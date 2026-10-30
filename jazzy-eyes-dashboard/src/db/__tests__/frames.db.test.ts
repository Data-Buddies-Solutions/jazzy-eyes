import { beforeEach, describe, expect, it } from 'vitest'
import {
  consumeFifo,
  createFrame,
  discountedCost,
  findFrame,
  findProduct,
  findProductWithStatus,
  findProductWithTransactions,
  findStatus,
  integer,
  latestBatchCost,
  latestRetailPrice,
  latestTransaction,
  listFrames,
  listWriteOffs,
  previewFifoCost,
  recordMovement,
  renameProduct,
  revertedWriteOffIds,
  searchFrames,
  transactionJson,
  setProductStatus,
  updateTransaction,
} from '../frames'
import { db } from '../pool'
import { sql } from '../sql'
import { insert } from '../table'
import { brands, frameStatuses, inventoryTransactions, products } from '../tables'
import type { InventoryTransaction } from '../types'

const day = (date: string) => new Date(`${date}T00:00:00.000Z`)

const fields = {
  brandId: 1,
  styleNumber: 'AB1',
  colorCode: 'BLK',
  eyeSize: '50',
  gender: 'Men',
  frameType: 'Zyl',
  productType: 'Optical',
}

async function addProduct(compositeId: string, overrides: Partial<typeof fields> & { currentQty?: number; statusId?: number } = {}) {
  await db.affected(insert(products, { ...fields, compositeId, currentQty: 1, ...overrides }))
}

async function addTransaction(
  productId: string,
  transactionType: InventoryTransaction['transactionType'],
  date: string,
  extra: Partial<InventoryTransaction> = {}
): Promise<number> {
  const row = await db.one(
    sql`${insert(inventoryTransactions, {
      productId,
      transactionType,
      transactionDate: day(date),
      quantity: 1,
      unitCost: 10,
      unitPrice: 20,
      ...extra,
    })} RETURNING id`
  )
  return (row as { id: number }).id
}

const remaining = async () =>
  db.rows(sql`SELECT id, remaining_qty AS "remainingQty" FROM inventory_transactions ORDER BY id`)

beforeEach(async () => {
  await db.affected(insert(brands, { id: 1, companyName: 'Acme', companyId: 1, brandName: 'Acme Optics', allocationQuantity: 5, costDiscountPercent: 10, costDiscountStartDate: day('2026-09-01') }))
  await db.affected(insert(brands, { id: 2, companyName: 'Other', companyId: 2, brandName: 'Zeta', allocationQuantity: 5 }))
  await db.affected(insert(frameStatuses, { name: 'Active', colorScheme: 'green', isProtected: false, displayOrder: 1 }))
})

describe('integer', () => {
  it('passes integers through and rejects numeric strings and fractions', () => {
    expect(integer(3, 'n')).toBe(3)
    expect(() => integer('3' as unknown as number, 'quantity')).toThrow('quantity must be an integer, got "3"')
    expect(() => integer(1.5, 'n')).toThrow('n must be an integer, got 1.5')
  })
})

