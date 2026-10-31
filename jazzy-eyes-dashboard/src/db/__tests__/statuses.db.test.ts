import { beforeEach, describe, expect, it } from 'vitest'
import { getPool } from '../pool'
import {
  createStatus,
  deleteStatus,
  findStatusWithProductCount,
  highestDisplayOrder,
  listStatusesWithProductCounts,
  statusNameExists,
  updateStatus,
} from '../statuses'

async function seed() {
  await getPool().query(`
    INSERT INTO frame_statuses (name, "colorScheme", is_protected, display_order, updated_at) VALUES
      ('Active', 'green', false, 2, now()),
      ('Sold', 'blue', true, 1, now()),
      ('Hold', 'gray', false, 2, now());
    INSERT INTO brands (id, company_name, company_id, brand_name, allocation_quantity, updated_at)
      VALUES (1, 'Acme', 10, 'Acme', 5, now());
    INSERT INTO products (composite_id, brand_id, status_id, style_number, color_code, eye_size, gender, frame_type, product_type, current_qty, updated_at) VALUES
      ('1-X-BLK-50', 1, 1, 'X', 'BLK', '50', 'Men', 'Full Rim', 'Optical', 1, now());
  `)
}

const names = async () =>
  (await getPool().query<{ name: string }>('SELECT name FROM frame_statuses ORDER BY id')).rows.map(
    (row) => row.name
  )

describe('statuses module', () => {
  beforeEach(seed)

  it('lists statuses by display order, then id, with product counts', async () => {
    const rows = await listStatusesWithProductCounts()

    expect(rows.map((row) => [row.id, row.name, row.displayOrder, row.productCount])).toEqual([
      [2, 'Sold', 1, 0],
      [1, 'Active', 2, 1],
      [3, 'Hold', 2, 0],
    ])
    expect(rows[0]).toMatchObject({ colorScheme: 'blue', isProtected: true })
  })

  it('finds one status with its product count, or null', async () => {
    expect(await findStatusWithProductCount(1)).toMatchObject({ name: 'Active', productCount: 1 })
    expect(await findStatusWithProductCount(99)).toBeNull()
  })

  it('matches status names exactly', async () => {
    expect(await statusNameExists('Active')).toBe(true)
    expect(await statusNameExists('active')).toBe(false)
  })

  it('returns the highest display order, or null with no statuses', async () => {
    expect(await highestDisplayOrder()).toBe(2)
    await getPool().query('TRUNCATE frame_statuses CASCADE')
    expect(await highestDisplayOrder()).toBeNull()
  })

  it('creates a status and returns the stored row', async () => {
    const created = await createStatus({
      name: 'New',
      colorScheme: 'red',
      isProtected: false,
      displayOrder: 3,
    })

    expect(created).toMatchObject({ id: 4, name: 'New', colorScheme: 'red', displayOrder: 3 })
    expect(await names()).toEqual(['Active', 'Sold', 'Hold', 'New'])
  })

  it('updates only the given fields, stamps updatedAt alone for an empty patch, and fails on a missing status', async () => {
    expect(await updateStatus(3, { colorScheme: 'pink' })).toMatchObject({
      name: 'Hold',
      colorScheme: 'pink',
      displayOrder: 2,
    })
    expect(await updateStatus(3, {})).toMatchObject({ name: 'Hold', colorScheme: 'pink' })
    await expect(updateStatus(99, { name: 'Ghost' })).rejects.toThrow('status 99 does not exist')
  })

  it('deletes a status and fails on a missing one', async () => {
    await deleteStatus(3)
    expect(await names()).toEqual(['Active', 'Sold'])

    await expect(deleteStatus(99)).rejects.toThrow('status 99 does not exist')
  })
})
