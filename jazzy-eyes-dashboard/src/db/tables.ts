import { col, defineTable, nullable } from './table'
import type { Brand, FrameStatus, InventoryTransaction, Product, RxSale } from './types'

export const brands = defineTable<Brand>('brands', {
  id: col('id', 'int'),
  companyName: col('company_name', 'text'),
  companyId: col('company_id', 'int'),
  brandName: col('brand_name', 'text'),
  allocationQuantity: col('allocation_quantity', 'int'),
  costDiscountPercent: nullable('cost_discount_percent', 'numeric'),
  costDiscountStartDate: nullable('cost_discount_start_date', 'date'),
  createdAt: col('created_at', 'timestamp'),
  updatedAt: col('updated_at', 'timestamp'),
})

export const frameStatuses = defineTable<FrameStatus>('frame_statuses', {
  id: col('id', 'int'),
  name: col('name', 'text'),
  colorScheme: col('colorScheme', 'text'),
  isProtected: col('is_protected', 'bool'),
  displayOrder: col('display_order', 'int'),
  createdAt: col('created_at', 'timestamp'),
  updatedAt: col('updated_at', 'timestamp'),
})

export const products = defineTable<Product>('products', {
  compositeId: col('composite_id', 'text'),
  brandId: col('brand_id', 'int'),
  statusId: nullable('status_id', 'int'),
  styleNumber: col('style_number', 'text'),
  colorCode: col('color_code', 'text'),
  eyeSize: col('eye_size', 'text'),
  gender: col('gender', 'text'),
  frameType: col('frame_type', 'text'),
  productType: col('product_type', 'text'),
  currentQty: col('current_qty', 'int'),
  createdAt: col('created_at', 'timestamp'),
  updatedAt: col('updated_at', 'timestamp'),
})

export const inventoryTransactions = defineTable<InventoryTransaction>('inventory_transactions', {
  id: col('id', 'int'),
  productId: col('product_id', 'text'),
  transactionType: col('transaction_type', 'enum'),
  transactionDate: col('transaction_date', 'date'),
  invoiceDate: nullable('invoice_date', 'date'),
  invoiceNumber: nullable('invoice_number', 'text'),
  quantity: col('quantity', 'int'),
  unitCost: col('unit_cost', 'numeric'),
  unitPrice: col('unit_price', 'numeric'),
  status: col('status', 'text'),
  notes: nullable('notes', 'text'),
  isSpecialOrder: col('is_special_order', 'bool'),
  writeOffReason: nullable('write_off_reason', 'text'),
  remainingQty: nullable('remaining_qty', 'int'),
  revertedFromId: nullable('reverted_from_id', 'int'),
  createdAt: col('created_at', 'timestamp'),
  updatedAt: col('updated_at', 'timestamp'),
})

export const rxSales = defineTable<RxSale>('rx_sales', {
  id: col('id', 'int'),
  brandId: col('brand_id', 'int'),
  styleNumber: col('style_number', 'text'),
  colorCode: col('color_code', 'text'),
  eyeSize: col('eye_size', 'text'),
  gender: col('gender', 'text'),
  frameType: col('frame_type', 'text'),
  productType: col('product_type', 'text'),
  saleDate: col('sale_date', 'date'),
  salePrice: col('sale_price', 'numeric'),
  costPrice: col('cost_price', 'numeric'),
  notes: nullable('notes', 'text'),
  createdAt: col('created_at', 'timestamp'),
  updatedAt: col('updated_at', 'timestamp'),
})

export const tables = { brands, frameStatuses, products, inventoryTransactions, rxSales }
