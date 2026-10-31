import { beforeEach, describe, expect, it } from 'vitest'
import {
  brandExists,
  companyExists,
  createBrand,
  deleteBrand,
  findBrandWithProductCount,
  highestCompanyId,
  listBrandsWithProductCounts,
  renameCompany,
  updateBrand,
} from '../brands'
import { getPool } from '../pool'

async function seed() {
  await getPool().query(`
    INSERT INTO brands (id, company_name, company_id, brand_name, allocation_quantity, cost_discount_percent, cost_discount_start_date, updated_at) VALUES
      (2, 'Beta', 20, 'B Two', 3, 12.50, '2026-09-01', now()),
      (1, 'Beta', 20, 'B One', 4, NULL, NULL, now()),
      (3, 'Alpha', 10, 'A Three', 5, 0, NULL, now());
    INSERT INTO products (composite_id, brand_id, style_number, color_code, eye_size, gender, frame_type, product_type, current_qty, updated_at) VALUES
      ('1-X-BLK-50', 1, 'X', 'BLK', '50', 'Men', 'Full Rim', 'Optical', 1, now()),
      ('1-Y-BLK-50', 1, 'Y', 'BLK', '50', 'Men', 'Full Rim', 'Optical', 1, now());
  `)
}

const brandIds = async () =>
  (await getPool().query<{ id: number }>('SELECT id FROM brands ORDER BY id')).rows.map(
    (row) => row.id
  )

describe('brands module', () => {
  beforeEach(seed)

  it('lists brands by company id then id with product counts and numeric discounts', async () => {
    const rows = await listBrandsWithProductCounts()

    expect(rows.map((row) => [row.id, row.companyId, row.productCount])).toEqual([
      [3, 10, 0],
      [1, 20, 2],
      [2, 20, 0],
    ])
    expect(rows[2]).toMatchObject({
      brandName: 'B Two',
      costDiscountPercent: 12.5,
      costDiscountStartDate: new Date('2026-09-01T00:00:00.000Z'),
    })
    expect(rows[1].costDiscountPercent).toBeNull()
  })

  it('finds one brand with its product count, or null', async () => {
    expect(await findBrandWithProductCount(1)).toMatchObject({ brandName: 'B One', productCount: 2 })
    expect(await findBrandWithProductCount(99)).toBeNull()
  })

  it('reports whether a brand id and a company id exist', async () => {
    expect(await brandExists(2)).toBe(true)
    expect(await brandExists(99)).toBe(false)
    expect(await companyExists(10)).toBe(true)
    expect(await companyExists(30)).toBe(false)
  })

  it('returns the highest company id, or null with no brands', async () => {
    expect(await highestCompanyId()).toBe(20)
    await getPool().query('TRUNCATE brands CASCADE')
    expect(await highestCompanyId()).toBeNull()
  })

  it('creates a brand with the default discount and returns the stored row', async () => {
    const created = await createBrand({
      id: 7,
      companyId: 10,
      companyName: 'Alpha',
      brandName: 'A Seven',
      allocationQuantity: 9,
    })

    expect(created).toMatchObject({
      id: 7,
      brandName: 'A Seven',
      costDiscountPercent: 0,
      costDiscountStartDate: null,
    })
    expect(await brandIds()).toEqual([1, 2, 3, 7])
  })

  it('updates only the given fields and fails on a missing brand', async () => {
    const updated = await updateBrand(2, { allocationQuantity: 8 })

    expect(updated).toMatchObject({ id: 2, brandName: 'B Two', allocationQuantity: 8 })
    await expect(updateBrand(99, { brandName: 'Ghost' })).rejects.toThrow('brand 99 does not exist')
  })

  it('surfaces the unique brand name violation', async () => {
    await expect(updateBrand(2, { brandName: 'B One' })).rejects.toThrow(/brands_brand_name_key/)
  })

  it('deletes a brand, fails on a missing one, and refuses one with products', async () => {
    await deleteBrand(2)
    expect(await brandIds()).toEqual([1, 3])

    await expect(deleteBrand(99)).rejects.toThrow('brand 99 does not exist')
    await expect(deleteBrand(1)).rejects.toThrow(/products_brand_id_fkey/)
    expect(await brandIds()).toEqual([1, 3])
  })

  it('renames every brand in a company and returns the count', async () => {
    expect(await renameCompany(20, 'Beta Co')).toBe(2)
    expect(await renameCompany(30, 'Nobody')).toBe(0)

    const { rows } = await getPool().query('SELECT id, company_name FROM brands ORDER BY id')
    expect(rows).toEqual([
      { id: 1, company_name: 'Beta Co' },
      { id: 2, company_name: 'Beta Co' },
      { id: 3, company_name: 'Alpha' },
    ])
  })
})
