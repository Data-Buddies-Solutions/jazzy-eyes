import { describe, expect, it } from 'vitest'
import { sql } from '../sql'
import { col, defineTable, insert, select, selectAll, set } from '../table'
import { brands, inventoryTransactions } from '../tables'

describe('select', () => {
  it('aliases picked columns to their domain names', () => {
    expect(select(brands, ['id', 'brandName']).compile().text).toBe(
      '"brands"."id" AS "id", "brands"."brand_name" AS "brandName"'
    )
  })

  it('prefixes joined columns from an aliased table', () => {
    expect(select(brands, ['brandName'], { alias: 'b', prefix: 'brand' }).compile().text).toBe(
      '"b"."brand_name" AS "brandBrandName"'
    )
  })

  it('selects every column of a table', () => {
    const { text } = selectAll(brands).compile()
    expect(text.split(', ')).toHaveLength(9)
    expect(text).toContain('"brands"."cost_discount_percent" AS "costDiscountPercent"')
  })
})

describe('defineTable', () => {
  it('refuses a column kind that does not fit the domain type', () => {
    type Row = { total: number; at: Date }
    defineTable<Row>('rows', {
      // @ts-expect-error a number column is 'int' or 'numeric', not 'text'
      total: col('total', 'text'),
      at: col('at', 'timestamp'),
    })
    defineTable<Row>('rows', {
      total: col('total', 'numeric'),
      // @ts-expect-error a Date column is 'timestamp' or 'date', not 'int'
      at: col('at', 'int'),
    })
  })
})

describe('insert', () => {
  it('refuses a key outside the descriptor that a spread carried in', () => {
    const row = { brandName: 'Acme', notes: 'not a column' }
    const values: { brandName: string } = row

    expect(() => insert(brands, values)).toThrow('insert(brands) cannot write notes')
  })

  it('leaves a serial id to the database and fills created_at and updated_at', () => {
    const { text, values } = insert(inventoryTransactions, {
      productId: 'P1',
      transactionType: 'SALE',
    }).compile()

    expect(text).toBe(
      'INSERT INTO "inventory_transactions" ("product_id", "transaction_type", "created_at", "updated_at") VALUES ($1, $2, $3, $4)'
    )
    expect(values.slice(0, 2)).toEqual(['P1', 'SALE'])
    expect(values[2]).toBeInstanceOf(Date)
    expect(values[2]).toBe(values[3])
  })

  it('keeps caller-provided timestamps', () => {
    const at = new Date('2026-01-01T00:00:00.000Z')
    const { values } = insert(brands, { id: 7, createdAt: at, updatedAt: at }).compile()
    expect(values).toEqual([7, at, at])
  })
})

describe('set', () => {
  it('refuses a key outside the descriptor, even one set to undefined', () => {
    const patch = { brandName: 'Acme', reviewNote: undefined }

    expect(() => set(brands, { ...patch })).toThrow('set(brands) cannot write reviewNote')
  })

  it('appends updated_at unless the caller sets it, and accepts SQL expressions', () => {
    const stamped = set(brands, { brandName: 'Acme' }).compile()
    expect(stamped.text).toBe('"brand_name" = $1, "updated_at" = $2')
    expect(stamped.values[1]).toBeInstanceOf(Date)

    const explicit = new Date('2026-02-02T00:00:00.000Z')
    expect(set(brands, { brandName: 'Acme', updatedAt: explicit }).compile()).toEqual({
      text: '"brand_name" = $1, "updated_at" = $2',
      values: ['Acme', explicit],
    })

    expect(
      set(inventoryTransactions, { quantity: sql`quantity - ${1}`, updatedAt: explicit }).compile()
    ).toEqual({
      text: '"quantity" = quantity - $1, "updated_at" = $2',
      values: [1, explicit],
    })
  })
})
