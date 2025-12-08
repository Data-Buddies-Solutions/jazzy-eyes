import { z } from 'zod';

export const frameFormSchema = z.object({
  brandId: z.coerce.number().int().positive('Brand is required'),
  styleNumber: z.string().min(1, 'Style number is required'),
  colorCode: z.string().min(1, 'Color code is required'),
  eyeSize: z.string().min(1, 'Eye size is required'),
  gender: z.enum(['Men', 'Women', 'Unisex']),
  frameType: z.enum(['Zyl', 'Metal', 'Rimless']),
  productType: z.enum(['Optical', 'Sunglasses']),
  invoiceDate: z.string().optional(),
  costPrice: z.coerce.number().nonnegative("Cost price can't be negative"),
  retailPrice: z.coerce.number().nonnegative("Retail price can't be negative"),
  notes: z.string().optional(),
});

export const manualSaleSchema = z.object({
  frameId: z.string().min(1, 'Frame ID is required'),
  salePrice: z.coerce
    .number()
    .positive('Sale price must be greater than 0')
    .optional(),
  saleDate: z.string().optional(),
});

export type FrameFormData = z.infer<typeof frameFormSchema>;
export type ManualSaleData = z.infer<typeof manualSaleSchema>;