describe('reading products', () => {
  it('lists products newest first with the brand and transactions newest first, ties by id', async () => {
    await addProduct('1-AB1-BLK-50')
    await db.affected(insert(products, { ...fields, compositeId: '2-OLD-RED-48', brandId: 2, createdAt: day('2020-01-01') }))
    const first = await addTransaction('1-AB1-BLK-50', 'ORDER', '2026-10-01')
    const second = await addTransaction('1-AB1-BLK-50', 'SALE', '2026-10-01')
    const older = await addTransaction('1-AB1-BLK-50', 'RESTOCK', '2026-09-01')

    const frames = await listFrames()

    expect(frames.map((frame) => frame.compositeId)).toEqual(['1-AB1-BLK-50', '2-OLD-RED-48'])
    expect(frames[0].brand).toEqual({ brandName: 'Acme Optics', companyName: 'Acme' })
    expect(frames[0].transactions.map((t) => t.id)).toEqual([second, first, older])
    expect(frames[1].transactions).toEqual([])
  })

  it('finds one frame or null', async () => {
    await addProduct('1-AB1-BLK-50')
    expect((await findFrame('1-AB1-BLK-50'))?.brand.brandName).toBe('Acme Optics')
    expect(await findFrame('missing')).toBeNull()
    expect(await findProduct('missing')).toBeNull()
  })

  it('returns the status summary, or null when the product has none', async () => {
    await addProduct('1-AB1-BLK-50', { statusId: 1 })
    await addProduct('1-AB2-BLK-50', { styleNumber: 'AB2' })
    expect((await findProductWithStatus('1-AB1-BLK-50'))?.status).toEqual({ id: 1, name: 'Active', colorScheme: 'green' })
    expect((await findProductWithStatus('1-AB2-BLK-50'))?.status).toBeNull()
  })

  it('orders transactions by id for the product-with-transactions lookup', async () => {
    await addProduct('1-AB1-BLK-50')
    const newer = await addTransaction('1-AB1-BLK-50', 'ORDER', '2026-10-01')
    const older = await addTransaction('1-AB1-BLK-50', 'RESTOCK', '2026-01-01')
    const found = await findProductWithTransactions('1-AB1-BLK-50')
    expect(found?.transactions.map((t) => t.id)).toEqual([newer, older])
  })

  it('serializes decimal columns as strings', async () => {
    await addProduct('1-AB1-BLK-50')
    await addTransaction('1-AB1-BLK-50', 'ORDER', '2026-10-01', { unitCost: 120.5, unitPrice: 300 })
    const [t] = (await findFrame('1-AB1-BLK-50'))!.transactions
    expect(transactionJson(t)).toMatchObject({ unitCost: '120.5', unitPrice: '300' })
  })
})

describe('searchFrames', () => {
  beforeEach(async () => {
    await addProduct('1-AB1-BLK-50')
    await addProduct('2-ZZ9-GRN-52', { brandId: 2, styleNumber: 'ZZ9', colorCode: 'GRN' })
    await addProduct('2-A%B-BLU-53', { brandId: 2, styleNumber: 'A%B', colorCode: 'BLU' })
  })

  const ids = async (query: string, searchMode = 'brand') =>
    (await searchFrames({ query, searchMode })).map((frame) => frame.compositeId)

  it('returns everything by composite id when the query is empty', async () => {
    expect(await ids('')).toEqual(['1-AB1-BLK-50', '2-A%B-BLU-53', '2-ZZ9-GRN-52'])
  })

  it('matches brand names, composite id prefixes and style numbers case-insensitively', async () => {
    expect(await ids('acme')).toEqual(['1-AB1-BLK-50'])
    expect(await ids('2-z')).toEqual(['2-ZZ9-GRN-52'])
    expect(await ids('zz')).toEqual(['2-ZZ9-GRN-52'])
  })

  it('matches only color codes in color mode', async () => {
    expect(await ids('grn', 'color')).toEqual(['2-ZZ9-GRN-52'])
    expect(await ids('acme', 'color')).toEqual([])
  })

  it('passes LIKE wildcards in the query through, as Prisma did', async () => {
    expect((await ids('%')).length).toBeGreaterThan(1)
  })
})

