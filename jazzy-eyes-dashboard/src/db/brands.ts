import { db } from './pool'
import { expression, sql } from './sql'
import { insert, selectAll, set } from './table'
import { brands } from './tables'
import type { Brand } from './types'

export type BrandWithProductCount = Brand & { productCount: number }

const productCount = expression<number>()(
  'productCount',
  sql`SELECT count(*)::int FROM products WHERE products.brand_id = brands.id`
)

export function listBrandsWithProductCounts(): Promise<BrandWithProductCount[]> {
  return db.rows(
    sql`SELECT ${selectAll(brands)}, ${productCount} FROM brands ORDER BY brands.company_id, brands.id`
  )
}

export function findBrandWithProductCount(id: number): Promise<BrandWithProductCount | null> {
  return db.one(sql`SELECT ${selectAll(brands)}, ${productCount} FROM brands WHERE brands.id = ${id}`)
}

export async function brandExists(id: number): Promise<boolean> {
  return (await db.one(sql`SELECT 1 AS "found" FROM brands WHERE id = ${id}`)) !== null
}

export async function highestCompanyId(): Promise<number | null> {
  const companyId = expression<number>()('companyId', sql`company_id`)
  const row = await db.one(sql`SELECT ${companyId} FROM brands ORDER BY company_id DESC LIMIT 1`)
  return row?.companyId ?? null
}

export type NewBrand = Pick<
  Brand,
  'id' | 'companyId' | 'companyName' | 'brandName' | 'allocationQuantity'
>

export async function createBrand(values: NewBrand): Promise<Brand> {
  const created = await db.one(sql`${insert(brands, values)} RETURNING ${selectAll(brands)}`)
  if (!created) throw new Error(`brand ${values.id} was not created`)
  return created
}

export type BrandPatch = Partial<Pick<Brand, 'brandName' | 'allocationQuantity'>>

export async function updateBrand(id: number, patch: BrandPatch): Promise<Brand> {
  const updated = await db.one(
    sql`UPDATE brands SET ${set(brands, patch)} WHERE id = ${id} RETURNING ${selectAll(brands)}`
  )
  if (!updated) throw new Error(`brand ${id} does not exist`)
  return updated
}

export async function deleteBrand(id: number): Promise<void> {
  const deleted = await db.affected(sql`DELETE FROM brands WHERE id = ${id}`)
  if (deleted === 0) throw new Error(`brand ${id} does not exist`)
}

export async function companyExists(companyId: number): Promise<boolean> {
  return (await db.one(sql`SELECT 1 AS "found" FROM brands WHERE company_id = ${companyId} LIMIT 1`)) !== null
}

export function renameCompany(companyId: number, companyName: string): Promise<number> {
  return db.affected(
    sql`UPDATE brands SET ${set(brands, { companyName })} WHERE company_id = ${companyId}`
  )
}
