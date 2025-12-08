'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FrameTable } from '@/components/admin/FrameTable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FrameForm } from '@/components/admin/FrameForm';
import type { Frame } from '@/types/admin';
import type { FrameFormData } from '@/lib/validations/admin';
import { Search, Loader2 } from 'lucide-react';

export default function ManageInventoryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Active' | 'Sold' | 'Discontinued'
  >('All');
  const [frames, setFrames] = useState<Frame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [editingFrame, setEditingFrame] = useState<Frame | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadFrames = async (query?: string) => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        query: query !== undefined ? query : searchQuery,
        status: statusFilter,
      });
      const response = await fetch(`/api/frames/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setFrames(data.frames);
      } else {
        throw new Error(data.error || 'Failed to load frames');
      }
    } catch (error) {
      console.error('Error loading frames:', error);
      alert('Failed to load frames. Please try again.');
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  };

  // Debounced live search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadFrames();
    }, 300); // 300ms delay after user stops typing

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    loadFrames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFrames();
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as 'All' | 'Active' | 'Sold' | 'Discontinued');
  };

  const handleEdit = (frame: Frame) => {
    setEditingFrame(frame);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (data: FrameFormData) => {
    if (!editingFrame) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/frames/${editingFrame.frameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setEditModalOpen(false);
        setEditingFrame(null);
        await loadFrames();
        alert('Frame updated successfully!');
      } else {
        throw new Error(result.error || 'Failed to update frame');
      }
    } catch (error) {
      console.error('Error updating frame:', error);
      alert('Failed to update frame. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsSold = async (frameId: string, salePrice?: number, saleDate?: string) => {
    try {
      const response = await fetch(`/api/frames/${frameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_as_sold',
          salePrice,
          saleDate,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await loadFrames();
        alert('Frame marked as sold successfully!');
      } else {
        throw new Error(result.error || 'Failed to mark as sold');
      }
    } catch (error) {
      console.error('Error marking frame as sold:', error);
      alert('Failed to mark frame as sold. Please try again.');
    }
  };

  const handleMarkAsDiscontinued = async (frameId: string) => {
    try {
      const response = await fetch(`/api/frames/${frameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_as_discontinued',
        }),
      });

      const result = await response.json();

      if (result.success) {
        await loadFrames();
        alert('Frame marked as discontinued successfully!');
      } else {
        throw new Error(result.error || 'Failed to mark as discontinued');
      }
    } catch (error) {
      console.error('Error marking frame as discontinued:', error);
      alert('Failed to mark frame as discontinued. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Manage Inventory</h1>
        <p className="text-gray-600">
          Search, view, edit, and manage your frame inventory
        </p>
      </div>

      {/* Search & Filter */}
      <div className="bg-white border-2 border-black rounded-lg p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by Frame ID, brand, or model... (e.g., 1-GG)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-2 border-black pl-10"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="border-2 border-black">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Sold">Sold</SelectItem>
                  <SelectItem value="Discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <Button
              type="submit"
              disabled={isSearching}
              className="bg-sky-deeper hover:bg-sky-deeper/90 text-black font-semibold border-2 border-black"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <p className="text-gray-600">
              {isLoading ? (
                'Loading...'
              ) : (
                <>
                  Found <span className="font-semibold">{frames.length}</span>{' '}
                  frame(s)
                </>
              )}
            </p>
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                }}
                className="text-sky-deeper hover:text-sky-deeper/80"
              >
                Clear filters
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Results Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-sky-deeper" />
        </div>
      ) : (
        <FrameTable
          frames={frames}
          onEdit={handleEdit}
          onMarkAsSold={handleMarkAsSold}
          onMarkAsDiscontinued={handleMarkAsDiscontinued}
        />
      )}

      {/* Edit Modal */}
      {editingFrame && (
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-black">
            <DialogHeader>
              <DialogTitle className="text-2xl">Edit Frame</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <FrameForm
                onSubmit={handleEditSubmit}
                defaultValues={{
                  brandId: parseInt(editingFrame.frameId.split('-')[0]),
                  styleNumber: editingFrame.styleNumber,
                  colorCode: editingFrame.colorCode,
                  eyeSize: editingFrame.eyeSize,
                  gender: editingFrame.gender,
                  frameType: editingFrame.frameType,
                  productType: editingFrame.productType,
                  costPrice: editingFrame.costPrice,
                  retailPrice: editingFrame.retailPrice,
                  notes: editingFrame.notes || '',
                }}
                isLoading={isSaving}
                submitLabel="Update Frame"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