describe('writing products', () => {
  it('creates a product and its ORDER together', async () => {
    await createFrame(
      { ...fields, compositeId: '1-AB1-BLK-50', statusId: 1 },
      { transactionType: 'ORDER', transactionDate: day('2026-10-01'), quantity: 1, unitCost: 10, unitPrice: 20 }
    )
    const created = await findProductWithTransactions('1-AB1-BLK-50')
    expect(created).toMatchObject({ statusId: 1, currentQty: 1 })
    expect(created?.transactions).toHaveLength(1)
  })

  it('rolls the product back when the ORDER fails', async () => {
    await expect(
      createFrame(
        { ...fields, compositeId: '1-AB1-BLK-50', statusId: undefined },
        { transactionType: 'ORDER', transactionDate: new Date('not-a-date'), quantity: 1, unitCost: 10, unitPrice: 20 }
      )
    ).rejects.toThrow()
    expect(await findProduct('1-AB1-BLK-50')).toBeNull()
  })

  it('renames a product, moving its transactions and keeping status, quantity and creation time', async () => {
    await db.affected(insert(products, { ...fields, compositeId: '1-AB1-BLK-50', statusId: 1, currentQty: 4, createdAt: day('2025-01-01') }))
    const order = await addTransaction('1-AB1-BLK-50', 'ORDER', '2026-10-01')
    const from = (await findProduct('1-AB1-BLK-50'))!

    await renameProduct(from, { ...fields, styleNumber: 'AB9', compositeId: '1-AB9-BLK-50' })

    expect(await findProduct('1-AB1-BLK-50')).toBeNull()
    const renamed = await findProductWithTransactions('1-AB9-BLK-50')
    expect(renamed).toMatchObject({ statusId: 1, currentQty: 4, createdAt: day('2025-01-01'), styleNumber: 'AB9' })
    expect(renamed?.transactions.map((t) => t.id)).toEqual([order])
  })

  it('leaves the product untouched when a rename fails', async () => {
    await addProduct('1-AB1-BLK-50')
    const from = (await findProduct('1-AB1-BLK-50'))!
    await expect(renameProduct(from, { ...fields, brandId: 999, compositeId: '999-AB1-BLK-50' })).rejects.toThrow()
    expect(await findProduct('1-AB1-BLK-50')).not.toBeNull()
    expect(await findProduct('999-AB1-BLK-50')).toBeNull()
  })

  it('rejects a non-integer status id before querying', async () => {
    await expect(findStatus('1' as unknown as number)).rejects.toThrow('status id must be an integer')
  })
})

describe('stock movements', () => {
  beforeEach(async () => {
    await addProduct('1-AB1-BLK-50', { currentQty: 3 })
  })

  it('records the transaction and the new quantity together', async () => {
    await recordMovement(
      { productId: '1-AB1-BLK-50', transactionType: 'SALE', transactionDate: day('2026-10-01'), quantity: 1, unitCost: 10, unitPrice: 20 },
      { currentQty: 2, statusId: 1 }
    )
    expect(await findProduct('1-AB1-BLK-50')).toMatchObject({ currentQty: 2, statusId: 1 })
    expect((await findProductWithTransactions('1-AB1-BLK-50'))?.transactions).toHaveLength(1)
  })

  it('writes nothing for a non-integer quantity', async () => {
    await expect(
      recordMovement(
        { productId: '1-AB1-BLK-50', transactionType: 'SALE', transactionDate: day('2026-10-01'), quantity: '1' as unknown as number, unitCost: 10, unitPrice: 20 },
        { currentQty: 2 }
      )
    ).rejects.toThrow('quantity must be an integer')
    expect(await findProduct('1-AB1-BLK-50')).toMatchObject({ currentQty: 3 })
    expect((await findProductWithTransactions('1-AB1-BLK-50'))?.transactions).toEqual([])
  })

  it('previews and consumes the oldest ORDER and RESTOCK batches first', async () => {
    const newer = await addTransaction('1-AB1-BLK-50', 'RESTOCK', '2026-10-01', { unitCost: 130, remainingQty: 2 })
    const older = await addTransaction('1-AB1-BLK-50', 'ORDER', '2026-01-01', { unitCost: 100, remainingQty: 1 })
    await addTransaction('1-AB1-BLK-50', 'REVERT_WRITE_OFF', '2025-01-01', { unitCost: 1, remainingQty: 5 })

    expect(await previewFifoCost('1-AB1-BLK-50', 2)).toBe(115)
    expect(await remaining()).toEqual([
      { id: newer, remainingQty: 2 },
      { id: older, remainingQty: 1 },
      { id: older + 1, remainingQty: 5 },
    ])

    expect(await consumeFifo('1-AB1-BLK-50', 2)).toBe(115)
    expect(await remaining()).toEqual([
      { id: newer, remainingQty: 1 },
      { id: older, remainingQty: 0 },
      { id: older + 1, remainingQty: 5 },
    ])
  })

  it('averages over the whole quantity even when batches run short', async () => {
    await addTransaction('1-AB1-BLK-50', 'ORDER', '2026-01-01', { unitCost: 100, remainingQty: 1 })
    expect(await previewFifoCost('1-AB1-BLK-50', 2)).toBe(50)
    expect(await previewFifoCost('1-AB1-BLK-50', 0)).toBe(0)
  })

  it('finds the latest batch cost and ORDER retail price, defaulting to 0', async () => {
    expect(await latestBatchCost('1-AB1-BLK-50')).toBe(0)
    expect(await latestRetailPrice('1-AB1-BLK-50')).toBe(0)
    await addTransaction('1-AB1-BLK-50', 'ORDER', '2026-01-01', { unitCost: 100, unitPrice: 250 })
    const restock = await addTransaction('1-AB1-BLK-50', 'RESTOCK', '2026-10-01', { unitCost: 130, unitPrice: 999 })
    expect(await latestBatchCost('1-AB1-BLK-50')).toBe(130)
    expect(await latestRetailPrice('1-AB1-BLK-50')).toBe(250)
    expect((await latestTransaction('1-AB1-BLK-50', ['ORDER', 'RESTOCK']))?.id).toBe(restock)
  })
})

