import { db } from './pool'
import { and, array, expression, or, raw, sql, type Sql } from './sql'
import { insert, select, selectAll, set } from './table'
import { brands, frameStatuses, inventoryTransactions, products } from './tables'
import type { FrameStatus, InventoryTransaction, Product, TransactionType } from './types'

// Integer columns written from request input. Prisma rejected anything else before querying;
// pg would coerce a numeric string, so the check keeps those requests failing.
export function integer(value: number, name: string): number {
  if (!Number.isInteger(value)) throw new Error(`${name} must be an integer, got ${JSON.stringify(value)}`)
  return value
}

export type BrandSummary = { brandName: string; companyName: string }
export type StatusSummary = { id: number; name: string; colorScheme: string }
type WithTransactions<P> = P & { transactions: InventoryTransaction[] }

const brandSummary = expression<BrandSummary>()(
  'brand',
  sql`json_build_object('brandName', b.brand_name, 'companyName', b.company_name)`
)

const statusSummary = expression<StatusSummary | null>()(
  'status',
  sql`CASE WHEN s.id IS NULL THEN NULL ELSE json_build_object('id', s.id, 'name', s.name, 'colorScheme', s."colorScheme") END`
)

const product = selectAll(products, { alias: 'p' })
const transaction = selectAll(inventoryTransactions)
const newestFirst = raw('transaction_date DESC, id DESC')
const oldestFirst = raw('transaction_date ASC, id ASC')

async function withTransactions<P extends Product>(
  rows: P[],
  order: Sql = newestFirst
): Promise<WithTransactions<P>[]> {
  if (rows.length === 0) return []
  const ids = rows.map((row) => row.compositeId)
  const transactions = await db.rows(
    sql`SELECT ${transaction} FROM inventory_transactions WHERE product_id = ANY(${array(ids)}) ORDER BY ${order}`
  )
  const byProduct = new Map<string, InventoryTransaction[]>()
  for (const t of transactions) byProduct.set(t.productId, [...(byProduct.get(t.productId) ?? []), t])
  return rows.map((row) => ({ ...row, transactions: byProduct.get(row.compositeId) ?? [] }))
}

// Prisma serialized Decimal columns as strings; the API responses keep that shape.
export function transactionJson(t: InventoryTransaction) {
  return { ...t, unitCost: String(t.unitCost), unitPrice: String(t.unitPrice) }
}

export async function listFrames() {
  const rows = await db.rows(
    sql`SELECT ${product}, ${brandSummary} FROM products p JOIN brands b ON b.id = p.brand_id
        ORDER BY p.created_at DESC, p.composite_id`
  )
  return withTransactions(rows)
}

export async function findFrame(compositeId: string) {
  const rows = await db.rows(
    sql`SELECT ${product}, ${brandSummary} FROM products p JOIN brands b ON b.id = p.brand_id
        WHERE p.composite_id = ${compositeId}`
  )
  return (await withTransactions(rows))[0] ?? null
}

export type FrameSearch = { query: string; searchMode: string }

export async function searchFrames({ query, searchMode }: FrameSearch) {
  const matches = !query
    ? null
    : searchMode === 'color'
      ? sql`p.color_code ILIKE ${`%${query}%`}`
      : or(
          sql`p.composite_id ILIKE ${`${query}%`}`,
          sql`b.brand_name ILIKE ${`%${query}%`}`,
          sql`p.style_number ILIKE ${`%${query}%`}`
        )
  const rows = await db.rows(
    sql`SELECT ${product}, ${brandSummary}, ${statusSummary}
        FROM products p JOIN brands b ON b.id = p.brand_id LEFT JOIN frame_statuses s ON s.id = p.status_id
        WHERE ${and(matches)} ORDER BY p.composite_id`
  )
  return withTransactions(rows)
}

export async function findProduct(compositeId: string): Promise<Product | null> {
  return db.one(sql`SELECT ${product} FROM products p WHERE p.composite_id = ${compositeId}`)
}

export async function findProductWithTransactions(compositeId: string) {
  const rows = await db.rows(sql`SELECT ${product} FROM products p WHERE p.composite_id = ${compositeId}`)
  return (await withTransactions(rows, raw('id')))[0] ?? null
}

export async function findProductWithStatus(compositeId: string) {
  const rows = await db.rows(
    sql`SELECT ${product}, ${statusSummary} FROM products p LEFT JOIN frame_statuses s ON s.id = p.status_id
        WHERE p.composite_id = ${compositeId}`
  )
  return (await withTransactions(rows))[0] ?? null
}

