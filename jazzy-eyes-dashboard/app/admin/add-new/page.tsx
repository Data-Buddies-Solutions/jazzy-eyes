'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FrameForm } from '@/components/admin/FrameForm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockAddFrame } from '@/data/mockApi';
import type { FrameFormData } from '@/lib/validations/admin';
import { CheckCircle2 } from 'lucide-react';
import type { Frame } from '@/types/admin';

export default function AddNewFramePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [savedFrame, setSavedFrame] = useState<Frame | null>(null);

  const handleSubmit = async (data: FrameFormData) => {
    setIsLoading(true);

    try {
      const newFrame = await mockAddFrame(data);
      setSavedFrame(newFrame);
    } catch (error) {
      console.error('Error adding frame:', error);
      alert('Failed to add frame. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAnother = () => {
    setSavedFrame(null);
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
                  <p className="text-3xl font-bold text-black">
                    {savedFrame.frameId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Frame Details</p>
                  <p className="text-lg font-semibold">
                    {savedFrame.brand} - {savedFrame.model}
                  </p>
                  <p className="text-gray-600">{savedFrame.color}</p>
                </div>
              </div>
            </Card>

            <div className="p-4 bg-sky-soft border-2 border-sky-deeper rounded-lg">
              <p className="font-semibold text-gray-800 mb-1">Next Step:</p>
              <p className="text-gray-700">
                Create a label with ID: <span className="font-bold">{savedFrame.frameId}</span>
              </p>
            </div>

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

      <FrameForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
