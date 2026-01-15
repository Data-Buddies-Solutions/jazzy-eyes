import { describe, it, expect } from 'vitest';
import {
  frameFormSchema,
  manualSaleSchema,
  writeOffSchema,
  restockSchema,
  createCompanySchema,
  createBrandSchema,
  createStatusSchema,
} from '../admin';

describe('frameFormSchema', () => {
  const validFrame = {
    brandId: 1,
    styleNumber: 'ABC123',
    colorCode: 'BLK',
    eyeSize: '52',
    gender: 'Unisex',
    frameType: 'Zyl',
    productType: 'Optical',
    costPrice: 100,
    retailPrice: 250,
  };

  it('validates a correct frame', () => {
    const result = frameFormSchema.safeParse(validFrame);
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = frameFormSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects negative cost price', () => {
    const result = frameFormSchema.safeParse({
      ...validFrame,
      costPrice: -10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid gender', () => {
    const result = frameFormSchema.safeParse({
      ...validFrame,
      gender: 'InvalidGender',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid frame type', () => {
    const result = frameFormSchema.safeParse({
      ...validFrame,
      frameType: 'InvalidType',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid product types', () => {
    expect(frameFormSchema.safeParse({ ...validFrame, productType: 'Optical' }).success).toBe(true);
    expect(frameFormSchema.safeParse({ ...validFrame, productType: 'Sunglasses' }).success).toBe(true);
  });

  it('coerces string numbers to numbers', () => {
    const result = frameFormSchema.safeParse({
      ...validFrame,
      brandId: '1',
      costPrice: '100',
      retailPrice: '250',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.brandId).toBe(1);
      expect(result.data.costPrice).toBe(100);
    }
  });
});

describe('manualSaleSchema', () => {
  it('validates a correct sale', () => {
    const result = manualSaleSchema.safeParse({
      frameId: 'FRAME-001',
      quantity: 2,
      salePrice: 200,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing frameId', () => {
    const result = manualSaleSchema.safeParse({
      quantity: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero quantity', () => {
    const result = manualSaleSchema.safeParse({
      frameId: 'FRAME-001',
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it('allows optional salePrice', () => {
    const result = manualSaleSchema.safeParse({
      frameId: 'FRAME-001',
      quantity: 1,
    });
    expect(result.success).toBe(true);
  });
});

describe('writeOffSchema', () => {
  it('validates a correct write-off', () => {
    const result = writeOffSchema.safeParse({
      frameId: 'FRAME-001',
      quantity: 1,
      reason: 'damaged',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid reasons', () => {
    const reasons = ['damaged', 'lost', 'defective', 'other'];
    reasons.forEach((reason) => {
      const result = writeOffSchema.safeParse({
        frameId: 'FRAME-001',
        quantity: 1,
        reason,
      });
      expect(result.success).toBe(true);
    });
  });

  it('rejects invalid reason', () => {
    const result = writeOffSchema.safeParse({
      frameId: 'FRAME-001',
      quantity: 1,
      reason: 'invalid-reason',
    });
    expect(result.success).toBe(false);
  });
});

describe('restockSchema', () => {
  it('validates a correct restock', () => {
    const result = restockSchema.safeParse({
      frameId: 'FRAME-001',
      quantity: 5,
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional costPrice', () => {
    const result = restockSchema.safeParse({
      frameId: 'FRAME-001',
      quantity: 5,
      costPrice: 75,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative cost price', () => {
    const result = restockSchema.safeParse({
      frameId: 'FRAME-001',
      quantity: 5,
      costPrice: -10,
    });
    expect(result.success).toBe(false);
  });
});

describe('createCompanySchema', () => {
  it('validates a correct company', () => {
    const result = createCompanySchema.safeParse({
      companyName: 'Acme Eyewear',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty company name', () => {
    const result = createCompanySchema.safeParse({
      companyName: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects company name over 255 characters', () => {
    const result = createCompanySchema.safeParse({
      companyName: 'A'.repeat(256),
    });
    expect(result.success).toBe(false);
  });
});

describe('createBrandSchema', () => {
  const validBrand = {
    brandId: 1,
    companyName: 'Acme',
    companyId: 1,
    brandName: 'Ray-Ban',
    allocationQuantity: 50,
  };

  it('validates a correct brand', () => {
    const result = createBrandSchema.safeParse(validBrand);
    expect(result.success).toBe(true);
  });

  it('rejects negative allocation', () => {
    const result = createBrandSchema.safeParse({
      ...validBrand,
      allocationQuantity: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects allocation over 999', () => {
    const result = createBrandSchema.safeParse({
      ...validBrand,
      allocationQuantity: 1000,
    });
    expect(result.success).toBe(false);
  });
});

describe('createStatusSchema', () => {
  it('validates a correct status', () => {
    const result = createStatusSchema.safeParse({
      name: 'In Stock',
      colorScheme: 'green',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid color schemes', () => {
    const colors = ['green', 'blue', 'gray', 'red', 'yellow', 'purple', 'orange', 'pink'];
    colors.forEach((colorScheme) => {
      const result = createStatusSchema.safeParse({
        name: 'Test Status',
        colorScheme,
      });
      expect(result.success).toBe(true);
    });
  });

  it('rejects invalid color scheme', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test Status',
      colorScheme: 'invalid-color',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name over 50 characters', () => {
    const result = createStatusSchema.safeParse({
      name: 'A'.repeat(51),
      colorScheme: 'green',
    });
    expect(result.success).toBe(false);
  });
});
