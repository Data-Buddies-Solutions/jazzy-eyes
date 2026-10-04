import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateCompositeId(
  brandId: number,
  styleNumber: string,
  colorCode: string,
  eyeSize: string
): string {
  return `${brandId}-${styleNumber}-${colorCode}-${eyeSize}`;
}

async function main() {
  console.log('🔄 Starting composite ID migration...\n');

  const products = await prisma.product.findMany({
    include: {
      transactions: true,
    },
  });

  console.log(`Found ${products.length} products to check.\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const product of products) {
    const expectedId = generateCompositeId(
      product.brandId,
      product.styleNumber,
      product.colorCode,
      product.eyeSize
    );

    if (expectedId === product.compositeId) {
      skippedCount++;
      continue;
    }

    console.log(`Updating: ${product.compositeId} → ${expectedId}`);
    console.log(`  Eye size field: ${product.eyeSize}`);
    console.log(`  Transactions: ${product.transactions.length}`);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.product.create({
          data: {
            compositeId: expectedId,
            brandId: product.brandId,
            statusId: product.statusId,
            styleNumber: product.styleNumber,
            colorCode: product.colorCode,
            eyeSize: product.eyeSize,
            gender: product.gender,
            frameType: product.frameType,
            productType: product.productType,
            currentQty: product.currentQty,
            createdAt: product.createdAt,
          },
        });

        await tx.inventoryTransaction.updateMany({
          where: { productId: product.compositeId },
          data: { productId: expectedId },
        });

        await tx.product.delete({
          where: { compositeId: product.compositeId },
        });
      });

      console.log(`  ✓ Updated successfully\n`);
      updatedCount++;
    } catch (error) {
      console.error(`  ✗ Error updating ${product.compositeId}:`, error);
      errorCount++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`  Total products: ${products.length}`);
  console.log(`  Updated: ${updatedCount}`);
  console.log(`  Skipped (already correct): ${skippedCount}`);
  console.log(`  Errors: ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n✅ Migration completed successfully!');
  } else {
    console.log('\n⚠️  Migration completed with errors. Review the output above.');
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
