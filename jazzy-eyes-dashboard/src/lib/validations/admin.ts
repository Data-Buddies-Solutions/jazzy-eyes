import { z } from 'zod';

export const frameFormSchema = z.object({
  brandId: z.coerce.number().int().positive('Brand is required'),
  styleNumber: z.string().min(1, 'Style number is required'),
  colorCode: z.string().min(1, 'Color code is required'),
  eyeSize: z.string().min(1, 'Eye size is required'),
  gender: z.enum(['Men', 'Women', 'Unisex']),
  frameType: z.enum(['Zyl', 'Metal', 'Rimless', 'Semi-rimless', 'Clip']),
  productType: z.enum(['Optical', 'Sunglasses']),
  invoiceDate: z.string().optional(),
  costPrice: z.coerce.number().nonnegative("Cost price can't be negative"),
  retailPrice: z.coerce.number().nonnegative("Retail price can't be negative"),
  notes: z.string().optional(),
});

export const manualSaleSchema = z.object({
  frameId: z.string().min(1, 'Frame ID is required'),
  quantity: z.coerce
    .number()
    .int()
    .min(1, 'Quantity must be at least 1'),
  salePrice: z.coerce
    .number()
    .positive('Sale price must be greater than 0')
    .optional(),
  saleDate: z.string().optional(),
});

export const writeOffSchema = z.object({
  frameId: z.string().min(1, 'Frame ID is required'),
  quantity: z.coerce
    .number()
    .int()
    .min(1, 'Quantity must be at least 1'),
  reason: z.enum(['damaged', 'lost', 'defective', 'return', 'other'], {
    message: 'Please select a reason',
  }),
  notes: z.string().optional(),
});

export const revertWriteOffSchema = z.object({
  frameId: z.string().min(1, 'Frame ID is required'),
  writeOffTransactionId: z.coerce
    .number()
    .int()
    .positive('Transaction ID is required'),
  notes: z.string().optional(),
});

export const restockSchema = z.object({
  frameId: z.string().min(1, 'Frame ID is required'),
  quantity: z.coerce
    .number()
    .int()
    .min(1, 'Quantity must be at least 1'),
  invoiceDate: z.string().optional(),
  costPrice: z.coerce
    .number()
    .nonnegative("Cost price can't be negative")
    .optional(),
  notes: z.string().optional(),
});

export type FrameFormData = z.infer<typeof frameFormSchema>;
export type ManualSaleData = z.infer<typeof manualSaleSchema>;
export type WriteOffData = z.infer<typeof writeOffSchema>;
export type RevertWriteOffData = z.infer<typeof revertWriteOffSchema>;
export type RestockData = z.infer<typeof restockSchema>;

// Brand Management Validation Schemas
export const createCompanySchema = z.object({
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(255, 'Company name must be less than 255 characters'),
});

export const createBrandSchema = z.object({
  brandId: z.coerce
    .number()
    .int()
    .positive('Brand ID must be a positive number'),
  companyName: z.string().min(1, 'Company name is required'),
  companyId: z.number().int().positive('Company ID is required'),
  brandName: z
    .string()
    .min(1, 'Brand name is required')
    .max(255, 'Brand name must be less than 255 characters'),
  allocationQuantity: z.coerce
    .number()
    .int()
    .min(0, 'Allocation must be 0 or greater')
    .max(999, 'Allocation must be less than 1000'),
});

export const updateBrandSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive('Brand ID must be a positive number')
    .optional(),
  brandName: z
    .string()
    .min(1, 'Brand name is required')
    .max(255, 'Brand name must be less than 255 characters')
    .optional(),
  allocationQuantity: z.coerce
    .number()
    .int()
    .min(0, 'Allocation must be 0 or greater')
    .max(999, 'Allocation must be less than 1000')
    .optional(),
});

export const updateCompanySchema = z.object({
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(255, 'Company name must be less than 255 characters'),
});

export type CreateCompanyData = z.infer<typeof createCompanySchema>;
export type CreateBrandData = z.infer<typeof createBrandSchema>;
export type UpdateBrandData = z.infer<typeof updateBrandSchema>;
export type UpdateCompanyData = z.infer<typeof updateCompanySchema>;

// Frame Status Management Validation Schemas
export const createStatusSchema = z.object({
  name: z
    .string()
    .min(1, 'Status name is required')
    .max(50, 'Status name must be less than 50 characters'),
  colorScheme: z.enum(
    ['green', 'blue', 'gray', 'red', 'yellow', 'purple', 'orange', 'pink'],
    {
      message: 'Invalid color scheme',
    }
  ),
});

export const updateStatusSchema = z.object({
  name: z
    .string()
    .min(1, 'Status name is required')
    .max(50, 'Status name must be less than 50 characters')
    .optional(),
  colorScheme: z
    .enum(['green', 'blue', 'gray', 'red', 'yellow', 'purple', 'orange', 'pink'], {
      message: 'Invalid color scheme',
    })
    .optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export type CreateStatusData = z.infer<typeof createStatusSchema>;
export type UpdateStatusData = z.infer<typeof updateStatusSchema>;
