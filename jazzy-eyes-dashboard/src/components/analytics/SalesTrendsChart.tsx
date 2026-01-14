'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, Calendar, TrendingUp } from 'lucide-react';
import { MetricCard } from './MetricCard';
import type { DateRange, SalesTrendsResponse } from '@/types/analytics';
import { toISODateString } from '@/lib/utils/date-utils';

interface SalesTrendsChartProps {
  dateRange: DateRange;
}

const BRAND_COLORS = ['#87CEEB', '#F59E0B', '#10B981', '#EF4444', '#A855F7', '#3B82F6', '#EC4899'];

export function SalesTrendsChart({ dateRange }: SalesTrendsChartProps) {
  const [data, setData] = useState<SalesTrendsResponse | null>(null);
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

        const response = await fetch(`/api/analytics/sales-trends?${params}`);
        const result = await response.json();

        if (result.success) {
          setData(result);
        } else {
          setError(result.error || 'Failed to fetch data');
        }
      } catch (err) {
        setError('Failed to fetch sales trends data');
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
        <h2 className="text-2xl font-bold mb-4">Sales Trends</h2>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-sky-deeper" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border-2 border-black rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Sales Trends</h2>
        <div className="text-center text-red-600 py-8">{error || 'No data available'}</div>
      </div>
    );
  }

  // Transform brand trends data for stacked area chart
  const brandTrendData = data.dailySales.map((day) => {
    const dayData: any = { date: day.date };
    data.brandTrends.forEach((brand) => {
      const brandDayData = brand.data.find((d) => d.date === day.date);
      dayData[brand.brandName] = brandDayData?.revenue || 0;
    });
    return dayData;
  });

  return (
    <div className="bg-white border-2 border-black rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Sales Trends</h2>
        <p className="text-sm text-gray-600">Revenue patterns over time</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Avg Daily Revenue"
          value={`$${data.summary.avgDailyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <MetricCard
          title="Best Day"
          value={`$${data.summary.bestDay.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle={new Date(data.summary.bestDay.date).toLocaleDateString()}
          icon={<Calendar className="w-5 h-5" />}
          className="border-green-500"
        />
        <MetricCard
          title="Total Days"
          value={data.summary.totalDays}
          subtitle="In selected period"
        />
      </div>

      {/* Overall Trend Line Chart */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Overall Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.dailySales}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(date) => new Date(date).toLocaleDateString()}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#87CEEB"
              strokeWidth={2}
              dot={{ fill: '#87CEEB', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Brand Contribution Stacked Area Chart */}
      {data.brandTrends.length > 0 && brandTrendData.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Revenue by Brand</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={brandTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
                formatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <Legend />
              {data.brandTrends.slice(0, 7).map((brand, index) => (
                <Area
                  key={brand.brandName}
                  type="monotone"
                  dataKey={brand.brandName}
                  stackId="1"
                  stroke={BRAND_COLORS[index % BRAND_COLORS.length]}
                  fill={BRAND_COLORS[index % BRAND_COLORS.length]}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
