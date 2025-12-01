export interface Frame {
  frameId: string;
  brand: string;
  model: string;
  color: string;
  gender: "Men" | "Women" | "Unisex";
  frameType: "Optical" | "Sunglasses";
  costPrice: number;
  retailPrice: number;
  status: "Active" | "Sold" | "Discontinued";
  dateAdded: string;
  supplier: string;
  notes: string | null;
}

export interface Sale {
  saleId: string;
  frameId: string;
  salePrice: number;
  salePriceOverride: boolean;
  saleDate: string;
  frame: {
    brand: string;
    model: string;
  };
}

export interface FrameIdFormData {
  frameId: string;
}
