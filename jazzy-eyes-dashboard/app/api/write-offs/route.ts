import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const writeOffs = await prisma.inventoryTransaction.findMany({
      where: {
        transactionType: 'WRITE_OFF',
      },
      include: {
        product: {
          include: {
            brand: true,
          },
        },
      },
      orderBy: {
        transactionDate: 'desc',
      },
    });

    const formattedWriteOffs = writeOffs.map((wo) => ({
      id: wo.id,
      frameId: wo.productId,
      brand: wo.product.brand.brandName,
      styleNumber: wo.product.styleNumber,
      colorCode: wo.product.colorCode,
      transactionDate: wo.transactionDate.toISOString(),
      quantity: wo.quantity,
      reason: wo.writeOffReason,
      notes: wo.notes,
      isReverted: false, // Will check below
      revertedByTransactionId: null as number | null,
    }));

    // Check which write-offs have been reverted
    const revertTransactions = await prisma.inventoryTransaction.findMany({
      where: {
        transactionType: 'REVERT_WRITE_OFF',
      },
      select: {
        revertedFromId: true,
        id: true,
      },
    });

    const revertedIds = new Set(revertTransactions.map((r) => r.revertedFromId));
    const revertMap = new Map(revertTransactions.map((r) => [r.revertedFromId, r.id]));

    formattedWriteOffs.forEach((wo) => {
      if (revertedIds.has(wo.id)) {
        wo.isReverted = true;
        wo.revertedByTransactionId = revertMap.get(wo.id) || null;
      }
    });

    return NextResponse.json({
      success: true,
      writeOffs: formattedWriteOffs,
    });
  } catch (error) {
    console.error('Error fetching write-offs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch write-offs' },
      { status: 500 }
    );
  }
}
