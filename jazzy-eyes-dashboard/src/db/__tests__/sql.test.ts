import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  and,
  array,
  count,
  direction,
  expression,
  join,
  json,
  likeContains,
  likeStartsWith,
  or,
  raw,
  sql,
  subquery,
  type Sql,
} from '../sql'

describe('sql', () => {
  it('numbers parameters in order and keeps values aside', () => {
    const query = sql`SELECT * FROM t WHERE a = ${1} AND b = ${'x'} AND c = ${null}`

    expect(query.compile()).toEqual({
      text: 'SELECT * FROM t WHERE a = $1 AND b = $2 AND c = $3',
      values: [1, 'x', null],
    })
  })

  it('splices nested fragments and renumbers their parameters', () => {
    const where = sql`transaction_type = ${'SALE'} AND notes IS NULL`
    const page = sql`SELECT id FROM inventory_transactions WHERE ${where} ORDER BY created_at LIMIT ${10} OFFSET ${20}`

    expect(page.compile()).toEqual({
      text: 'SELECT id FROM inventory_transactions WHERE transaction_type = $1 AND notes IS NULL ORDER BY created_at LIMIT $2 OFFSET $3',
      values: ['SALE', 10, 20],
    })
    expect(sql`SELECT count(*) FROM inventory_transactions WHERE ${where}`.compile().values).toEqual(
      ['SALE']
    )
  })

  it('writes JSON as a jsonb parameter and SQL NULL for a missing value', () => {
    expect(sql`SET details = ${json(['Fever', 1])}`.compile()).toEqual({
      text: 'SET details = $1::jsonb',
      values: ['["Fever",1]'],
    })
    expect(sql`SET details = ${json(null)}`.compile()).toEqual({
      text: 'SET details = NULL',
      values: [],
    })
  })

  it('passes arrays only through array(), with an optional element type', () => {
    expect(sql`transaction_type = ANY(${array(['ORDER', 'SALE'], '"TransactionType"')})`.compile()).toEqual({
      text: 'transaction_type = ANY($1::"TransactionType"[])',
      values: [['ORDER', 'SALE']],
    })
    expect(sql`id = ANY(${array(['a'])})`.compile().text).toBe('id = ANY($1)')
  })

  it('composes and/or, dropping falsy parts and collapsing empty groups', () => {
    expect(and(sql`a = ${1}`, false, sql`b = ${2}`).compile()).toEqual({
      text: '(a = $1 AND b = $2)',
      values: [1, 2],
    })
    expect(or(null, undefined).compile().text).toBe('FALSE')
    expect(and().compile().text).toBe('TRUE')
    expect(join([raw('a'), raw('b'), raw('c')], ', ').compile().text).toBe('a, b, c')
  })

  it('names counts and escapes LIKE patterns', () => {
    expect(sql`SELECT ${count('total')} FROM t`.compile().text).toBe(
      'SELECT count(*)::int AS "total" FROM t'
    )
    expect(likeContains('50%_off\\')).toBe('%50\\%\\_off\\\\%')
    expect(likeStartsWith('pi_')).toBe('pi\\_%')
  })

  it('types a query by the selections it interpolates and nothing else', () => {
    const where = sql`brand_id = ${1}`
    const counted = sql`SELECT ${count('total')} FROM products WHERE ${where}`
    expectTypeOf(counted).toEqualTypeOf<Sql<{ total: number }>>()

    const untyped = sql`SELECT composite_id FROM products WHERE ${where}`
    expectTypeOf(untyped).toEqualTypeOf<Sql<unknown>>()

    const nested = sql`SELECT ${count('total')} FROM products WHERE brand_id IN ${subquery(sql`SELECT id FROM brands`)}`
    expectTypeOf(nested).toEqualTypeOf<Sql<{ total: number }>>()

    const computed = sql`SELECT ${expression<Date>()('latest', sql`max(transaction_date)`)} FROM inventory_transactions`
    expectTypeOf(computed).toEqualTypeOf<Sql<{ latest: Date }>>()
    expect(computed.compile().text).toBe(
      'SELECT (max(transaction_date)) AS "latest" FROM inventory_transactions'
    )
  })

  it('keeps backslashes in the static SQL text', () => {
    expect(sql`regexp_replace(phone, '\D', '', 'g')`.compile().text).toBe(
      "regexp_replace(phone, '\\D', '', 'g')"
    )
  })

  it('refuses an array element type that is not a type name', () => {
    expect(() => array(['a'], 'text[]; DROP TABLE users; --')).toThrow('is not a type name')
  })

  it('accepts only ASC or DESC as an ORDER BY direction', () => {
    expect(sql`ORDER BY created_at ${direction('ASC')}`.compile()).toEqual({
      text: 'ORDER BY created_at ASC',
      values: [],
    })
    expect(sql`ORDER BY created_at ${direction('DESC')}`.compile().text).toBe(
      'ORDER BY created_at DESC'
    )
    const hostile = 'ASC; DROP TABLE users; --'
    // @ts-expect-error a direction is 'ASC' | 'DESC', not any string
    expect(() => direction(hostile)).toThrow('is not a sort direction')
  })
})
