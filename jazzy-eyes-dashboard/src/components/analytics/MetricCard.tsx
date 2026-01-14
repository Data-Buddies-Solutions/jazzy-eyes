'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MetricCardProps } from '@/types/analytics';
import { cn } from '@/lib/utils';

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  className,
}: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'neutral':
        return <Minus className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'neutral':
        return 'text-gray-400';
      default:
        return '';
    }
  };

  return (
    <div
      className={cn(
        'bg-white border-2 border-black rounded-lg p-4 flex flex-col',
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {icon && <div className="text-sky-deeper">{icon}</div>}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-black">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>

        {trend && (
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            {trendValue && (
              <span className={cn('text-sm font-medium', getTrendColor())}>
                {trendValue}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
