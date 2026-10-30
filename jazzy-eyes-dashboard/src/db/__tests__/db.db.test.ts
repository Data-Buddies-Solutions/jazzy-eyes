import type { Socket } from 'node:net'
import type pg from 'pg'
import { describe, expect, it, vi } from 'vitest'
import { db, getPool, type Db } from '../pool'
import { count, expression, sql } from '../sql'

function dropConnection(client: pg.PoolClient): void {
  const { connection } = client as unknown as { connection: { stream: Socket } }
  connection.stream.destroy()
}

function nextAcquiredClient(): Promise<pg.PoolClient> {
  return new Promise((resolve) => getPool().once('acquire', resolve))
}

function insertBrand(id: number) {
  return sql`INSERT INTO brands (id, company_name, company_id, brand_name, allocation_quantity, discount_percentage, updated_at)
    VALUES (${id}, ${'Acme'}, ${10}, ${`Brand ${id}`}, ${5}, ${0}, now())`
}

const brandId = expression<number>()('id', sql`id`)
const total = () => db.one(sql`SELECT ${count('n')} FROM brands`)

describe('db', () => {
  it('inserts, reads one typed row, counts, and reports affected rows', async () => {
    expect(await db.affected(insertBrand(1))).toBe(1)

    expect(await db.one(sql`SELECT ${brandId} FROM brands WHERE id = ${1}`)).toEqual({ id: 1 })
    expect(await total()).toEqual({ n: 1 })
    expect(await db.one(sql`SELECT ${brandId} FROM brands WHERE id = ${2}`)).toBeNull()
    expect(await db.rows(sql`SELECT ${brandId} FROM brands`)).toEqual([{ id: 1 }])
  })

  it('reports zero affected rows for a duplicate insert with ON CONFLICT DO NOTHING', async () => {
    await db.affected(insertBrand(1))

    expect(await db.affected(sql`${insertBrand(1)} ON CONFLICT DO NOTHING`)).toBe(0)
  })

  it('commits a transaction on return and rolls it back on throw', async () => {
    const result = await db.transaction(async (tx) => {
      await tx.affected(insertBrand(1))
      return 'done' as const
    })
    expect(result).toBe('done')
    expect(await total()).toEqual({ n: 1 })

    await expect(
      db.transaction(async (tx) => {
        await tx.affected(insertBrand(2))
        throw new Error('abort')
      })
    ).rejects.toThrow('abort')
    expect(await total()).toEqual({ n: 1 })
  })

  it(
    'runs a db.* call made inside the transaction callback on the transaction connection',
    { timeout: 2000 },
    async () => {
      await db.transaction(async (tx) => {
        await tx.affected(insertBrand(1))
        expect(await total()).toEqual({ n: 1 })
      })
    }
  )

  it(
    'nests a transaction as a savepoint so an inner rollback keeps the outer work',
    { timeout: 2000 },
    async () => {
      await db.transaction(async (tx) => {
        await tx.affected(insertBrand(1))
        await expect(
          db.transaction(async (inner) => {
            await inner.affected(insertBrand(2))
            throw new Error('inner abort')
          })
        ).rejects.toThrow('inner abort')
        expect(await tx.one(sql`SELECT ${count('n')} FROM brands`)).toEqual({ n: 1 })
      })
      expect(await total()).toEqual({ n: 1 })
    }
  )

  it(
    'nests three levels deep so the innermost rollback keeps the middle and outer work',
    { timeout: 2000 },
    async () => {
      await db.transaction(async (tx) => {
        await tx.affected(insertBrand(1))
        await db.transaction(async (middle) => {
          await middle.affected(insertBrand(2))
          await expect(
            db.transaction(async (inner) => {
              await inner.affected(insertBrand(3))
              throw new Error('deepest abort')
            })
          ).rejects.toThrow('deepest abort')
          expect(await total()).toEqual({ n: 2 })
        })
        expect(await total()).toEqual({ n: 2 })
      })
      expect(await total()).toEqual({ n: 2 })
    }
  )

  it(
    'rejects a nested transaction that starts while a sibling nested transaction is open',
    { timeout: 2000 },
    async () => {
      await db.transaction(async (tx) => {
        await tx.affected(insertBrand(1))
        const [failed, sibling] = await Promise.allSettled([
          db.transaction(async (inner) => {
            await inner.affected(insertBrand(2))
            throw new Error('inner abort')
          }),
          db.transaction((inner) => inner.affected(insertBrand(3))),
        ])
        expect(failed).toMatchObject({ status: 'rejected', reason: new Error('inner abort') })
        expect(sibling).toMatchObject({
          status: 'rejected',
          reason: new Error(
            'a nested db.transaction started while a sibling nested transaction was still open; savepoints are a stack, so await the sibling first'
          ),
        })
        expect(await tx.one(sql`SELECT ${count('n')} FROM brands`)).toEqual({ n: 1 })
      })
      expect(await total()).toEqual({ n: 1 })
    }
  )

  it(
    'closes an inner handle when its savepoint finishes while the outer transaction is still open',
    { timeout: 2000 },
    async () => {
      await db.transaction(async (tx) => {
        const inner = await db.transaction(async (handle) => handle)
        await expect(inner.rows(sql`SELECT 1`)).rejects.toThrow(
          'tx handle used after the transaction finished'
        )
        expect(await tx.one(sql`SELECT 1 AS one`)).toEqual({ one: 1 })
      })
    }
  )

  it(
    'runs sequential sibling nested transactions, including one after a failed sibling',
    { timeout: 2000 },
    async () => {
      await db.transaction(async () => {
        await db.transaction((inner) => inner.affected(insertBrand(1)))
        await db.transaction((inner) => inner.affected(insertBrand(2)))
        await expect(
          db.transaction(async (inner) => {
            await inner.affected(insertBrand(3))
            throw new Error('inner abort')
          })
        ).rejects.toThrow('inner abort')
        await db.transaction((inner) => inner.affected(insertBrand(4)))
        expect(await total()).toEqual({ n: 3 })
      })
      expect(await total()).toEqual({ n: 3 })
    }
  )

  it('leaves no error listener behind after many transactions on one client', async () => {
    const warnings: string[] = []
    const onWarning = (warning: Error) => {
      warnings.push(warning.name)
    }
    process.on('warning', onWarning)
    try {
      const acquired = nextAcquiredClient()
      await db.transaction(async () => undefined)
      const client = await acquired
      const baseline = client.listenerCount('error')
      for (let i = 0; i < 12; i++) {
        await db.transaction(async (tx) => {
          await tx.one(sql`SELECT 1 AS one`)
        })
      }
      await new Promise((resolve) => setImmediate(resolve))
      expect(client.listenerCount('error')).toBe(baseline)
      expect(warnings).not.toContain('MaxListenersExceededWarning')
    } finally {
      process.off('warning', onWarning)
    }
  })

  it('refuses a tx handle once the transaction has committed or rolled back', async () => {
    const committed = await db.transaction(async (tx) => tx)
    await expect(committed.rows(sql`SELECT 1`)).rejects.toThrow(
      'tx handle used after the transaction finished'
    )

    let rolledBack: Db | undefined
    await db
      .transaction(async (tx) => {
        rolledBack = tx
        throw new Error('abort')
      })
      .catch(() => undefined)
    await expect(rolledBack!.one(sql`SELECT 1`)).rejects.toThrow(
      'tx handle used after the transaction finished'
    )
  })

  it('rejects the work, discards the client and stays alive when the connection drops mid-transaction', async () => {
    const acquired = nextAcquiredClient()
    const uncaught = vi.fn()
    process.on('uncaughtException', uncaught)

    try {
      await expect(
        db.transaction(async (tx) => {
          dropConnection(await acquired)
          await tx.rows(sql`SELECT 1`)
        })
      ).rejects.toThrow(/Connection terminated/)
    } finally {
      process.removeListener('uncaughtException', uncaught)
    }

    expect(uncaught).not.toHaveBeenCalled()
    expect(getPool().totalCount).toBe(0)
    expect(await db.one(sql`SELECT 1 AS one`)).toEqual({ one: 1 })
  })

  it(
    'releases the savepoint when a nested transaction returns, leaving only the outer transaction lock',
    { timeout: 2000 },
    async () => {
      const transactionLocks = (tx: Db) =>
        tx.one(
          sql`SELECT ${count('n')} FROM pg_locks WHERE pid = pg_backend_pid() AND locktype = 'transactionid'`
        )
      await db.transaction(async (tx) => {
        await tx.affected(insertBrand(1))
        await db.transaction(async (inner) => {
          await inner.affected(insertBrand(2))
          expect(await transactionLocks(inner)).toEqual({ n: 2 })
        })
        expect(await transactionLocks(tx)).toEqual({ n: 1 })
      })
    }
  )

  it('logs an idle connection failure by message and code, never the error object', () => {
    const error = Object.assign(new Error('terminating connection due to administrator command'), {
      code: '57P01',
    })
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    getPool().emit('error', error, undefined as unknown as pg.PoolClient)

    expect(logged).toHaveBeenCalledWith('Idle database connection failed', {
      message: 'terminating connection due to administrator command',
      code: '57P01',
    })
    logged.mockRestore()
  })

  it('refuses a second statement in the query text instead of running it', async () => {
    try {
      await expect(db.rows(sql`SELECT 1; CREATE TABLE pwned (id int)`)).rejects.toThrow(
        /multiple commands/
      )
      expect(
        await db.one(sql`SELECT ${count('n')} FROM pg_tables WHERE tablename = ${'pwned'}`)
      ).toEqual({ n: 0 })
    } finally {
      await getPool().query('DROP TABLE IF EXISTS pwned')
    }
  })

  it('throws when two selections return the same column name', async () => {
    await expect(
      db.rows(sql`SELECT b.id, p.brand_id AS id FROM brands b, products p`)
    ).rejects.toThrow('returns the column "id" twice')
  })
})
