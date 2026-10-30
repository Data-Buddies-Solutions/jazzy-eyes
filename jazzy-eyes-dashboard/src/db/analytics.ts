import { db } from './pool'
import { and, expression, raw, sql, type Sql } from './sql'
import { select, selectAll } from './table'
import { brands, inventoryTransactions, products, rxSales } from './tables'

export type DateRange = { start: Date; end: Date }

// 'id' keeps rows in insertion order; 'date' sorts by the business date first.
export type RowOrder = 'id' | 'date'

// Both bounds are inclusive. The date columns compare against the Date values as
// UTC dates, as Prisma did.
function within(column: Sql, range: DateRange): Sql {
  return sql`${column} >= ${range.start} AND ${column} <= ${range.end}`
}

const brandCost = select(brands, ['brandName', 'costDiscountPercent', 'costDiscountStartDate'], {
  alias: 'b',
})

const statusName = expression<string | null>()('statusName', sql`s.name`)

// The unit cost of the product's latest ORDER or RESTOCK, or null when it has none.
// Callers fall back to this cost when a row carries none of its own.
const latestOrderCost = expression<number | null>()(
  'latestOrderCost',
  sql`SELECT o.unit_cost FROM inventory_transactions o
    WHERE o.product_id = p.composite_id AND o.transaction_type IN ('ORDER', 'RESTOCK')
    ORDER BY o.transaction_date DESC, o.id DESC
    LIMIT 1`
)

export function saleRows(range?: DateRange, order: RowOrder = 'id') {
  return db.rows(sql`
    SELECT
      ${select(inventoryTransactions, ['id', 'productId', 'transactionDate', 'quantity', 'unitCost', 'unitPrice'], { alias: 't' })},
      ${select(products, ['productType'], { alias: 'p' })},
      ${brandCost},
      ${latestOrderCost}
    FROM inventory_transactions t
    JOIN products p ON p.composite_id = t.product_id
    JOIN brands b ON b.id = p.brand_id
    WHERE ${and(sql`t.transaction_type = 'SALE'`, range && within(raw('t.transaction_date'), range))}
    ORDER BY ${order === 'date' ? raw('t.transaction_date, t.id') : raw('t.id')}`)
}

export function returnWriteOffRows(range?: DateRange) {
  return db.rows(sql`
    SELECT
      ${select(inventoryTransactions, ['id', 'transactionDate', 'quantity'], { alias: 't' })},
      ${brandCost},
      ${latestOrderCost}
    FROM inventory_transactions t
    JOIN products p ON p.composite_id = t.product_id
    JOIN brands b ON b.id = p.brand_id
    WHERE ${and(
      sql`t.transaction_type = 'WRITE_OFF'`,
      sql`t.write_off_reason = 'return'`,
      range && within(raw('t.transaction_date'), range)
    )}
    ORDER BY t.id`)
}

export function rxSaleRows(range?: DateRange, order: RowOrder = 'id') {
  return db.rows(sql`
    SELECT
      ${select(rxSales, ['id', 'saleDate', 'salePrice', 'costPrice', 'productType'], { alias: 'r' })},
      ${select(brands, ['brandName'], { alias: 'b' })}
    FROM rx_sales r
    JOIN brands b ON b.id = r.brand_id
    WHERE ${and(range && within(raw('r.sale_date'), range))}
    ORDER BY ${order === 'date' ? raw('r.sale_date, r.id') : raw('r.id')}`)
}

export function inStockProductRows() {
  return db.rows(sql`
    SELECT
      ${select(products, ['compositeId', 'currentQty'], { alias: 'p' })},
      ${statusName},
      ${brandCost},
      ${latestOrderCost}
    FROM products p
    JOIN brands b ON b.id = p.brand_id
    LEFT JOIN frame_statuses s ON s.id = p.status_id
    WHERE p.current_qty > 0
    ORDER BY p.composite_id`)
}

// Every brand by name, with all its products (each holding its transactions in the
// range) and its RX sales in the range. Transactions and RX sales come by date: the
// route sums margins in that order, and Prisma's range query returned them that way.
export async function brandsWithActivity(range: DateRange) {
  const brandList = await db.rows(sql`SELECT ${selectAll(brands)} FROM brands ORDER BY brand_name, id`)
  const productList = await db.rows(sql`
    SELECT ${select(products, ['compositeId', 'brandId'], { alias: 'p' })}, ${statusName}
    FROM products p
    LEFT JOIN frame_statuses s ON s.id = p.status_id
    ORDER BY p.composite_id`)
  const transactionList = await db.rows(sql`
    SELECT ${select(inventoryTransactions, ['id', 'productId', 'transactionType', 'transactionDate', 'unitCost', 'unitPrice'])}
    FROM inventory_transactions
    WHERE ${within(raw('transaction_date'), range)}
    ORDER BY transaction_date, id`)
  const rxList = await db.rows(sql`
    SELECT ${select(rxSales, ['id', 'brandId', 'salePrice', 'costPrice'])}
    FROM rx_sales
    WHERE ${within(raw('sale_date'), range)}
    ORDER BY sale_date, id`)

  const transactionsByProduct = groupBy(transactionList, (t) => t.productId)
  const productsByBrand = groupBy(
    productList.map((p) => ({ ...p, transactions: transactionsByProduct.get(p.compositeId) ?? [] })),
    (p) => p.brandId
  )
  const rxByBrand = groupBy(rxList, (rx) => rx.brandId)
  return brandList.map((brand) => ({
    ...brand,
    products: productsByBrand.get(brand.id) ?? [],
    rxSales: rxByBrand.get(brand.id) ?? [],
  }))
}

function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>()
  for (const item of items) {
    const group = groups.get(key(item))
    if (group) group.push(item)
    else groups.set(key(item), [item])
  }
  return groups
}
