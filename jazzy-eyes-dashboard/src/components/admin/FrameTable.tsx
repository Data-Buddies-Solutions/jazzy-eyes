'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Package, AlertTriangle, History, ShoppingCart } from 'lucide-react';
import type { Frame } from '@/types/admin';
import { ManualSaleModal } from './ManualSaleModal';
import { WriteOffModal } from './WriteOffModal';
import { RestockModal } from './RestockModal';
import { TransactionHistoryModal } from './TransactionHistoryModal';

interface FrameTableProps {
  frames: Frame[];
  onEdit: (frame: Frame) => void;
  onMarkAsSold: (frameId: string, quantity: number, salePrice?: number, saleDate?: string) => Promise<void>;
  onRefresh: () => void;
}

export function FrameTable({
  frames,
  onEdit,
  onMarkAsSold,
  onRefresh,
}: FrameTableProps) {
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [writeOffModalOpen, setWriteOffModalOpen] = useState(false);
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const handleMarkAsSold = (frame: Frame) => {
    setSelectedFrame(frame);
    setSaleModalOpen(true);
  };

  const handleWriteOff = (frame: Frame) => {
    setSelectedFrame(frame);
    setWriteOffModalOpen(true);
  };

  const handleRestock = (frame: Frame) => {
    setSelectedFrame(frame);
    setRestockModalOpen(true);
  };

  const handleHistory = (frame: Frame) => {
    setSelectedFrame(frame);
    setHistoryModalOpen(true);
  };

  const handleSaleSubmit = async (quantity: number, salePrice?: number, saleDate?: string) => {
    if (selectedFrame) {
      await onMarkAsSold(selectedFrame.frameId, quantity, salePrice, saleDate);
      setSaleModalOpen(false);
      setSelectedFrame(null);
    }
  };

  if (frames.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-500 text-lg">No frames found</p>
        <p className="text-gray-400 text-sm mt-1">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border-2 border-black rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-sky-soft border-b-2 border-black">
              <TableHead className="font-bold text-black">Frame ID</TableHead>
              <TableHead className="font-bold text-black">Brand</TableHead>
              <TableHead className="font-bold text-black">Model</TableHead>
              <TableHead className="font-bold text-black">Color</TableHead>
              <TableHead className="font-bold text-black text-center">Qty</TableHead>
              <TableHead className="font-bold text-black">Type</TableHead>
              <TableHead className="font-bold text-black">Status</TableHead>
              <TableHead className="font-bold text-black text-right">
                Retail Price
              </TableHead>
              <TableHead className="font-bold text-black text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {frames.map((frame) => (
              <TableRow key={frame.frameId} className="border-b border-gray-200">
                <TableCell className="font-mono font-semibold">
                  {frame.frameId}
                </TableCell>
                <TableCell>{frame.brand}</TableCell>
                <TableCell>{frame.styleNumber}</TableCell>
                <TableCell>{frame.colorCode}</TableCell>
                <TableCell className="text-center font-semibold">
                  {frame.currentQty}
                </TableCell>
                <TableCell>{frame.frameType}</TableCell>
                <TableCell>
                  {frame.currentQty === 0 ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
                      Sold Out
                    </span>
                  ) : frame.status === 'Discontinued' ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                      Discontinued
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                      Active
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  ${frame.retailPrice.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(frame)}
                      className="border-black"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {frame.currentQty > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsSold(frame)}
                          className="border-green-600 text-green-700 hover:bg-green-50"
                          title="Sell"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleWriteOff(frame)}
                          className="border-red-600 text-red-700 hover:bg-red-50"
                          title="Write Off"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestock(frame)}
                      className="border-purple-600 text-purple-700 hover:bg-purple-50"
                      title="Restock"
                    >
                      <Package className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHistory(frame)}
                      className="border-gray-600 text-gray-700 hover:bg-gray-50"
                      title="History"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedFrame && (
        <>
          <ManualSaleModal
            open={saleModalOpen}
            onOpenChange={setSaleModalOpen}
            frame={selectedFrame}
            onSubmit={handleSaleSubmit}
          />
          <WriteOffModal
            open={writeOffModalOpen}
            onOpenChange={setWriteOffModalOpen}
            frame={selectedFrame}
            onSuccess={onRefresh}
          />
          <RestockModal
            open={restockModalOpen}
            onOpenChange={setRestockModalOpen}
            frame={selectedFrame}
            onSuccess={onRefresh}
          />
          <TransactionHistoryModal
            open={historyModalOpen}
            onOpenChange={setHistoryModalOpen}
            frame={selectedFrame}
          />
        </>
      )}
    </>
  );
}
