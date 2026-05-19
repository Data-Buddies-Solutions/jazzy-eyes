import { PrismaClient } from '@prisma/client';

// Merge the duplicate Luxottica company (companyId 14000) into the canonical one (companyId 6000).
// All brands under 14000 get repointed to 6000, then the 14000 row is implicitly gone
// (companies aren't a separate table — companyId/companyName live on the Brand row).
const SOURCE_COMPANY_ID = 14000;
const TARGET_COMPANY_ID = 6000;

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');
  const mode = apply ? 'APPLY' : 'DRY RUN';

  console.log(`🔄 Merge Luxottica company ${SOURCE_COMPANY_ID} → ${TARGET_COMPANY_ID}  [${mode}]\n`);

  const [sourceBrands, targetBrands] = await Promise.all([
    prisma.brand.findMany({ where: { companyId: SOURCE_COMPANY_ID } }),
    prisma.brand.findMany({ where: { companyId: TARGET_COMPANY_ID } }),
  ]);

  if (sourceBrands.length === 0) {
    console.log(`No brands under companyId ${SOURCE_COMPANY_ID}. Nothing to merge.`);
    return;
  }
  if (targetBrands.length === 0) {
    throw new Error(`Target companyId ${TARGET_COMPANY_ID} has no brands. Aborting.`);
  }

  const targetCompanyName = targetBrands[0].companyName;
  console.log(`Target company: [${TARGET_COMPANY_ID}] ${targetCompanyName}`);
  console.log(`Currently has ${targetBrands.length} brand(s): ${targetBrands.map((b) => b.brandName).join(', ')}\n`);

  console.log(`Source company: [${SOURCE_COMPANY_ID}] ${sourceBrands[0].companyName}`);
  console.log(`Has ${sourceBrands.length} brand(s) to move:`);
  for (const b of sourceBrands) {
    console.log(`  - [${b.id}] ${b.brandName} → repoint to companyId ${TARGET_COMPANY_ID} ("${targetCompanyName}")`);
  }

  if (!apply) {
    console.log('\nDry run complete. Re-run with --apply to execute.');
    return;
  }

  await prisma.brand.updateMany({
    where: { companyId: SOURCE_COMPANY_ID },
    data: { companyId: TARGET_COMPANY_ID, companyName: targetCompanyName },
  });

  console.log(`\n✅ Merged. ${sourceBrands.length} brand(s) now under companyId ${TARGET_COMPANY_ID}.`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
