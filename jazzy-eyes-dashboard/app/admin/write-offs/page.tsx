'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Loader2, AlertTriangle, RotateCcw } from 'lucide-react';

interface WriteOff {
  id: number;
  frameId: string;
  brand: string;
  styleNumber: string;
  colorCode: string;
  transactionDate: string;
  quantity: number;
  reason: string | null;
  notes: string | null;
  isReverted: boolean;
  revertedByTransactionId: number | null;
}

const WRITE_OFF_REASON_LABELS: Record<string, string> = {
  damaged: 'Damaged',
  lost: 'Lost/Missing',
  defective: 'Defective',
  return: 'Return',
  other: 'Other',
};

export default function WriteOffsPage() {
  const [writeOffs, setWriteOffs] = useState<WriteOff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReverting, setIsReverting] = useState<number | null>(null);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);
  const [selectedWriteOff, setSelectedWriteOff] = useState<WriteOff | null>(null);

  const loadWriteOffs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/write-offs');
      const data = await response.json();

      if (data.success) {
        setWriteOffs(data.writeOffs);
      } else {
        throw new Error(data.error || 'Failed to load write-offs');
      }
    } catch (error) {
      console.error('Error loading write-offs:', error);
      toast.error('Failed to load write-offs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWriteOffs();
  }, []);

  const handleRevertClick = (writeOff: WriteOff) => {
    setSelectedWriteOff(writeOff);
    setRevertConfirmOpen(true);
  };

  const handleRevertConfirm = async () => {
    if (!selectedWriteOff) return;

    setIsReverting(selectedWriteOff.id);
    setRevertConfirmOpen(false);

    try {
      const response = await fetch(`/api/frames/${selectedWriteOff.frameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revert_write_off',
          writeOffTransactionId: selectedWriteOff.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Write-off reverted successfully!');
        await loadWriteOffs();
      } else {
        throw new Error(result.error || 'Failed to revert write-off');
      }
    } catch (error) {
      console.error('Error reverting write-off:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to revert write-off');
    } finally {
      setIsReverting(null);
      setSelectedWriteOff(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const activeWriteOffs = writeOffs.filter((wo) => !wo.isReverted);
  const revertedWriteOffs = writeOffs.filter((wo) => wo.isReverted);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Write-offs</h1>
        <p className="text-gray-600">
          View and manage inventory write-offs. Revert write-offs made in error.
        </p>
      </div>

      {/* Summary */}
      <div className="flex gap-4">
        <div className="bg-white border-2 border-black rounded-lg p-4">
          <div className="text-sm text-gray-600">Active Write-offs</div>
          <div className="text-2xl font-bold">{activeWriteOffs.length}</div>
        </div>
        <div className="bg-white border-2 border-black rounded-lg p-4">
          <div className="text-sm text-gray-600">Reverted</div>
          <div className="text-2xl font-bold text-gray-400">{revertedWriteOffs.length}</div>
        </div>
      </div>

      {/* Write-offs Table */}
      <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-sky-deeper" />
          </div>
        ) : writeOffs.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No write-offs found</p>
            <p className="text-gray-400 text-sm mt-1">
              Write-offs will appear here when frames are written off from inventory
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-sky-soft border-b-2 border-black">
                <TableHead className="font-bold text-black">Date</TableHead>
                <TableHead className="font-bold text-black">Frame ID</TableHead>
                <TableHead className="font-bold text-black">Brand</TableHead>
                <TableHead className="font-bold text-black">Model</TableHead>
                <TableHead className="font-bold text-black">Color</TableHead>
                <TableHead className="font-bold text-black text-center">Qty</TableHead>
                <TableHead className="font-bold text-black">Reason</TableHead>
                <TableHead className="font-bold text-black">Notes</TableHead>
                <TableHead className="font-bold text-black text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {writeOffs.map((writeOff) => (
                <TableRow
                  key={writeOff.id}
                  className={`border-b border-gray-200 ${writeOff.isReverted ? 'opacity-50' : ''}`}
                >
                  <TableCell className="whitespace-nowrap">
                    {formatDate(writeOff.transactionDate)}
                  </TableCell>
                  <TableCell className="font-mono font-semibold">
                    {writeOff.frameId}
                  </TableCell>
                  <TableCell>{writeOff.brand}</TableCell>
                  <TableCell>{writeOff.styleNumber}</TableCell>
                  <TableCell>{writeOff.colorCode}</TableCell>
                  <TableCell className="text-center font-semibold text-red-600">
                    -{writeOff.quantity}
                  </TableCell>
                  <TableCell>
                    {writeOff.reason && (
                      <Badge variant="outline" className="border-red-300 text-red-700">
                        {WRITE_OFF_REASON_LABELS[writeOff.reason] || writeOff.reason}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {writeOff.notes && (
                      <p className="text-sm text-gray-500 truncate" title={writeOff.notes}>
                        {writeOff.notes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {writeOff.isReverted ? (
                      <Badge className="bg-gray-200 text-gray-600">Reverted</Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevertClick(writeOff)}
                        disabled={isReverting === writeOff.id}
                        className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                      >
                        {isReverting === writeOff.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Revert
                          </>
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Revert Confirmation Dialog */}
      <AlertDialog open={revertConfirmOpen} onOpenChange={setRevertConfirmOpen}>
        <AlertDialogContent className="border-2 border-black">
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Write-off?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore {selectedWriteOff?.quantity} unit(s) of{' '}
              <span className="font-semibold">
                {selectedWriteOff?.brand} {selectedWriteOff?.styleNumber}
              </span>{' '}
              back to inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-black">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevertConfirm}
              className="bg-yellow-500 hover:bg-yellow-600 text-black border-2 border-black"
            >
              Revert Write-off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
