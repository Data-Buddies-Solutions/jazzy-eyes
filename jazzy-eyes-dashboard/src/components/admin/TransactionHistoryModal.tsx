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
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Frame, InventoryTransactionRecord } from '@/types/admin';
import { Loader2, History, RotateCcw, ShoppingCart, Package, AlertTriangle, Truck } from 'lucide-react';
// Note: RotateCcw kept for REVERT_WRITE_OFF transaction type display

interface TransactionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frame: Frame;
}

const TRANSACTION_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ORDER: { label: 'Initial Order', icon: Truck, color: 'bg-blue-100 text-blue-800' },
  SALE: { label: 'Sale', icon: ShoppingCart, color: 'bg-green-100 text-green-800' },
  WRITE_OFF: { label: 'Write Off', icon: AlertTriangle, color: 'bg-red-100 text-red-800' },
  RESTOCK: { label: 'Restock', icon: Package, color: 'bg-purple-100 text-purple-800' },
  REVERT_WRITE_OFF: { label: 'Revert Write-Off', icon: RotateCcw, color: 'bg-yellow-100 text-yellow-800' },
};

const WRITE_OFF_REASON_LABELS: Record<string, string> = {
  damaged: 'Damaged',
  lost: 'Lost/Missing',
  defective: 'Defective',
  return: 'Return',
  other: 'Other',
};

export function TransactionHistoryModal({
  open,
  onOpenChange,
  frame,
}: TransactionHistoryModalProps) {
  const [transactions, setTransactions] = useState<InventoryTransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/frames/${frame.frameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_transactions' }),
      });

      const result = await response.json();

      if (result.success) {
        setTransactions(result.transactions);
      } else {
        throw new Error(result.error || 'Failed to load transactions');
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadTransactions();
    }
  }, [open, frame.frameId]);

  const formatDate = (dateString: string) => {
    // Parse as UTC to avoid timezone shifts
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] border-2 border-black">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <History className="h-6 w-6" />
            Transaction History
          </DialogTitle>
          <DialogDescription>
            View all inventory transactions for this frame.
          </DialogDescription>
        </DialogHeader>

        {/* Frame Details */}
        <Card className="p-4 border-2 border-black bg-sky-soft/20">
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-sm text-gray-600">Frame ID: </span>
              <span className="font-mono font-bold">{frame.frameId}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Brand: </span>
              <span className="font-semibold">{frame.brand}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Model: </span>
              <span className="font-semibold">{frame.styleNumber}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Current Stock: </span>
              <span className="font-semibold">{frame.currentQty} unit(s)</span>
            </div>
          </div>
        </Card>

        {/* Transactions Table */}
        <div className="overflow-y-auto max-h-[400px] border-2 border-black rounded-lg">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-sky-deeper" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No transactions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-bold">Date</TableHead>
                  <TableHead className="font-bold">Type</TableHead>
                  <TableHead className="font-bold text-right">Qty</TableHead>
                  <TableHead className="font-bold text-right">Amount</TableHead>
                  <TableHead className="font-bold">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
                  const config = TRANSACTION_TYPE_CONFIG[transaction.transactionType] || {
                    label: transaction.transactionType,
                    icon: History,
                    color: 'bg-gray-100 text-gray-800',
                  };
                  const Icon = config.icon;

                  // Determine what amount to show based on transaction type
                  const getAmountDisplay = () => {
                    switch (transaction.transactionType) {
                      case 'SALE':
                        return transaction.unitPrice > 0 ? `$${transaction.unitPrice.toFixed(2)}` : '—';
                      case 'WRITE_OFF':
                        return '—';
                      case 'ORDER':
                      case 'RESTOCK':
                        return `$${transaction.unitCost.toFixed(2)}`;
                      case 'REVERT_WRITE_OFF':
                        return '—';
                      default:
                        return '—';
                    }
                  };

                  return (
                    <TableRow key={transaction.id} className="border-b">
                      <TableCell className="whitespace-nowrap">
                        {formatDate(transaction.transactionDate)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${config.color} flex items-center gap-1 w-fit`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                        {transaction.isReverted && (
                          <Badge className="ml-1 bg-gray-200 text-gray-600 text-xs">
                            Reverted
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {transaction.transactionType === 'SALE' || transaction.transactionType === 'WRITE_OFF'
                          ? `-${transaction.quantity}`
                          : `+${transaction.quantity}`}
                      </TableCell>
                      <TableCell className="text-right">
                        {getAmountDisplay()}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="text-sm">
                          {transaction.writeOffReason && (
                            <span className="text-red-600 font-medium">
                              {WRITE_OFF_REASON_LABELS[transaction.writeOffReason] || transaction.writeOffReason}
                            </span>
                          )}
                          {transaction.revertedFromId && (
                            <span className="text-yellow-600 font-medium">
                              Reverted #{transaction.revertedFromId}
                            </span>
                          )}
                          {transaction.notes && (
                            <p className="text-gray-500 truncate" title={transaction.notes}>
                              {transaction.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-2 border-black"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
