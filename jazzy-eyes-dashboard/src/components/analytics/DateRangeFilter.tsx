'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { DATE_RANGE_PRESETS, getDateRangePreset, formatDateRange } from '@/lib/utils/date-utils';
import type { DateRange } from '@/types/analytics';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (dateRange: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const handlePresetChange = (preset: string) => {
    const { startDate, endDate } = getDateRangePreset(preset);
    onChange({
      startDate,
      endDate,
      preset,
    });
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Calendar className="w-4 h-4" />
        <span className="hidden sm:inline">Date Range:</span>
      </div>
      <Select value={value.preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="border-2 border-black w-[180px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_PRESETS.map((preset) => (
            <SelectItem key={preset} value={preset}>
              {preset}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="hidden md:inline text-sm text-gray-500">
        {formatDateRange(value.startDate, value.endDate)}
      </span>
    </div>
  );
}
