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
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import type { Frame } from '@/types/admin';
import { Loader2, Minus, Plus, Package } from 'lucide-react';

interface RestockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frame: Frame;
  onSuccess: () => void;
}

export function RestockModal({
  open,
  onOpenChange,
  frame,
  onSuccess,
}: RestockModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [costPrice, setCostPrice] = useState<string>(frame.costPrice.toString());
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
  );
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when frame changes or modal opens
  useEffect(() => {
    if (open) {
      setQuantity(1);
      setCostPrice(frame.costPrice.toString());
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [open, frame.frameId, frame.costPrice]);

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty >= 1 && newQty <= 999) {
      setQuantity(newQty);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (quantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/frames/${frame.frameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restock',
          quantity,
          costPrice: parseFloat(costPrice),
          invoiceDate: new Date(invoiceDate).toISOString(),
          notes: notes.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || `Restocked ${quantity} unit(s) successfully!`);
        onOpenChange(false);
        // Reset form
        setQuantity(1);
        setCostPrice(frame.costPrice.toString());
        setNotes('');
        onSuccess();
      } else {
        throw new Error(result.error || 'Failed to restock');
      }
    } catch (error) {
      console.error('Error restocking frame:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to restock. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const newStockLevel = frame.currentQty + quantity;
  const totalInventoryValue = parseFloat(costPrice) * quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-2 border-black">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Package className="h-6 w-6 text-green-600" />
              Restock Frame
            </DialogTitle>
            <DialogDescription>
              Add more units of this frame to inventory. Enter the quantity and cost from your supplier invoice.
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
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm text-gray-600">Current Stock:</span>
                  <span className="font-semibold">{frame.currentQty} unit(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last Cost Price:</span>
                  <span className="font-semibold">
                    ${frame.costPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Quantity Selector */}
            <div className="space-y-2">
              <Label>Quantity to Add</Label>
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
                    if (!isNaN(val) && val >= 1 && val <= 999) {
                      setQuantity(val);
                    }
                  }}
                  min={1}
                  max={999}
                  className="border-2 border-black text-center w-20"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= 999}
                  className="border-2 border-black h-10 w-10"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Cost Price */}
            <div className="space-y-2">
              <Label htmlFor="costPrice">Cost Price per Unit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="border-2 border-black pl-7"
                />
              </div>
              <p className="text-xs text-gray-500">
                Defaults to last cost price. Update if supplier price has changed.
              </p>
            </div>

            {/* Invoice Date */}
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="border-2 border-black"
              />
              <p className="text-xs text-gray-500">
                Date on the supplier invoice
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Invoice #12345, PO #67890"
                className="border-2 border-black"
                rows={2}
              />
            </div>

            {/* Summary */}
            <Card className="p-4 border-2 border-green-300 bg-green-50">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">New Stock Level:</span>
                  <span className="text-xl font-bold text-green-700">
                    {newStockLevel} unit(s)
                  </span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm text-gray-600">Inventory Value Added:</span>
                  <span className="font-semibold">
                    ${totalInventoryValue.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {quantity} unit(s) x ${parseFloat(costPrice).toFixed(2)}
                </p>
              </div>
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
              disabled={isLoading || quantity < 1}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold border-2 border-green-800"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Restock ${quantity} Unit${quantity > 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
