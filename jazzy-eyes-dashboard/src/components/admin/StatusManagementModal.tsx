'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Edit, Trash2, AlertCircle, Lock } from 'lucide-react';
import { StatusForm } from './StatusForm';
import { ConfirmationModal } from './ConfirmationModal';
import type { FrameStatus, CreateStatusData, UpdateStatusData } from '@/types/admin';

interface StatusManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusesChanged?: () => void;
}

export function StatusManagementModal({
  open,
  onOpenChange,
  onStatusesChanged,
}: StatusManagementModalProps) {
  const [statuses, setStatuses] = useState<FrameStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);

  // Selected data
  const [selectedStatus, setSelectedStatus] = useState<FrameStatus | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<any>(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  const loadStatuses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/statuses');
      const data = await response.json();

      if (data.success && data.statuses) {
        setStatuses(data.statuses);
      } else {
        setError('Failed to load statuses');
      }
    } catch (err) {
      console.error('Error loading statuses:', err);
      setError('Failed to load statuses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadStatuses();
    }
  }, [open]);

  const handleCreateStatus = async (data: CreateStatusData) => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setAddModalOpen(false);
        await loadStatuses();
        toast.success(`Status "${data.name}" created successfully`);
        onStatusesChanged?.();
      } else {
        setError(result.error || 'Failed to create status');
      }
    } catch (err) {
      console.error('Error creating status:', err);
      setError('Failed to create status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditStatus = (status: FrameStatus) => {
    setSelectedStatus(status);
    setEditModalOpen(true);
  };

  const handleUpdateStatus = async (data: UpdateStatusData) => {
    if (!selectedStatus) return;

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/statuses/${selectedStatus.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success && result.requiresConfirmation) {
        setPendingUpdate({ ...data, confirmed: true });
        setConfirmMessage(result.message);
        setConfirmModalOpen(true);
        setIsSaving(false);
        return;
      }

      if (result.success) {
        setEditModalOpen(false);
        setSelectedStatus(null);
        await loadStatuses();
        toast.success('Status updated successfully');
        onStatusesChanged?.();
      } else {
        setError(result.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmedUpdate = async () => {
    if (!selectedStatus || !pendingUpdate) return;

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/statuses/${selectedStatus.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingUpdate),
      });

      const result = await response.json();

      if (result.success) {
        setConfirmModalOpen(false);
        setEditModalOpen(false);
        setSelectedStatus(null);
        setPendingUpdate(null);
        await loadStatuses();
        toast.success('Status updated successfully');
        onStatusesChanged?.();
      } else {
        setError(result.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStatus = (status: FrameStatus) => {
    if (status.isProtected) {
      setError(`Cannot delete protected status "${status.name}"`);
      return;
    }

    if (status.productCount > 0) {
      setError(
        `Cannot delete "${status.name}" - it has ${status.productCount} product(s) associated with it. Please reassign products first.`
      );
      return;
    }

    setSelectedStatus(status);
    setConfirmMessage(
      `Are you sure you want to delete "${status.name}"? This action cannot be undone.`
    );
    setDeleteConfirmModalOpen(true);
  };

  const handleConfirmedDelete = async () => {
    if (!selectedStatus) return;

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/statuses/${selectedStatus.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setDeleteConfirmModalOpen(false);
        setSelectedStatus(null);
        await loadStatuses();
        toast.success('Status deleted successfully');
        onStatusesChanged?.();
      } else {
        setError(result.error || 'Failed to delete status');
      }
    } catch (err) {
      console.error('Error deleting status:', err);
      setError('Failed to delete status');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadgeClass = (colorScheme: string) => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-100 text-green-800 border-green-300',
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      gray: 'bg-gray-100 text-gray-800 border-gray-300',
      red: 'bg-red-100 text-red-800 border-red-300',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      purple: 'bg-purple-100 text-purple-800 border-purple-300',
      orange: 'bg-orange-100 text-orange-800 border-orange-300',
      pink: 'bg-pink-100 text-pink-800 border-pink-300',
    };
    return colorMap[colorScheme] || colorMap.green;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-black">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl">Manage Statuses</DialogTitle>
              <Button
                onClick={() => setAddModalOpen(true)}
                className="bg-sky-deeper hover:bg-sky-deeper/90 text-black font-semibold border-2 border-black"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Status
              </Button>
            </div>
          </DialogHeader>

          {/* Error Alert */}
          {error && (
            <Alert className="border-2 border-red-500 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-600">{error}</AlertDescription>
            </Alert>
          )}

          {/* Status List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-sky-deeper" />
              </div>
            ) : (
              statuses.map((status) => (
                <div
                  key={status.id}
                  className="flex items-center justify-between p-4 bg-white border-2 border-black rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeClass(
                        status.colorScheme
                      )}`}
                    >
                      {status.name}
                    </span>
                    {status.isProtected && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Lock className="w-3 h-3" />
                        <span>Protected</span>
                      </div>
                    )}
                    <span className="text-sm text-gray-500">
                      {status.productCount} product(s)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditStatus(status)}
                      disabled={status.isProtected}
                      className="border-black"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteStatus(status)}
                      disabled={status.isProtected || status.productCount > 0}
                      className="border-black text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Status Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="border-2 border-black">
          <DialogTitle>Add New Status</DialogTitle>
          <StatusForm
            mode="create"
            onSubmit={handleCreateStatus}
            isLoading={isSaving}
            submitLabel="Create Status"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Status Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="border-2 border-black">
          <DialogTitle>Edit Status</DialogTitle>
          {selectedStatus && (
            <StatusForm
              mode="edit"
              onSubmit={handleUpdateStatus}
              defaultValues={{
                name: selectedStatus.name,
                colorScheme: selectedStatus.colorScheme,
              }}
              isLoading={isSaving}
              submitLabel="Update Status"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal - Update */}
      <ConfirmationModal
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        title="Confirm Update"
        description={confirmMessage}
        onConfirm={handleConfirmedUpdate}
        isLoading={isSaving}
      />

      {/* Confirmation Modal - Delete */}
      <ConfirmationModal
        open={deleteConfirmModalOpen}
        onOpenChange={setDeleteConfirmModalOpen}
        title="Confirm Delete"
        description={confirmMessage}
        onConfirm={handleConfirmedDelete}
        isLoading={isSaving}
      />
    </>
  );
}
