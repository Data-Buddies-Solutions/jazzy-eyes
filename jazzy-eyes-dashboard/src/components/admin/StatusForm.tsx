'use client';

import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createStatusSchema,
  updateStatusSchema,
  type CreateStatusData,
  type UpdateStatusData,
} from '@/lib/validations/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface StatusFormProps {
  onSubmit: (data: any) => void | Promise<void>;
  defaultValues?: Partial<CreateStatusData | UpdateStatusData>;
  isLoading?: boolean;
  submitLabel?: string;
  mode: 'create' | 'edit';
}

const colorOptions = [
  { value: 'green', label: 'Green', preview: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'blue', label: 'Blue', preview: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'gray', label: 'Gray', preview: 'bg-gray-100 text-gray-800 border-gray-300' },
  { value: 'red', label: 'Red', preview: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'yellow', label: 'Yellow', preview: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'purple', label: 'Purple', preview: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'orange', label: 'Orange', preview: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'pink', label: 'Pink', preview: 'bg-pink-100 text-pink-800 border-pink-300' },
];

export function StatusForm({
  onSubmit,
  defaultValues,
  isLoading = false,
  submitLabel,
  mode,
}: StatusFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateStatusData | UpdateStatusData>({
    resolver: zodResolver(mode === 'create' ? createStatusSchema : updateStatusSchema) as Resolver<CreateStatusData | UpdateStatusData>,
    defaultValues,
    mode: 'onBlur',
  });

  const selectedColor = watch('colorScheme');
  const statusName = watch('name');
  const defaultSubmitLabel = mode === 'create' ? 'Create Status' : 'Update Status';

  return (
    <Card className="border-2 border-black p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Status Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Status Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Enter status name (e.g., Reserved)"
            className={`border-2 ${errors.name ? 'border-red-500' : 'border-black'}`}
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message as string}</p>
          )}
        </div>

        {/* Color Scheme */}
        <div className="space-y-2">
          <Label htmlFor="colorScheme">
            Color Scheme <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedColor}
            onValueChange={(value) => setValue('colorScheme', value as CreateStatusData['colorScheme'])}
            disabled={isLoading}
          >
            <SelectTrigger className="border-2 border-black">
              <SelectValue placeholder="Select color scheme" />
            </SelectTrigger>
            <SelectContent>
              {colorOptions.map((color) => (
                <SelectItem key={color.value} value={color.value}>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded border ${color.preview} text-xs`}>
                      {color.label}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.colorScheme && (
            <p className="text-sm text-red-600">{errors.colorScheme.message as string}</p>
          )}
        </div>

        {/* Preview */}
        {selectedColor && statusName && (
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="p-4 bg-gray-50 rounded border-2 border-black">
              <span
                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${
                  colorOptions.find((c) => c.value === selectedColor)?.preview
                }`}
              >
                {statusName || 'Status Name'}
              </span>
            </div>
          </div>
        )}

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
