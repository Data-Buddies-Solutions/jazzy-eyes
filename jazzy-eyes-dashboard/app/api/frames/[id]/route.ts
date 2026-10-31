import { NextRequest, NextResponse } from 'next/server';
import {
  consumeFifo,
  discountedCost,
  findFrame,
  findProduct,
  findProductWithStatus,
  findProductWithTransactions,
  findRevert,
  findStatus,
  findStatusByName,
  findTransaction,
  latestBatchCost,
  latestRetailPrice,
  latestTransaction,
  previewFifoCost,
  recordMovement,
  renameProduct,
  revertedWriteOffIds,
  setProductStatus,
  transactionJson,
  updateProduct,
  updateTransaction,
  type TransactionPatch,
} from '@/db/frames';

// Next always supplies the segment; a missing one failed inside Prisma, so it stays a 500.
async function frameId(params: Promise<{ id: string }>): Promise<string> {
  const { id } = await params;
  if (id === undefined) throw new Error('frame id param is missing');
  return id;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const compositeId = await frameId(params);

    const frame = await findFrame(compositeId);

    if (!frame) {
      return NextResponse.json(
        { success: false, error: 'Frame not found' },
        { status: 404 }
      );
    }

    const product = { ...frame, transactions: frame.transactions.map(transactionJson) };
    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Error fetching frame:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch frame' },
      { status: 500 }
    );
  }
}

