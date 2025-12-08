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
  frameType: 'Zyl' | 'Metal' | 'Rimless';
  productType: 'Optical' | 'Sunglasses';
  costPrice: number;
  retailPrice: number;
  status: 'Active' | 'Sold' | 'Discontinued';
  dateAdded: string;
  notes: string | null;
  saleDate?: string;
  salePrice?: number;
}

export interface FrameFormData {
  brandId: number;
  styleNumber: string;
  colorCode: string;
  eyeSize: string;
  gender: 'Men' | 'Women' | 'Unisex';
  frameType: 'Zyl' | 'Metal' | 'Rimless';
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
  salePrice?: number;
  saleDate?: string;
}

export interface SearchFilters {
  query: string;
  status: 'All' | 'Active' | 'Sold' | 'Discontinued';
}
