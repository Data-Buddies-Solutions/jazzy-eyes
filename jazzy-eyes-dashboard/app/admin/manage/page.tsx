'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

type StatusFilter = 'All' | 'Active' | 'Sold Out' | 'Discontinued';

export default function ManageInventoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [frames, setFrames] = useState<Frame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [editingFrame, setEditingFrame] = useState<Frame | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });

  const loadFrames = async (query?: string, page: number = 1, status?: StatusFilter) => {
    setIsSearching(true);
    try {
      const currentStatus = status !== undefined ? status : statusFilter;
      const params = new URLSearchParams({
        query: query !== undefined ? query : searchQuery,
        page: page.toString(),
        limit: '20',
        status: currentStatus,
      });
      const response = await fetch(`/api/frames/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setFrames(data.frames);
        setPagination(data.pagination);
      } else {
        throw new Error(data.error || 'Failed to load frames');
      }
    } catch (error) {
      console.error('Error loading frames:', error);
      toast.error('Failed to load frames. Please try again.');
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  };

  // Debounced live search - reset to page 1 on new search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadFrames(searchQuery, 1, statusFilter);
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
    loadFrames(searchQuery, 1, statusFilter);
  };

  const handlePageChange = (newPage: number) => {
    loadFrames(searchQuery, newPage, statusFilter);
  };

  const handleStatusFilter = (status: StatusFilter) => {
    setStatusFilter(status);
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
        await loadFrames(searchQuery, pagination.page, statusFilter);
        // Show the backend message which includes ID change info
        toast.success(result.message || 'Frame updated successfully!');
        // If ID changed, also show the new ID
        if (result.newCompositeId) {
          console.log('Frame ID changed to:', result.newCompositeId);
        }
      } else {
        throw new Error(result.error || 'Failed to update frame');
      }
    } catch (error) {
      console.error('Error updating frame:', error);
      toast.error('Failed to update frame. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsSold = async (
    frameId: string,
    quantity: number,
    salePrice?: number,
    saleDate?: string
  ) => {
    try {
      const response = await fetch(`/api/frames/${frameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_as_sold',
          quantity,
          salePrice,
          saleDate,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await loadFrames(searchQuery, pagination.page, statusFilter);
        toast.success(result.message || `Sold ${quantity} unit(s) successfully!`);
      } else {
        throw new Error(result.error || 'Failed to mark as sold');
      }
    } catch (error) {
      console.error('Error marking frame as sold:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to mark frame as sold. Please try again.'
      );
    }
  };

  const handleRefresh = () => {
    loadFrames(searchQuery, pagination.page, statusFilter);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Manage Inventory</h1>
        <p className="text-gray-600">
          Search, view, edit, and manage your frame inventory
        </p>
      </div>

      {/* Search */}
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

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 mr-2">Status:</span>
            {(['All', 'Active', 'Sold Out', 'Discontinued'] as StatusFilter[]).map((status) => (
              <Button
                key={status}
                type="button"
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter(status)}
                className={
                  statusFilter === status
                    ? status === 'Active'
                      ? 'bg-green-600 hover:bg-green-700 text-white border-2 border-green-700'
                      : status === 'Sold Out'
                      ? 'bg-red-600 hover:bg-red-700 text-white border-2 border-red-700'
                      : status === 'Discontinued'
                      ? 'bg-gray-600 hover:bg-gray-700 text-white border-2 border-gray-700'
                      : 'bg-sky-deeper hover:bg-sky-deeper/90 text-black border-2 border-black'
                    : 'border-2 border-gray-300 hover:border-black'
                }
              >
                {status}
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm">
            <p className="text-gray-600">
              {isLoading ? (
                'Loading...'
              ) : (
                <>
                  Showing{' '}
                  <span className="font-semibold">
                    {pagination.totalCount === 0
                      ? 0
                      : (pagination.page - 1) * pagination.limit + 1}
                    -
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.totalCount
                    )}
                  </span>{' '}
                  of <span className="font-semibold">{pagination.totalCount}</span>{' '}
                  frame(s)
                </>
              )}
            </p>
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSearchQuery('')}
                className="text-sky-deeper hover:text-sky-deeper/80"
              >
                Clear search
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
        <>
          <FrameTable
            frames={frames}
            onEdit={handleEdit}
            onMarkAsSold={handleMarkAsSold}
            onRefresh={handleRefresh}
          />

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || isSearching}
                className="border-2 border-black"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {/* Show page numbers */}
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // Show first, last, current, and pages near current
                    return (
                      page === 1 ||
                      page === pagination.totalPages ||
                      Math.abs(page - pagination.page) <= 2
                    );
                  })
                  .map((page, index, array) => {
                    // Add ellipsis if there's a gap
                    const showEllipsisBefore =
                      index > 0 && page - array[index - 1] > 1;
                    return (
                      <span key={page} className="flex items-center">
                        {showEllipsisBefore && (
                          <span className="px-2 text-gray-400">...</span>
                        )}
                        <Button
                          variant={pagination.page === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          disabled={isSearching}
                          className={
                            pagination.page === page
                              ? 'bg-sky-deeper hover:bg-sky-deeper/90 text-black border-2 border-black'
                              : 'border-2 border-black'
                          }
                        >
                          {page}
                        </Button>
                      </span>
                    );
                  })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages || isSearching}
                className="border-2 border-black"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </>
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
                  invoiceDate: editingFrame.invoiceDate
                    ? editingFrame.invoiceDate.split('T')[0]
                    : '',
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
