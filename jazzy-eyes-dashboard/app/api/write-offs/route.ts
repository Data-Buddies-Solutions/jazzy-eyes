import { NextResponse } from 'next/server';
import { listWriteOffs, revertedWriteOffIds } from '@/db/frames';

export async function GET() {
  try {
    const writeOffs = await listWriteOffs();
    const reverts = await revertedWriteOffIds();

    const formattedWriteOffs = writeOffs.map((wo) => ({
      id: wo.id,
      frameId: wo.productId,
      brand: wo.brandName,
      styleNumber: wo.styleNumber,
      colorCode: wo.colorCode,
      transactionDate: wo.transactionDate.toISOString(),
      quantity: wo.quantity,
      reason: wo.writeOffReason,
      notes: wo.notes,
      isReverted: reverts.has(wo.id),
      revertedByTransactionId: reverts.get(wo.id) ?? null,
    }));

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
