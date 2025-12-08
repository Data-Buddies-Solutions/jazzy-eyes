'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to admin/manage page
    router.push('/admin/manage');
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Redirecting...</h1>
        <p className="text-gray-600">Taking you to the inventory management page</p>
      </div>
    </div>
  );
}
