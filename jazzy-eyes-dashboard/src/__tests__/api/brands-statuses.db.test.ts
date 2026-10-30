import type { NextRequest } from 'next/server'
import { describe, expect, test } from 'vitest'
import { getPool } from '@/db/pool'
import { call, tableState, useRouteHarness, type Call } from './harness'
import * as brands from '../../../app/api/brands/route'
import * as brand from '../../../app/api/brands/[id]/route'
import * as company from '../../../app/api/brands/company/[companyId]/route'
import * as statuses from '../../../app/api/statuses/route'
import * as status from '../../../app/api/statuses/[id]/route'

useRouteHarness()

// The harness types params as Record<string, string>; routes declare their own param names.
type Route = (request: NextRequest, context: { params: Promise<never> }) => Promise<Response>
type Handler = Parameters<typeof call>[0]

async function read(handler: Route, request: Call) {
  expect(await call(handler as Handler, request)).toMatchSnapshot()
}

async function write(handler: Route, request: Call) {
  const response = await call(handler as Handler, request)
  expect({ response, state: await tableState() }).toMatchSnapshot()
}

function sql(text: string) {
  return getPool().query(text)
}

const insertBrand = (values: string) =>
  sql(`INSERT INTO brands (id, company_name, company_id, brand_name, allocation_quantity, cost_discount_percent, cost_discount_start_date, created_at, updated_at)
       VALUES (${values}, '2026-01-01', '2026-01-01')`)

const insertRxSale = (brandId: number) =>
  sql(`INSERT INTO rx_sales (brand_id, style_number, color_code, eye_size, gender, frame_type, product_type, sale_date, sale_price, cost_price, notes, created_at, updated_at)
       VALUES (${brandId}, 'X1', 'BLK', '50', 'Men', 'Full Rim', 'Optical', '2026-10-01', 100, 40, NULL, '2026-10-01', '2026-10-01')`)

const insertUnusedStatus = () =>
  sql(`INSERT INTO frame_statuses (name, "colorScheme", is_protected, display_order, created_at, updated_at)
       VALUES ('Archived', 'purple', false, 0, '2026-01-01', '2026-01-01')`)

describe('GET /api/brands', () => {
  test('groups brands by company with product counts and a name-sorted list', async () => {
    await read(brands.GET, { path: '/api/brands' })
  })

  test('returns empty lists when there are no brands', async () => {
    await sql('TRUNCATE brands CASCADE')
    await read(brands.GET, { path: '/api/brands' })
  })
})

describe('POST /api/brands', () => {
  const post = (body?: unknown) => write(brands.POST, { method: 'POST', path: '/api/brands', body })

  test('missing body fails with 500', async () => {
    await post()
  })

  test('missing type is rejected', async () => {
    await post({ companyName: 'Acme' })
  })

  test('unknown type is rejected', async () => {
    await post({ type: 'widget' })
  })

  test('company: proposes the next thousand above the highest company id', async () => {
    await post({ type: 'company', companyName: 'Acme' })
  })

  test('company: steps to the next thousand when the highest id is a multiple of 1000', async () => {
    await insertBrand(`1001, 'Big', 1000, 'Big One', 1, 0, NULL`)
    await post({ type: 'company', companyName: 'Acme' })
  })

  test('company: proposes 1000 when there are no brands', async () => {
    await sql('TRUNCATE brands CASCADE')
    await post({ type: 'company', companyName: 'Acme' })
  })

  test.each([
    ['missing companyName', {}],
    ['empty companyName', { companyName: '' }],
    ['companyName over 255 characters', { companyName: 'x'.repeat(256) }],
  ])('company: rejects %s', async (_name, fields) => {
    await post({ type: 'company', ...fields })
  })

  const validBrand = {
    type: 'brand',
    brandId: 401,
    companyName: 'Indie',
    companyId: 30,
    brandName: 'New Brand',
    allocationQuantity: 12,
  }

  test('brand: creates a brand', async () => {
    await post(validBrand)
  })

  test('brand: coerces numeric strings for brandId and allocationQuantity', async () => {
    await post({ ...validBrand, brandId: '402', allocationQuantity: '0' })
  })

  test('brand: allows a company name that differs from the existing company id', async () => {
    await post({ ...validBrand, companyName: 'Not Kering', companyId: 10 })
  })

  test('brand: duplicate brand id conflicts', async () => {
    await post({ ...validBrand, brandId: 101 })
  })

  test('brand: duplicate brand name fails with 500', async () => {
    await post({ ...validBrand, brandName: 'Gucci' })
  })

  test.each([
    ['brandId of 0', { brandId: 0 }],
    ['negative brandId', { brandId: -5 }],
    ['non-numeric brandId', { brandId: 'abc' }],
    ['fractional brandId', { brandId: 1.5 }],
    ['missing brandId', { brandId: undefined }],
    ['empty companyName', { companyName: '' }],
    ['missing companyId', { companyId: undefined }],
    ['string companyId', { companyId: '30' }],
    ['companyId of 0', { companyId: 0 }],
    ['empty brandName', { brandName: '' }],
    ['brandName over 255 characters', { brandName: 'x'.repeat(256) }],
    ['negative allocation', { allocationQuantity: -1 }],
    ['allocation of 1000', { allocationQuantity: 1000 }],
    ['fractional allocation', { allocationQuantity: 2.5 }],
  ])('brand: rejects %s', async (_name, fields) => {
    await post({ ...validBrand, ...fields })
  })
})

