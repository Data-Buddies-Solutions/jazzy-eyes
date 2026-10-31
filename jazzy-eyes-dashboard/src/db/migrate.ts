import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { Pool, PoolClient } from 'pg'
import { closePool, getPool } from './pool'
import { quote } from './sql'

export const MIGRATIONS_DIR = path.join(import.meta.dirname, 'migrations')

const FILE_NAME = /^(\d{4})_[a-z0-9_]+\.sql$/
const IDENTIFIER_CHAR = String.raw`\w$\u0080-\uffff`
const QUOTED_OR_COMMENT_START = new RegExp(
  [
    String.raw`(?<![${IDENTIFIER_CHAR}])\$([A-Za-z_\u0080-\uffff][\w\u0080-\uffff]*)?\$[\s\S]*?\$\1\$`,
    String.raw`(?<![${IDENTIFIER_CHAR}])[Ee]'(?:[^'\\]|\\[\s\S]|'')*'`,
    String.raw`'(?:[^']|'')*'`,
    String.raw`"(?:[^"]|"")*"`,
    String.raw`--[^\n\r]*`,
    String.raw`\/\*`,
  ].join('|'),
  'g'
)
const BLOCK_COMMENT_MARK = /\/\*|\*\//g
const TRANSACTION_CONTROL =
  /(^|;)\s*(BEGIN|START\s+TRANSACTION|COMMIT|END|ROLLBACK|ABORT|SAVEPOINT|PREPARE\s+TRANSACTION)\b/i
const LOCK_KEY = 7204911
const LOCK_TIMEOUT = '2min'
const LOCK_NOT_AVAILABLE = '55P03'
const CREATE_LEDGER = `CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
)`

export type Migration = { name: string; checksum: string; sql: string }

export type MigrationRefusal =
  | 'bad_file_name'
  | 'gap_in_sequence'
  | 'transaction_control'
  | 'lock_timeout'
  | 'checksum_mismatch'
  | 'applied_without_file'
  | 'apply_failed'
  | 'baseline_required'
  | 'schema_mismatch'
  | 'ledger_not_empty'

export class MigrationError extends Error {
  readonly reason: MigrationRefusal

  constructor(reason: MigrationRefusal, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'MigrationError'
    this.reason = reason
  }
}

export function checksumOf(sql: string): string {
  return createHash('sha256').update(sql).digest('hex')
}

export function controlsTransaction(sql: string): boolean {
  return TRANSACTION_CONTROL.test(withoutQuotedTextOrComments(sql))
}

function withoutQuotedTextOrComments(sql: string): string {
  let code = ''
  let end = 0
  QUOTED_OR_COMMENT_START.lastIndex = 0
  for (let match; (match = QUOTED_OR_COMMENT_START.exec(sql));) {
    code += `${sql.slice(end, match.index)} `
    end =
      match[0] === '/*' ? endOfBlockComment(sql, match.index) : QUOTED_OR_COMMENT_START.lastIndex
    QUOTED_OR_COMMENT_START.lastIndex = end
  }
  return code + sql.slice(end)
}

function endOfBlockComment(sql: string, start: number): number {
  let depth = 0
  BLOCK_COMMENT_MARK.lastIndex = start
  for (let mark; (mark = BLOCK_COMMENT_MARK.exec(sql));) {
    depth += mark[0] === '/*' ? 1 : -1
    if (depth === 0) return BLOCK_COMMENT_MARK.lastIndex
  }
  return start + '/*'.length
}

export function loadMigrations(dir = MIGRATIONS_DIR): Migration[] {
  const files = readdirSync(dir)
    .filter((file) => file.toLowerCase().endsWith('.sql'))
    .sort()
  return files.map((file, index) => {
    const match = FILE_NAME.exec(file)
    if (!match) {
      throw new MigrationError('bad_file_name', `${file} must be named NNNN_slug.sql`)
    }
    const expected = String(index + 1).padStart(4, '0')
    if (match[1] !== expected) {
      throw new MigrationError('gap_in_sequence', `${file} should be numbered ${expected}`)
    }
    const sql = readFileSync(path.join(dir, file), 'utf8')
    if (controlsTransaction(sql)) {
      throw new MigrationError(
        'transaction_control',
        `${file} contains a transaction statement (BEGIN, COMMIT, END, ROLLBACK, ABORT or SAVEPOINT); the runner wraps each file in its own transaction`
      )
    }
    return { name: file.slice(0, -'.sql'.length), checksum: checksumOf(sql), sql }
  })
}

export type MigrateResult = { applied: string[]; alreadyApplied: number }

export async function migrate(
  pool: Pool,
  migrations = loadMigrations(),
  lockTimeout = LOCK_TIMEOUT
): Promise<MigrateResult> {
  return withLockedClient(pool, lockTimeout, async (client) => {
    const applied = (await ledgerExists(client)) ? await appliedMigrations(client) : new Map()
    if (applied.size === 0 && (await hasTables(client))) {
      throw new MigrationError(
        'baseline_required',
        'this database already has tables but schema_migrations records nothing. Run `npx tsx scripts/record-baseline.ts` once against this database first.'
      )
    }
    await client.query(CREATE_LEDGER)
    const byName = new Map(migrations.map((migration) => [migration.name, migration]))
    for (const [name, checksum] of applied) {
      const file = byName.get(name)
      if (!file) {
        throw new MigrationError('applied_without_file', `${name} is applied but has no file`)
      }
      if (file.checksum !== checksum) {
        throw new MigrationError(
          'checksum_mismatch',
          `${name} was applied with checksum ${checksum} but the file now has ${file.checksum}`
        )
      }
    }
    const pending = migrations.filter((migration) => !applied.has(migration.name))
    for (const migration of pending) await applyMigration(client, migration)
    return { applied: pending.map((migration) => migration.name), alreadyApplied: applied.size }
  })
}

