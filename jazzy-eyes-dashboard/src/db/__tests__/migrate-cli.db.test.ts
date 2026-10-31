import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'
import { loadMigrations } from '../migrate'
import { startTestDatabase } from '../test-database'

const tsx = path.resolve('node_modules/.bin/tsx')

it('runs npm run db:migrate through tsx the way the CLI is used', { timeout: 30_000 }, async () => {
  const database = await startTestDatabase({ migrated: false })
  try {
    const { stdout } = await promisify(execFile)(tsx, ['scripts/migrate.ts'], {
      env: { ...process.env, DATABASE_URL: database.url },
    })

    const names = loadMigrations().map((m) => m.name)
    expect(stdout.trim()).toBe(`Applied: ${names.join(', ')}. Already applied: 0.`)
  } finally {
    await database.stop()
  }
})
