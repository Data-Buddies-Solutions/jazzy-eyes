'use client';

import { useState, useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, AlertCircle, Loader2, Glasses } from 'lucide-react';
import type { Brand } from '@/types/admin';

const rxSaleSchema = z.object({
  brandId: z.coerce.number().int().positive('Brand is required'),
  styleNumber: z.string().min(1, 'Style number is required'),
  colorCode: z.string().min(1, 'Color code is required'),
  eyeSize: z.string().min(1, 'Eye size is required'),
  gender: z.enum(['Men', 'Women', 'Unisex']),
  frameType: z.enum(['Zyl', 'Metal', 'Rimless', 'Semi-rimless', 'Clip']),
  productType: z.enum(['Optical', 'Sunglasses']),
  saleDate: z.string().optional(),
  salePrice: z.coerce.number().positive('Sale price must be greater than 0'),
  costPrice: z.coerce.number().nonnegative("Cost price can't be negative").optional(),
  notes: z.string().optional(),
});

type RxSaleFormData = z.infer<typeof rxSaleSchema>;

interface SavedRxSale {
  id: number;
  brandName: string;
  styleNumber: string;
  colorCode: string;
  eyeSize: string;
  salePrice: number;
}

export default function SellPrescriptionPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSale, setSavedSale] = useState<SavedRxSale | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingData, setPendingData] = useState<RxSaleFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<RxSaleFormData>({
    resolver: zodResolver(rxSaleSchema) as Resolver<RxSaleFormData>,
    mode: 'onBlur',
    defaultValues: {
      brandId: 0,
      styleNumber: '',
      colorCode: '',
      eyeSize: '',
      gender: 'Unisex',
      frameType: 'Zyl',
      productType: 'Optical',
      saleDate: new Date().toISOString().split('T')[0],
      salePrice: 0,
      costPrice: 0,
      notes: '',
    },
  });

  const gender = watch('gender');
  const frameType = watch('frameType');
  const productType = watch('productType');

  useEffect(() => {
    async function fetchBrands() {
      try {
        const response = await fetch('/api/brands');
        const data = await response.json();
        if (data.success && data.brands) {
          setBrands(data.brands);
        }
      } catch (error) {
        console.error('Error fetching brands:', error);
      } finally {
        setLoadingBrands(false);
      }
    }
    fetchBrands();
  }, []);

  const onFormSubmit = (data: RxSaleFormData) => {
    setPendingData(data);
    setShowConfirmDialog(true);
  };

  const handleConfirmSale = async () => {
    if (!pendingData) return;

    setShowConfirmDialog(false);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rx-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to record RX sale');
      }

      setSavedSale({
        id: result.rxSale.id,
        brandName: result.rxSale.brandName,
        styleNumber: result.rxSale.styleNumber,
        colorCode: result.rxSale.colorCode,
        eyeSize: result.rxSale.eyeSize,
        salePrice: result.rxSale.salePrice,
      });

      toast.success('RX sale recorded successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record RX sale';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setPendingData(null);
    }
  };

  const handleAddAnother = () => {
    setSavedSale(null);
    setError(null);
    reset();
  };

  if (savedSale) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sell Prescription</h1>
          <p className="text-gray-600">Record RX sales for analytics</p>
        </div>

        <Card className="p-8 border-2 border-black bg-white">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2">RX Sale Recorded!</h2>
              <p className="text-gray-600">
                This sale has been marked as RX and will appear in your analytics
              </p>
            </div>

            <Card className="p-6 border-2 border-black bg-white">
              <div className="space-y-3 text-left">
                <div className="border-b pb-3">
                  <p className="text-sm text-gray-600">Sale ID</p>
                  <p className="text-3xl font-bold text-black font-mono">
                    RX-{savedSale.id}
                  </p>
                </div>
                <div className="border-b pb-3">
                  <p className="text-sm text-gray-600">Frame Details</p>
                  <p className="text-lg font-semibold">
                    {savedSale.brandName} - {savedSale.styleNumber}
                  </p>
                  <p className="text-gray-600">
                    {savedSale.colorCode} | {savedSale.eyeSize}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sale Price</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${savedSale.salePrice.toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                onClick={handleAddAnother}
                className="bg-sky-deeper hover:bg-sky-deeper/90 text-black font-semibold border-2 border-black"
              >
                Record Another RX Sale
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3 -mt-2">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Glasses className="w-6 h-6" />
          Sell Prescription
        </h1>
        <p className="text-gray-600 text-sm">
          Record RX sales without affecting inventory. These will be tracked separately for analytics.
        </p>
      </div>

      {error && (
        <Card className="p-4 border-2 border-red-500 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Error Recording Sale</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
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
              <Label>Gender</Label>
              <RadioGroup
                value={gender}
                onValueChange={(value) =>
                  setValue('gender', value as 'Men' | 'Women' | 'Unisex')
                }
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Men" id="rx-men" />
                  <Label htmlFor="rx-men" className="font-normal cursor-pointer">
                    Men
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Women" id="rx-women" />
                  <Label htmlFor="rx-women" className="font-normal cursor-pointer">
                    Women
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Unisex" id="rx-unisex" />
                  <Label htmlFor="rx-unisex" className="font-normal cursor-pointer">
                    Unisex
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Frame Type */}
            <div className="space-y-2">
              <Label>Frame Type</Label>
              <RadioGroup
                value={frameType}
                onValueChange={(value) =>
                  setValue('frameType', value as 'Zyl' | 'Metal' | 'Rimless' | 'Semi-rimless' | 'Clip')
                }
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Zyl" id="rx-zyl" />
                  <Label htmlFor="rx-zyl" className="font-normal cursor-pointer">
                    Zyl
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Metal" id="rx-metal" />
                  <Label htmlFor="rx-metal" className="font-normal cursor-pointer">
                    Metal
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Rimless" id="rx-rimless" />
                  <Label htmlFor="rx-rimless" className="font-normal cursor-pointer">
                    Rimless
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Semi-rimless" id="rx-semi-rimless" />
                  <Label htmlFor="rx-semi-rimless" className="font-normal cursor-pointer">
                    Semi-rimless
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Clip" id="rx-clip" />
                  <Label htmlFor="rx-clip" className="font-normal cursor-pointer">
                    Clip
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Product Type */}
            <div className="space-y-2">
              <Label>Product Type</Label>
              <RadioGroup
                value={productType}
                onValueChange={(value) =>
                  setValue('productType', value as 'Optical' | 'Sunglasses')
                }
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Optical" id="rx-optical" />
                  <Label htmlFor="rx-optical" className="font-normal cursor-pointer">
                    Optical
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Sunglasses" id="rx-sunglasses" />
                  <Label htmlFor="rx-sunglasses" className="font-normal cursor-pointer">
                    Sunglasses
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Sale Date */}
            <div className="space-y-2">
              <Label htmlFor="saleDate">Sale Date</Label>
              <Input
                id="saleDate"
                type="date"
                {...register('saleDate')}
                className="border-2 border-black"
              />
            </div>

            {/* Prices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="salePrice">
                  Sale Price <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <Input
                    id="salePrice"
                    type="number"
                    step="0.01"
                    {...register('salePrice')}
                    placeholder="0.00"
                    className="border-2 border-black pl-7"
                  />
                </div>
                {errors.salePrice && (
                  <p className="text-sm text-red-500">{errors.salePrice.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost Price (Optional)</Label>
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
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                {...register('notes')}
                placeholder="Additional information about this RX sale"
                className="border-2 border-black"
              />
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
                Recording...
              </>
            ) : (
              'Record RX Sale'
            )}
          </Button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="border-2 border-black">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Glasses className="w-5 h-5" />
              Confirm RX Sale
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will be marked as an <strong>RX sale</strong> and recorded for analytics.
              This does <strong>not</strong> affect your frame inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-black">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSale}
              className="bg-sky-deeper hover:bg-sky-deeper/90 text-black border-2 border-black"
            >
              Confirm Sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
