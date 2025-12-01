'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { frameFormSchema, type FrameFormData } from '@/lib/validations/admin';
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
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const BRAND_OPTIONS = [
  'Tom Ford',
  'Cartier',
  'Oliver Peoples',
  'Ray-Ban',
  'Gucci',
  'Prada',
  'Oakley',
  'Other',
];

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
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FrameFormData>({
    resolver: zodResolver(frameFormSchema) as any,
    mode: 'onBlur',
    defaultValues: defaultValues || {
      brand: '',
      model: '',
      color: '',
      gender: 'Unisex' as const,
      frameType: 'Optical' as const,
      costPrice: 0,
      retailPrice: 0,
      supplier: '',
      notes: '',
    },
  });

  const gender = watch('gender');
  const frameType = watch('frameType');

  const handleFormSubmit = (data: any) => {
    // Convert string prices to numbers
    const formData = {
      ...data,
      costPrice: parseFloat(data.costPrice),
      retailPrice: parseFloat(data.retailPrice),
    };
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card className="p-6 border-2 border-black">
        <div className="space-y-6">
          {/* Brand */}
          <div className="space-y-2">
            <Label htmlFor="brand">
              Brand <span className="text-red-500">*</span>
            </Label>
            <Select
              onValueChange={(value) => setValue('brand', value)}
              defaultValue={defaultValues?.brand}
            >
              <SelectTrigger className="border-2 border-black">
                <SelectValue placeholder="Select a brand" />
              </SelectTrigger>
              <SelectContent>
                {BRAND_OPTIONS.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.brand && (
              <p className="text-sm text-red-500">{errors.brand.message}</p>
            )}
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model">
              Model <span className="text-red-500">*</span>
            </Label>
            <Input
              id="model"
              {...register('model')}
              placeholder="e.g., Wayfarer, Santos"
              className="border-2 border-black"
            />
            {errors.model && (
              <p className="text-sm text-red-500">{errors.model.message}</p>
            )}
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label htmlFor="color">
              Color <span className="text-red-500">*</span>
            </Label>
            <Input
              id="color"
              {...register('color')}
              placeholder="e.g., Black, Tortoise"
              className="border-2 border-black"
            />
            {errors.color && (
              <p className="text-sm text-red-500">{errors.color.message}</p>
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
                setValue('frameType', value as 'Optical' | 'Sunglasses')
              }
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Optical" id="optical" />
                <Label htmlFor="optical" className="font-normal cursor-pointer">
                  Optical
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Sunglasses" id="sunglasses" />
                <Label
                  htmlFor="sunglasses"
                  className="font-normal cursor-pointer"
                >
                  Sunglasses
                </Label>
              </div>
            </RadioGroup>
            {errors.frameType && (
              <p className="text-sm text-red-500">{errors.frameType.message}</p>
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

          {/* Supplier */}
          <div className="space-y-2">
            <Label htmlFor="supplier">
              Supplier <span className="text-red-500">*</span>
            </Label>
            <Input
              id="supplier"
              {...register('supplier')}
              placeholder="e.g., Luxottica, Safilo Group"
              className="border-2 border-black"
            />
            {errors.supplier && (
              <p className="text-sm text-red-500">{errors.supplier.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional information about this frame"
              className="border-2 border-black min-h-[100px]"
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
          disabled={isLoading}
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
