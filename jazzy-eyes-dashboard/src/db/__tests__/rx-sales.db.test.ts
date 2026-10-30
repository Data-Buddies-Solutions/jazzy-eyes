import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../pool'
import { countRxSales, createRxSale, findBrandName, listRxSales, type NewRxSale } from '../rx-sales'
import { insert } from '../table'
import { brands } from '../tables'

const day = (date: string) => new Date(`${date}T00:00:00.000Z`)

const sale = (overrides: Partial<NewRxSale> = {}): NewRxSale => ({
  brandId: 1,
  styleNumber: 'RX1',
  colorCode: 'BLK',
  eyeSize: '50',
  gender: 'Unisex',
  frameType: 'Zyl',
  productType: 'Optical',
  saleDate: day('2026-10-01'),
  salePrice: 210.5,
  costPrice: 0,
  notes: null,
  ...overrides,
})

beforeEach(async () => {
  await db.affected(insert(brands, { id: 1, companyName: 'Acme', companyId: 1, brandName: 'Acme Optics', allocationQuantity: 5 }))
})

describe('rx sales', () => {
  it('finds a brand name, null for an unknown brand, and rejects a non-integer id', async () => {
    expect(await findBrandName(1)).toBe('Acme Optics')
    expect(await findBrandName(999)).toBeNull()
    await expect(findBrandName('1' as unknown as number)).rejects.toThrow('brandId must be an integer')
  })

  it('creates a sale and returns the stored row', async () => {
    const created = await createRxSale(sale({ notes: 'walk-in' }))
    expect(created).toMatchObject({ id: 1, brandId: 1, salePrice: 210.5, costPrice: 0, saleDate: day('2026-10-01'), notes: 'walk-in' })
    expect(await countRxSales()).toBe(1)
  })

  it('lists sales newest first, ties by newest id, with the brand name and paging', async () => {
    await createRxSale(sale({ saleDate: day('2026-09-01') }))
    await createRxSale(sale({ saleDate: day('2026-10-01') }))
    await createRxSale(sale({ saleDate: day('2026-10-01') }))

    const all = await listRxSales({ skip: 0, limit: 10 })
    expect(all.map((row) => row.id)).toEqual([3, 2, 1])
    expect(all[0].brandName).toBe('Acme Optics')
    expect((await listRxSales({ skip: 1, limit: 1 })).map((row) => row.id)).toEqual([2])
    expect(await countRxSales()).toBe(3)
  })
})
