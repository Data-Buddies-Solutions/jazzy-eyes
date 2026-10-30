import { EventEmitter } from 'node:events'
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { Pool } from 'pg'
import { afterAll, describe, expect, it } from 'vitest'
import { checksumOf, loadMigrations, migrate, MIGRATIONS_DIR, MigrationError } from '../migrate'

const tempDirs: string[] = []

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true })
})

function dirWith(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'jazzy-migrations-'))
  tempDirs.push(dir)
  for (const [name, sql] of Object.entries(files)) writeFileSync(path.join(dir, name), sql)
  return dir
}

function refusal(run: () => unknown): string {
  try {
    run()
  } catch (error) {
    if (error instanceof MigrationError) return error.reason
    throw error
  }
  throw new Error('expected a MigrationError')
}

describe('loadMigrations', () => {
  it('loads the repo migrations in order with sha256 checksums', () => {
    const migrations = loadMigrations(MIGRATIONS_DIR)
    const files = readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith('.sql'))
    expect(migrations.map((m) => `${m.name}.sql`)).toEqual([...files].sort())
    expect(migrations.length).toBeGreaterThan(0)
    expect(migrations[0].checksum).toBe(checksumOf(migrations[0].sql))
  })

  it('keeps the three Prisma-era files byte for byte, so their checksums match the recorded history', () => {
    const recorded = Object.fromEntries(
      loadMigrations(MIGRATIONS_DIR).map((m) => [m.name, m.checksum])
    )
    expect(recorded).toMatchObject({
      '0001_init': 'a86a83f25f44b0593b36abaa781058299f67cc26bc38567ae6b5707a92a86269',
      '0002_add_invoice_date_to_products':
        'aab327af49bda353b3ffec1732c30525bfacc578e30d0267c75415da2640d616',
      '0003_add_is_special_order_to_inventory_transactions':
        'b045bc78eaebca95daa2d05be1a91c511273e2a98a700d488422da6fa1989312',
    })
  })

  it('reads files in name order and ignores non-sql files', () => {
    const dir = dirWith({ '0002_b.sql': 'b', '0001_a.sql': 'a', 'notes.txt': 'x' })
    expect(loadMigrations(dir).map((m) => [m.name, m.sql])).toEqual([
      ['0001_a', 'a'],
      ['0002_b', 'b'],
    ])
  })

  it('refuses a file that is not named NNNN_slug.sql', () => {
    expect(refusal(() => loadMigrations(dirWith({ 'add_column.sql': '' })))).toBe('bad_file_name')
    expect(refusal(() => loadMigrations(dirWith({ '0001_Add-Column.sql': '' })))).toBe(
      'bad_file_name'
    )
    expect(refusal(() => loadMigrations(dirWith({ '0001_add_column.SQL': '' })))).toBe(
      'bad_file_name'
    )
  })

  it('refuses a file that controls its own transaction, wherever the statement sits', () => {
    const refused = [
      'BEGIN;\nCREATE TABLE t (id int);',
      'CREATE TABLE t (id int);\nSTART TRANSACTION;',
      'CREATE TABLE t (id int);\n  commit;',
      'CREATE TABLE t (id int);COMMIT;',
      'CREATE TABLE t (id int);\nEND;',
      'CREATE TABLE t (id int);\nROLLBACK;',
      'CREATE TABLE t (id int);\nABORT;',
      'CREATE TABLE t (id int);\nSAVEPOINT s;',
      "CREATE TABLE t (id int);\nPREPARE TRANSACTION 'deploy';",
      '-- the runner wraps this file\nCOMMIT;',
      '/* the runner wraps this file */ ROLLBACK;',
      'CREATE TABLE a (id int);\n/* x /* y */ */ COMMIT;\nCREATE TABLE b (id int);\nSELECT 1/0;',
      '/* a /* b /* c */ */ */ BEGIN;',
      "/* it's /* nested */ still */ COMMIT;",
      'CREATE TABLE a (id int);\nSELECT 1 AS "/*";\nCOMMIT;\nSELECT 1/0;',
      'CREATE TABLE "a--b" (id int);\nCOMMIT;',
      "SELECT 1 AS \"'\"; COMMIT; SELECT 'x';",
      'SELECT 1 AS "$$"; COMMIT; SELECT $$x$$;',
      'CREATE TABLE a$x$ (id int);\nCOMMIT;\nCREATE TABLE b$x$ (id int);',
      'CREATE TABLE é$$ (id int);\nCOMMIT;\nCREATE TABLE b$$ (id int);',
      'SELECT 1;-- x\rCOMMIT;',
      'CREATE TABLE t (id int); /* never closed; COMMIT;',
    ]
    for (const sql of refused) {
      expect(
        refusal(() => loadMigrations(dirWith({ '0001_a.sql': sql }))),
        sql
      ).toBe('transaction_control')
    }
  })

  it('accepts transaction words inside quoted bodies, comments, expressions and longer identifiers', () => {
    const accepted = {
      '0001_a.sql': "INSERT INTO t VALUES ('begin the end')",
      '0002_b.sql': 'UPDATE t SET a = CASE WHEN b THEN 1 ELSE 0\nEND',
      '0003_c.sql': 'DO $$\nBEGIN\n  PERFORM 1;\nEND $$;',
      '0004_d.sql':
        'CREATE FUNCTION f() RETURNS trigger AS $body$\nBEGIN\n  RETURN NEW;\nEND;\n$body$ LANGUAGE plpgsql;',
      '0005_e.sql':
        '-- the runner owns the transaction; COMMIT happens there\nCREATE TABLE t (id int);',
      '0006_f.sql': 'CREATE TABLE t (id int); /* no undo here; ROLLBACK is the runner job */',
      '0007_g.sql': "INSERT INTO t VALUES ('it''s; COMMIT;')",
      '0008_h.sql': 'SELECT 1;\nBEGINNING',
      '0009_i.sql': 'COMMITTED;',
      '0010_j.sql': 'CREATE TABLE t (id int); /* outer /* inner */ COMMIT; */',
      '0011_k.sql': "INSERT INTO t VALUES ('/*'); /**/ SELECT 1;",
      '0012_l.sql': 'SELECT 2 */* x */ 3;',
      '0013_m.sql': 'CREATE TABLE "it\'s ""COMMIT""; END" (id int);',
      '0014_n.sql': "SELECT $é$ '; COMMIT; ' $é$;",
    }
    expect(loadMigrations(dirWith(accepted))).toHaveLength(14)
  })

  it("reads backslash escapes only inside E'' strings", () => {
    const refused = [
      "SELECT E'\\''; BEGIN; SELECT '';",
      "SELECT E'C:\\\\'; COMMIT;",
      "SELECT date'a\\'; COMMIT; SELECT 'b';",
    ]
    for (const sql of refused) {
      expect(
        refusal(() => loadMigrations(dirWith({ '0001_a.sql': sql }))),
        sql
      ).toBe('transaction_control')
    }
    const accepted = {
      '0001_a.sql': "INSERT INTO t VALUES (e'it\\'s; COMMIT;')",
      '0002_b.sql': "INSERT INTO t VALUES (E'it''s \\' ; COMMIT; ')",
    }
    expect(loadMigrations(dirWith(accepted))).toHaveLength(2)
  })

  it('refuses a gap or a duplicate number', () => {
    expect(refusal(() => loadMigrations(dirWith({ '0001_a.sql': '', '0003_c.sql': '' })))).toBe(
      'gap_in_sequence'
    )
    expect(refusal(() => loadMigrations(dirWith({ '0001_a.sql': '', '0001_b.sql': '' })))).toBe(
      'gap_in_sequence'
    )
    expect(refusal(() => loadMigrations(dirWith({ '0002_b.sql': '' })))).toBe('gap_in_sequence')
  })
})

