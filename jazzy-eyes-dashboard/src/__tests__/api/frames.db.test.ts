import { describe, expect, test } from 'vitest'
import type { NextRequest } from 'next/server'
import { getPool } from '@/db/pool'
import { call, tableState, useRouteHarness, type Call } from './harness'
import * as frames from '../../../app/api/frames/route'
import * as frame from '../../../app/api/frames/[id]/route'
import * as search from '../../../app/api/frames/search/route'
import * as writeOffs from '../../../app/api/write-offs/route'
import * as rxSales from '../../../app/api/rx-sales/route'

useRouteHarness()

// The harness types params as Record<string, string>; routes declare their own param names.
type Route = (request: NextRequest, context: { params: Promise<never> }) => Promise<Response>
type Handler = Parameters<typeof call>[0]

const send = (handler: Route, request: Call) => call(handler as Handler, request)

async function read(handler: Route, request: Call) {
  expect(await send(handler, request)).toMatchSnapshot()
}

async function write(handler: Route, request: Call) {
  const response = await send(handler, request)
  expect({ response, state: await tableState() }).toMatchSnapshot()
}

function sql(text: string) {
  return getPool().query(text)
}

const insertProduct = (compositeId: string, brandId: number, statusId: number | null, qty: number) => {
  const [, style, color, eye] = compositeId.split('-')
  return sql(`INSERT INTO products (composite_id, brand_id, status_id, style_number, color_code, eye_size, gender, frame_type, product_type, current_qty, created_at, updated_at)
              VALUES ('${compositeId}', ${brandId}, ${statusId ?? 'NULL'}, '${style}', '${color}', '${eye}', 'Women', 'Zyl', 'Optical', ${qty}, '2026-06-01', '2026-06-01')`)
}

const insertTransaction = (
  productId: string,
  type: string,
  date: string,
  { quantity = 1, unitCost = 50, unitPrice = 100, remainingQty = 'NULL', reason = 'NULL', notes = 'NULL' } = {}
) =>
  sql(`INSERT INTO inventory_transactions (product_id, transaction_type, transaction_date, quantity, unit_cost, unit_price, write_off_reason, remaining_qty, notes, created_at, updated_at)
       VALUES ('${productId}', '${type}', '${date}', ${quantity}, ${unitCost}, ${unitPrice}, ${reason}, ${remainingQty}, ${notes}, '${date}', '${date}')`)

// Zero-quantity products that exercise every display-status rule in the search route.
async function addZeroQtyProducts() {
  await insertProduct('301-RET-WHT-50', 301, 1, 0)
  await insertTransaction('301-RET-WHT-50', 'ORDER', '2026-06-01', { remainingQty: '1' })
  await insertTransaction('301-RET-WHT-50', 'WRITE_OFF', '2026-06-10', { reason: "'return'", unitCost: 0, unitPrice: 0 })
  await insertProduct('301-DMG-GRY-51', 301, 1, 0)
  await insertTransaction('301-DMG-GRY-51', 'ORDER', '2026-06-02', { remainingQty: '0' })
  await insertTransaction('301-DMG-GRY-51', 'WRITE_OFF', '2026-06-11', { reason: "'damaged'", unitPrice: 0 })
  await insertProduct('301-DSC-BRN-52', 301, 3, 0)
  await insertTransaction('301-DSC-BRN-52', 'ORDER', '2026-06-03', { remainingQty: '0' })
  await insertTransaction('301-DSC-BRN-52', 'SALE', '2026-06-12')
}

const minimalFrame = {
  brandId: 102,
  styleNumber: 'SL9',
  colorCode: 'NAV',
  eyeSize: '51',
  gender: 'Unisex',
  frameType: 'Metal',
  productType: 'Optical',
  costPrice: 75,
  retailPrice: 180,
}

describe('GET /api/frames', () => {
  test('lists every product newest first with brand and transactions', async () => {
    await read(frames.GET, { path: '/api/frames' })
  })
})