describe('GET /api/brands/[id]', () => {
  const get = (id: string) => read(brand.GET, { path: `/api/brands/${id}`, params: { id } })

  test('returns a brand with its product count', async () => {
    await get('101')
  })

  test('returns a brand with no products', async () => {
    await get('301')
  })

  test('parses a leading integer from a mixed id', async () => {
    await get('101abc')
  })

  test('non-numeric id is rejected', async () => {
    await get('abc')
  })

  test('unknown id is not found', async () => {
    await get('999')
  })
})

describe('PUT /api/brands/[id]', () => {
  const put = (id: string, body?: unknown) =>
    write(brand.PUT, { method: 'PUT', path: `/api/brands/${id}`, params: { id }, body })

  test('non-numeric id is rejected', async () => {
    await put('abc', { brandName: 'X' })
  })

  test('missing body fails with 500', async () => {
    await put('301')
  })

  test.each([
    ['id of 0', { id: 0 }],
    ['non-numeric id', { id: 'abc' }],
    ['empty brandName', { brandName: '' }],
    ['brandName over 255 characters', { brandName: 'x'.repeat(256) }],
    ['negative allocation', { allocationQuantity: -1 }],
    ['allocation of 1000', { allocationQuantity: 1000 }],
    ['fractional allocation', { allocationQuantity: 1.5 }],
  ])('rejects %s', async (_name, body) => {
    await put('301', body)
  })

  test('unknown id is not found', async () => {
    await put('999', { brandName: 'X' })
  })

  test('brand with products requires confirmation', async () => {
    await put('101', { brandName: 'Gucci Eyewear' })
  })

  test('brand with products requires confirmation even for a duplicate new id', async () => {
    await put('101', { id: 102 })
  })

  test('brand with products updates once confirmed', async () => {
    await put('101', { brandName: 'Gucci Eyewear', allocationQuantity: '25', confirmed: true })
  })

  test('brand with no products updates without confirmation', async () => {
    await put('301', { allocationQuantity: 0 })
  })

  test('empty body on a brand with no products succeeds without changes', async () => {
    await put('301', {})
  })

  test('same id as the current one takes the plain update path', async () => {
    await put('301', { id: 301, brandName: 'Renamed' })
  })

  test('duplicate brand name fails with 500', async () => {
    await put('301', { brandName: 'Gucci' })
  })

  test('new id that already exists conflicts', async () => {
    await put('301', { id: 101 })
  })

  test('new id recreates the brand under that id', async () => {
    await put('301', { id: 302, brandName: 'Moved Brand', allocationQuantity: 9 })
  })

  test('new id keeps the old name and allocation when omitted', async () => {
    await put('301', { id: 303 })
  })

  test('new id drops the cost discount of the recreated brand', async () => {
    await insertBrand(`501, 'Solo', 40, 'Discounted', 7, 15.50, '2026-08-01'`)
    await put('501', { id: 502 })
  })

  test('new id on a confirmed brand with products fails with 500', async () => {
    await put('101', { id: 105, confirmed: true })
  })

  test('new id on a brand with rx sales but no products fails with 500', async () => {
    await insertBrand(`601, 'Solo', 40, 'Rx Only', 7, 0, NULL`)
    await insertRxSale(601)
    await put('601', { id: 602 })
  })
})

describe('DELETE /api/brands/[id]', () => {
  const del = (id: string) =>
    write(brand.DELETE, { method: 'DELETE', path: `/api/brands/${id}`, params: { id } })

  test('deletes a brand with no products', async () => {
    await del('301')
  })

  test('non-numeric id is rejected', async () => {
    await del('abc')
  })

  test('unknown id is not found', async () => {
    await del('999')
  })

  test('brand with products conflicts', async () => {
    await del('101')
  })

  test('brand with rx sales but no products fails with 500', async () => {
    await insertBrand(`601, 'Solo', 40, 'Rx Only', 7, 0, NULL`)
    await insertRxSale(601)
    await del('601')
  })
})

describe('PUT /api/brands/company/[companyId]', () => {
  const put = (companyId: string, body?: unknown) =>
    write(company.PUT, {
      method: 'PUT',
      path: `/api/brands/company/${companyId}`,
      params: { companyId },
      body,
    })

  test('renames every brand in the company', async () => {
    await put('10', { companyName: 'Kering Eyewear' })
  })

  test('renames a single-brand company', async () => {
    await put('30', { companyName: 'Indie Co' })
  })

  test('non-numeric company id is rejected', async () => {
    await put('abc', { companyName: 'X' })
  })

  test('missing body fails with 500', async () => {
    await put('10')
  })

  test.each([
    ['missing companyName', {}],
    ['empty companyName', { companyName: '' }],
    ['companyName over 255 characters', { companyName: 'x'.repeat(256) }],
  ])('rejects %s', async (_name, body) => {
    await put('10', body)
  })

  test('unknown company is not found', async () => {
    await put('99', { companyName: 'Ghost' })
  })
})

