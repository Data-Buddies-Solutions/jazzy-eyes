import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  console.log('📋 Creating default frame statuses...');

  const defaultStatuses = [
    { name: 'Active', colorScheme: 'green', isProtected: false, displayOrder: 1 },
    { name: 'Sold Out', colorScheme: 'blue', isProtected: true, displayOrder: 2 },
    { name: 'Discontinued', colorScheme: 'gray', isProtected: false, displayOrder: 3 },
    { name: 'Reserved', colorScheme: 'yellow', isProtected: false, displayOrder: 4 },
    { name: 'Damaged', colorScheme: 'red', isProtected: false, displayOrder: 5 },
    { name: 'On Hold', colorScheme: 'purple', isProtected: false, displayOrder: 6 },
  ];

  for (const status of defaultStatuses) {
    await prisma.frameStatus.upsert({
      where: { name: status.name },
      update: {},
      create: status,
    });
    console.log(`  ✓ Created status: ${status.name}`);
  }

  console.log('✅ Default statuses created successfully\n');

  console.log('👓 Creating test frames...');

  const activeStatus = await prisma.frameStatus.findUnique({ where: { name: 'Active' } });

  if (activeStatus) {
    const testFrames = [
      {
        compositeId: '1001-GG0002-TRT-54-17-140',
        brandId: 1001,
        statusId: activeStatus.id,
        styleNumber: 'GG0002',
        colorCode: 'TRT',
        eyeSize: '54-17-140',
        gender: 'Men',
        frameType: 'Full Rim',
        productType: 'Optical',
      },
      {
        compositeId: '1001-GG0003-GLD-51-18-145',
        brandId: 1001,
        statusId: activeStatus.id,
        styleNumber: 'GG0003',
        colorCode: 'GLD',
        eyeSize: '51-18-145',
        gender: 'Unisex',
        frameType: 'Semi-Rimless',
        productType: 'Sun',
      },
      {
        compositeId: '3001-TF5001-BLK-55-16-145',
        brandId: 3001,
        statusId: activeStatus.id,
        styleNumber: 'TF5001',
        colorCode: 'BLK',
        eyeSize: '55-16-145',
        gender: 'Men',
        frameType: 'Full Rim',
        productType: 'Optical',
      },
      {
        compositeId: '3001-TF5002-HVN-53-17-140',
        brandId: 3001,
        statusId: activeStatus.id,
        styleNumber: 'TF5002',
        colorCode: 'HVN',
        eyeSize: '53-17-140',
        gender: 'Women',
        frameType: 'Full Rim',
        productType: 'Sun',
      },
      {
        compositeId: '7000-SALT001-BLK-50-20-145',
        brandId: 7000,
        statusId: activeStatus.id,
        styleNumber: 'SALT001',
        colorCode: 'BLK',
        eyeSize: '50-20-145',
        gender: 'Unisex',
        frameType: 'Full Rim',
        productType: 'Optical',
      },
      {
        compositeId: '7000-SALT002-SLV-52-18-140',
        brandId: 7000,
        statusId: activeStatus.id,
        styleNumber: 'SALT002',
        colorCode: 'SLV',
        eyeSize: '52-18-140',
        gender: 'Men',
        frameType: 'Full Rim',
        productType: 'Optical',
      },
      {
        compositeId: '7000-SALT003-GRY-49-19-135',
        brandId: 7000,
        statusId: activeStatus.id,
        styleNumber: 'SALT003',
        colorCode: 'GRY',
        eyeSize: '49-19-135',
        gender: 'Women',
        frameType: 'Semi-Rimless',
        productType: 'Optical',
      },
      {
        compositeId: '7000-SALT004-BRN-54-17-145',
        brandId: 7000,
        statusId: activeStatus.id,
        styleNumber: 'SALT004',
        colorCode: 'BRN',
        eyeSize: '54-17-145',
        gender: 'Unisex',
        frameType: 'Full Rim',
        productType: 'Sun',
      },
      {
        compositeId: '7000-SALT005-TRT-51-18-140',
        brandId: 7000,
        statusId: activeStatus.id,
        styleNumber: 'SALT005',
        colorCode: 'TRT',
        eyeSize: '51-18-140',
        gender: 'Women',
        frameType: 'Full Rim',
        productType: 'Sun',
      },
    ];

    for (const frame of testFrames) {
      await prisma.product.upsert({
        where: { compositeId: frame.compositeId },
        update: {},
        create: frame,
      });
      console.log(`  ✓ Created frame: ${frame.compositeId}`);
    }

    console.log(`✅ Created ${testFrames.length} test frames\n`);

    console.log('💰 Adding pricing transactions...');

    const pricingData = [
      { compositeId: '1001-GG0002-TRT-54-17-140', cost: 180, retail: 450 },
      { compositeId: '1001-GG0003-GLD-51-18-145', cost: 195, retail: 485 },
      { compositeId: '3001-TF5001-BLK-55-16-145', cost: 210, retail: 525 },
      { compositeId: '3001-TF5002-HVN-53-17-140', cost: 220, retail: 550 },
      { compositeId: '7000-SALT001-BLK-50-20-145', cost: 160, retail: 400 },
      { compositeId: '7000-SALT002-SLV-52-18-140', cost: 165, retail: 410 },
      { compositeId: '7000-SALT003-GRY-49-19-135', cost: 155, retail: 390 },
      { compositeId: '7000-SALT004-BRN-54-17-145', cost: 170, retail: 425 },
      { compositeId: '7000-SALT005-TRT-51-18-140', cost: 168, retail: 420 },
    ];

    for (const pricing of pricingData) {
      await prisma.inventoryTransaction.create({
        data: {
          productId: pricing.compositeId,
          transactionType: 'ORDER',
          transactionDate: new Date('2025-12-01'),
          invoiceDate: new Date('2025-12-01'),
          invoiceNumber: `INV-${pricing.compositeId}`,
          quantity: 1,
          unitCost: pricing.cost,
          unitPrice: pricing.retail,
          status: 'completed',
        },
      });
      console.log(`  ✓ Added pricing for ${pricing.compositeId}: $${pricing.retail}`);
    }

    console.log(`✅ Added pricing for ${pricingData.length} frames\n`);
  } else {
    console.log('  ⚠️  Active status not found, skipping test frames\n');
  }

  console.log('🔄 Backfilling existing products with statuses...');

  const products = await prisma.product.findMany({
    include: {
      transactions: {
        orderBy: { transactionDate: 'desc' },
      },
    },
  });

  if (products.length === 0) {
    console.log('  No products found to backfill');
  } else {
    const activeStatus = await prisma.frameStatus.findUnique({ where: { name: 'Active' } });
    const soldStatus = await prisma.frameStatus.findUnique({ where: { name: 'Sold Out' } });
    const discontinuedStatus = await prisma.frameStatus.findUnique({ where: { name: 'Discontinued' } });

    let activeCount = 0;
    let soldCount = 0;
    let discontinuedCount = 0;

    for (const product of products) {
      if (product.statusId) {
        continue;
      }

      let statusId = activeStatus?.id;

      const saleTransaction = product.transactions.find((t) => t.transactionType === 'SALE');
      if (saleTransaction && soldStatus) {
        statusId = soldStatus.id;
        soldCount++;
      } else {
        const orderTransaction = product.transactions.find((t) => t.transactionType === 'ORDER');
        if (
          (orderTransaction?.status === 'discontinued' ||
            orderTransaction?.notes?.includes('DISCONTINUED')) &&
          discontinuedStatus
        ) {
          statusId = discontinuedStatus.id;
          discontinuedCount++;
        } else if (activeStatus) {
          activeCount++;
        }
      }

      if (statusId) {
        await prisma.product.update({
          where: { compositeId: product.compositeId },
          data: { statusId },
        });
      }
    }

    console.log(`  ✓ Backfilled ${products.length} products`);
    console.log(`    - ${activeCount} set to Active`);
    console.log(`    - ${soldCount} set to Sold`);
    console.log(`    - ${discontinuedCount} set to Discontinued`);
  }

  console.log('\n✅ Seed script completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
