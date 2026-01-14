'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, PackageX } from 'lucide-react';
import { MetricCard } from './MetricCard';
import type { InventoryHealthResponse } from '@/types/analytics';

const STATUS_COLORS: Record<string, string> = {
  green: '#10B981',
  blue: '#3B82F6',
  gray: '#9CA3AF',
  red: '#EF4444',
  yellow: '#F59E0B',
  purple: '#A855F7',
  orange: '#F97316',
  pink: '#EC4899',
};

export function InventoryHealthChart() {
  const [data, setData] = useState<InventoryHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/analytics/inventory-health`);
        const result = await response.json();

        if (result.success) {
          setData(result);
        } else {
          setError(result.error || 'Failed to fetch data');
        }
      } catch (err) {
        setError('Failed to fetch inventory health data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Inventory Health</h2>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-sky-deeper" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border-2 border-black rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Inventory Health</h2>
        <div className="text-center text-red-600 py-8">{error || 'No data available'}</div>
      </div>
    );
  }

  const deadStockCount = data.agingBuckets.find((b) => b.range === '180+ days')?.count || 0;
  const totalValue = data.agingBuckets.reduce((sum, b) => sum + b.value, 0);

  return (
    <div className="bg-white border-2 border-black rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Inventory Health</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MetricCard
          title="Total Inventory Value"
          value={`$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="At retail price"
        />
        <MetricCard
          title="Dead Stock"
          value={deadStockCount}
          subtitle="180+ days old"
          icon={<PackageX className="w-5 h-5" />}
          className={deadStockCount > 0 ? 'border-red-500' : ''}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.statusDistribution as Array<{ statusName: string; count: number; colorScheme: string }>}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="count"
                label={(entry) => `${entry.statusName} (${entry.count})`}
              >
                {data.statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.colorScheme] || '#87CEEB'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Aging Analysis Bar Chart */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Aging Analysis</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.agingBuckets} layout="vertical" margin={{ left: 80, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="range" type="category" width={75} />
              <Tooltip />
              <Bar dataKey="count" fill="#87CEEB" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Oldest Items */}
      {data.oldestItems.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Oldest Items Needing Attention</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b-2 border-black">
                <tr>
                  <th className="text-left p-2">Frame ID</th>
                  <th className="text-left p-2">Brand</th>
                  <th className="text-left p-2">Style</th>
                  <th className="text-right p-2">Days</th>
                  <th className="text-right p-2">Retail Price</th>
                </tr>
              </thead>
              <tbody>
                {data.oldestItems.slice(0, 5).map((item) => (
                  <tr key={item.frameId} className="border-b border-gray-200">
                    <td className="p-2 font-mono text-xs">{item.frameId}</td>
                    <td className="p-2">{item.brandName}</td>
                    <td className="p-2">{item.styleNumber}</td>
                    <td className="p-2 text-right">
                      <span className={item.daysInInventory > 180 ? 'text-red-600 font-semibold' : ''}>
                        {item.daysInInventory}d
                      </span>
                    </td>
                    <td className="p-2 text-right">${item.retailPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
