export interface Frame {
  frameId: string;
  brand: string;
  model: string;
  color: string;
  gender: 'Men' | 'Women' | 'Unisex';
  frameType: 'Optical' | 'Sunglasses';
  costPrice: number;
  retailPrice: number;
  stockLevel: number;
  dateAdded: string;
}

export interface Sale {
  saleId: string;
  frameId: string;
  saleDate: string;
  salePrice: number;
  paymentMethod: string;
  soldBy: string;
}
