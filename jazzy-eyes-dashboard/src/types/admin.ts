export interface Frame {
  frameId: string;
  brand: string;
  model: string;
  color: string;
  gender: 'Men' | 'Women' | 'Unisex';
  frameType: 'Optical' | 'Sunglasses';
  costPrice: number;
  retailPrice: number;
  status: 'Active' | 'Sold' | 'Discontinued';
  dateAdded: string;
  supplier: string;
  notes: string | null;
  saleDate?: string;
  salePrice?: number;
}

export interface FrameFormData {
  brand: string;
  model: string;
  color: string;
  gender: 'Men' | 'Women' | 'Unisex';
  frameType: 'Optical' | 'Sunglasses';
  costPrice: number;
  retailPrice: number;
  supplier: string;
  notes?: string;
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