describe('GET /api/statuses', () => {
  test('lists statuses by display order with product counts', async () => {
    await insertUnusedStatus()
    await read(statuses.GET, { path: '/api/statuses' })
  })

  test('returns an empty list when there are no statuses', async () => {
    await sql('TRUNCATE frame_statuses CASCADE')
    await read(statuses.GET, { path: '/api/statuses' })
  })
})

describe('POST /api/statuses', () => {
  const post = (body?: unknown) =>
    write(statuses.POST, { method: 'POST', path: '/api/statuses', body })

  test('creates a status after the highest display order', async () => {
    await post({ name: 'Reserved', colorScheme: 'yellow', isProtected: true, displayOrder: 99 })
  })

  test('creates the first status with display order 1', async () => {
    await sql('TRUNCATE frame_statuses CASCADE')
    await post({ name: 'Reserved', colorScheme: 'yellow' })
  })

  test('duplicate name conflicts', async () => {
    await post({ name: 'Active', colorScheme: 'red' })
  })

  test('name differing only in case is accepted', async () => {
    await post({ name: 'active', colorScheme: 'red' })
  })

  test('missing body fails with 500', async () => {
    await post()
  })

  test.each([
    ['missing name', { colorScheme: 'red' }],
    ['empty name', { name: '', colorScheme: 'red' }],
    ['name over 50 characters', { name: 'x'.repeat(51), colorScheme: 'red' }],
    ['missing colorScheme', { name: 'Reserved' }],
    ['unknown colorScheme', { name: 'Reserved', colorScheme: 'teal' }],
  ])('rejects %s', async (_name, body) => {
    await post(body)
  })
})

describe('GET /api/statuses/[id]', () => {
  const get = (id: string) => read(status.GET, { path: `/api/statuses/${id}`, params: { id } })

  test('returns a status with its product count', async () => {
    await get('1')
  })

  test('returns a protected status', async () => {
    await get('2')
  })

  test('non-numeric id is rejected', async () => {
    await get('abc')
  })

  test('unknown id is not found', async () => {
    await get('999')
  })
})

describe('PUT /api/statuses/[id]', () => {
  const put = (id: string, body?: unknown) =>
    write(status.PUT, { method: 'PUT', path: `/api/statuses/${id}`, params: { id }, body })

  test('non-numeric id is rejected', async () => {
    await put('abc', { name: 'X' })
  })

  test('missing body fails with 500', async () => {
    await put('1')
  })

  test.each([
    ['empty name', { name: '' }],
    ['name over 50 characters', { name: 'x'.repeat(51) }],
    ['unknown colorScheme', { colorScheme: 'teal' }],
    ['negative displayOrder', { displayOrder: -1 }],
    ['fractional displayOrder', { displayOrder: 1.5 }],
    ['string displayOrder', { displayOrder: '2' }],
  ])('rejects %s', async (_name, body) => {
    await put('1', body)
  })

  test('unknown id is not found', async () => {
    await put('999', { name: 'X' })
  })

  test('protected status is forbidden', async () => {
    await put('2', { name: 'Gone', confirmed: true })
  })

  test('duplicate name conflicts before confirmation is asked', async () => {
    await put('1', { name: 'Discontinued' })
  })

  test('status with products requires confirmation', async () => {
    await put('1', { colorScheme: 'red' })
  })

  test('keeping the same name skips the duplicate check', async () => {
    await put('1', { name: 'Active', confirmed: true })
  })

  test('status with products updates once confirmed', async () => {
    await put('1', { name: 'Available', colorScheme: 'red', displayOrder: 5, confirmed: true })
  })

  test('unused status updates without confirmation', async () => {
    await insertUnusedStatus()
    await put('4', { name: 'Archive', colorScheme: 'orange', displayOrder: 0, isProtected: true })
  })

  test('empty body on an unused status succeeds without changes', async () => {
    await insertUnusedStatus()
    await put('4', {})
  })
})

describe('DELETE /api/statuses/[id]', () => {
  const del = (id: string) =>
    write(status.DELETE, { method: 'DELETE', path: `/api/statuses/${id}`, params: { id } })

  test('deletes an unused status', async () => {
    await insertUnusedStatus()
    await del('4')
  })

  test('non-numeric id is rejected', async () => {
    await del('abc')
  })

  test('unknown id is not found', async () => {
    await del('999')
  })

  test('protected status is forbidden', async () => {
    await del('2')
  })

  test('status with products conflicts', async () => {
    await del('1')
  })
})
