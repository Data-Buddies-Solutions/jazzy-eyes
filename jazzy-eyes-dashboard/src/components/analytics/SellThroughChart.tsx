'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { Loader2, Zap } from 'lucide-react';
import { MetricCard } from './MetricCard';
import type { DateRange, SellThroughResponse } from '@/types/analytics';
import { toISODateString } from '@/lib/utils/date-utils';

interface SellThroughChartProps {
  dateRange: DateRange;
}

export function SellThroughChart({ dateRange }: SellThroughChartProps) {
  const [data, setData] = useState<SellThroughResponse | null>(null);
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

        const response = await fetch(`/api/analytics/sell-through?${params}`);
        const result = await response.json();

        if (result.success) {
          setData(result);
        } else {
          setError(result.error || 'Failed to fetch data');
        }
      } catch (err) {
        setError('Failed to fetch sell-through data');
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
        <h2 className="text-2xl font-bold mb-4">Sell-Through Rate</h2>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-sky-deeper" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border-2 border-black rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Sell-Through Rate</h2>
        <div className="text-center text-red-600 py-8">{error || 'No data available'}</div>
      </div>
    );
  }

  const getColorByRate = (rate: number) => {
    if (rate >= 75) return '#10B981'; // green - excellent
    if (rate >= 50) return '#F59E0B'; // yellow - good
    if (rate >= 25) return '#F97316'; // orange - slow
    return '#EF4444'; // red - stale
  };

  const excellentCount = data.data.filter((b) => b.status === 'excellent').length;
  const slowCount = data.data.filter((b) => b.status === 'slow' || b.status === 'stale').length;

  return (
    <div className="bg-white border-2 border-black rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Sell-Through Rate</h2>
        <p className="text-sm text-gray-600">Inventory turnover speed</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Overall Sell-Through"
          value={`${data.summary.overallSellThrough.toFixed(1)}%`}
          icon={<Zap className="w-5 h-5" />}
        />
        <MetricCard
          title="Top Performers"
          value={excellentCount}
          subtitle=">75% sell-through"
          className="border-green-500"
        />
        <MetricCard
          title="Slow Movers"
          value={slowCount}
          subtitle="<50% sell-through"
          className={slowCount > 0 ? 'border-orange-500' : ''}
        />
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={Math.max(300, data.data.length * 45)}>
        <BarChart
          data={data.data}
          layout="vertical"
          margin={{ top: 20, right: 80, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" domain={[0, 100]} />
          <YAxis dataKey="brandName" type="category" width={90} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;

              const data = payload[0].payload;
              return (
                <div className="bg-white border-2 border-black p-3 rounded shadow-lg">
                  <p className="font-bold">{data.brandName}</p>
                  <p className="text-sm">
                    Sell-Through: <span className="font-semibold">{data.sellThroughRate.toFixed(1)}%</span>
                  </p>
                  <p className="text-sm">
                    Sold: <span className="font-semibold">{data.soldInPeriod}</span>
                  </p>
                  <p className="text-sm">
                    In Stock: <span className="font-semibold">{data.currentInventory}</span>
                  </p>
                  <p className="text-sm">
                    Velocity: <span className="font-semibold">{data.velocity.toFixed(2)} units/day</span>
                  </p>
                  <p className="text-sm font-semibold mt-1 capitalize">{data.status}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="sellThroughRate" radius={[0, 4, 4, 0]}>
            {data.data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColorByRate(entry.sellThroughRate)} />
            ))}
            <LabelList
              dataKey="sellThroughRate"
              position="right"
              formatter={(value: any) => `${Number(value).toFixed(0)}%`}
              style={{ fontSize: 12, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }} />
          <span>Excellent (≥75%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }} />
          <span>Good (50-74%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F97316' }} />
          <span>Slow (25-49%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }} />
          <span>Stale {'(<25%)'}</span>
        </div>
      </div>
    </div>
  );
}
