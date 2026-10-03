import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const compositeId = id;

    const product = await prisma.product.findUnique({
      where: { compositeId },
      include: {
        brand: {
          select: {
            brandName: true,
            companyName: true,
          },
        },
        transactions: {
          orderBy: { transactionDate: 'desc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Frame not found' },
        { status: 404 }
      );
    }

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
    const { id } = await params;
    const compositeId = id;
    const body = await request.json();

    const existingProduct = await prisma.product.findUnique({
      where: { compositeId },
      include: { transactions: true },
    });

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
      const existingWithNewId = await prisma.product.findUnique({
        where: { compositeId: newCompositeId },
      });

      if (existingWithNewId) {
        return NextResponse.json(
          { success: false, error: `A frame with ID ${newCompositeId} already exists` },
          { status: 409 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.product.create({
          data: {
            compositeId: newCompositeId,
            brandId: newBrandId,
            statusId: existingProduct.statusId,
            styleNumber: newStyleNumber,
            colorCode: newColorCode,
            eyeSize: newEyeSize,
            gender: newGender,
            frameType: newFrameType,
            productType: newProductType,
            currentQty: existingProduct.currentQty,
            createdAt: existingProduct.createdAt,
          },
        });

        await tx.inventoryTransaction.updateMany({
          where: { productId: compositeId },
          data: { productId: newCompositeId },
        });

        await tx.product.delete({
          where: { compositeId },
        });
      });

      updatedProduct = await prisma.product.findUnique({
        where: { compositeId: newCompositeId },
        include: { transactions: true },
      });
    } else {
      updatedProduct = await prisma.product.update({
        where: { compositeId },
        data: {
          brandId: newBrandId,
          styleNumber: newStyleNumber,
          colorCode: newColorCode,
          eyeSize: newEyeSize,
          gender: newGender,
          frameType: newFrameType,
          productType: newProductType,
        },
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
      const latestOrder = await prisma.inventoryTransaction.findFirst({
        where: { productId: productIdForTransaction, transactionType: 'ORDER' },
        orderBy: { transactionDate: 'desc' },
      });

      if (latestOrder) {
        await prisma.inventoryTransaction.update({
          where: { id: latestOrder.id },
          data: {
            unitCost: body.costPrice !== undefined ? body.costPrice : latestOrder.unitCost,
            unitPrice: body.retailPrice !== undefined ? body.retailPrice : latestOrder.unitPrice,
            invoiceDate: body.invoiceDate !== undefined ? (body.invoiceDate ? new Date(body.invoiceDate) : null) : latestOrder.invoiceDate,
            notes: body.notes !== undefined ? body.notes : latestOrder.notes,
            isSpecialOrder: body.isSpecialOrder !== undefined ? body.isSpecialOrder : latestOrder.isSpecialOrder,
          },
        });
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

async function applyBrandCostDiscount(
  brandId: number,
  cost: number,
  saleDate: Date
): Promise<number> {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { costDiscountPercent: true, costDiscountStartDate: true },
  });
  if (
    brand?.costDiscountPercent &&
    Number(brand.costDiscountPercent) > 0 &&
    brand.costDiscountStartDate &&
    saleDate >= brand.costDiscountStartDate
  ) {
    return cost * (1 - Number(brand.costDiscountPercent) / 100);
  }
  return cost;
}

async function previewFIFOCost(
  productId: string,
  quantityToConsume: number
): Promise<number> {
  const batches = await prisma.inventoryTransaction.findMany({
    where: {
      productId,
      transactionType: { in: ['ORDER', 'RESTOCK'] },
      remainingQty: { gt: 0 },
    },
    orderBy: { transactionDate: 'asc' },
  });

  let remainingToConsume = quantityToConsume;
  let totalCost = 0;

  for (const batch of batches) {
    if (remainingToConsume <= 0) break;
    const availableInBatch = batch.remainingQty || 0;
    const consumeFromBatch = Math.min(availableInBatch, remainingToConsume);
    totalCost += consumeFromBatch * Number(batch.unitCost);
    remainingToConsume -= consumeFromBatch;
  }

  return quantityToConsume > 0 ? totalCost / quantityToConsume : 0;
}

async function consumeFIFOInventory(
  productId: string,
  quantityToConsume: number
): Promise<{ totalCost: number; avgCost: number }> {
  const batches = await prisma.inventoryTransaction.findMany({
    where: {
      productId,
      transactionType: { in: ['ORDER', 'RESTOCK'] },
      remainingQty: { gt: 0 },
    },
    orderBy: { transactionDate: 'asc' },
  });

  let remainingToConsume = quantityToConsume;
  let totalCost = 0;

  for (const batch of batches) {
    if (remainingToConsume <= 0) break;

    const availableInBatch = batch.remainingQty || 0;
    const consumeFromBatch = Math.min(availableInBatch, remainingToConsume);

    await prisma.inventoryTransaction.update({
      where: { id: batch.id },
      data: { remainingQty: availableInBatch - consumeFromBatch },
    });

    totalCost += consumeFromBatch * Number(batch.unitCost);
    remainingToConsume -= consumeFromBatch;
  }

  const avgCost = quantityToConsume > 0 ? totalCost / quantityToConsume : 0;
  return { totalCost, avgCost };
}

async function getSoldOutStatus() {
  return await prisma.frameStatus.findUnique({
    where: { name: 'Sold Out' },
  });
}

async function getActiveStatus() {
  return await prisma.frameStatus.findUnique({
    where: { name: 'Active' },
  });
}

async function getLatestCostPrice(productId: string): Promise<number> {
  const latestBatch = await prisma.inventoryTransaction.findFirst({
    where: {
      productId,
      transactionType: { in: ['ORDER', 'RESTOCK'] },
    },
    orderBy: { transactionDate: 'desc' },
  });
  return latestBatch ? Number(latestBatch.unitCost) : 0;
}

async function getRetailPrice(productId: string): Promise<number> {
  const orderTransaction = await prisma.inventoryTransaction.findFirst({
    where: {
      productId,
      transactionType: 'ORDER',
    },
    orderBy: { transactionDate: 'desc' },
  });
  return orderTransaction ? Number(orderTransaction.unitPrice) : 0;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const compositeId = id;
    const body = await request.json();

    const { action } = body;

    const existingProduct = await prisma.product.findUnique({
      where: { compositeId },
      include: {
        transactions: {
          orderBy: { transactionDate: 'desc' },
        },
        status: true,
      },
    });

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

      const retailPrice = await getRetailPrice(compositeId);
      const finalSalePrice = salePrice || retailPrice;

      const finalSaleDate = saleDate ? new Date(saleDate) : new Date();

      const previewCost = await previewFIFOCost(compositeId, quantity);

      const discountedPreviewCost = await applyBrandCostDiscount(
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

      const { avgCost } = await consumeFIFOInventory(compositeId, quantity);

      const finalUnitCost = await applyBrandCostDiscount(
        existingProduct.brandId,
        avgCost,
        finalSaleDate
      );

      const newQty = existingProduct.currentQty - quantity;

      let statusUpdate = {};
      if (newQty === 0) {
        const soldOutStatus = await getSoldOutStatus();
        if (soldOutStatus) {
          statusUpdate = { statusId: soldOutStatus.id };
        }
      }

      await prisma.$transaction([
        prisma.inventoryTransaction.create({
          data: {
            productId: compositeId,
            transactionType: 'SALE',
            transactionDate: finalSaleDate,
            quantity,
            unitCost: finalUnitCost,
            unitPrice: finalSalePrice,
            status: 'completed',
            notes: `Sold ${quantity} unit(s) via admin`,
          },
        }),
        prisma.product.update({
          where: { compositeId },
          data: {
            currentQty: newQty,
            ...statusUpdate,
          },
        }),
      ]);

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

      let avgCost = 0;
      if (reason !== 'return') {
        const fifoResult = await consumeFIFOInventory(compositeId, quantity);
        avgCost = fifoResult.avgCost;
      }

      const newQty = existingProduct.currentQty - quantity;

      let statusUpdate = {};
      if (newQty === 0) {
        const soldOutStatus = await getSoldOutStatus();
        if (soldOutStatus) {
          statusUpdate = { statusId: soldOutStatus.id };
        }
      }

      await prisma.$transaction([
        prisma.inventoryTransaction.create({
          data: {
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
        }),
        prisma.product.update({
          where: { compositeId },
          data: {
            currentQty: newQty,
            ...statusUpdate,
          },
        }),
      ]);

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

      const writeOffTransaction = await prisma.inventoryTransaction.findUnique({
        where: { id: writeOffTransactionId },
      });

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

      const existingRevert = await prisma.inventoryTransaction.findFirst({
        where: {
          productId: compositeId,
          transactionType: 'REVERT_WRITE_OFF',
          revertedFromId: writeOffTransactionId,
        },
      });

      if (existingRevert) {
        return NextResponse.json(
          { success: false, error: 'This write-off has already been reverted' },
          { status: 400 }
        );
      }

      const quantityToRestore = writeOffTransaction.quantity;
      const newQty = existingProduct.currentQty + quantityToRestore;

      let statusUpdate = {};
      if (existingProduct.status?.name === 'Sold Out') {
        const activeStatus = await getActiveStatus();
        if (activeStatus) {
          statusUpdate = { statusId: activeStatus.id };
        }
      }

      await prisma.$transaction([
        prisma.inventoryTransaction.create({
          data: {
            productId: compositeId,
            transactionType: 'REVERT_WRITE_OFF',
            transactionDate: new Date(),
            quantity: quantityToRestore,
            unitCost: Number(writeOffTransaction.unitCost),
            unitPrice: 0,
            status: 'completed',
            revertedFromId: writeOffTransactionId,
            remainingQty: quantityToRestore,
            notes: notes || `Reverted write-off #${writeOffTransactionId}`,
          },
        }),
        prisma.product.update({
          where: { compositeId },
          data: {
            currentQty: newQty,
            ...statusUpdate,
          },
        }),
      ]);

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

      const finalCostPrice = costPrice !== undefined ? costPrice : await getLatestCostPrice(compositeId);
      const finalInvoiceDate = invoiceDate ? new Date(invoiceDate) : null;
      const transactionDate = finalInvoiceDate || new Date();
      const retailPrice = await getRetailPrice(compositeId);

      const newQty = existingProduct.currentQty + quantity;

      let statusUpdate = {};
      if (existingProduct.status?.name === 'Sold Out') {
        const activeStatus = await getActiveStatus();
        if (activeStatus) {
          statusUpdate = { statusId: activeStatus.id };
        }
      }

      await prisma.$transaction([
        prisma.inventoryTransaction.create({
          data: {
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
        }),
        prisma.product.update({
          where: { compositeId },
          data: {
            currentQty: newQty,
            ...statusUpdate,
          },
        }),
      ]);

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

      const newStatus = await prisma.frameStatus.findUnique({
        where: { id: newStatusId },
      });

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

      await prisma.product.update({
        where: { compositeId },
        data: { statusId: newStatusId },
      });

      return NextResponse.json({
        success: true,
        message: `Status changed to "${newStatus.name}" successfully`,
      });
    }

    if (action === 'get_transactions') {
      const revertTransactions = await prisma.inventoryTransaction.findMany({
        where: {
          productId: compositeId,
          transactionType: 'REVERT_WRITE_OFF',
        },
        select: { revertedFromId: true },
      });

      const revertedIds = new Set(revertTransactions.map(t => t.revertedFromId).filter(Boolean));

      const transactions = existingProduct.transactions.map(t => ({
        id: t.id,
        transactionType: t.transactionType,
        transactionDate: t.transactionDate.toISOString(),
        quantity: t.quantity,
        unitCost: Number(t.unitCost),
        unitPrice: Number(t.unitPrice),
        notes: t.notes,
        writeOffReason: t.writeOffReason,
        remainingQty: t.remainingQty,
        revertedFromId: t.revertedFromId,
        isReverted: t.transactionType === 'WRITE_OFF' ? revertedIds.has(t.id) : undefined,
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
        await prisma.inventoryTransaction.update({
          where: { id: orderTransaction.id },
          data: {
            notes: 'DISCONTINUED',
            status: 'discontinued',
          },
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
