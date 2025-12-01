'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function SuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto px-4 pt-24 text-center space-y-6">
        {/* Success Message Box */}
        <div className="bg-white border-2 border-sky-soft rounded-lg p-6 space-y-4">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-success/10 p-4">
              <CheckCircle className="w-16 h-16 text-success" />
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-black">Sale Recorded!</h1>
            <p className="text-black">
              The frame sale has been successfully recorded.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center">
          <Button
            className="w-full max-w-xs border-2 border-black"
            size="lg"
            onClick={() => router.push('/')}
          >
            Record Another Sale
          </Button>
        </div>
      </div>
    </div>
  );
}
