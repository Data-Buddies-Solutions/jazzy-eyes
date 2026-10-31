export const TRANSACTION_TYPES = ['ORDER', 'SALE', 'WRITE_OFF', 'RESTOCK', 'REVERT_WRITE_OFF'] as const

export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export type Brand = {
  id: number
  companyName: string
  companyId: number
  brandName: string
  allocationQuantity: number
  costDiscountPercent: number | null
  costDiscountStartDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export type FrameStatus = {
  id: number
  name: string
  colorScheme: string
  isProtected: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export type Product = {
  compositeId: string
  brandId: number
  statusId: number | null
  styleNumber: string
  colorCode: string
  eyeSize: string
  gender: string
  frameType: string
  productType: string
  currentQty: number
  createdAt: Date
  updatedAt: Date
}

export type InventoryTransaction = {
  id: number
  productId: string
  transactionType: TransactionType
  transactionDate: Date
  invoiceDate: Date | null
  invoiceNumber: string | null
  quantity: number
  unitCost: number
  unitPrice: number
  status: string
  notes: string | null
  isSpecialOrder: boolean
  writeOffReason: string | null
  remainingQty: number | null
  revertedFromId: number | null
  createdAt: Date
  updatedAt: Date
}

export type RxSale = {
  id: number
  brandId: number
  styleNumber: string
  colorCode: string
  eyeSize: string
  gender: string
  frameType: string
  productType: string
  saleDate: Date
  salePrice: number
  costPrice: number
  notes: string | null
  createdAt: Date
  updatedAt: Date
}
