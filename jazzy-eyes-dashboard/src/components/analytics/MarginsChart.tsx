'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, DollarSign, TrendingUp } from 'lucide-react';
import { MetricCard } from './MetricCard';
import type { DateRange, MarginsResponse } from '@/types/analytics';
import { toISODateString } from '@/lib/utils/date-utils';

interface MarginsChartProps {
  dateRange: DateRange;
}

export function MarginsChart({ dateRange }: MarginsChartProps) {
  const [data, setData] = useState<MarginsResponse | null>(null);
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

        const response = await fetch(`/api/analytics/margins?${params}`);
        const result = await response.json();

        if (result.success) {
          setData(result);
        } else {
          setError(result.error || 'Failed to fetch data');
        }
      } catch (err) {
        setError('Failed to fetch margins data');
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
        <h2 className="text-2xl font-bold mb-4">Margin Analysis</h2>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-sky-deeper" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border-2 border-black rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Margin Analysis</h2>
        <div className="text-center text-red-600 py-8">{error || 'No data available'}</div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-black rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Margin Analysis</h2>
        <p className="text-sm text-gray-600">Profitability by brand</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Revenue"
          value={`$${data.overall.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <MetricCard
          title="Total Profit"
          value={`$${data.overall.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <MetricCard
          title="Avg Margin"
          value={`${data.overall.avgMargin.toFixed(1)}%`}
        />
        <MetricCard
          title="Best Margin"
          value={data.overall.bestMarginBrand}
          subtitle="Top performer"
          className="border-green-500"
        />
      </div>

      {/* By Brand Chart */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Margins by Brand</h3>
        <ResponsiveContainer width="100%" height={Math.max(300, data.byBrand.length * 45)}>
          <BarChart data={data.byBrand} layout="vertical" margin={{ left: 90, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="brandName" type="category" width={85} />
            <Tooltip
              formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            />
            <Legend />
            <Bar dataKey="totalRevenue" fill="#87CEEB" name="Revenue" />
            <Bar dataKey="totalCost" fill="#EF4444" name="Cost" />
            <Bar dataKey="grossProfit" fill="#10B981" name="Profit" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Product Type Comparison */}
      {data.byProductType.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Optical vs Sun</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.byProductType.map((type) => (
              <div key={type.productType} className="border-2 border-black rounded p-4">
                <p className="text-lg font-semibold">{type.productType}</p>
                <p className="text-2xl font-bold text-sky-deeper mt-2">
                  {type.marginPercent.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  ${type.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} revenue
                </p>
                <p className="text-sm text-gray-600">
                  ${type.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })} profit
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
