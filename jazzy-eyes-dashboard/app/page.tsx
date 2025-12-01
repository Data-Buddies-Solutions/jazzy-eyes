'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FrameIdInput } from '@/components/pos/FrameIdInput';
import { ErrorMessage } from '@/components/pos/ErrorMessage';
import { mockGetFrame } from '@/data/mockApi';
import type { FrameIdFormData } from '@/lib/validations/pos';
import { Menu } from 'lucide-react';

export default function IdEntryPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: FrameIdFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const frame = await mockGetFrame(data.frameId);

      // Check if frame is already sold
      if (frame.status === 'Sold') {
        setError('This frame has already been sold.');
        return;
      }

      // Navigate to confirmation page with frameId
      router.push(`/pos/confirm?frameId=${data.frameId}`);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Frame not found') {
          setError(`Frame ID "${data.frameId}" was not found. Please check the ID and try again.`);
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-black px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Jazzy Eyes Frame Look Up</h1>
          <button
            onClick={() => router.push('/admin')}
            className="p-2 text-black hover:text-sky-deeper transition-colors"
            aria-label="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto space-y-6">
          {/* Frame ID Input Form */}
          <FrameIdInput onSubmit={handleSubmit} isLoading={isLoading} />

          {/* Error Display */}
          {error && (
            <ErrorMessage
              title="Frame Not Found"
              message={error}
            />
          )}
        </div>
      </main>
    </div>
  );
}