function generateCompositeId(
  brandId: number,
  styleNumber: string,
  colorCode: string,
  eyeSize: string
): string {
  return `${brandId}-${styleNumber}-${colorCode}-${eyeSize}`;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const compositeId = await frameId(params);
    const body = await request.json();

    const existingProduct = await findProduct(compositeId);

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Frame not found' },
        { status: 404 }
      );
    }

    const newBrandId = body.brandId !== undefined ? body.brandId : existingProduct.brandId;
    const newStyleNumber = body.styleNumber !== undefined ? body.styleNumber : existingProduct.styleNumber;
    const newColorCode = body.colorCode !== undefined ? body.colorCode : existingProduct.colorCode;
    const newEyeSize = body.eyeSize !== undefined ? body.eyeSize : existingProduct.eyeSize;
    const newGender = body.gender !== undefined ? body.gender : existingProduct.gender;
    const newFrameType = body.frameType !== undefined ? body.frameType : existingProduct.frameType;
    const newProductType = body.productType !== undefined ? body.productType : existingProduct.productType;

    const newCompositeId = generateCompositeId(newBrandId, newStyleNumber, newColorCode, newEyeSize);
    const idChanged = newCompositeId !== compositeId;

    let updatedProduct;

    if (idChanged) {
      const existingWithNewId = await findProduct(newCompositeId);

      if (existingWithNewId) {
        return NextResponse.json(
          { success: false, error: `A frame with ID ${newCompositeId} already exists` },
          { status: 409 }
        );
      }

      await renameProduct(existingProduct, {
        compositeId: newCompositeId,
        brandId: newBrandId,
        styleNumber: newStyleNumber,
        colorCode: newColorCode,
        eyeSize: newEyeSize,
        gender: newGender,
        frameType: newFrameType,
        productType: newProductType,
      });

      const renamed = await findProductWithTransactions(newCompositeId);
      updatedProduct = renamed && {
        ...renamed,
        transactions: renamed.transactions.map(transactionJson),
      };
    } else {
      updatedProduct = await updateProduct(compositeId, {
        brandId: newBrandId,
        styleNumber: newStyleNumber,
        colorCode: newColorCode,
        eyeSize: newEyeSize,
        gender: newGender,
        frameType: newFrameType,
        productType: newProductType,
      });
    }

    if (
      body.costPrice !== undefined ||
      body.retailPrice !== undefined ||
      body.notes !== undefined ||
      body.invoiceDate !== undefined ||
      body.isSpecialOrder !== undefined
    ) {
      const productIdForTransaction = idChanged ? newCompositeId : compositeId;
      const latestOrder = await latestTransaction(productIdForTransaction, ['ORDER']);

      if (latestOrder) {
        const patch: TransactionPatch = {};
        if (body.costPrice !== undefined) patch.unitCost = body.costPrice;
        if (body.retailPrice !== undefined) patch.unitPrice = body.retailPrice;
        if (body.invoiceDate !== undefined) {
          patch.invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : null;
        }
        if (body.notes !== undefined) patch.notes = body.notes;
        if (body.isSpecialOrder !== undefined) patch.isSpecialOrder = body.isSpecialOrder;
        await updateTransaction(latestOrder.id, patch);
      }
    }

    return NextResponse.json({
      success: true,
      message: idChanged
        ? `Frame updated successfully. ID changed from ${compositeId} to ${newCompositeId}`
        : 'Frame updated successfully',
      product: updatedProduct,
      newCompositeId: idChanged ? newCompositeId : undefined,
    });
  } catch (error) {
    console.error('Error updating frame:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update frame' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const compositeId = await frameId(params);
    const body = await request.json();

    const { action } = body;

    const existingProduct = await findProductWithStatus(compositeId);

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Frame not found' },
        { status: 404 }
      );
    }

    if (action === 'mark_as_sold') {
      const { quantity = 1, salePrice, saleDate } = body;

      if (quantity < 1) {
        return NextResponse.json(
          { success: false, error: 'Quantity must be at least 1' },
          { status: 400 }
        );
      }

      if (quantity > existingProduct.currentQty) {
        return NextResponse.json(
          { success: false, error: `Not enough stock. Only ${existingProduct.currentQty} available.` },
          { status: 400 }
        );
      }

      const retailPrice = await latestRetailPrice(compositeId);
      const finalSalePrice = salePrice || retailPrice;

      const finalSaleDate = saleDate ? new Date(saleDate) : new Date();

      const previewCost = await previewFifoCost(compositeId, quantity);

      const discountedPreviewCost = await discountedCost(
        existingProduct.brandId,
        previewCost,
        finalSaleDate
      );

      if (discountedPreviewCost > 0 && finalSalePrice < discountedPreviewCost) {
        return NextResponse.json(
          { success: false, error: `Sale price ($${finalSalePrice.toFixed(2)}) cannot be below wholesale cost ($${discountedPreviewCost.toFixed(2)})` },
          { status: 400 }
        );
      }

      const avgCost = await consumeFifo(compositeId, quantity);

      const finalUnitCost = await discountedCost(
        existingProduct.brandId,
        avgCost,
        finalSaleDate
      );

      const newQty = existingProduct.currentQty - quantity;
      const soldOutStatus = newQty === 0 ? await findStatusByName('Sold Out') : null;

      await recordMovement(
        {
          productId: compositeId,
          transactionType: 'SALE',
          transactionDate: finalSaleDate,
          quantity,
          unitCost: finalUnitCost,
          unitPrice: finalSalePrice,
          status: 'completed',
          notes: `Sold ${quantity} unit(s) via admin`,
        },
        { currentQty: newQty, statusId: soldOutStatus?.id }
      );

      return NextResponse.json({
        success: true,
        message: `Sold ${quantity} unit(s) successfully`,
        newQty,
      });
    }

    if (action === 'write_off') {
      const { quantity, reason, notes } = body;

      if (!quantity || quantity < 1) {
        return NextResponse.json(
          { success: false, error: 'Quantity must be at least 1' },
          { status: 400 }
        );
      }

      if (quantity > existingProduct.currentQty) {
        return NextResponse.json(
          { success: false, error: `Not enough stock. Only ${existingProduct.currentQty} available.` },
          { status: 400 }
        );
      }

      const validReasons = ['damaged', 'lost', 'defective', 'return', 'other'];
      if (!reason || !validReasons.includes(reason)) {
        return NextResponse.json(
          { success: false, error: 'A valid reason is required for write-off' },
          { status: 400 }
        );
      }

      const avgCost = reason === 'return' ? 0 : await consumeFifo(compositeId, quantity);

      const newQty = existingProduct.currentQty - quantity;
      const soldOutStatus = newQty === 0 ? await findStatusByName('Sold Out') : null;

      await recordMovement(
        {
          productId: compositeId,
          transactionType: 'WRITE_OFF',
          transactionDate: new Date(),
          quantity,
          unitCost: avgCost,
          unitPrice: 0,
          status: 'completed',
          writeOffReason: reason,
          notes: notes || null,
        },
        { currentQty: newQty, statusId: soldOutStatus?.id }
      );

      return NextResponse.json({
        success: true,
        message: `Written off ${quantity} unit(s) successfully`,
        newQty,
      });
    }

    if (action === 'revert_write_off') {
      const { writeOffTransactionId, notes } = body;

      if (!writeOffTransactionId) {
        return NextResponse.json(
          { success: false, error: 'Write-off transaction ID is required' },
          { status: 400 }
        );
      }

      const writeOffTransaction = await findTransaction(writeOffTransactionId);

      if (!writeOffTransaction) {
        return NextResponse.json(
          { success: false, error: 'Write-off transaction not found' },
          { status: 404 }
        );
      }

      if (writeOffTransaction.transactionType !== 'WRITE_OFF') {
        return NextResponse.json(
          { success: false, error: 'Transaction is not a write-off' },
          { status: 400 }
        );
      }

      if (writeOffTransaction.productId !== compositeId) {
        return NextResponse.json(
          { success: false, error: 'Transaction does not belong to this frame' },
          { status: 400 }
        );
      }

      if (await findRevert(compositeId, writeOffTransactionId)) {
        return NextResponse.json(
          { success: false, error: 'This write-off has already been reverted' },
          { status: 400 }
        );
      }

      const quantityToRestore = writeOffTransaction.quantity;
      const newQty = existingProduct.currentQty + quantityToRestore;
      const activeStatus =
        existingProduct.status?.name === 'Sold Out' ? await findStatusByName('Active') : null;

      await recordMovement(
        {
          productId: compositeId,
          transactionType: 'REVERT_WRITE_OFF',
          transactionDate: new Date(),
          quantity: quantityToRestore,
          unitCost: writeOffTransaction.unitCost,
          unitPrice: 0,
          status: 'completed',
          revertedFromId: writeOffTransactionId,
          remainingQty: quantityToRestore,
          notes: notes || `Reverted write-off #${writeOffTransactionId}`,
        },
        { currentQty: newQty, statusId: activeStatus?.id }
      );

      return NextResponse.json({
        success: true,
        message: `Reverted write-off of ${quantityToRestore} unit(s) successfully`,
        newQty,
      });
    }

    if (action === 'restock') {
      const { quantity, invoiceDate, costPrice, notes, isSpecialOrder } = body;

      if (!quantity || quantity < 1) {
        return NextResponse.json(
          { success: false, error: 'Quantity must be at least 1' },
          { status: 400 }
        );
      }

      const finalCostPrice = costPrice !== undefined ? costPrice : await latestBatchCost(compositeId);
      const finalInvoiceDate = invoiceDate ? new Date(invoiceDate) : null;
      const transactionDate = finalInvoiceDate || new Date();
      const retailPrice = await latestRetailPrice(compositeId);

      const newQty = existingProduct.currentQty + quantity;
      const activeStatus =
        existingProduct.status?.name === 'Sold Out' ? await findStatusByName('Active') : null;

      await recordMovement(
        {
          productId: compositeId,
          transactionType: 'RESTOCK',
          transactionDate,
          invoiceDate: finalInvoiceDate,
          quantity,
          unitCost: finalCostPrice,
          unitPrice: retailPrice,
          status: 'completed',
          remainingQty: quantity,
          notes: notes || null,
          isSpecialOrder: isSpecialOrder === true,
        },
        { currentQty: newQty, statusId: activeStatus?.id }
      );

      return NextResponse.json({
        success: true,
        message: `Restocked ${quantity} unit(s) successfully`,
        newQty,
      });
    }

    if (action === 'change_status') {
      const { newStatusId } = body;

      if (!newStatusId) {
        return NextResponse.json(
          { success: false, error: 'New status ID is required' },
          { status: 400 }
        );
      }

      const newStatus = await findStatus(newStatusId);

      if (!newStatus) {
        return NextResponse.json(
          { success: false, error: 'Status not found' },
          { status: 404 }
        );
      }

      if (newStatus.isProtected && newStatus.name === 'Sold Out') {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot manually set status to "Sold Out". This status is set automatically when quantity reaches 0.',
          },
          { status: 403 }
        );
      }

      await setProductStatus(compositeId, newStatusId);

      return NextResponse.json({
        success: true,
        message: `Status changed to "${newStatus.name}" successfully`,
      });
    }

    if (action === 'get_transactions') {
      const reverted = await revertedWriteOffIds(compositeId);

      const transactions = existingProduct.transactions.map(t => ({
        id: t.id,
        transactionType: t.transactionType,
        transactionDate: t.transactionDate.toISOString(),
        quantity: t.quantity,
        unitCost: t.unitCost,
        unitPrice: t.unitPrice,
        notes: t.notes,
        writeOffReason: t.writeOffReason,
        remainingQty: t.remainingQty,
        revertedFromId: t.revertedFromId,
        isReverted: t.transactionType === 'WRITE_OFF' ? reverted.has(t.id) : undefined,
      }));

      return NextResponse.json({
        success: true,
        transactions,
      });
    }

    if (action === 'mark_as_discontinued') {
      const orderTransaction = existingProduct.transactions.find(
        (t) => t.transactionType === 'ORDER'
      );

      if (orderTransaction) {
        await updateTransaction(orderTransaction.id, {
          notes: 'DISCONTINUED',
          status: 'discontinued',
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Frame marked as discontinued successfully',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating frame status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update frame status' },
      { status: 500 }
    );
  }
}
