import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Brand name to ID mapping
const brandMap: Record<string, number> = {
  'Tom Ford': 3001,
  'Chloe': 1003,
  'Fred': 4002,
  'Chopard': 9000,
  'Gucci': 1001,
  'Oakley': 6002,
  'Rayban': 6001,
  'Morel': 5001,
  'Salt': 7000,
  'LA Eyeworks': 13001,
  'CLD': 10003,
  'NRG': 10002,
  'Café': 10001,
  'Etnia': 2002,
  'Lool': 2001,
  'Silhouette': 8000,
  'Maui Jim': 1004,
  'Fendi': 4001,
  'YSL': 1002,
  'Vera Bradley': 11001,
  'Pepe Jeans': 10004,
  'Chroma': 2003,
  'Pellicer': 2004,
  'Konishi': 12001,
};

// Parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Map gender from CSV to DB format
function mapGender(gender: string): string {
  const g = gender.trim().toLowerCase();
  if (g === 'men') return 'Men';
  if (g === 'women') return 'Women';
  if (g === 'uni') return 'Unisex';
  return 'Unisex';
}

// Map product type from CSV to DB format
function mapProductType(type: string): string {
  const t = type.trim().toLowerCase();
  if (t === 'sun') return 'Sun';
  if (t === 'opth') return 'Optical';
  return 'Optical';
}

// Map frame type - normalize casing
function mapFrameType(type: string): string {
  const t = type.trim().toLowerCase();
  if (t === 'zyl') return 'Zyl';
  if (t === 'metal') return 'Metal';
  if (t === 'rimless') return 'Rimless';
  if (t === 'semi-rimless') return 'Semi-Rimless';
  return type.trim();
}

// Parse price, return null if invalid
function parsePrice(price: string): number | null {
  if (!price || price === 'N/A' || price === '#VALUE!' || price.trim() === '') {
    return null;
  }
  const parsed = parseFloat(price.replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? null : parsed;
}

async function importInventory(csvPath: string, dryRun: boolean = true) {
  console.log(`\n📦 Importing inventory from: ${csvPath}`);
  console.log(`🔧 Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE IMPORT'}\n`);

  // Read CSV file
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Skip header
  const dataLines = lines.slice(1);

  // Get Active status for new products
  const activeStatus = await prisma.frameStatus.findUnique({ where: { name: 'Active' } });
  if (!activeStatus) {
    console.error('❌ Active status not found in database. Run seed first.');
    return;
  }

  let imported = 0;
  let skipped = 0;
  let errors: string[] = [];
  let duplicates = 0;

  for (const line of dataLines) {
    const fields = parseCSVLine(line);

    // CSV columns: Brand, ID#, Style #, Color #, Eye size, Men/Women/Uni, Frame Type, Sun/Opth, NOTES, Order/InvDate, Wholesale Price, Retail Price, Qty
    const [brand, , styleNumber, colorCode, eyeSize, gender, frameType, productType, notes, , wholesalePrice, retailPrice, qty] = fields;

    // Skip if DISCO (discontinued - user said to delete these)
    if (notes && notes.includes('DISCO')) {
      skipped++;
      continue;
    }

    // Skip if no valid prices
    const wholesale = parsePrice(wholesalePrice);
    const retail = parsePrice(retailPrice);
    if (wholesale === null && retail === null) {
      skipped++;
      continue;
    }

    // Get brand ID
    const brandId = brandMap[brand];
    if (!brandId) {
      errors.push(`Unknown brand: ${brand}`);
      continue;
    }

    // Parse quantity (default to 1 if empty)
    const quantity = parseInt(qty) || 1;

    // Create composite ID: brandId-styleNumber-colorCode-eyeSize
    const eyeSizeShort = eyeSize.split('-')[0] || eyeSize; // Just the first number
    const compositeId = `${brandId}-${styleNumber}-${colorCode}-${eyeSizeShort}`;

    if (dryRun) {
      console.log(`Would import: ${compositeId} | ${brand} ${styleNumber} ${colorCode} | Qty: ${quantity} | $${wholesale || 0} / $${retail || 0}`);
      imported++;
    } else {
      try {
        // Check if product already exists
        const existing = await prisma.product.findUnique({
          where: { compositeId }
        });

        if (existing) {
          duplicates++;
          console.log(`  ⚠️  Skipping duplicate: ${compositeId}`);
          continue;
        }

        // Create product
        await prisma.product.create({
          data: {
            compositeId,
            brandId,
            statusId: activeStatus.id,
            styleNumber,
            colorCode,
            eyeSize,
            gender: mapGender(gender),
            frameType: mapFrameType(frameType),
            productType: mapProductType(productType),
            currentQty: quantity,
          }
        });

        // Create ORDER transaction with pricing
        await prisma.inventoryTransaction.create({
          data: {
            productId: compositeId,
            transactionType: 'ORDER',
            transactionDate: new Date(),
            invoiceDate: new Date(),
            quantity,
            unitCost: wholesale || 0,
            unitPrice: retail || 0,
            status: 'completed',
            notes: notes || undefined,
          }
        });

        console.log(`  ✓ Imported: ${compositeId}`);
        imported++;
      } catch (error) {
        errors.push(`Error importing ${compositeId}: ${error}`);
      }
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  ✓ Imported: ${imported}`);
  console.log(`  ⏭️  Skipped (DISCO/no price): ${skipped}`);
  console.log(`  ⚠️  Duplicates: ${duplicates}`);
  console.log(`  ❌ Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - ${e}`));
  }

  if (dryRun) {
    console.log('\n💡 To run the actual import, use: DRY_RUN=false npx ts-node prisma/import-inventory.ts');
  }
}

// Main
const csvPath = process.argv[2] || '/Users/kyleshechtman/Desktop/(EDIT) Jazzy Eyes - Inventory - Sheet1.csv';
const dryRun = process.env.DRY_RUN !== 'false';

importInventory(csvPath, dryRun)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
