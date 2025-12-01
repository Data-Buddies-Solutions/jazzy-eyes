'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, ShoppingCart, Ban } from 'lucide-react';
import type { Frame } from '@/types/admin';
import { ManualSaleModal } from './ManualSaleModal';

interface FrameTableProps {
  frames: Frame[];
  onEdit: (frame: Frame) => void;
  onMarkAsSold: (frameId: string, salePrice?: number, saleDate?: string) => Promise<void>;
  onMarkAsDiscontinued: (frameId: string) => Promise<void>;
}

export function FrameTable({
  frames,
  onEdit,
  onMarkAsSold,
  onMarkAsDiscontinued,
}: FrameTableProps) {
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [saleModalOpen, setSaleModalOpen] = useState(false);

  const getStatusBadge = (status: Frame['status']) => {
    switch (status) {
      case 'Active':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            Active
          </Badge>
        );
      case 'Sold':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            Sold
          </Badge>
        );
      case 'Discontinued':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
            Discontinued
          </Badge>
        );
    }
  };

  const handleMarkAsSold = (frame: Frame) => {
    setSelectedFrame(frame);
    setSaleModalOpen(true);
  };

  const handleSaleSubmit = async (salePrice?: number, saleDate?: string) => {
    if (selectedFrame) {
      await onMarkAsSold(selectedFrame.frameId, salePrice, saleDate);
      setSaleModalOpen(false);
      setSelectedFrame(null);
    }
  };

  const handleMarkAsDiscontinued = async (frameId: string) => {
    if (
      confirm(
        'Are you sure you want to mark this frame as discontinued? This action can be reversed by editing the frame.'
      )
    ) {
      await onMarkAsDiscontinued(frameId);
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
                <TableCell>{frame.model}</TableCell>
                <TableCell>{frame.color}</TableCell>
                <TableCell>{frame.frameType}</TableCell>
                <TableCell>{getStatusBadge(frame.status)}</TableCell>
                <TableCell className="text-right font-semibold">
                  ${frame.retailPrice.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(frame)}
                      className="border-black"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {frame.status === 'Active' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsSold(frame)}
                          className="border-black hover:bg-sky-soft"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsDiscontinued(frame.frameId)}
                          className="border-black hover:bg-red-50"
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedFrame && (
        <ManualSaleModal
          open={saleModalOpen}
          onOpenChange={setSaleModalOpen}
          frame={selectedFrame}
          onSubmit={handleSaleSubmit}
        />
      )}
    </>
  );
}