export type ProductFields = Pick<
  Product,
  'brandId' | 'styleNumber' | 'colorCode' | 'eyeSize' | 'gender' | 'frameType' | 'productType'
>

export type NewTransaction = Pick<
  InventoryTransaction,
  'productId' | 'transactionType' | 'transactionDate' | 'quantity' | 'unitCost' | 'unitPrice'
> &
  Partial<
    Pick<
      InventoryTransaction,
      'invoiceDate' | 'status' | 'notes' | 'isSpecialOrder' | 'writeOffReason' | 'remainingQty' | 'revertedFromId'
    >
  >

function insertTransaction(values: NewTransaction): Sql {
  return insert(inventoryTransactions, { ...values, quantity: integer(values.quantity, 'quantity') })
}

export async function createFrame(
  fields: ProductFields & Pick<Product, 'compositeId'> & { statusId: number | undefined },
  order: Omit<NewTransaction, 'productId'>
): Promise<string> {
  integer(fields.brandId, 'brandId')
  await db.transaction(async (tx) => {
    await tx.affected(insert(products, fields))
    await tx.affected(insertTransaction({ ...order, productId: fields.compositeId }))
  })
  return fields.compositeId
}

export async function updateProduct(compositeId: string, fields: ProductFields): Promise<Product> {
  integer(fields.brandId, 'brandId')
  const updated = await db.one(
    sql`UPDATE products SET ${set(products, fields)} WHERE composite_id = ${compositeId} RETURNING ${selectAll(products)}`
  )
  if (!updated) throw new Error(`product ${compositeId} does not exist`)
  return updated
}

// Moves a product to a new composite id: the new row takes over its transactions and the old row is deleted.
export async function renameProduct(
  from: Product,
  to: ProductFields & Pick<Product, 'compositeId'>
): Promise<void> {
  integer(to.brandId, 'brandId')
  await db.transaction(async (tx) => {
    await tx.affected(
      insert(products, { ...to, statusId: from.statusId, currentQty: from.currentQty, createdAt: from.createdAt })
    )
    await tx.affected(
      sql`UPDATE inventory_transactions SET ${set(inventoryTransactions, { productId: to.compositeId })}
          WHERE product_id = ${from.compositeId}`
    )
    await tx.affected(sql`DELETE FROM products WHERE composite_id = ${from.compositeId}`)
  })
}

export async function setProductStatus(compositeId: string, statusId: number): Promise<void> {
  const updated = await db.affected(
    sql`UPDATE products SET ${set(products, { statusId: integer(statusId, 'statusId') })} WHERE composite_id = ${compositeId}`
  )
  if (updated === 0) throw new Error(`product ${compositeId} does not exist`)
}

export async function findStatus(id: number): Promise<FrameStatus | null> {
  return db.one(sql`SELECT ${selectAll(frameStatuses)} FROM frame_statuses WHERE id = ${integer(id, 'status id')}`)
}

export function findStatusByName(name: string): Promise<FrameStatus | null> {
  return db.one(sql`SELECT ${selectAll(frameStatuses)} FROM frame_statuses WHERE name = ${name}`)
}

// Applies the brand's cost discount when the sale falls on or after the discount's start date.
export async function discountedCost(brandId: number, cost: number, saleDate: Date): Promise<number> {
  const brand = await db.one(
    sql`SELECT ${select(brands, ['costDiscountPercent', 'costDiscountStartDate'])} FROM brands WHERE id = ${brandId}`
  )
  const percent = brand?.costDiscountPercent ?? 0
  if (percent > 0 && brand?.costDiscountStartDate && saleDate >= brand.costDiscountStartDate) {
    return cost * (1 - percent / 100)
  }
  return cost
}

export async function findTransaction(id: number): Promise<InventoryTransaction | null> {
  return db.one(sql`SELECT ${transaction} FROM inventory_transactions WHERE id = ${integer(id, 'transaction id')}`)
}

export function latestTransaction(
  productId: string,
  types: readonly TransactionType[]
): Promise<InventoryTransaction | null> {
  return db.one(
    sql`SELECT ${transaction} FROM inventory_transactions
        WHERE product_id = ${productId} AND transaction_type = ANY(${array(types, '"TransactionType"')})
        ORDER BY ${newestFirst} LIMIT 1`
  )
}

