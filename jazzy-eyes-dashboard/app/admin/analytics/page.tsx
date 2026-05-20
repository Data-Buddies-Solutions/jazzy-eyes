'use client';

import { useState, useEffect } from 'react';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
import { BrandPerformanceChart } from '@/components/analytics/BrandPerformanceChart';
import { MarginsChart } from '@/components/analytics/MarginsChart';
import { SalesTrendsChart } from '@/components/analytics/SalesTrendsChart';
import { MetricCard } from '@/components/analytics/MetricCard';
import { getDateRangePreset, toISODateString } from '@/lib/utils/date-utils';
import { Glasses, DollarSign, RotateCcw } from 'lucide-react';
import type { DateRange, KpisResponse } from '@/types/analytics';

const fmtMoney = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    ...getDateRangePreset('Last 30 days'),
    preset: 'Last 30 days',
  });

  const [kpis, setKpis] = useState<KpisResponse | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({
      startDate: toISODateString(dateRange.startDate),
      endDate: toISODateString(dateRange.endDate),
    });
    fetch(`/api/analytics/kpis?${params}`)
      .then((r) => r.json())
      .then((d: KpisResponse) => {
        if (d.success) setKpis(d);
      })
      .catch(() => setKpis(null));
  }, [dateRange]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Snapshot of inventory, sales, and returns</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Current Inventory"
          value={kpis ? kpis.currentInventory.toLocaleString() : '—'}
          subtitle="On hand minus discontinued in stock"
          icon={<Glasses className="w-5 h-5" />}
        />
        <MetricCard
          title="Total Inventory Value"
          value={kpis ? fmtMoney(kpis.totalInventoryValue) : '—'}
          subtitle="Cost basis, qty × unit cost"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <MetricCard
          title="Returns This Period"
          value={kpis ? `${kpis.returnsCount} units` : '—'}
          subtitle={kpis ? `${fmtMoney(kpis.returnsCreditValue)} credit generated` : ''}
          icon={<RotateCcw className="w-5 h-5" />}
        />
      </div>

      <div className="space-y-6">
        <BrandPerformanceChart dateRange={dateRange} />
        <MarginsChart dateRange={dateRange} />
        <SalesTrendsChart dateRange={dateRange} />
      </div>
    </div>
  );
}
