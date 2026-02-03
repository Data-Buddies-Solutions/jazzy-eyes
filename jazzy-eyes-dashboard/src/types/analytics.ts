// Analytics Dashboard Type Definitions

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: string;
}

// Brand Performance Types
export interface BrandPerformanceData {
  brandId: number;
  brandName: string;
  companyName: string;
  allocationQuantity: number;
  totalInventory: number; // Active + non-sold
  totalSold: number; // Sold in period (inventory + RX)
  inventorySold?: number; // Inventory sales only
  rxSold?: number; // RX sales only
  revenue: number; // Sales revenue (inventory + RX)
  avgMargin: number; // %
  sellThroughRate: number; // % (inventory only)
  reorderRecommended: boolean; // inventory < 20% of allocation
}

export interface BrandPerformanceResponse {
  success: boolean;
  data: BrandPerformanceData[];
}

// Sell-Through Types
export interface SellThroughData {
  brandName: string;
  currentInventory: number;
  soldInPeriod: number; // Total sold (inventory + RX)
  inventorySold?: number; // Inventory sales only
  rxSold?: number; // RX sales only
  sellThroughRate: number; // % (inventory only)
  velocity: number; // units/day (all sales)
  status: 'excellent' | 'good' | 'slow' | 'stale';
}

export interface SellThroughResponse {
  success: boolean;
  data: SellThroughData[];
  summary: {
    overallSellThrough: number;
    totalSold?: number;
    totalRxSold?: number;
    fastestMoving: string;
    slowestMoving: string;
  };
}

// Inventory Health Types
export interface StatusDistribution {
  statusName: string;
  count: number;
  percentage: number;
  colorScheme: string;
}

export interface AgingBucket {
  range: string;
  count: number;
  percentage: number;
  value: number; // Total retail value
}

export interface OldestItem {
  frameId: string;
  brandName: string;
  styleNumber: string;
  daysInInventory: number;
  costPrice: number;
  retailPrice: number;
}

export interface InventoryHealthResponse {
  success: boolean;
  statusDistribution: StatusDistribution[];
  agingBuckets: AgingBucket[];
  oldestItems: OldestItem[];
}

// Margin Analysis Types
export interface BrandMargin {
  brandName: string;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
  unitsSold: number;
  avgSalePrice: number;
}

export interface ProductTypeMargin {
  productType: string; // 'Optical', 'Sun', 'Sunglasses', etc.
  revenue: number;
  profit: number;
  marginPercent: number;
}

export interface MarginOverall {
  totalRevenue: number;
  totalProfit: number;
  avgMargin: number;
  bestMarginBrand: string;
  worstMarginBrand: string;
}

export interface MarginsResponse {
  success: boolean;
  byBrand: BrandMargin[];
  byProductType: ProductTypeMargin[];
  overall: MarginOverall;
}

// Sales Trends Types
export interface DailySale {
  date: string; // YYYY-MM-DD
  unitsSold: number;
  revenue: number;
  avgPrice: number;
}

export interface BrandTrend {
  brandName: string;
  data: Array<{
    date: string;
    units: number;
    revenue: number;
  }>;
  totalRevenue: number;
}

export interface SalesTrendSummary {
  totalDays: number;
  avgDailyRevenue: number;
  bestDay: {
    date: string;
    revenue: number;
  };
  worstDay: {
    date: string;
    revenue: number;
  };
}

export interface SalesTrendsResponse {
  success: boolean;
  dailySales: DailySale[];
  brandTrends: BrandTrend[];
  summary: SalesTrendSummary;
}

// Metric Card Props
export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
}
