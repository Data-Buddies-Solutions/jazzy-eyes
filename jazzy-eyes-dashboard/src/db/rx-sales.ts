import { integer } from './frames'
import { db } from './pool'
import { count, sql } from './sql'
import { insert, select, selectAll } from './table'
import { brands, rxSales } from './tables'
import type { RxSale } from './types'

export async function findBrandName(brandId: number): Promise<string | null> {
  const brand = await db.one(
    sql`SELECT ${select(brands, ['brandName'])} FROM brands WHERE id = ${integer(brandId, 'brandId')}`
  )
  return brand?.brandName ?? null
}

export type NewRxSale = Pick<
  RxSale,
  | 'brandId'
  | 'styleNumber'
  | 'colorCode'
  | 'eyeSize'
  | 'gender'
  | 'frameType'
  | 'productType'
  | 'saleDate'
  | 'salePrice'
  | 'costPrice'
  | 'notes'
>

export async function createRxSale(values: NewRxSale): Promise<RxSale> {
  const created = await db.one(sql`${insert(rxSales, values)} RETURNING ${selectAll(rxSales)}`)
  if (!created) throw new Error('rx sale was not created')
  return created
}

export async function countRxSales(): Promise<number> {
  const row = await db.one(sql`SELECT ${count('n')} FROM rx_sales`)
  return row?.n ?? 0
}

export type RxSaleWithBrand = RxSale & { brandName: string }

export function listRxSales({ skip, limit }: { skip: number; limit: number }): Promise<RxSaleWithBrand[]> {
  return db.rows(
    sql`SELECT ${selectAll(rxSales, { alias: 'r' })}, ${select(brands, ['brandName'], { alias: 'b' })}
        FROM rx_sales r JOIN brands b ON b.id = r.brand_id
        ORDER BY r.sale_date DESC, r.id DESC
        OFFSET ${skip} LIMIT ${limit}`
  )
}