export async function latestBatchCost(productId: string): Promise<number> {
  return (await latestTransaction(productId, ['ORDER', 'RESTOCK']))?.unitCost ?? 0
}

export async function latestRetailPrice(productId: string): Promise<number> {
  return (await latestTransaction(productId, ['ORDER']))?.unitPrice ?? 0
}

export type TransactionPatch = Partial<
  Pick<InventoryTransaction, 'unitCost' | 'unitPrice' | 'invoiceDate' | 'notes' | 'isSpecialOrder' | 'status'>
>

export async function updateTransaction(id: number, patch: TransactionPatch): Promise<void> {
  const updated = await db.affected(
    sql`UPDATE inventory_transactions SET ${set(inventoryTransactions, patch)} WHERE id = ${id}`
  )
  if (updated === 0) throw new Error(`transaction ${id} does not exist`)
}

export function findRevert(productId: string, writeOffId: number): Promise<InventoryTransaction | null> {
  return db.one(
    sql`SELECT ${transaction} FROM inventory_transactions
        WHERE product_id = ${productId} AND transaction_type = 'REVERT_WRITE_OFF' AND reverted_from_id = ${writeOffId}
        ORDER BY id LIMIT 1`
  )
}

export async function revertedWriteOffIds(productId: string | null = null): Promise<Map<number, number>> {
  const rows = await db.rows(
    sql`SELECT ${select(inventoryTransactions, ['id', 'revertedFromId'])} FROM inventory_transactions
        WHERE ${and(sql`transaction_type = 'REVERT_WRITE_OFF'`, sql`reverted_from_id IS NOT NULL`, productId !== null && sql`product_id = ${productId}`)}
        ORDER BY id`
  )
  return new Map(rows.map((row) => [row.revertedFromId as number, row.id]))
}

export function listWriteOffs() {
  return db.rows(
    sql`SELECT ${select(inventoryTransactions, ['id', 'productId', 'transactionDate', 'quantity', 'writeOffReason', 'notes'], { alias: 't' })},
               ${select(products, ['styleNumber', 'colorCode'], { alias: 'p' })},
               ${select(brands, ['brandName'], { alias: 'b' })}
        FROM inventory_transactions t
        JOIN products p ON p.composite_id = t.product_id
        JOIN brands b ON b.id = p.brand_id
        WHERE t.transaction_type = 'WRITE_OFF'
        ORDER BY t.transaction_date DESC, t.id DESC`
  )
}

// Records a stock movement and the product's new quantity (and status) atomically.
export async function recordMovement(
  movement: NewTransaction,
  update: { currentQty: number; statusId?: number }
): Promise<void> {
  const productPatch = { ...update, currentQty: integer(update.currentQty, 'currentQty') }
  const row = insertTransaction(movement)
  await db.transaction(async (tx) => {
    await tx.affected(row)
    await tx.affected(
      sql`UPDATE products SET ${set(products, productPatch)} WHERE composite_id = ${movement.productId}`
    )
  })
}

function fifoBatches(productId: string): Promise<InventoryTransaction[]> {
  return db.rows(
    sql`SELECT ${transaction} FROM inventory_transactions
        WHERE product_id = ${productId} AND transaction_type IN ('ORDER', 'RESTOCK') AND remaining_qty > 0
        ORDER BY ${oldestFirst}`
  )
}

// Average unit cost of the oldest batches that would cover the quantity, without consuming them.
export async function previewFifoCost(productId: string, quantity: number): Promise<number> {
  let remaining = quantity
  let totalCost = 0
  for (const batch of await fifoBatches(productId)) {
    if (remaining <= 0) break
    const taken = Math.min(batch.remainingQty || 0, remaining)
    totalCost += taken * batch.unitCost
    remaining -= taken
  }
  return quantity > 0 ? totalCost / quantity : 0
}

// Consumes the oldest batches one update at a time, outside any transaction, and returns the average unit cost.
export async function consumeFifo(productId: string, quantity: number): Promise<number> {
  let remaining = quantity
  let totalCost = 0
  for (const batch of await fifoBatches(productId)) {
    if (remaining <= 0) break
    const available = batch.remainingQty || 0
    const taken = Math.min(available, remaining)
    await db.affected(
      sql`UPDATE inventory_transactions SET ${set(inventoryTransactions, { remainingQty: available - taken })}
          WHERE id = ${batch.id}`
    )
    totalCost += taken * batch.unitCost
    remaining -= taken
  }
  return quantity > 0 ? totalCost / quantity : 0
}
