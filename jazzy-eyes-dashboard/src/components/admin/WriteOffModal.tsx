'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Frame, WriteOffReason } from '@/types/admin';
import { Loader2, Minus, Plus, AlertTriangle } from 'lucide-react';

interface WriteOffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frame: Frame;
  onSuccess: () => void;
}

const WRITE_OFF_REASONS: { value: WriteOffReason; label: string }[] = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'lost', label: 'Lost/Missing' },
  { value: 'defective', label: 'Defective' },
  { value: 'return', label: 'Return (No Cost)' },
  { value: 'other', label: 'Other' },
];

export function WriteOffModal({
  open,
  onOpenChange,
  frame,
  onSuccess,
}: WriteOffModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<WriteOffReason | ''>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const maxQty = frame.currentQty;

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty >= 1 && newQty <= maxQty) {
      setQuantity(newQty);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      toast.error('Please select a reason for the write-off');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/frames/${frame.frameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'write_off',
          quantity,
          reason,
          notes: notes.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || `Written off ${quantity} unit(s) successfully!`);
        onOpenChange(false);
        // Reset form
        setQuantity(1);
        setReason('');
        setNotes('');
        onSuccess();
      } else {
        throw new Error(result.error || 'Failed to write off');
      }
    } catch (error) {
      console.error('Error writing off frame:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to write off. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isReturn = reason === 'return';
  const totalLossAmount = isReturn ? 0 : frame.costPrice * quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto border-2 border-black">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              Write Off Frame
            </DialogTitle>
            <DialogDescription>
              Remove damaged, lost, or defective frames from inventory. This action creates an audit trail.
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
                  <span className="text-sm text-gray-600">Available Stock:</span>
                  <span className="font-semibold">{frame.currentQty} unit(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cost per Unit:</span>
                  <span className="font-semibold">
                    ${frame.costPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Quantity Selector */}
            <div className="space-y-2">
              <Label>Quantity to Write Off</Label>
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

            {/* Reason Select */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Select value={reason} onValueChange={(value) => setReason(value as WriteOffReason)}>
                <SelectTrigger className="border-2 border-black">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {WRITE_OFF_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional details..."
                className="border-2 border-black"
                rows={3}
              />
            </div>

            {/* Total Loss Amount */}
            <Card className={`p-4 border-2 ${isReturn ? 'border-blue-300 bg-blue-50' : 'border-red-300 bg-red-50'}`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold">{isReturn ? 'Cost Impact:' : 'Total Loss (at cost):'}</span>
                <span className={`text-xl font-bold ${isReturn ? 'text-blue-700' : 'text-red-700'}`}>
                  ${totalLossAmount.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {isReturn
                  ? `${quantity} unit(s) returned - no cost recorded`
                  : `${quantity} unit(s) x $${frame.costPrice.toFixed(2)} cost`
                }
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
              disabled={isLoading || !reason || quantity < 1 || quantity > maxQty}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold border-2 border-red-800"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Write Off ${quantity} Unit${quantity > 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
