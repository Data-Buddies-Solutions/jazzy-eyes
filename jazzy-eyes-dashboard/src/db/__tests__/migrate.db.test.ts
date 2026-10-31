import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  checksumOf,
  loadMigrations,
  migrate,
  MigrationError,
  recordBaseline,
  type Migration,
} from '../migrate'
import { createPool } from '../pool'
import { localTestDatabaseUrl, startTestDatabase, type TestDatabase } from '../test-database'

let database: TestDatabase
let pool: ReturnType<typeof createPool>

beforeAll(async () => {
  database = await startTestDatabase({ migrated: false })
  pool = createPool(database.url)
})

afterAll(async () => {
  await pool.end()
  await database.stop()
})

beforeEach(async () => {
  await pool.query('SELECT pg_advisory_unlock_all(); RESET lock_timeout')
  await pool.query(
    'DROP SCHEMA public CASCADE; CREATE SCHEMA public'
  )
})

function migration(name: string, sql: string): Migration {
  return { name, checksum: checksumOf(sql), sql }
}

const first = migration('0001_create_things', 'CREATE TABLE things (id text PRIMARY KEY)')
const second = migration('0002_add_label', 'ALTER TABLE things ADD COLUMN label text')

async function ledger(): Promise<{ name: string; checksum: string }[]> {
  const { rows } = await pool.query('SELECT name, checksum FROM schema_migrations ORDER BY name')
  return rows
}

async function refusal(run: () => Promise<unknown>): Promise<string> {
  try {
    await run()
  } catch (error) {
    if (error instanceof MigrationError) return error.reason
    throw error
  }
  throw new Error('expected a MigrationError')
}

async function tableExists(name: string): Promise<boolean> {
  const { rows } = await pool.query('SELECT to_regclass($1) IS NOT NULL AS present', [name])
  return rows[0].present
}

describe('migrate', () => {
  it('applies pending files in order, each recorded with its checksum', async () => {
    const result = await migrate(pool, [first, second])

    expect(result).toEqual({ applied: [first.name, second.name], alreadyApplied: 0 })
    expect(await ledger()).toEqual([
      { name: first.name, checksum: first.checksum },
      { name: second.name, checksum: second.checksum },
    ])
    await pool.query("INSERT INTO things (id, label) VALUES ('a', 'b')")
  })

  it('does nothing on a rerun and applies only the new file later', async () => {
    await migrate(pool, [first])

    expect(await migrate(pool, [first])).toEqual({ applied: [], alreadyApplied: 1 })
    expect(await migrate(pool, [first, second])).toEqual({
      applied: [second.name],
      alreadyApplied: 1,
    })
  })

  it('rolls a failing file back whole and leaves no ledger row, so a fixed file applies cleanly', async () => {
    const broken = migration(
      '0002_add_label',
      'ALTER TABLE things ADD COLUMN label text; ALTER TABLE missing ADD COLUMN x text'
    )
    await migrate(pool, [first])

    expect(await refusal(() => migrate(pool, [first, broken]))).toBe('apply_failed')
    expect(await ledger()).toEqual([{ name: first.name, checksum: first.checksum }])
    const columns = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'things'"
    )
    expect(columns.rows.map((row) => row.column_name)).toEqual(['id'])

    expect(await migrate(pool, [first, second])).toEqual({
      applied: [second.name],
      alreadyApplied: 1,
    })
  })

  it('rolls the file back when its ledger row cannot be written', async () => {
    const refusesItsLedgerRow = migration(
      '0001_create_things',
      `CREATE TABLE things (id text PRIMARY KEY);
CREATE FUNCTION refuse_ledger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'no ledger row'; END $$;
CREATE TRIGGER refuse_ledger BEFORE INSERT ON schema_migrations FOR EACH ROW EXECUTE FUNCTION refuse_ledger();`
    )

    expect(await refusal(() => migrate(pool, [refusesItsLedgerRow]))).toBe('apply_failed')
    expect(await tableExists('things')).toBe(false)
    expect(await ledger()).toEqual([])
  })

  it('starts each file from a reset session, so a setting an earlier file changed cannot hide a COMMIT', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'jazzy-migrations-'))
    writeFileSync(path.join(dir, '0001_flip_strings.sql'), 'SET standard_conforming_strings = off')
    writeFileSync(
      path.join(dir, '0002_hidden_commit.sql'),
      String.raw`CREATE TABLE hidden_commit (id int);
SELECT '\', '; COMMIT; SELECT 'x';
SELECT 1/0;`
    )
    const migrations = loadMigrations(dir)
    rmSync(dir, { recursive: true })

    expect(await refusal(() => migrate(pool, migrations))).toBe('apply_failed')
    expect(await tableExists('hidden_commit')).toBe(false)
    expect(await ledger()).toEqual([
      { name: '0001_flip_strings', checksum: migrations[0].checksum },
    ])
  })

  it('holds the advisory lock with no lock_timeout while a file runs', async () => {
    const probe = migration(
      '0001_probe_lock',
      `CREATE TABLE lock_probe AS SELECT
  current_setting('lock_timeout') AS lock_timeout,
  EXISTS (
    SELECT 1 FROM pg_locks
    WHERE locktype = 'advisory' AND objid = 7204911 AND pid = pg_backend_pid()
  ) AS holds_lock`
    )

    await migrate(pool, [probe])

    const { rows } = await pool.query('SELECT lock_timeout, holds_lock FROM lock_probe')
    expect(rows).toEqual([{ lock_timeout: '0', holds_lock: true }])
  })

  it('refuses when an applied file was edited', async () => {
    await migrate(pool, [first])
    const edited = migration(first.name, 'CREATE TABLE things (id text PRIMARY KEY, extra text)')

    expect(await refusal(() => migrate(pool, [edited, second]))).toBe('checksum_mismatch')
    expect(await tableExists('things')).toBe(true)
    expect(await ledger()).toHaveLength(1)
  })

  it('refuses when the database has an applied migration the code does not know', async () => {
    await migrate(pool, [first, second])

    expect(await refusal(() => migrate(pool, [first]))).toBe('applied_without_file')
  })

  it('applies the real migration files to an empty database and the rerun is a no-op', async () => {
    const migrations = loadMigrations()

    const result = await migrate(pool, migrations)

    expect(result.applied).toEqual(migrations.map((m) => m.name))
    expect(await tableExists('brands')).toBe(true)
    expect(await tableExists('inventory_transactions')).toBe(true)
    expect(await tableExists('frame_statuses')).toBe(true)
    expect(await tableExists('rx_sales')).toBe(true)
    expect(await migrate(pool, migrations)).toEqual({
      applied: [],
      alreadyApplied: migrations.length,
    })
  })
})