type ClientCall =
  | { query: string; values?: unknown[]; errorListeners: number }
  | { release: unknown; errorListeners: number }

function fakePool(lockError?: Error): { pool: Pool; calls: ClientCall[] } {
  const calls: ClientCall[] = []
  const client = Object.assign(new EventEmitter(), {
    async query(text: string, values?: unknown[]) {
      calls.push({ query: text, values, errorListeners: client.listenerCount('error') })
      if (lockError && text.includes('pg_advisory_lock')) throw lockError
      return { rows: text.includes('to_regclass') ? [{ present: false }] : [] }
    },
    release(destroy?: unknown) {
      calls.push({ release: destroy, errorListeners: client.listenerCount('error') })
    },
  })
  return { pool: { connect: async () => client } as unknown as Pool, calls }
}

function pgError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code })
}

describe('migrate locking', () => {
  it('bounds the lock wait, resets the timeout once locked, and destroys the client afterwards', async () => {
    const { pool, calls } = fakePool()

    expect(await migrate(pool, [])).toEqual({ applied: [], alreadyApplied: 0 })

    expect(calls.slice(0, 3)).toEqual([
      {
        query: 'SELECT set_config($1, $2, false)',
        values: ['lock_timeout', '2min'],
        errorListeners: 1,
      },
      { query: 'SELECT pg_advisory_lock($1)', values: [7204911], errorListeners: 1 },
      { query: 'RESET lock_timeout', values: undefined, errorListeners: 1 },
    ])
    expect(calls.every((call) => 'release' in call || call.errorListeners === 1)).toBe(true)
    expect(calls.at(-1)).toEqual({ release: true, errorListeners: 0 })
  })

  it('reports a lock wait that timed out as lock_timeout, carrying the database error', async () => {
    const timeout = pgError('55P03', 'canceling statement due to lock timeout')
    const { pool, calls } = fakePool(timeout)

    const error = await migrate(pool, [], '500ms').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(MigrationError)
    expect((error as MigrationError).reason).toBe('lock_timeout')
    expect((error as MigrationError).cause).toBe(timeout)
    expect(calls).toEqual([
      {
        query: 'SELECT set_config($1, $2, false)',
        values: ['lock_timeout', '500ms'],
        errorListeners: 1,
      },
      { query: 'SELECT pg_advisory_lock($1)', values: [7204911], errorListeners: 1 },
      { release: true, errorListeners: 0 },
    ])
  })

  it('rethrows any other failure while waiting for the lock unchanged', async () => {
    const terminated = pgError('57P01', 'terminating connection due to administrator command')
    const { pool, calls } = fakePool(terminated)

    await expect(migrate(pool, [])).rejects.toBe(terminated)
    expect(calls.at(-1)).toEqual({ release: true, errorListeners: 0 })
  })
})