async function withLockedClient<T>(
  pool: Pool,
  lockTimeout: string,
  work: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  const connectionErrorsSurfaceThroughTheirQueries = () => undefined
  client.on('error', connectionErrorsSurfaceThroughTheirQueries)
  try {
    await acquireLock(client, lockTimeout)
    return await work(client)
  } finally {
    client.off('error', connectionErrorsSurfaceThroughTheirQueries)
    client.release(true)
  }
}

async function acquireLock(client: PoolClient, lockTimeout: string): Promise<void> {
  await client.query('SELECT set_config($1, $2, false)', ['lock_timeout', lockTimeout])
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY])
  } catch (error) {
    if (sqlState(error) !== LOCK_NOT_AVAILABLE) throw error
    throw new MigrationError(
      'lock_timeout',
      `another migration run has held the lock for more than ${lockTimeout}`,
      error
    )
  }
  await client.query('RESET lock_timeout')
}

async function inTransaction<T>(client: PoolClient, work: () => Promise<T>): Promise<T> {
  await client.query('BEGIN')
  try {
    const result = await work()
    await client.query('COMMIT')
    return result
  } catch (error) {
    await rollbackBeforeRethrow(client)
    throw error
  }
}

function rollbackBeforeRethrow(client: PoolClient): Promise<void> {
  return client.query('ROLLBACK').then(
    () => undefined,
    () => undefined
  )
}

async function applyMigration(client: PoolClient, migration: Migration): Promise<void> {
  try {
    await inTransaction(client, async () => {
      await client.query('RESET ALL')
      await client.query('SET LOCAL standard_conforming_strings = on')
      await client.query(migration.sql)
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [
        migration.name,
        migration.checksum,
      ])
    })
  } catch (error) {
    throw new MigrationError('apply_failed', `${migration.name}: ${describe(error)}`, error)
  }
}

export async function migrateDatabase(): Promise<MigrateResult> {
  try {
    return await migrate(getPool())
  } finally {
    await closePool()
  }
}

export type RecordBaselineResult = { recorded: boolean }

export async function recordBaseline(
  pool: Pool,
  migrations = loadMigrations()
): Promise<RecordBaselineResult> {
  const [baseline] = migrations
  return withLockedClient(pool, LOCK_TIMEOUT, (client) =>
    inTransaction(client, async () => {
      const missing = await missingTables(client, tablesCreatedBy(baseline.sql))
      if (missing.length > 0) {
        throw new MigrationError(
          'schema_mismatch',
          `this database lacks ${missing.join(', ')}, which ${baseline.name} creates; record the baseline only on a database that already has its schema`
        )
      }
      await client.query(CREATE_LEDGER)
      const existing = await appliedMigrations(client)
      const recorded = existing.get(baseline.name)
      if (recorded === baseline.checksum) return { recorded: false }
      if (recorded !== undefined) {
        throw new MigrationError(
          'checksum_mismatch',
          `${baseline.name} was recorded with checksum ${recorded} but the file now has ${baseline.checksum}`
        )
      }
      if (existing.size > 0) {
        throw new MigrationError(
          'ledger_not_empty',
          `schema_migrations already records ${[...existing.keys()].join(', ')}`
        )
      }
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [
        baseline.name,
        baseline.checksum,
      ])
      return { recorded: true }
    })
  )
}

export async function recordProductionBaseline(): Promise<RecordBaselineResult> {
  try {
    return await recordBaseline(getPool())
  } finally {
    await closePool()
  }
}

async function appliedMigrations(client: PoolClient): Promise<Map<string, string>> {
  const { rows } = await client.query<{ name: string; checksum: string }>(
    'SELECT name, checksum FROM schema_migrations ORDER BY name'
  )
  return new Map(rows.map((row) => [row.name, row.checksum]))
}

async function tableExists(client: PoolClient, name: string): Promise<boolean> {
  const { rows } = await client.query<{ present: boolean }>(
    'SELECT to_regclass($1) IS NOT NULL AS present',
    [name]
  )
  return rows[0].present
}

async function hasTables(client: PoolClient): Promise<boolean> {
  const { rows } = await client.query<{ present: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations') AS present"
  )
  return rows[0].present
}

function tablesCreatedBy(sql: string): string[] {
  return [...sql.matchAll(/CREATE TABLE (?:public\.)?"?(\w+)"?/gi)].map((match) => match[1])
}

async function missingTables(client: PoolClient, names: string[]): Promise<string[]> {
  const missing: string[] = []
  for (const name of names) {
    if (!(await tableExists(client, `public.${quote(name)}`))) missing.push(name)
  }
  return missing
}

function ledgerExists(client: PoolClient): Promise<boolean> {
  return tableExists(client, 'schema_migrations')
}

function sqlState(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
