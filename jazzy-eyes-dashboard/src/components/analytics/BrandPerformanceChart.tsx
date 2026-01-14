'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Loader2, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import { MetricCard } from './MetricCard';
import type { DateRange, BrandPerformanceResponse } from '@/types/analytics';
import { toISODateString } from '@/lib/utils/date-utils';

interface BrandPerformanceChartProps {
  dateRange: DateRange;
}

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

        if (result.success) {
          setData(result);
        } else {
          setError(result.error || 'Failed to fetch data');
        }
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

  const totalRevenue = data.data.reduce((sum, b) => sum + b.revenue, 0);
  const totalSold = data.data.reduce((sum, b) => sum + b.totalSold, 0);
  const reorderCount = data.data.filter((b) => b.reorderRecommended).length;
  const avgSellThrough =
    data.data.length > 0
      ? data.data.reduce((sum, b) => sum + b.sellThroughRate, 0) / data.data.length
      : 0;

  // Transform data for chart
  const chartData = data.data.map((brand) => ({
    brandName: brand.brandName,
    sold: brand.totalSold,
    inStock: brand.totalInventory,
    reorder: brand.reorderRecommended,
    sellThroughRate: brand.sellThroughRate,
  }));

  return (
    <div className="bg-white border-2 border-black rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Brand Performance</h2>
        <p className="text-sm text-gray-600">
          Showing which brands need reordering
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <MetricCard
          title="Units Sold"
          value={totalSold}
          subtitle="In selected period"
        />
        <MetricCard
          title="Avg Sell-Through"
          value={`${avgSellThrough.toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <MetricCard
          title="Reorder Alerts"
          value={reorderCount}
          subtitle={`${reorderCount} brand${reorderCount !== 1 ? 's' : ''} below 20%`}
          icon={<AlertTriangle className="w-5 h-5" />}
          className={reorderCount > 0 ? 'border-yellow-500' : ''}
        />
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 50)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" />
          <YAxis dataKey="brandName" type="category" width={110} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;

              const data = payload[0].payload;
              return (
                <div className="bg-white border-2 border-black p-3 rounded shadow-lg">
                  <p className="font-bold">{data.brandName}</p>
                  <p className="text-sm">
                    Sold: <span className="font-semibold">{data.sold}</span>
                  </p>
                  <p className="text-sm">
                    In Stock: <span className="font-semibold">{data.inStock}</span>
                  </p>
                  <p className="text-sm">
                    Sell-Through:{' '}
                    <span className="font-semibold">
                      {data.sellThroughRate.toFixed(1)}%
                    </span>
                  </p>
                  {data.reorder && (
                    <p className="text-sm text-yellow-600 font-semibold mt-1">
                      ⚠️ Reorder Recommended
                    </p>
                  )}
                </div>
              );
            }}
          />
          <Legend />
          <Bar dataKey="sold" stackId="a" fill="#87CEEB" name="Sold">
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.reorder ? '#F59E0B' : '#87CEEB'}
              />
            ))}
          </Bar>
          <Bar dataKey="inStock" stackId="a" fill="#E5E7EB" name="In Stock" />
        </BarChart>
      </ResponsiveContainer>

      {/* Reorder Recommendations */}
      {reorderCount > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-500 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">
                {reorderCount} Brand{reorderCount !== 1 ? 's' : ''} Need Reordering
              </p>
              <ul className="text-sm text-yellow-800 mt-2 space-y-1">
                {data.data
                  .filter((b) => b.reorderRecommended)
                  .map((brand) => (
                    <li key={brand.brandId}>
                      <span className="font-semibold">{brand.brandName}</span>: {brand.totalInventory}{' '}
                      in stock (allocation: {brand.allocationQuantity})
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
