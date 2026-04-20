import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Backfills `isSpecialOrder = true` on all InventoryTransaction rows whose
 * `notes` column mentions "special order" (case-insensitive).
 *
 * Historically, staff tracked special orders by typing "Special Order - <patient>"
 * into the free-text notes field. This script migrates that information onto
 * the first-class `isSpecialOrder` boolean without modifying the notes text.
 *
 * Idempotent: safe to re-run.
 *
 * Usage:
 *   npx tsx prisma/migrations/backfill-special-orders.ts
 */
async function main() {
  console.log('🔄 Backfilling isSpecialOrder flag from notes...\n');

  const matches = await prisma.inventoryTransaction.findMany({
    where: { notes: { contains: 'special order', mode: 'insensitive' } },
    select: {
      id: true,
      productId: true,
      transactionType: true,
      transactionDate: true,
      notes: true,
      isSpecialOrder: true,
    },
    orderBy: { transactionDate: 'asc' },
  });

  console.log(`Found ${matches.length} matching transactions.\n`);

  const alreadySet = matches.filter((m) => m.isSpecialOrder).length;
  const toUpdate = matches.filter((m) => !m.isSpecialOrder);

  if (toUpdate.length === 0) {
    console.log('✅ Nothing to do — all matching rows are already flagged.');
    return;
  }

  console.log(`  Already flagged: ${alreadySet}`);
  console.log(`  Will update:     ${toUpdate.length}\n`);

  for (const row of toUpdate) {
    const date = row.transactionDate.toISOString().slice(0, 10);
    console.log(`  [${row.transactionType}] ${date}  ${row.productId}  —  ${JSON.stringify(row.notes)}`);
  }

  const result = await prisma.inventoryTransaction.updateMany({
    where: {
      id: { in: toUpdate.map((r) => r.id) },
    },
    data: { isSpecialOrder: true },
  });

  console.log(`\n✅ Backfill complete: ${result.count} transactions updated.`);
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
