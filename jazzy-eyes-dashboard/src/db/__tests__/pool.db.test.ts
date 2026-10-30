import { describe, expect, it } from 'vitest'
import { getPool } from '../pool'
const WITH_MILLIS = new Date('2026-03-05T23:30:15.123Z')
const UTC_MIDNIGHT = new Date('2026-03-05T00:00:00.000Z')

async function insertTransaction(unitCost: string): Promise<number> {
  await getPool().query(
    `INSERT INTO brands (id, company_name, company_id, brand_name, allocation_quantity, discount_percentage, updated_at)
     VALUES (1, 'Acme', 10, 'Acme Frames', 5, 0, $1) ON CONFLICT (id) DO NOTHING`,
    [WITH_MILLIS]
  )
  await getPool().query(
    `INSERT INTO products (composite_id, brand_id, style_number, color_code, eye_size, gender, frame_type, product_type, updated_at)
     VALUES ('1-A-B-50', 1, 'A', 'B', '50', 'Unisex', 'Full', 'Optical', $1) ON CONFLICT (composite_id) DO NOTHING`,
    [WITH_MILLIS]
  )
  const { rows } = await getPool().query(
    `INSERT INTO inventory_transactions (product_id, transaction_type, transaction_date, quantity, unit_cost, unit_price, updated_at)
     VALUES ('1-A-B-50', 'ORDER', $1, 1, $2, 99.50, $3) RETURNING id`,
    [UTC_MIDNIGHT, unitCost, WITH_MILLIS]
  )
  return rows[0].id
}

describe('the pool returns UTC dates and number counts and prices', () => {
  it('runs these tests in a non-UTC zone so UTC mistakes show', () => {
    expect(WITH_MILLIS.getTimezoneOffset()).not.toBe(0)
  })

  it('round-trips a timestamp(3) to the millisecond and a date as UTC midnight', async () => {
    const id = await insertTransaction('12.34')

    const { rows } = await getPool().query(
      'SELECT updated_at, transaction_date FROM inventory_transactions WHERE id = $1',
      [id]
    )

    expect(rows[0].updated_at).toEqual(WITH_MILLIS)
    expect(rows[0].transaction_date).toEqual(UTC_MIDNIGHT)
  })

  it('fills a CURRENT_TIMESTAMP default with the UTC wall clock', async () => {
    const before = Date.now()
    const id = await insertTransaction('12.34')

    const { rows } = await getPool().query(
      'SELECT created_at FROM inventory_transactions WHERE id = $1',
      [id]
    )

    expect(Math.abs(rows[0].created_at.getTime() - before)).toBeLessThan(5000)
  })

  it('returns a DECIMAL column and a sum of one as numbers', async () => {
    const first = await insertTransaction('12.34')
    await insertTransaction('0.66')

    const { rows } = await getPool().query(
      'SELECT unit_cost, unit_price, (SELECT sum(unit_cost) FROM inventory_transactions) AS total FROM inventory_transactions WHERE id = $1',
      [first]
    )

    expect(rows[0]).toEqual({ unit_cost: 12.34, unit_price: 99.5, total: 13 })
  })

  it('returns count(*) as a number', async () => {
    await insertTransaction('1.00')
    await insertTransaction('1.00')

    const { rows } = await getPool().query('SELECT count(*) AS n FROM inventory_transactions')

    expect(rows[0].n).toBe(2)
  })
})
