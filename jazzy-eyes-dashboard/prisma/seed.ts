import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const brands = [
  { id: 1, brandName: 'Gucci', companyName: 'Kering', companyId: 1000 },
  { id: 2, brandName: 'Rayban', companyName: 'EssilorLuxottica', companyId: 11000 },
  { id: 3, brandName: 'Tom Ford', companyName: 'Marcolin', companyId: 8000 },
];

// Sample frame data for testing
const sampleFrames = [
  { brandId: 1, styleNumber: 'GG1234', colorCode: 'BLK', eyeSize: '52', gender: 'Unisex', frameType: 'Full Rim', productType: 'Optical' },
  { brandId: 1, styleNumber: 'GG1234', colorCode: 'TRT', eyeSize: '52', gender: 'Unisex', frameType: 'Full Rim', productType: 'Optical' },
  { brandId: 1, styleNumber: 'GG5678', colorCode: 'GLD', eyeSize: '54', gender: 'Women', frameType: 'Full Rim', productType: 'Sun' },
  { brandId: 1, styleNumber: 'GG5678', colorCode: 'SLV', eyeSize: '54', gender: 'Women', frameType: 'Full Rim', productType: 'Sun' },
  { brandId: 2, styleNumber: 'RB2140', colorCode: 'BLK', eyeSize: '50', gender: 'Unisex', frameType: 'Full Rim', productType: 'Sun' },
  { brandId: 2, styleNumber: 'RB2140', colorCode: 'HVN', eyeSize: '50', gender: 'Unisex', frameType: 'Full Rim', productType: 'Sun' },
  { brandId: 2, styleNumber: 'RB3025', colorCode: 'GLD', eyeSize: '58', gender: 'Unisex', frameType: 'Rimless', productType: 'Sun' },
  { brandId: 2, styleNumber: 'RB3025', colorCode: 'SLV', eyeSize: '58', gender: 'Unisex', frameType: 'Rimless', productType: 'Sun' },
  { brandId: 2, styleNumber: 'RB5228', colorCode: 'BLK', eyeSize: '53', gender: 'Unisex', frameType: 'Full Rim', productType: 'Optical' },
  { brandId: 2, styleNumber: 'RB5228', colorCode: 'TRT', eyeSize: '53', gender: 'Unisex', frameType: 'Full Rim', productType: 'Optical' },
  { brandId: 3, styleNumber: 'TF5401', colorCode: 'BLK', eyeSize: '54', gender: 'Men', frameType: 'Full Rim', productType: 'Optical' },
  { brandId: 3, styleNumber: 'TF5401', colorCode: 'BRN', eyeSize: '54', gender: 'Men', frameType: 'Full Rim', productType: 'Optical' },
  { brandId: 3, styleNumber: 'TF0752', colorCode: 'BLK', eyeSize: '52', gender: 'Women', frameType: 'Full Rim', productType: 'Sun' },
  { brandId: 3, styleNumber: 'TF0752', colorCode: 'TRT', eyeSize: '52', gender: 'Women', frameType: 'Full Rim', productType: 'Sun' },
  { brandId: 3, styleNumber: 'TF5178', colorCode: 'HVN', eyeSize: '51', gender: 'Unisex', frameType: 'Full Rim', productType: 'Optical' },
  { brandId: 3, styleNumber: 'TF5178', colorCode: 'BLU', eyeSize: '51', gender: 'Unisex', frameType: 'Full Rim', productType: 'Optical' },
  { brandId: 1, styleNumber: 'GG9999', colorCode: 'RED', eyeSize: '50', gender: 'Women', frameType: 'Semi Rim', productType: 'Sun' },
  { brandId: 2, styleNumber: 'RB4165', colorCode: 'BLK', eyeSize: '55', gender: 'Unisex', frameType: 'Full Rim', productType: 'Sun' },
  { brandId: 3, styleNumber: 'TF5555', colorCode: 'CRY', eyeSize: '53', gender: 'Women', frameType: 'Full Rim', productType: 'Optical' },
  { brandId: 1, styleNumber: 'GG0001', colorCode: 'WHT', eyeSize: '56', gender: 'Men', frameType: 'Full Rim', productType: 'Optical' },
];

async function main() {
  console.log('Starting database seed...\n');

  // Seed brands
  console.log('Seeding brands...');
  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { id: brand.id },
      update: {
        brandName: brand.brandName,
        companyName: brand.companyName,
        companyId: brand.companyId,
      },
      create: {
        id: brand.id,
        brandName: brand.brandName,
        companyName: brand.companyName,
        companyId: brand.companyId,
        allocationQuantity: 100,
        discountPercentage: 10.00,
      },
    });
    console.log(`✓ Created/updated brand: ${brand.brandName}`);
  }

  // Seed products (frames) and inventory transactions
  console.log('\nSeeding products (frames)...');
  for (const frame of sampleFrames) {
    const compositeId = `${frame.brandId}-${frame.styleNumber}-${frame.colorCode}-${frame.eyeSize}`;

    // Create or update product (without invoiceDate)
    await prisma.product.upsert({
      where: { compositeId },
      update: frame,
      create: {
        compositeId,
        ...frame,
      },
    });
    console.log(`✓ Created/updated frame: ${compositeId}`);

    // Create an ORDER transaction with invoice date
    await prisma.inventoryTransaction.upsert({
      where: {
        // Find by product and transaction type
        id: await prisma.inventoryTransaction.findFirst({
          where: {
            productId: compositeId,
            transactionType: 'ORDER'
          },
          select: { id: true }
        }).then(t => t?.id || 0)
      },
      update: {
        quantity: 5,
        unitCost: 100.00,
        unitPrice: 250.00,
        invoiceDate: new Date('2024-01-15'),
        invoiceNumber: `INV-2024-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`,
      },
      create: {
        productId: compositeId,
        transactionType: 'ORDER',
        transactionDate: new Date('2024-01-15'),
        invoiceDate: new Date('2024-01-15'),
        invoiceNumber: `INV-2024-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`,
        quantity: 5,
        unitCost: 100.00,
        unitPrice: 250.00,
        status: 'completed',
        notes: 'Initial stock order',
      },
    });
  }

  console.log(`\n✅ Seed completed! ${brands.length} brands, ${sampleFrames.length} frames in database.`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
