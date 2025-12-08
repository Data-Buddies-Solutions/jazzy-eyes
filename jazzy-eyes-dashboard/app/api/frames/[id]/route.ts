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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const compositeId = id;
    const body = await request.json();

    // Check if frame exists
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

    // Update product fields that can be changed
    const updatedProduct = await prisma.product.update({
      where: { compositeId },
      data: {
        gender: body.gender,
        frameType: body.frameType,
        productType: body.productType,
      },
    });

    // If cost/retail prices or invoice info changed, update the latest ORDER transaction
    if (body.costPrice !== undefined || body.retailPrice !== undefined || body.notes !== undefined || body.invoiceDate !== undefined) {
      const latestOrder = existingProduct.transactions.find(
        (t) => t.transactionType === 'ORDER'
      );

      if (latestOrder) {
        await prisma.inventoryTransaction.update({
          where: { id: latestOrder.id },
          data: {
            unitCost: body.costPrice !== undefined ? body.costPrice : latestOrder.unitCost,
            unitPrice: body.retailPrice !== undefined ? body.retailPrice : latestOrder.unitPrice,
            invoiceDate: body.invoiceDate !== undefined ? (body.invoiceDate ? new Date(body.invoiceDate) : null) : latestOrder.invoiceDate,
            notes: body.notes !== undefined ? body.notes : latestOrder.notes,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Frame updated successfully',
      product: updatedProduct,
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
    const { id } = await params;
    const compositeId = id;
    const body = await request.json();

    const { action, salePrice, saleDate } = body;

    // Check if frame exists
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

    if (action === 'mark_as_sold') {
      // Check if already sold
      const existingSale = existingProduct.transactions.find(
        (t) => t.transactionType === 'SALE'
      );

      if (existingSale) {
        return NextResponse.json(
          { success: false, error: 'Frame is already marked as sold' },
          { status: 400 }
        );
      }

      // Get retail price from ORDER transaction
      const orderTransaction = existingProduct.transactions.find(
        (t) => t.transactionType === 'ORDER'
      );

      const finalSalePrice = salePrice || Number(orderTransaction?.unitPrice) || 0;
      const finalSaleDate = saleDate ? new Date(saleDate) : new Date();

      // Create SALE transaction
      await prisma.inventoryTransaction.create({
        data: {
          productId: compositeId,
          transactionType: 'SALE',
          transactionDate: finalSaleDate,
          quantity: 1,
          unitCost: Number(orderTransaction?.unitCost) || 0,
          unitPrice: finalSalePrice,
          status: 'completed',
          notes: 'Marked as sold via admin',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Frame marked as sold successfully',
      });
    }

    if (action === 'mark_as_discontinued') {
      // For now, we'll add a note to indicate discontinued
      // You could add a status field to the Product model in the future
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