describe('POST /api/frames', () => {
  test('creates a new product with an ORDER dated by its invoice date', async () => {
    await write(frames.POST, {
      method: 'POST',
      path: '/api/frames',
      body: {
        ...minimalFrame,
        brandId: '101',
        productType: 'Sunglasses',
        invoiceDate: '2026-10-10',
        costPrice: '99.5',
        notes: 'first in',
        isSpecialOrder: true,
      },
    })
  })

  test('creates a new product dated today when no invoice date is given', async () => {
    await write(frames.POST, { method: 'POST', path: '/api/frames', body: minimalFrame })
  })

  test('rejects an existing product with 409', async () => {
    await write(frames.POST, {
      method: 'POST',
      path: '/api/frames',
      body: { ...minimalFrame, brandId: 101, styleNumber: 'GG1', colorCode: 'BLK', eyeSize: '54' },
    })
  })

  test('rejects an unknown brand with 404', async () => {
    await write(frames.POST, { method: 'POST', path: '/api/frames', body: { ...minimalFrame, brandId: 999 } })
  })

  test('rejects an empty body with field errors', async () => {
    await write(frames.POST, { method: 'POST', path: '/api/frames', body: {} })
  })

  test('rejects bad enums, empty strings and negative prices', async () => {
    await write(frames.POST, {
      method: 'POST',
      path: '/api/frames',
      body: {
        ...minimalFrame,
        brandId: 0,
        styleNumber: '',
        gender: 'Other',
        frameType: 'Full Rim',
        productType: 'Sun',
        costPrice: -1,
        retailPrice: 'abc',
        isSpecialOrder: 'yes',
      },
    })
  })

  test('returns 500 for a missing JSON body', async () => {
    await write(frames.POST, { method: 'POST', path: '/api/frames' })
  })

  test('returns 500 and writes nothing for an unparseable invoice date', async () => {
    const response = await send(frames.POST, {
      method: 'POST',
      path: '/api/frames',
      body: { ...minimalFrame, invoiceDate: 'not-a-date' },
    })
    // details carries the database driver's message, which is not part of the contract.
    expect({
      response: { status: response.status, error: (response.body as { error: string }).error },
      state: await tableState(),
    }).toMatchSnapshot()
  })
})

describe('GET /api/frames/[id]', () => {
  test('returns the product with brand and transactions newest first', async () => {
    await read(frame.GET, { path: '/api/frames/201-RB1-GLD-50', params: { id: '201-RB1-GLD-50' } })
  })

  test('returns 404 for an unknown id', async () => {
    await read(frame.GET, { path: '/api/frames/nope', params: { id: 'nope' } })
  })

  test('returns 500 when the id param is missing', async () => {
    await read(frame.GET, { path: '/api/frames/', params: {} })
  })
})

describe('PUT /api/frames/[id]', () => {
  const put = (id: string, body?: unknown) =>
    write(frame.PUT, { method: 'PUT', path: `/api/frames/${id}`, params: { id }, body })

  test('updates attributes in place when the composite id is unchanged', async () => {
    await put('101-GG1-BLK-54', { gender: 'Unisex', frameType: 'Metal', productType: 'Sun' })
  })

  test('moves the product and its transactions when the composite id changes', async () => {
    const response = await send(frame.PUT, {
      method: 'PUT',
      path: '/api/frames/101-GG1-BLK-54',
      params: { id: '101-GG1-BLK-54' },
      body: { styleNumber: 'GG1X', colorCode: 'BLU', costPrice: 110, notes: 'renamed' },
    })
    // The route includes transactions without an order; sort so the snapshot does not depend on row order.
    const product = (response.body as { product: { transactions: { id: number }[] } }).product
    product.transactions.sort((a, b) => a.id - b.id)
    expect({ response, state: await tableState() }).toMatchSnapshot()
  })

  test('rejects a composite id change onto an existing product with 409', async () => {
    await put('101-GG1-BLK-54', { styleNumber: 'GG2', colorCode: 'TRT', eyeSize: '52' })
  })

  test('returns 500 when the new brand does not exist', async () => {
    await put('101-GG1-BLK-54', { brandId: 999 })
  })

  test('updates price, notes, invoice date and special order on the latest ORDER', async () => {
    await put('201-RB1-GLD-50', {
      costPrice: 65,
      retailPrice: 175,
      notes: 'repriced',
      invoiceDate: '2026-07-10',
      isSpecialOrder: true,
    })
  })

  test('clears the invoice date when given an empty string', async () => {
    await put('101-GG1-BLK-54', { invoiceDate: '' })
  })

  test('ignores order fields when the product has no ORDER', async () => {
    await insertProduct('301-NO-ORD-50', 301, 1, 1)
    await put('301-NO-ORD-50', { retailPrice: 10, notes: 'nothing to update' })
  })

  test('returns 404 for an unknown id', async () => {
    await put('nope', { notes: 'x' })
  })

  test('returns 500 for a missing JSON body', async () => {
    await put('101-GG1-BLK-54')
  })
})

