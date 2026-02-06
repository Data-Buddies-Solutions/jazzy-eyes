'use client';

import { useState, useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { frameFormSchema, type FrameFormData } from '@/lib/validations/admin';
import type { Brand } from '@/types/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Pricing rules by brand name
const PRICING_RULES: Record<string, { type: 'multiplier' | 'flat'; value: number; round?: boolean }> = {
  // 2.9x rounded to nearest 5
  'YSL': { type: 'multiplier', value: 2.9, round: true },
  'Chloe': { type: 'multiplier', value: 2.9, round: true },
  'Gucci': { type: 'multiplier', value: 2.9, round: true },
  'Lool': { type: 'multiplier', value: 2.9, round: true },
  'Etnia': { type: 'multiplier', value: 2.9, round: true },
  'Chroma': { type: 'multiplier', value: 2.9, round: true },
  'Pellicer': { type: 'multiplier', value: 2.9, round: true },
  'Tom Ford': { type: 'multiplier', value: 2.9, round: true },
  'Fendi': { type: 'multiplier', value: 2.9, round: true },
  'Fred': { type: 'multiplier', value: 2.9, round: true },
  'Morel ': { type: 'multiplier', value: 2.9, round: true },
  'Rayban': { type: 'multiplier', value: 2.9, round: true },
  'Oakley': { type: 'multiplier', value: 2.9, round: true },
  'Salt': { type: 'multiplier', value: 2.9, round: true },
  'Silhouette': { type: 'multiplier', value: 2.9, round: true },
  'Chopard': { type: 'multiplier', value: 2.9, round: true },
  'LA Eyeworks': { type: 'multiplier', value: 2.9, round: true },
  'Faniel': { type: 'multiplier', value: 2.9, round: true },
  // 2x flat (no rounding)
  'Maui Jim': { type: 'multiplier', value: 2, round: false },
  // $250 flat price
  'Café': { type: 'flat', value: 250 },
  'NRG': { type: 'flat', value: 250 },
  'CLD': { type: 'flat', value: 250 },
  'Pepe Jeans': { type: 'flat', value: 250 },
  'Vera Bradley ': { type: 'flat', value: 250 },
  'Konishi': { type: 'flat', value: 250 },
};

// Round to nearest 5
function roundToNearest5(value: number): number {
  return Math.round(value / 5) * 5;
}

// Calculate retail price based on brand and cost
function calculateRetailPrice(brandName: string, costPrice: number): number | null {
  const rule = PRICING_RULES[brandName];
  if (!rule || costPrice <= 0) return null;

  if (rule.type === 'flat') {
    return rule.value;
  }

  const calculated = costPrice * rule.value;
  return rule.round ? roundToNearest5(calculated) : calculated;
}

interface FrameFormProps {
  onSubmit: (data: FrameFormData) => void;
  defaultValues?: Partial<FrameFormData>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function FrameForm({
  onSubmit,
  defaultValues,
  isLoading = false,
  submitLabel = 'Save & Generate Label',
}: FrameFormProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FrameFormData>({
    resolver: zodResolver(frameFormSchema) as Resolver<FrameFormData>,
    mode: 'onBlur',
    defaultValues: defaultValues || {
      brandId: 0,
      styleNumber: '',
      colorCode: '',
      eyeSize: '',
      gender: 'Unisex' as const,
      frameType: 'Zyl' as const,
      productType: 'Optical' as const,
      invoiceDate: '',
      costPrice: 0,
      retailPrice: 0,
      notes: '',
    },
  });

  const gender = watch('gender');
  const frameType = watch('frameType');
  const productType = watch('productType');
  const watchedBrandId = watch('brandId');
  const watchedCostPrice = watch('costPrice');

  // Auto-calculate retail price when brand or cost changes
  useEffect(() => {
    if (!watchedBrandId || !watchedCostPrice || watchedCostPrice <= 0) return;

    const selectedBrand = brands.find((b) => b.id === watchedBrandId);
    if (!selectedBrand) return;

    const calculatedRetail = calculateRetailPrice(selectedBrand.brandName, watchedCostPrice);
    if (calculatedRetail !== null) {
      setValue('retailPrice', calculatedRetail);
    }
  }, [watchedBrandId, watchedCostPrice, brands, setValue]);

  // Fetch brands from API
  useEffect(() => {
    async function fetchBrands() {
      try {
        const response = await fetch('/api/brands');
        const data = await response.json();
        if (data.success && data.brands) {
          const sortedBrands = [...data.brands].sort((a: Brand, b: Brand) =>
            a.brandName.localeCompare(b.brandName)
          );
          setBrands(sortedBrands);
        }
      } catch (error) {
        console.error('Error fetching brands:', error);
      } finally {
        setLoadingBrands(false);
      }
    }
    fetchBrands();
  }, []);

  const handleFormSubmit = (data: any) => {
    // Ensure brandId is number and prices are numbers
    const formData = {
      ...data,
      brandId: parseInt(data.brandId, 10),
      costPrice: parseFloat(data.costPrice),
      retailPrice: parseFloat(data.retailPrice),
    };
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      <Card className="p-5 border-2 border-black">
        <div className="space-y-5">
          {/* Brand */}
          <div className="space-y-2">
            <Label htmlFor="brandId">
              Brand <span className="text-red-500">*</span>
            </Label>
            {loadingBrands ? (
              <div className="flex items-center justify-center p-4 border-2 border-black rounded">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Loading brands...</span>
              </div>
            ) : (
              <Select
                onValueChange={(value) => setValue('brandId', parseInt(value, 10))}
                defaultValue={defaultValues?.brandId?.toString()}
              >
                <SelectTrigger className="border-2 border-black">
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id.toString()}>
                      {brand.brandName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.brandId && (
              <p className="text-sm text-red-500">{errors.brandId.message}</p>
            )}
          </div>

          {/* Style Number */}
          <div className="space-y-2">
            <Label htmlFor="styleNumber">
              Style Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="styleNumber"
              {...register('styleNumber')}
              placeholder="e.g., TF5555, 0GC001689"
              className="border-2 border-black"
            />
            {errors.styleNumber && (
              <p className="text-sm text-red-500">{errors.styleNumber.message}</p>
            )}
          </div>

          {/* Color Code */}
          <div className="space-y-2">
            <Label htmlFor="colorCode">
              Color Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="colorCode"
              {...register('colorCode')}
              placeholder="e.g., 001, BLK, TORT"
              className="border-2 border-black"
            />
            {errors.colorCode && (
              <p className="text-sm text-red-500">{errors.colorCode.message}</p>
            )}
          </div>

          {/* Eye Size */}
          <div className="space-y-2">
            <Label htmlFor="eyeSize">
              Eye Size <span className="text-red-500">*</span>
            </Label>
            <Input
              id="eyeSize"
              {...register('eyeSize')}
              placeholder="e.g., 52, 54-18, 55mm"
              className="border-2 border-black"
            />
            {errors.eyeSize && (
              <p className="text-sm text-red-500">{errors.eyeSize.message}</p>
            )}
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label>
              Gender <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={gender}
              onValueChange={(value) =>
                setValue('gender', value as 'Men' | 'Women' | 'Unisex')
              }
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Men" id="men" />
                <Label htmlFor="men" className="font-normal cursor-pointer">
                  Men
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Women" id="women" />
                <Label htmlFor="women" className="font-normal cursor-pointer">
                  Women
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Unisex" id="unisex" />
                <Label htmlFor="unisex" className="font-normal cursor-pointer">
                  Unisex
                </Label>
              </div>
            </RadioGroup>
            {errors.gender && (
              <p className="text-sm text-red-500">{errors.gender.message}</p>
            )}
          </div>

          {/* Frame Type */}
          <div className="space-y-2">
            <Label>
              Frame Type <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={frameType}
              onValueChange={(value) =>
                setValue('frameType', value as 'Zyl' | 'Metal' | 'Rimless' | 'Semi-rimless' | 'Clip')
              }
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Zyl" id="zyl" />
                <Label htmlFor="zyl" className="font-normal cursor-pointer">
                  Zyl
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Metal" id="metal" />
                <Label htmlFor="metal" className="font-normal cursor-pointer">
                  Metal
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Rimless" id="rimless" />
                <Label htmlFor="rimless" className="font-normal cursor-pointer">
                  Rimless
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Semi-rimless" id="semi-rimless" />
                <Label htmlFor="semi-rimless" className="font-normal cursor-pointer">
                  Semi-rimless
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Clip" id="clip" />
                <Label htmlFor="clip" className="font-normal cursor-pointer">
                  Clip
                </Label>
              </div>
            </RadioGroup>
            {errors.frameType && (
              <p className="text-sm text-red-500">{errors.frameType.message}</p>
            )}
          </div>

          {/* Product Type */}
          <div className="space-y-2">
            <Label>
              Product Type <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={productType}
              onValueChange={(value) =>
                setValue('productType', value as 'Optical' | 'Sunglasses')
              }
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Optical" id="productTypeOptical" />
                <Label htmlFor="productTypeOptical" className="font-normal cursor-pointer">
                  Optical
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Sunglasses" id="productTypeSunglasses" />
                <Label
                  htmlFor="productTypeSunglasses"
                  className="font-normal cursor-pointer"
                >
                  Sunglasses
                </Label>
              </div>
            </RadioGroup>
            {errors.productType && (
              <p className="text-sm text-red-500">{errors.productType.message}</p>
            )}
          </div>

          {/* Invoice Date */}
          <div className="space-y-2">
            <Label htmlFor="invoiceDate">
              Invoice Date
            </Label>
            <Input
              id="invoiceDate"
              type="date"
              {...register('invoiceDate')}
              className="border-2 border-black"
            />
            {errors.invoiceDate && (
              <p className="text-sm text-red-500">{errors.invoiceDate.message}</p>
            )}
          </div>

          {/* Prices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="costPrice">
                Cost Price <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  {...register('costPrice')}
                  placeholder="0.00"
                  className="border-2 border-black pl-7"
                />
              </div>
              {errors.costPrice && (
                <p className="text-sm text-red-500">{errors.costPrice.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="retailPrice">
                Retail Price <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="retailPrice"
                  type="number"
                  step="0.01"
                  {...register('retailPrice')}
                  placeholder="0.00"
                  className="border-2 border-black pl-7"
                />
              </div>
              {errors.retailPrice && (
                <p className="text-sm text-red-500">
                  {errors.retailPrice.message}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              {...register('notes')}
              placeholder="Additional information about this frame"
              className="border-2 border-black"
            />
            {errors.notes && (
              <p className="text-sm text-red-500">{errors.notes.message}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isLoading || loadingBrands}
          className="bg-sky-deeper hover:bg-sky-deeper/90 text-black font-semibold border-2 border-black min-w-[200px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
