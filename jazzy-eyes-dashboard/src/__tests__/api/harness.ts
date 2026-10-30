import { NextRequest } from 'next/server'
import { afterAll, afterEach, beforeEach, vi } from 'vitest'
import { getPool } from '@/db/pool'

export const NOW = new Date('2026-10-15T16:00:00.000Z')

const SEED = `
INSERT INTO frame_statuses (name, "colorScheme", is_protected, display_order, created_at, updated_at) VALUES
  ('Active', 'green', false, 1, '2026-01-01', '2026-01-01'),
  ('Sold Out', 'blue', true, 2, '2026-01-01', '2026-01-01'),
  ('Discontinued', 'gray', false, 3, '2026-01-01', '2026-01-01');

INSERT INTO brands (id, company_name, company_id, brand_name, allocation_quantity, cost_discount_percent, cost_discount_start_date, created_at, updated_at) VALUES
  (101, 'Kering', 10, 'Gucci', 20, 10.00, '2026-09-01', '2026-01-01', '2026-01-01'),
  (102, 'Kering', 10, 'Saint Laurent', 10, 0, NULL, '2026-01-01', '2026-01-01'),
  (201, 'Luxottica', 20, 'Ray-Ban', 30, NULL, NULL, '2026-01-01', '2026-01-01'),
  (301, 'Indie', 30, 'Empty Brand', 5, 0, NULL, '2026-01-01', '2026-01-01');

INSERT INTO products (composite_id, brand_id, status_id, style_number, color_code, eye_size, gender, frame_type, product_type, current_qty, created_at, updated_at) VALUES
  ('101-GG1-BLK-54', 101, 1, 'GG1', 'BLK', '54', 'Men', 'Full Rim', 'Optical', 2, '2025-10-10', '2026-09-12'),
  ('101-GG2-TRT-52', 101, 2, 'GG2', 'TRT', '52', 'Women', 'Rimless', 'Sun', 0, '2026-08-03', '2026-10-02'),
  ('102-SL1-BLK-55', 102, 1, 'SL1', 'BLK', '55', 'Unisex', 'Semi-Rimless', 'Optical', 1, '2026-10-01', '2026-10-01'),
  ('201-RB1-GLD-50', 201, 3, 'RB1', 'GLD', '50', 'Men', 'Full Rim', 'Sun', 3, '2026-07-15', '2026-10-07'),
  ('201-RB2-RED-49', 201, NULL, 'RB2', 'RED', '49', 'Women', 'Full Rim', 'Optical', 1, '2026-10-14', '2026-10-14');

INSERT INTO inventory_transactions (product_id, transaction_type, transaction_date, invoice_date, invoice_number, quantity, unit_cost, unit_price, status, notes, is_special_order, write_off_reason, remaining_qty, reverted_from_id, created_at, updated_at) VALUES
  ('101-GG1-BLK-54', 'ORDER', '2025-10-10', '2025-10-08', 'INV-1', 3, 100.00, 250.00, 'completed', NULL, false, NULL, 2, NULL, '2025-10-10', '2025-10-10'),
  ('101-GG1-BLK-54', 'SALE', '2026-09-12', NULL, NULL, 1, 100.00, 250.00, 'completed', NULL, false, NULL, NULL, NULL, '2026-09-12', '2026-09-12'),
  ('101-GG2-TRT-52', 'ORDER', '2026-08-03', '2026-08-01', 'INV-2', 2, 120.50, 300.00, 'completed', NULL, false, NULL, 0, NULL, '2026-08-03', '2026-08-03'),
  ('101-GG2-TRT-52', 'SALE', '2026-09-20', NULL, NULL, 1, 120.50, 289.99, 'completed', NULL, false, NULL, NULL, NULL, '2026-09-20', '2026-09-20'),
  ('101-GG2-TRT-52', 'SALE', '2026-10-02', NULL, NULL, 1, 120.50, 300.00, 'completed', 'special order pickup', true, NULL, NULL, NULL, '2026-10-02', '2026-10-02'),
  ('102-SL1-BLK-55', 'ORDER', '2026-10-01', '2026-09-29', 'INV-3', 1, 80.00, 199.00, 'completed', NULL, false, NULL, 1, NULL, '2026-10-01', '2026-10-01'),
  ('201-RB1-GLD-50', 'ORDER', '2026-07-15', NULL, NULL, 4, 60.00, 150.00, 'completed', NULL, false, NULL, 3, NULL, '2026-07-15', '2026-07-15'),
  ('201-RB1-GLD-50', 'WRITE_OFF', '2026-09-05', NULL, NULL, 1, 60.00, 0, 'completed', 'cracked lens', false, 'Damaged', NULL, NULL, '2026-09-05', '2026-09-05'),
  ('201-RB1-GLD-50', 'WRITE_OFF', '2026-10-05', NULL, NULL, 1, 60.00, 0, 'completed', NULL, false, 'Lost', NULL, NULL, '2026-10-05', '2026-10-05'),
  ('201-RB1-GLD-50', 'REVERT_WRITE_OFF', '2026-10-06', NULL, NULL, 1, 60.00, 0, 'completed', 'found it', false, NULL, NULL, 9, '2026-10-06', '2026-10-06'),
  ('201-RB1-GLD-50', 'RESTOCK', '2026-10-07', NULL, NULL, 1, 60.00, 150.00, 'completed', NULL, false, NULL, NULL, NULL, '2026-10-07', '2026-10-07'),
  ('201-RB2-RED-49', 'ORDER', '2026-10-14', '2026-10-13', 'INV-4', 1, 55.25, 129.00, 'completed', NULL, true, NULL, 1, NULL, '2026-10-14', '2026-10-14');

INSERT INTO rx_sales (brand_id, style_number, color_code, eye_size, gender, frame_type, product_type, sale_date, sale_price, cost_price, notes, created_at, updated_at) VALUES
  (101, 'GG9', 'BLK', '53', 'Men', 'Full Rim', 'Optical', '2026-10-03', 400.00, 150.00, NULL, '2026-10-03', '2026-10-03'),
  (201, 'RB9', 'BLU', '51', 'Women', 'Full Rim', 'Optical', '2026-09-25', 220.00, 0, 'walk-in', '2026-09-25', '2026-09-25');
`

