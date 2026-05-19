'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { DateRange, BrandPerformanceResponse } from '@/types/analytics';
import { toISODateString } from '@/lib/utils/date-utils';

interface BrandPerformanceChartProps {
  dateRange: DateRange;
}

const fmtMoney = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function BrandPerformanceChart({ dateRange }: BrandPerformanceChartProps) {
  const [data, setData] = useState<BrandPerformanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          startDate: toISODateString(dateRange.startDate),
          endDate: toISODateString(dateRange.endDate),
        });
        const response = await fetch(`/api/analytics/brand-performance?${params}`);
        const result = await response.json();
        if (result.success) setData(result);
        else setError(result.error || 'Failed to fetch data');
      } catch (err) {
        setError('Failed to fetch brand performance data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [dateRange]);

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Brand Performance</h2>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-sky-deeper" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border-2 border-black rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Brand Performance</h2>
        <div className="text-center text-red-600 py-8">{error || 'No data available'}</div>
      </div>
    );
  }

  const rows = data.data
    .map((b) => ({ brandName: b.brandName, sold: b.totalSold, revenue: b.revenue }))
    .filter((b) => b.sold > 0 || b.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="bg-white border-2 border-black rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Brand Performance</h2>

      {rows.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">No sales in selected period.</p>
      ) : (
        <div className="overflow-x-auto border-2 border-black rounded">
          <table className="w-full text-sm">
            <thead className="bg-sky-soft/30 border-b-2 border-black">
              <tr>
                <th className="text-left p-2 font-semibold">Brand</th>
                <th className="text-right p-2 font-semibold">Units sold</th>
                <th className="text-right p-2 font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.brandName} className="border-b last:border-b-0">
                  <td className="p-2 font-medium">{b.brandName}</td>
                  <td className="p-2 text-right">{b.sold}</td>
                  <td className="p-2 text-right">{fmtMoney(b.revenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-black bg-sky-soft/20 font-semibold">
              <tr>
                <td className="p-2">Total</td>
                <td className="p-2 text-right">{rows.reduce((s, r) => s + r.sold, 0)}</td>
                <td className="p-2 text-right">{fmtMoney(rows.reduce((s, r) => s + r.revenue, 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
