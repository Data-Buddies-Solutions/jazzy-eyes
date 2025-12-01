'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import type { Frame } from '@/types/admin';
import { Loader2 } from 'lucide-react';

interface ManualSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frame: Frame;
  onSubmit: (salePrice?: number, saleDate?: string) => Promise<void>;
}

export function ManualSaleModal({
  open,
  onOpenChange,
  frame,
  onSubmit,
}: ManualSaleModalProps) {
  const [salePrice, setSalePrice] = useState<string>(frame.retailPrice.toString());
  const [saleDate, setSaleDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const price = parseFloat(salePrice);
      const finalPrice = price !== frame.retailPrice ? price : undefined;

      // Convert date to ISO string for the API
      const dateObj = new Date(saleDate);
      const finalDate = dateObj.toISOString();

      await onSubmit(finalPrice, finalDate);
    } catch (error) {
      console.error('Error recording sale:', error);
      alert('Failed to record sale. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-2 border-black">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl">Mark Frame as Sold</DialogTitle>
            <DialogDescription>
              Record a manual sale for this frame. This is useful when a sale was
              made but not recorded through the POS system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Frame Details */}
            <Card className="p-4 border-2 border-black bg-sky-soft/20">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Frame ID:</span>
                  <span className="font-mono font-bold">{frame.frameId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Brand:</span>
                  <span className="font-semibold">{frame.brand}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Model:</span>
                  <span className="font-semibold">{frame.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Color:</span>
                  <span>{frame.color}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm text-gray-600">Retail Price:</span>
                  <span className="font-semibold">
                    ${frame.retailPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Sale Price Override */}
            <div className="space-y-2">
              <Label htmlFor="salePrice">
                Sale Price (Optional Override)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="border-2 border-black pl-7"
                />
              </div>
              <p className="text-xs text-gray-500">
                Leave as retail price or enter a different amount if the frame
                was sold at a discount or premium.
              </p>
            </div>

            {/* Sale Date */}
            <div className="space-y-2">
              <Label htmlFor="saleDate">Sale Date</Label>
              <Input
                id="saleDate"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="border-2 border-black"
              />
              <p className="text-xs text-gray-500">
                Defaults to today but can be changed if needed
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="border-2 border-black"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-sky-deeper hover:bg-sky-deeper/90 text-black font-semibold border-2 border-black"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                'Confirm Sale'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
