import { z } from 'zod';

export const frameFormSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  color: z.string().min(1, 'Color is required'),
  gender: z.enum(['Men', 'Women', 'Unisex']),
  frameType: z.enum(['Optical', 'Sunglasses']),
  costPrice: z.coerce.number().nonnegative("Cost price can't be negative"),
  retailPrice: z.coerce.number().nonnegative("Retail price can't be negative"),
  supplier: z.string().min(1, 'Supplier is required'),
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