describe('PATCH /api/frames/[id]', () => {
  const patch = (id: string, body?: unknown) =>
    write(frame.PATCH, { method: 'PATCH', path: `/api/frames/${id}`, params: { id }, body })

  test('returns 404 for an unknown id', async () => {
    await patch('nope', { action: 'mark_as_sold' })
  })

  test('rejects an unknown action', async () => {
    await patch('101-GG1-BLK-54', { action: 'explode' })
  })

  test('rejects a missing action', async () => {
    await patch('101-GG1-BLK-54', {})
  })

  test('returns 500 for a missing JSON body', async () => {
    await patch('101-GG1-BLK-54')
  })

  describe('mark_as_sold', () => {
    test('sells one unit at retail by default and marks the last unit Sold Out', async () => {
      await patch('102-SL1-BLK-55', { action: 'mark_as_sold' })
    })

    test('applies the brand cost discount for sales on or after its start date', async () => {
      await patch('101-GG1-BLK-54', { action: 'mark_as_sold', salePrice: 95, saleDate: '2026-10-01' })
    })

    test('rejects a price below the discounted wholesale cost', async () => {
      await patch('101-GG1-BLK-54', { action: 'mark_as_sold', salePrice: 80 })
    })

    test('does not discount the cost for sales before the discount start date', async () => {
      await patch('101-GG1-BLK-54', { action: 'mark_as_sold', salePrice: 95, saleDate: '2026-08-15' })
    })

    test('consumes FIFO batches oldest first and averages their cost', async () => {
      await insertTransaction('101-GG1-BLK-54', 'RESTOCK', '2026-10-01', { quantity: 2, unitCost: 120, unitPrice: 250, remainingQty: '2' })
      await sql(`UPDATE products SET current_qty = 4 WHERE composite_id = '101-GG1-BLK-54'`)
      await patch('101-GG1-BLK-54', { action: 'mark_as_sold', quantity: 3, salePrice: 260 })
    })

    test('rejects a quantity below 1', async () => {
      await patch('101-GG1-BLK-54', { action: 'mark_as_sold', quantity: 0 })
    })

    test('rejects a quantity above stock', async () => {
      await patch('101-GG1-BLK-54', { action: 'mark_as_sold', quantity: 3 })
    })

    test('rejects any sale of a zero-stock frame', async () => {
      await patch('101-GG2-TRT-52', { action: 'mark_as_sold' })
    })

    test('returns 500 for a string quantity after consuming FIFO stock', async () => {
      await patch('101-GG1-BLK-54', { action: 'mark_as_sold', quantity: '1', salePrice: 250 })
    })
  })

  describe('write_off', () => {
    test('writes off stock at FIFO cost without the brand discount', async () => {
      await patch('101-GG1-BLK-54', { action: 'write_off', quantity: 1, reason: 'damaged', notes: 'scratched' })
    })

    test('writes off a return at zero cost without consuming FIFO and marks the last unit Sold Out', async () => {
      await patch('102-SL1-BLK-55', { action: 'write_off', quantity: 1, reason: 'return' })
    })

    test('rejects a missing quantity', async () => {
      await patch('101-GG1-BLK-54', { action: 'write_off', reason: 'lost' })
    })

    test('rejects a quantity below 1', async () => {
      await patch('101-GG1-BLK-54', { action: 'write_off', quantity: -1, reason: 'lost' })
    })

    test('rejects a quantity above stock before checking the reason', async () => {
      await patch('101-GG1-BLK-54', { action: 'write_off', quantity: 5 })
    })

    test('rejects a missing reason', async () => {
      await patch('101-GG1-BLK-54', { action: 'write_off', quantity: 1 })
    })

    test('rejects an unknown reason', async () => {
      await patch('101-GG1-BLK-54', { action: 'write_off', quantity: 1, reason: 'Damaged' })
    })
  })

  describe('revert_write_off', () => {
    test('restores the quantity and keeps a non-Sold-Out status', async () => {
      await patch('201-RB1-GLD-50', { action: 'revert_write_off', writeOffTransactionId: 8 })
    })

    test('restores a Sold Out frame to Active with custom notes', async () => {
      await insertTransaction('101-GG2-TRT-52', 'WRITE_OFF', '2026-10-09', { reason: "'lost'", unitCost: 120.5, unitPrice: 0 })
      await patch('101-GG2-TRT-52', { action: 'revert_write_off', writeOffTransactionId: 13, notes: 'turned up' })
    })

    test('rejects an already reverted write-off', async () => {
      await patch('201-RB1-GLD-50', { action: 'revert_write_off', writeOffTransactionId: 9 })
    })

    test('rejects a missing transaction id', async () => {
      await patch('201-RB1-GLD-50', { action: 'revert_write_off' })
    })

    test('returns 404 for an unknown transaction id', async () => {
      await patch('201-RB1-GLD-50', { action: 'revert_write_off', writeOffTransactionId: 999 })
    })

    test('rejects a transaction that is not a write-off', async () => {
      await patch('201-RB1-GLD-50', { action: 'revert_write_off', writeOffTransactionId: 7 })
    })

    test('rejects a write-off that belongs to another frame', async () => {
      await patch('101-GG1-BLK-54', { action: 'revert_write_off', writeOffTransactionId: 8 })
    })

    test('returns 500 for a malformed transaction id', async () => {
      await patch('201-RB1-GLD-50', { action: 'revert_write_off', writeOffTransactionId: 'abc' })
    })
  })

  describe('restock', () => {
    test('restocks a Sold Out frame back to Active with every field given', async () => {
      await patch('101-GG2-TRT-52', {
        action: 'restock',
        quantity: 2,
        invoiceDate: '2026-10-12',
        costPrice: 118,
        notes: 'reorder',
        isSpecialOrder: true,
      })
    })

    test('defaults cost to the latest batch, date to today and keeps the status', async () => {
      await patch('201-RB1-GLD-50', { action: 'restock', quantity: 1 })
    })

    test('uses zero cost and retail for a frame with no batches', async () => {
      await insertProduct('301-NO-ORD-50', 301, 1, 0)
      await patch('301-NO-ORD-50', { action: 'restock', quantity: 1, isSpecialOrder: 'yes' })
    })

    test('rejects a missing quantity', async () => {
      await patch('101-GG1-BLK-54', { action: 'restock' })
    })

    test('rejects a quantity below 1', async () => {
      await patch('101-GG1-BLK-54', { action: 'restock', quantity: 0 })
    })
  })

  describe('change_status', () => {
    test('changes the status', async () => {
      await patch('101-GG1-BLK-54', { action: 'change_status', newStatusId: 3 })
    })

    test('rejects a missing status id', async () => {
      await patch('101-GG1-BLK-54', { action: 'change_status' })
    })

    test('returns 404 for an unknown status id', async () => {
      await patch('101-GG1-BLK-54', { action: 'change_status', newStatusId: 99 })
    })

    test('refuses to set Sold Out manually with 403', async () => {
      await patch('101-GG1-BLK-54', { action: 'change_status', newStatusId: 2 })
    })

    test('returns 500 for a malformed status id', async () => {
      await patch('101-GG1-BLK-54', { action: 'change_status', newStatusId: 'abc' })
    })
  })

  describe('get_transactions', () => {
    test('lists transactions newest first and flags reverted write-offs', async () => {
      await patch('201-RB1-GLD-50', { action: 'get_transactions' })
    })

    test('lists sales without a reverted flag', async () => {
      await patch('101-GG2-TRT-52', { action: 'get_transactions' })
    })
  })

  describe('mark_as_discontinued', () => {
    test('overwrites the latest ORDER notes and status', async () => {
      await patch('101-GG1-BLK-54', { action: 'mark_as_discontinued' })
    })

    test('succeeds without changes when the frame has no ORDER', async () => {
      await insertProduct('301-NO-ORD-50', 301, 1, 1)
      await patch('301-NO-ORD-50', { action: 'mark_as_discontinued' })
    })
  })
})

