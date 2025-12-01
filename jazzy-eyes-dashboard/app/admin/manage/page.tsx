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
import {
  mockSearchFrames,
  mockMarkAsSold,
  mockMarkAsDiscontinued,
  mockUpdateFrame,
} from '@/data/mockApi';
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

  const loadFrames = async () => {
    setIsSearching(true);
    try {
      const results = await mockSearchFrames(searchQuery, statusFilter);
      setFrames(results);
    } catch (error) {
      console.error('Error loading frames:', error);
      alert('Failed to load frames. Please try again.');
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  };

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

  useEffect(() => {
    loadFrames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleEdit = (frame: Frame) => {
    setEditingFrame(frame);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (data: FrameFormData) => {
    if (!editingFrame) return;

    setIsSaving(true);
    try {
      await mockUpdateFrame(editingFrame.frameId, data);
      setEditModalOpen(false);
      setEditingFrame(null);
      await loadFrames();
      alert('Frame updated successfully!');
    } catch (error) {
      console.error('Error updating frame:', error);
      alert('Failed to update frame. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsSold = async (frameId: string, salePrice?: number, saleDate?: string) => {
    try {
      await mockMarkAsSold(frameId, salePrice, saleDate);
      await loadFrames();
      alert('Frame marked as sold successfully!');
    } catch (error) {
      console.error('Error marking frame as sold:', error);
      alert('Failed to mark frame as sold. Please try again.');
    }
  };

  const handleMarkAsDiscontinued = async (frameId: string) => {
    try {
      await mockMarkAsDiscontinued(frameId);
      await loadFrames();
      alert('Frame marked as discontinued successfully!');
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
                  placeholder="Search by brand or model..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-2 border-black pl-10"
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
                  brand: editingFrame.brand,
                  model: editingFrame.model,
                  color: editingFrame.color,
                  gender: editingFrame.gender,
                  frameType: editingFrame.frameType,
                  costPrice: editingFrame.costPrice,
                  retailPrice: editingFrame.retailPrice,
                  supplier: editingFrame.supplier,
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
