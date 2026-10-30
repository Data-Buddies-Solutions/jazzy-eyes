import { describe, expect, it } from 'vitest'
import { getPool } from '../pool'
import type { Column } from '../table'
import { tables } from '../tables'
import { TRANSACTION_TYPES } from '../types'

type ColumnRow = {
  column_name: string
  is_nullable: 'YES' | 'NO'
  data_type: string
  udt_name: string
}

const KIND_OF_DATA_TYPE: Record<string, Column['kind']> = {
  text: 'text',
  'character varying': 'text',
  integer: 'int',
  numeric: 'numeric',
  boolean: 'bool',
  'timestamp without time zone': 'timestamp',
  date: 'date',
  'USER-DEFINED': 'enum',
}

function liveKind(row: ColumnRow): string {
  return KIND_OF_DATA_TYPE[row.data_type] ?? `${row.data_type} (${row.udt_name})`
}

describe('every table descriptor matches the migrated schema', () => {
  it('registers every public table the migrations create', async () => {
    const { rows } = await getPool().query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations' ORDER BY tablename"
    )

    expect(rows.map((row) => row.tablename)).toEqual(
      Object.values(tables)
        .map((table) => table.name)
        .sort()
    )
  })

  it('the TransactionType enum has exactly the labels src/db/types.ts exports', async () => {
    const { rows } = await getPool().query<{ enumlabel: string }>(
      "SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = enumtypid WHERE typname = 'TransactionType' ORDER BY enumsortorder"
    )

    expect(rows.map((row) => row.enumlabel)).toEqual([...TRANSACTION_TYPES])
  })

  for (const table of Object.values(tables)) {
    it(`${table.name}: every column exists, nothing is missing, and nullability and kind match`, async () => {
      const { rows } = await getPool().query<ColumnRow>(
        'SELECT column_name, is_nullable, data_type, udt_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
        ['public', table.name]
      )
      const live = new Map(
        rows.map((row) => [
          row.column_name,
          { nullable: row.is_nullable === 'YES', kind: liveKind(row) },
        ])
      )
      const declared = new Map(
        Object.values(table.columns as Record<string, Column>).map((column) => [
          column.name,
          { nullable: column.nullable, kind: column.kind },
        ])
      )

      expect(Object.fromEntries(declared)).toEqual(Object.fromEntries(live))
    })
  }
})