describe('GET /api/frames/search', () => {
  const find = (query: string) => read(search.GET, { path: `/api/frames/search${query}` })

  test('returns every frame by composite id with default pagination', async () => {
    await find('')
  })

  test('matches brand names case-insensitively in brand mode', async () => {
    await find('?query=gucci')
  })

  test('matches composite id prefixes in brand mode', async () => {
    await find('?query=201-rb')
  })

  test('matches style numbers in brand mode', async () => {
    await find('?query=sl1&searchMode=brand')
  })

  test('matches color codes only in color mode', async () => {
    await find('?query=blk&searchMode=color')
  })

  test('color mode does not match brand names', async () => {
    await find('?query=gucci&searchMode=color')
  })

  test('filters Active frames', async () => {
    await addZeroQtyProducts()
    await find('?status=Active')
  })

  test('filters Sold Out frames, including discontinued and written-off ones at zero', async () => {
    await addZeroQtyProducts()
    await find('?status=Sold%20Out')
  })

  test('filters Discontinued frames', async () => {
    await addZeroQtyProducts()
    await find('?status=Discontinued')
  })

  test('filters Returned frames', async () => {
    await addZeroQtyProducts()
    await find('?status=Returned')
  })

  test('returns nothing for an unknown status', async () => {
    await find('?status=Bogus')
  })

  test('combines query, status and pagination', async () => {
    await addZeroQtyProducts()
    await find('?query=301&status=Sold%20Out&page=2&limit=1')
  })

  test('paginates', async () => {
    await find('?page=2&limit=2')
  })

  test('returns an empty page past the end', async () => {
    await find('?page=9&limit=2')
  })

  test('rejects a zero limit', async () => {
    await find('?limit=0')
  })

  test('rejects a limit above 100', async () => {
    await find('?limit=101')
  })

  test('rejects a non-numeric page', async () => {
    await find('?page=abc')
  })
})

