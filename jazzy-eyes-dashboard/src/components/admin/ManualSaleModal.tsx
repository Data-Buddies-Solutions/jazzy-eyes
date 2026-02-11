'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
import { Loader2, Minus, Plus } from 'lucide-react';

interface ManualSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frame: Frame;
  onSubmit: (quantity: number, salePrice?: number, saleDate?: string) => Promise<void>;
}

export function ManualSaleModal({
  open,
  onOpenChange,
  frame,
}: ManualSaleModalProps & { onSubmit: (quantity: number, salePrice?: number, saleDate?: string) => Promise<void> }) {
  const [quantity, setQuantity] = useState<number>(1);
  const [salePrice, setSalePrice] = useState<string>(frame.retailPrice.toString());
  const [saleDate, setSaleDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
  );
  const [isLoading, setIsLoading] = useState(false);

  const maxQty = frame.currentQty;

  // Reset form when modal opens or frame changes
  useEffect(() => {
    if (open) {
      setQuantity(1);
      setSalePrice(frame.retailPrice.toString());
      setSaleDate(new Date().toISOString().split('T')[0]);
    }
  }, [open, frame.frameId, frame.retailPrice]);

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty >= 1 && newQty <= maxQty) {
      setQuantity(newQty);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const price = parseFloat(salePrice);
      const finalPrice = price !== frame.retailPrice ? price : undefined;

      // Convert date to ISO string for the API
      const dateObj = new Date(saleDate);
      const finalDate = dateObj.toISOString();

      // Call the parent's onSubmit with quantity
      const response = await fetch(`/api/frames/${frame.frameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_as_sold',
          quantity,
          salePrice: finalPrice,
          saleDate: finalDate,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || `Sold ${quantity} unit(s) successfully!`);
        onOpenChange(false);
        // Reset form
        setQuantity(1);
        // Trigger a page refresh or callback to reload frames
        window.location.reload();
      } else {
        throw new Error(result.error || 'Failed to record sale');
      }
    } catch (error) {
      console.error('Error recording sale:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to record sale. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalSaleAmount = parseFloat(salePrice) * quantity;
  const currentSalePrice = parseFloat(salePrice) || 0;
  const isBelowCost = frame.costPrice > 0 && currentSalePrice < frame.costPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto border-2 border-black">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl">Sell Frame</DialogTitle>
            <DialogDescription>
              Record a sale for this frame. Select the quantity and enter sale details.
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
                  <span className="font-semibold">{frame.styleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Color:</span>
                  <span>{frame.colorCode}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm text-gray-600">Available Stock:</span>
                  <span className="font-semibold">{frame.currentQty} unit(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Wholesale Cost:</span>
                  <span className="font-semibold">
                    ${frame.costPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Retail Price:</span>
                  <span className="font-semibold">
                    ${frame.retailPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Quantity Selector */}
            <div className="space-y-2">
              <Label>Quantity to Sell</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className="border-2 border-black h-10 w-10"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= maxQty) {
                      setQuantity(val);
                    }
                  }}
                  min={1}
                  max={maxQty}
                  className="border-2 border-black text-center w-20"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= maxQty}
                  className="border-2 border-black h-10 w-10"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-500">
                  of {maxQty} available
                </span>
              </div>
            </div>

            {/* Sale Price Override */}
            <div className="space-y-2">
              <Label htmlFor="salePrice">
                Sale Price per Unit (Optional Override)
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
              {isBelowCost && (
                <p className="text-sm text-red-600 font-medium">
                  Sale price cannot be below wholesale cost (${frame.costPrice.toFixed(2)})
                </p>
              )}
              <p className="text-xs text-gray-500">
                Leave as retail price or enter a different amount if the frame
                was sold at a discount.
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

            {/* Total Sale Amount */}
            <Card className="p-4 border-2 border-black bg-green-50">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Sale Amount:</span>
                <span className="text-xl font-bold text-green-700">
                  ${totalSaleAmount.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {quantity} unit(s) x ${parseFloat(salePrice).toFixed(2)}
              </p>
            </Card>
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
              disabled={isLoading || quantity < 1 || quantity > maxQty || isBelowCost}
              className="bg-sky-deeper hover:bg-sky-deeper/90 text-black font-semibold border-2 border-black"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                `Confirm Sale (${quantity} unit${quantity > 1 ? 's' : ''})`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
