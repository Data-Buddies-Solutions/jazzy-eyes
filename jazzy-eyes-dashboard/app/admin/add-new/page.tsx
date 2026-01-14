'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FrameForm } from '@/components/admin/FrameForm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { FrameFormData, Brand } from '@/types/admin';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface SavedFrameInfo {
  frameId: string;
  brand: string;
  styleNumber: string;
  colorCode: string;
  eyeSize: string;
}

export default function AddNewFramePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFrame, setSavedFrame] = useState<SavedFrameInfo | null>(null);

  const handleSubmit = async (data: FrameFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add frame');
      }

      // Fetch brand name for display
      const brandResponse = await fetch('/api/brands');
      const brandData = await brandResponse.json();
      const brand = brandData.brands?.find((b: Brand) => b.id === data.brandId);

      setSavedFrame({
        frameId: result.frameId,
        brand: brand?.brandName || 'Unknown',
        styleNumber: data.styleNumber,
        colorCode: data.colorCode,
        eyeSize: data.eyeSize,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add frame';
      setError(errorMessage);
      console.error('Error adding frame:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAnother = () => {
    setSavedFrame(null);
    setError(null);
  };

  const handleViewAll = () => {
    router.push('/admin/manage');
  };

  if (savedFrame) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Add New Frame</h1>
          <p className="text-gray-600">
            Add individual frames to your inventory
          </p>
        </div>

        <Card className="p-8 border-2 border-black bg-white">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2">Frame Added Successfully!</h2>
              <p className="text-gray-600">
                Your new frame has been added to the inventory
              </p>
            </div>

            <Card className="p-6 border-2 border-black bg-white">
              <div className="space-y-3 text-left">
                <div className="border-b pb-3">
                  <p className="text-sm text-gray-600">Generated Frame ID</p>
                  <p className="text-3xl font-bold text-black font-mono">
                    {savedFrame.frameId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Frame Details</p>
                  <p className="text-lg font-semibold">
                    {savedFrame.brand} - {savedFrame.styleNumber}
                  </p>
                  <p className="text-gray-600">
                    {savedFrame.colorCode} | {savedFrame.eyeSize}
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                onClick={handleAddAnother}
                className="bg-sky-deeper hover:bg-sky-deeper/90 text-black font-semibold border-2 border-black"
              >
                Add Another Frame
              </Button>
              <Button
                onClick={handleViewAll}
                variant="outline"
                className="border-2 border-black"
              >
                View All Frames
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Add New Frame</h1>
        <p className="text-gray-600">
          Add individual frames to your inventory. Fill out all required fields below.
        </p>
      </div>

      {error && (
        <Card className="p-4 border-2 border-red-500 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Error Adding Frame</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </Card>
      )}

      <FrameForm onSubmit={handleSubmit} isLoading={isLoading} submitLabel="Add Frame" />
    </div>
  );
}
