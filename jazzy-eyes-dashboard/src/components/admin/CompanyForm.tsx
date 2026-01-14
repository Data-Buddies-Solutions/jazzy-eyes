'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCompanySchema, type CreateCompanyData } from '@/lib/validations/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface CompanyFormProps {
  onSubmit: (data: CreateCompanyData) => void | Promise<void>;
  defaultValues?: Partial<CreateCompanyData>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function CompanyForm({
  onSubmit,
  defaultValues,
  isLoading = false,
  submitLabel = 'Create Company',
}: CompanyFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCompanyData>({
    resolver: zodResolver(createCompanySchema),
    defaultValues,
    mode: 'onBlur',
  });

  return (
    <Card className="border-2 border-black p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            {...register('companyName')}
            placeholder="Enter company name"
            className={`border-2 ${errors.companyName ? 'border-red-500' : 'border-black'}`}
            disabled={isLoading}
          />
          {errors.companyName && (
            <p className="text-sm text-red-600">{errors.companyName.message}</p>
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
              Creating...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
    </Card>
  );
}
