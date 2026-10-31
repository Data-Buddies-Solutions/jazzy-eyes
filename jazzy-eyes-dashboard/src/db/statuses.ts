import { db } from './pool'
import { expression, sql } from './sql'
import { insert, selectAll, set } from './table'
import { frameStatuses } from './tables'
import type { FrameStatus } from './types'

export type StatusWithProductCount = FrameStatus & { productCount: number }

const productCount = expression<number>()(
  'productCount',
  sql`SELECT count(*)::int FROM products WHERE products.status_id = frame_statuses.id`
)

export function listStatusesWithProductCounts(): Promise<StatusWithProductCount[]> {
  return db.rows(
    sql`SELECT ${selectAll(frameStatuses)}, ${productCount} FROM frame_statuses
        ORDER BY frame_statuses.display_order, frame_statuses.id`
  )
}

export function findStatusWithProductCount(id: number): Promise<StatusWithProductCount | null> {
  return db.one(
    sql`SELECT ${selectAll(frameStatuses)}, ${productCount} FROM frame_statuses WHERE frame_statuses.id = ${id}`
  )
}

export async function statusNameExists(name: string): Promise<boolean> {
  return (await db.one(sql`SELECT 1 AS "found" FROM frame_statuses WHERE name = ${name}`)) !== null
}

export async function highestDisplayOrder(): Promise<number | null> {
  const displayOrder = expression<number>()('displayOrder', sql`display_order`)
  const row = await db.one(
    sql`SELECT ${displayOrder} FROM frame_statuses ORDER BY display_order DESC LIMIT 1`
  )
  return row?.displayOrder ?? null
}

export type NewStatus = Pick<FrameStatus, 'name' | 'colorScheme' | 'isProtected' | 'displayOrder'>

export async function createStatus(values: NewStatus): Promise<FrameStatus> {
  const created = await db.one(
    sql`${insert(frameStatuses, values)} RETURNING ${selectAll(frameStatuses)}`
  )
  if (!created) throw new Error(`status ${values.name} was not created`)
  return created
}

export type StatusPatch = Partial<Pick<FrameStatus, 'name' | 'colorScheme' | 'displayOrder'>>

export async function updateStatus(id: number, patch: StatusPatch): Promise<FrameStatus> {
  const updated = await db.one(
    sql`UPDATE frame_statuses SET ${set(frameStatuses, patch)} WHERE id = ${id} RETURNING ${selectAll(frameStatuses)}`
  )
  if (!updated) throw new Error(`status ${id} does not exist`)
  return updated
}

export async function deleteStatus(id: number): Promise<void> {
  const deleted = await db.affected(sql`DELETE FROM frame_statuses WHERE id = ${id}`)
  if (deleted === 0) throw new Error(`status ${id} does not exist`)
}