describe('GET /api/write-offs', () => {
  test('lists write-offs newest first with revert links', async () => {
    await read(writeOffs.GET, { path: '/api/write-offs' })
  })
})

describe('GET /api/rx-sales', () => {
  const list = (query: string) => read(rxSales.GET, { path: `/api/rx-sales${query}` })

  test('lists sales newest first with default pagination', async () => {
    await list('')
  })

  test('paginates', async () => {
    await list('?page=2&limit=1')
  })

  test('rejects invalid pagination', async () => {
    await list('?page=0')
  })
})

describe('POST /api/rx-sales', () => {
  const post = (body?: unknown) => write(rxSales.POST, { method: 'POST', path: '/api/rx-sales', body })
  const sale = { brandId: 201, styleNumber: 'RB7', colorCode: 'GRN', eyeSize: '52', salePrice: 210 }

  test('records a sale with defaults for optional fields', async () => {
    await post(sale)
  })

  test('records a sale with every field given', async () => {
    await post({
      ...sale,
      brandId: 101,
      gender: 'Women',
      frameType: 'Metal',
      productType: 'Sun',
      saleDate: '2026-10-11',
      costPrice: 90.5,
      notes: 'rx',
    })
  })

  test('rejects missing required fields', async () => {
    await post({ brandId: 201 })
  })

  test('rejects a zero sale price as missing', async () => {
    await post({ ...sale, salePrice: 0 })
  })

  test('returns 404 for an unknown brand', async () => {
    await post({ ...sale, brandId: 999 })
  })

  test('returns 500 for a string brand id', async () => {
    await post({ ...sale, brandId: '201' })
  })

  test('returns 500 for a missing JSON body', async () => {
    await post()
  })
})
