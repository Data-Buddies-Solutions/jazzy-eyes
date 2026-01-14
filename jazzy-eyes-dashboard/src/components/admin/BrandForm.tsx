'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createBrandSchema,
  updateBrandSchema,
  type CreateBrandData,
  type UpdateBrandData,
} from '@/lib/validations/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface BrandFormProps {
  onSubmit: (data: CreateBrandData | UpdateBrandData) => void | Promise<void>;
  defaultValues?: Partial<CreateBrandData | UpdateBrandData>;
  companyName?: string;
  companyId?: number;
  isLoading?: boolean;
  submitLabel?: string;
  mode: 'create' | 'edit';
}

export function BrandForm({
  onSubmit,
  defaultValues,
  companyName,
  companyId,
  isLoading = false,
  submitLabel,
  mode,
}: BrandFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(mode === 'create' ? createBrandSchema : updateBrandSchema) as any,
    defaultValues:
      mode === 'create' && companyName && companyId
        ? { ...defaultValues, companyName, companyId }
        : defaultValues,
    mode: 'onBlur',
  });

  const defaultSubmitLabel = mode === 'create' ? 'Create Brand' : 'Update Brand';

  return (
    <Card className="border-2 border-black p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Name (read-only in create mode) */}
        {mode === 'create' && companyName && (
          <div className="space-y-2">
            <Label>Company</Label>
            <div className="px-4 py-2 bg-sky-soft/50 border-2 border-black rounded-md">
              <p className="font-semibold">{companyName}</p>
            </div>
            <input type="hidden" {...register('companyName')} value={companyName} />
            <input type="hidden" {...register('companyId')} value={companyId} />
          </div>
        )}

        {/* Brand Name */}
        <div className="space-y-2">
          <Label htmlFor="brandName">Brand Name *</Label>
          <Input
            id="brandName"
            {...register('brandName')}
            placeholder="Enter brand name"
            className={`border-2 ${errors.brandName ? 'border-red-500' : 'border-black'}`}
            disabled={isLoading}
          />
          {errors.brandName && (
            <p className="text-sm text-red-600">{errors.brandName.message}</p>
          )}
        </div>

        {/* Brand ID (create mode) */}
        {mode === 'create' && (
          <div className="space-y-2">
            <Label htmlFor="brandId">Brand ID *</Label>
            <Input
              id="brandId"
              type="number"
              {...register('brandId')}
              placeholder="Enter brand ID"
              className={`border-2 ${(errors as any).brandId ? 'border-red-500' : 'border-black'}`}
              disabled={isLoading}
            />
            {(errors as any).brandId && (
              <p className="text-sm text-red-600">{(errors as any).brandId.message}</p>
            )}
            <p className="text-sm text-gray-600">
              Suggested: {companyId ? `${companyId + 1}, ${companyId + 2}, etc.` : 'N/A'}
            </p>
          </div>
        )}

        {/* Brand ID (edit mode) */}
        {mode === 'edit' && (
          <div className="space-y-2">
            <Label htmlFor="id">Brand ID *</Label>
            <Input
              id="id"
              type="number"
              {...(register as any)('id')}
              placeholder="Enter brand ID"
              className={`border-2 ${(errors as any).id ? 'border-red-500' : 'border-black'}`}
              disabled={isLoading}
            />
            {(errors as any).id && (
              <p className="text-sm text-red-600">{(errors as any).id.message}</p>
            )}
          </div>
        )}

        {/* Allocation Quantity */}
        <div className="space-y-2">
          <Label htmlFor="allocationQuantity">Allocation Quantity *</Label>
          <Input
            id="allocationQuantity"
            type="number"
            min="0"
            max="999"
            {...register('allocationQuantity')}
            placeholder="0"
            className={`border-2 ${
              errors.allocationQuantity ? 'border-red-500' : 'border-black'
            }`}
            disabled={isLoading}
          />
          {errors.allocationQuantity && (
            <p className="text-sm text-red-600">{errors.allocationQuantity.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-sky-deeper hover:bg-sky-deeper/90 text-black font-semibold border-2 border-black"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === 'create' ? 'Creating...' : 'Updating...'}
            </>
          ) : (
            submitLabel || defaultSubmitLabel
          )}
        </Button>
      </form>
    </Card>
  );
}
