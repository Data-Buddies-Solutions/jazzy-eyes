'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { DateRange, MarginsResponse } from '@/types/analytics';
import { toISODateString } from '@/lib/utils/date-utils';

interface MarginsChartProps {
  dateRange: DateRange;
}

const fmtMoney = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Treat "Sun" and "Sunglasses" as the same category.
const normalizeProductType = (t: string) =>
  t.toLowerCase().startsWith('sun') ? 'Sun' : t;

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
        if (result.success) setData(result);
        else setError(result.error || 'Failed to fetch data');
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
        <h2 className="text-2xl font-bold mb-4">Margins & Vendor Credits</h2>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-sky-deeper" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border-2 border-black rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Margins & Vendor Credits</h2>
        <div className="text-center text-red-600 py-8">{error || 'No data available'}</div>
      </div>
    );
  }

  const rows = data.byBrand
    .filter(
      (b) =>
        b.totalRevenue > 0 ||
        b.returnCredits > 0
    )
    .map((b) => ({
      brandName: b.brandName,
      revenue: b.totalRevenue,
      cost: b.totalCost,
      generated: b.returnCredits,
      marginPercent: b.marginPercent,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const totals = rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      cost: acc.cost + r.cost,
      generated: acc.generated + r.generated,
      grossProfit: acc.grossProfit + (r.revenue - r.cost),
    }),
    { revenue: 0, cost: 0, generated: 0, grossProfit: 0 }
  );
  const totalMargin = totals.revenue > 0 ? (totals.grossProfit / totals.revenue) * 100 : 0;

  // Merge Sun + Sunglasses into a single product type
  const mergedProductTypes = new Map<string, { revenue: number; profit: number }>();
  for (const p of data.byProductType) {
    const key = normalizeProductType(p.productType);
    const prev = mergedProductTypes.get(key) ?? { revenue: 0, profit: 0 };
    mergedProductTypes.set(key, {
      revenue: prev.revenue + p.revenue,
      profit: prev.profit + p.profit,
    });
  }
  const productTypes = Array.from(mergedProductTypes.entries()).map(([productType, d]) => ({
    productType,
    revenue: d.revenue,
    profit: d.profit,
    marginPercent: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0,
  }));

  return (
    <div className="bg-white border-2 border-black rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Margins & Vendor Credits</h2>

      {rows.length === 0 ? (
        <p className="text-gray-500 py-6 text-center">No sales or vendor credits in this period.</p>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-4">
            Use the EOM report for credit balances.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="border-2 border-black rounded p-3 bg-green-50">
              <p className="text-xs text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-green-700">{fmtMoney(totals.revenue)}</p>
            </div>
            <div className="border-2 border-black rounded p-3 bg-red-50">
              <p className="text-xs text-gray-600">Cost</p>
              <p className="text-2xl font-bold text-red-700">{fmtMoney(totals.cost)}</p>
            </div>
            <div className="border-2 border-black rounded p-3 bg-blue-50">
              <p className="text-xs text-gray-600">Credits generated</p>
              <p className="text-2xl font-bold text-blue-700">{fmtMoney(totals.generated)}</p>
            </div>
          </div>

          <div className="overflow-x-auto border-2 border-black rounded">
            <table className="w-full text-sm">
              <thead className="bg-sky-soft/30 border-b-2 border-black">
                <tr>
                  <th className="text-left p-2 font-semibold">Brand</th>
                  <th className="text-right p-2 font-semibold">Revenue</th>
                  <th className="text-right p-2 font-semibold">Cost</th>
                  <th className="text-right p-2 font-semibold">Margin</th>
                  <th className="text-right p-2 font-semibold">Credits generated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.brandName} className="border-b last:border-b-0">
                    <td className="p-2 font-medium">{r.brandName}</td>
                    <td className="p-2 text-right">{fmtMoney(r.revenue)}</td>
                    <td className="p-2 text-right">{fmtMoney(r.cost)}</td>
                    <td className="p-2 text-right">
                      {r.revenue > 0 ? `${r.marginPercent.toFixed(1)}%` : '—'}
                    </td>
                    <td className="p-2 text-right text-blue-700">
                      {r.generated > 0 ? fmtMoney(r.generated) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-black bg-sky-soft/20 font-semibold">
                <tr>
                  <td className="p-2">Total</td>
                  <td className="p-2 text-right">{fmtMoney(totals.revenue)}</td>
                  <td className="p-2 text-right">{fmtMoney(totals.cost)}</td>
                  <td className="p-2 text-right">{totalMargin.toFixed(1)}%</td>
                  <td className="p-2 text-right text-blue-700">{fmtMoney(totals.generated)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {productTypes.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Margin by product type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productTypes.map((type) => (
              <div key={type.productType} className="border-2 border-black rounded p-4">
                <p className="text-lg font-semibold">{type.productType}</p>
                <p className="text-2xl font-bold text-sky-deeper mt-2">
                  {type.marginPercent.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600 mt-1">{fmtMoney(type.revenue)} revenue</p>
                <p className="text-sm text-gray-600">{fmtMoney(type.profit)} profit</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