describe('discountedCost', () => {
  it('discounts on and after the start date only', async () => {
    expect(await discountedCost(1, 100, day('2026-09-01'))).toBe(90)
    expect(await discountedCost(1, 100, day('2026-08-31'))).toBe(100)
  })

  it('leaves the cost alone for a brand without a discount', async () => {
    expect(await discountedCost(2, 100, day('2026-10-01'))).toBe(100)
  })
})

describe('write-offs', () => {
  it('lists write-offs newest first with product and brand, and maps reverts per product', async () => {
    await addProduct('1-AB1-BLK-50')
    await addProduct('2-ZZ9-GRN-52', { brandId: 2, styleNumber: 'ZZ9', colorCode: 'GRN' })
    const old = await addTransaction('1-AB1-BLK-50', 'WRITE_OFF', '2026-01-01', { writeOffReason: 'lost' })
    const recent = await addTransaction('2-ZZ9-GRN-52', 'WRITE_OFF', '2026-10-01', { writeOffReason: 'damaged', notes: 'cracked' })
    const revert = await addTransaction('1-AB1-BLK-50', 'REVERT_WRITE_OFF', '2026-10-02', { revertedFromId: old })
    await addTransaction('1-AB1-BLK-50', 'SALE', '2026-10-03')

    expect(await listWriteOffs()).toEqual([
      { id: recent, productId: '2-ZZ9-GRN-52', transactionDate: day('2026-10-01'), quantity: 1, writeOffReason: 'damaged', notes: 'cracked', styleNumber: 'ZZ9', colorCode: 'GRN', brandName: 'Zeta' },
      { id: old, productId: '1-AB1-BLK-50', transactionDate: day('2026-01-01'), quantity: 1, writeOffReason: 'lost', notes: null, styleNumber: 'AB1', colorCode: 'BLK', brandName: 'Acme Optics' },
    ])
    expect(await revertedWriteOffIds()).toEqual(new Map([[old, revert]]))
    expect(await revertedWriteOffIds('1-AB1-BLK-50')).toEqual(new Map([[old, revert]]))
    expect(await revertedWriteOffIds('2-ZZ9-GRN-52')).toEqual(new Map())
  })
})

describe('updates that match no row', () => {
  it('throw instead of reporting success', async () => {
    await expect(setProductStatus('missing', 1)).rejects.toThrow('product missing does not exist')
    await expect(updateTransaction(999_999, { notes: 'x' })).rejects.toThrow(
      'transaction 999999 does not exist'
    )
  })
})