const realPostgresUrl = process.env.TEST_DATABASE_URL

describe.skipIf(!realPostgresUrl)('migrate on a real Postgres', () => {
  it('reads each file with standard_conforming_strings on when the database default is off', async () => {
    const admin = createPool(localTestDatabaseUrl(realPostgresUrl ?? ''))
    const name = `jazzy_migrate_strings_${process.pid}_test`
    await admin.query(`DROP DATABASE IF EXISTS ${name}`)
    await admin.query(`CREATE DATABASE ${name}`)
    await admin.query(`ALTER DATABASE ${name} SET standard_conforming_strings = off`)
    const url = new URL(realPostgresUrl ?? '')
    url.pathname = `/${name}`
    const target = createPool(url.toString())
    try {
      const hiddenCommit = migration(
        '0001_hidden_commit',
        String.raw`CREATE TABLE hidden_commit (id int);
SELECT '\', '; COMMIT; SELECT 'x';
SELECT 1/0;`
      )

      expect(await refusal(() => migrate(target, [hiddenCommit]))).toBe('apply_failed')
      const { rows } = await target.query(
        "SELECT to_regclass('hidden_commit') IS NOT NULL AS present"
      )
      expect(rows).toEqual([{ present: false }])
    } finally {
      await target.end()
      await admin.query(`DROP DATABASE ${name} WITH (FORCE)`)
      await admin.end()
    }
  })
})

describe('recordBaseline', () => {
  it('records the baseline on a database that already has its schema, then migrate applies only later files', async () => {
    await pool.query(first.sql)

    expect(await recordBaseline(pool, [first, second])).toEqual({ recorded: true })
    expect(await ledger()).toEqual([{ name: first.name, checksum: first.checksum }])
    expect(await migrate(pool, [first, second])).toEqual({
      applied: [second.name],
      alreadyApplied: 1,
    })
  })

  it('does nothing once the baseline is recorded, even after later migrations', async () => {
    await pool.query(first.sql)
    await recordBaseline(pool, [first, second])
    await migrate(pool, [first, second])

    expect(await recordBaseline(pool, [first, second])).toEqual({ recorded: false })
    expect(await ledger()).toHaveLength(2)
  })

  it('refuses an empty database, which needs migrate', async () => {
    expect(await refusal(() => recordBaseline(pool, [first]))).toBe('schema_mismatch')
    expect(await tableExists('schema_migrations')).toBe(false)
  })

  it('refuses a database that lacks a table the baseline creates', async () => {
    const baseline = migration(
      '0001_create_two',
      'CREATE TABLE things (id text PRIMARY KEY); CREATE TABLE public."Others" (id text)'
    )
    await pool.query('CREATE TABLE things (id text PRIMARY KEY)')

    expect(await refusal(() => recordBaseline(pool, [baseline]))).toBe('schema_mismatch')
    await pool.query('CREATE TABLE "Others" (id text)')
    expect(await recordBaseline(pool, [baseline])).toEqual({ recorded: true })
  })

  it('refuses a baseline recorded with a checksum the file no longer has', async () => {
    await pool.query(first.sql)
    await recordBaseline(pool, [first])
    const edited = migration(first.name, `${first.sql};`)

    expect(await refusal(() => recordBaseline(pool, [edited]))).toBe('checksum_mismatch')
  })

  it('refuses a ledger that already records something other than the baseline', async () => {
    await migrate(pool, [first, second])
    await pool.query('DELETE FROM schema_migrations WHERE name = $1', [first.name])

    expect(await refusal(() => recordBaseline(pool, [first, second]))).toBe('ledger_not_empty')
  })

  it('refuses to migrate a database that has tables but no recorded baseline, and creates no ledger', async () => {
    await pool.query(first.sql)

    expect(await refusal(() => migrate(pool, [first]))).toBe('baseline_required')
    expect(await tableExists('schema_migrations')).toBe(false)
  })

  it('records the real baseline on a database built from it, and migrate then has nothing to do', async () => {
    const migrations = loadMigrations()
    await pool.query(migrations[0].sql)

    expect(await recordBaseline(pool, migrations)).toEqual({ recorded: true })
    expect(await migrate(pool, migrations)).toEqual({
      applied: migrations.slice(1).map((m) => m.name),
      alreadyApplied: 1,
    })
  })
})
