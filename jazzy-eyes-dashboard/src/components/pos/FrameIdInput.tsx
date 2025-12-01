import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { frameIdSchema } from '@/lib/validations/pos';
import type { FrameIdFormData } from '@/lib/validations/pos';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FrameIdInputProps {
  onSubmit: (data: FrameIdFormData) => void;
  isLoading?: boolean;
}

export function FrameIdInput({ onSubmit, isLoading = false }: FrameIdInputProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<FrameIdFormData>({
    resolver: zodResolver(frameIdSchema),
    mode: 'onChange'
  });

  const frameId = watch('frameId');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-black">Enter Frame ID</h1>
        <p className="text-black text-sm">
          Type the Frame ID from the label on the glasses
        </p>
      </div>

      {/* Input field with clear button */}
      <div className="relative">
        <Input
          {...register('frameId')}
          placeholder="e.g., 0542"
          autoFocus
          disabled={isLoading}
          className={errors.frameId ? 'border-error focus-visible:ring-error' : ''}
          autoComplete="off"
        />
        {frameId && (
          <button
            type="button"
            onClick={() => reset()}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Error message */}
      {errors.frameId && (
        <p className="text-error text-sm text-center">
          {errors.frameId.message}
        </p>
      )}

      {/* Submit button */}
      <div className="flex justify-center">
        <Button
          type="submit"
          className="w-full max-w-xs border-2 border-black"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </div>
    </form>
  );
}
