'use client';

import { useState } from 'react';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
import { BrandPerformanceChart } from '@/components/analytics/BrandPerformanceChart';
import { SellThroughChart } from '@/components/analytics/SellThroughChart';
import { InventoryHealthChart } from '@/components/analytics/InventoryHealthChart';
import { MarginsChart } from '@/components/analytics/MarginsChart';
import { SalesTrendsChart } from '@/components/analytics/SalesTrendsChart';
import { getDateRangePreset } from '@/lib/utils/date-utils';
import type { DateRange } from '@/types/analytics';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    ...getDateRangePreset('Last 30 days'),
    preset: 'Last 30 days',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">
            Track sales performance and make informed purchasing decisions
          </p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Single Scrollable Page with All Dashboards */}
      <div className="space-y-6">
        {/* Dashboard 1: Brand Performance - Most Important */}
        <BrandPerformanceChart dateRange={dateRange} />

        {/* Dashboard 2: Sell-Through Rate */}
        <SellThroughChart dateRange={dateRange} />

        {/* Dashboard 3: Inventory Health */}
        <InventoryHealthChart />

        {/* Dashboard 4: Margin Analysis */}
        <MarginsChart dateRange={dateRange} />

        {/* Dashboard 5: Sales Trends */}
        <SalesTrendsChart dateRange={dateRange} />
      </div>
    </div>
  );
}
