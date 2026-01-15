export interface Brand {
  id: number;
  brandName: string;
  companyName: string;
}

export interface Frame {
  frameId: string;
  brand: string;
  styleNumber: string;
  colorCode: string;
  eyeSize: string;
  gender: 'Men' | 'Women' | 'Unisex';
  frameType: 'Zyl' | 'Metal' | 'Rimless' | 'Semi-rimless' | 'Clip';
  productType: 'Optical' | 'Sunglasses';
  invoiceDate?: string;
  costPrice: number;
  retailPrice: number;
  status: string;
  statusId?: number;
  statusColorScheme?: string;
  dateAdded: string;
  notes: string | null;
  saleDate?: string;
  salePrice?: number;
  currentQty: number;
}

export interface FrameFormData {
  brandId: number;
  styleNumber: string;
  colorCode: string;
  eyeSize: string;
  gender: 'Men' | 'Women' | 'Unisex';
  frameType: 'Zyl' | 'Metal' | 'Rimless' | 'Semi-rimless' | 'Clip';
  productType: 'Optical' | 'Sunglasses';
  invoiceDate?: string;
  costPrice: number;
  retailPrice: number;
  notes?: string;
}

export interface AddFrameResponse {
  success: boolean;
  frameId: string;
  message?: string;
  error?: string;
}

export interface ManualSaleData {
  frameId: string;
  quantity: number;
  salePrice?: number;
  saleDate?: string;
}

export type WriteOffReason = 'damaged' | 'lost' | 'defective' | 'return' | 'other';

export interface WriteOffData {
  frameId: string;
  quantity: number;
  reason: WriteOffReason;
  notes?: string;
}

export interface RevertWriteOffData {
  frameId: string;
  writeOffTransactionId: number;
  notes?: string;
}

export interface RestockData {
  frameId: string;
  quantity: number;
  invoiceDate?: string;
  costPrice?: number;
  notes?: string;
}

export interface InventoryTransactionRecord {
  id: number;
  transactionType: 'ORDER' | 'SALE' | 'WRITE_OFF' | 'RESTOCK' | 'REVERT_WRITE_OFF';
  transactionDate: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  notes: string | null;
  writeOffReason: string | null;
  remainingQty: number | null;
  revertedFromId: number | null;
  isReverted?: boolean;
}

export interface SearchFilters {
  query: string;
  status: 'All' | 'Active' | 'Sold' | 'Discontinued';
}

// Brand Management Types
export interface BrandWithDetails extends Brand {
  allocationQuantity: number;
  companyId: number;
  productCount: number;
}

export interface CompanyGroup {
  companyName: string;
  companyId: number;
  brands: BrandWithDetails[];
  totalBrands: number;
  totalAllocation: number;
}

export interface CreateCompanyData {
  companyName: string;
}

export interface CreateBrandData {
  brandId: number;
  companyName: string;
  companyId: number;
  brandName: string;
  allocationQuantity: number;
}

export interface UpdateBrandData {
  id?: number;
  brandName?: string;
  allocationQuantity?: number;
}

export interface UpdateCompanyData {
  companyName: string;
}

// Frame Status Management Types
export interface FrameStatus {
  id: number;
  name: string;
  colorScheme: 'green' | 'blue' | 'gray' | 'red' | 'yellow' | 'purple' | 'orange' | 'pink';
  isProtected: boolean;
  displayOrder: number;
  productCount: number;
}

export interface CreateStatusData {
  name: string;
  colorScheme: 'green' | 'blue' | 'gray' | 'red' | 'yellow' | 'purple' | 'orange' | 'pink';
}

export interface UpdateStatusData {
  name?: string;
  colorScheme?: 'green' | 'blue' | 'gray' | 'red' | 'yellow' | 'purple' | 'orange' | 'pink';
  displayOrder?: number;
}
