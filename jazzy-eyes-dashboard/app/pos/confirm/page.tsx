'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mockGetFrame } from '@/data/mockApi';
import type { Frame } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

function ConfirmPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const frameId = searchParams.get('frameId');

  const [frame, setFrame] = useState<Frame | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!frameId) {
      router.push('/');
      return;
    }

    const loadFrame = async () => {
      try {
        const frameData = await mockGetFrame(frameId);
        setFrame(frameData);
      } catch (err) {
        setError('Failed to load frame details');
      } finally {
        setIsLoading(false);
      }
    };

    loadFrame();
  }, [frameId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Loading frame details...</p>
      </div>
    );
  }

  if (error || !frame) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-error">{error || 'Frame not found'}</p>
          <Button onClick={() => router.push('/')}>
            Back to ID Entry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-black px-4 py-4 sm:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-2 text-black hover:text-sky-deeper transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Confirm Frame Details</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto space-y-6">
          <div className="bg-white border-2 border-sky-soft rounded-lg p-6 space-y-4">
            <div>
              <p className="text-sm text-black">Brand & Model</p>
              <p className="text-2xl font-bold text-black">{frame.brand} {frame.model}</p>
            </div>

            <div>
              <p className="text-sm text-black">Frame ID</p>
              <p className="text-lg font-semibold text-black">{frame.frameId}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-black">Color</p>
                <p className="font-medium text-black">{frame.color}</p>
              </div>
              <div>
                <p className="text-sm text-black">Type</p>
                <p className="font-medium text-black">{frame.frameType}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-black">
              <p className="text-sm text-black">Retail Price</p>
              <p className="text-3xl font-bold text-black">${frame.retailPrice.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-3 flex flex-col items-center">
            <Button
              className="w-full max-w-xs border-2 border-black"
              size="lg"
              onClick={() => router.push('/pos/success')}
            >
              Confirm Sale
            </Button>

            <Button
              variant="outline"
              className="w-full max-w-xs border-2 border-black"
              onClick={() => router.push('/')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <ConfirmPageContent />
    </Suspense>
  );
}