export function useRouteHarness(): void {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW })
    await getPool().query(SEED)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  afterAll(async () => {
    const leftover = (globalThis as { prisma?: { $disconnect(): Promise<void> } }).prisma
    await leftover?.$disconnect()
  })
}

type Handler = (request: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<Response>

export type Call = {
  method?: string
  path: string
  params?: Record<string, string>
  body?: unknown
}

export async function call(handler: Handler, { method = 'GET', path, params = {}, body }: Call) {
  const request = new NextRequest(new URL(path, 'http://localhost'), {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const response = await handler(request, { params: Promise.resolve(params) })
  const text = await response.text()
  let parsed: unknown = text
  try {
    parsed = JSON.parse(text)
  } catch {}
  return { status: response.status, body: withoutTimestamps(parsed) }
}

const TIMESTAMP_KEYS = new Set(['createdAt', 'updatedAt', 'created_at', 'updated_at'])

function withoutTimestamps(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(withoutTimestamps)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [
        key,
        TIMESTAMP_KEYS.has(key) ? '<timestamp>' : withoutTimestamps(inner),
      ])
    )
  }
  return value
}

const STATE_QUERIES = {
  brands: 'SELECT * FROM brands ORDER BY id',
  frame_statuses: 'SELECT * FROM frame_statuses ORDER BY id',
  products: 'SELECT * FROM products ORDER BY composite_id',
  inventory_transactions: 'SELECT * FROM inventory_transactions ORDER BY id',
  rx_sales: 'SELECT * FROM rx_sales ORDER BY id',
}

export async function tableState(): Promise<Record<string, unknown>> {
  const state: Record<string, unknown> = {}
  for (const [table, query] of Object.entries(STATE_QUERIES)) {
    const { rows } = await getPool().query(query)
    state[table] = withoutTimestamps(rows)
  }
  return state
}
