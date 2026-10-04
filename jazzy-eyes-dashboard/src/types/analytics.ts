
export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: string;
}

export interface BrandPerformanceData {
  brandId: number;
  brandName: string;
  companyName: string;
  allocationQuantity: number;
  totalInventory: number;
  totalSold: number;
  inventorySold?: number;
  rxSold?: number;
  revenue: number;
  avgMargin: number;
  sellThroughRate: number;
  reorderRecommended: boolean;
}

export interface BrandPerformanceResponse {
  success: boolean;
  data: BrandPerformanceData[];
}

export interface BrandMargin {
  brandName: string;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
  unitsSold: number;
  avgSalePrice: number;
  returnCredits: number;
}

export interface KpisResponse {
  success: boolean;
  totalInventoryValue: number;
  totalQtyOnHand: number;
  currentInventory: number;
  discontinuedInStock: number;
  returnsCount: number;
  returnsCreditValue: number;
  outstandingCreditBalance: number;
}

export interface ProductTypeMargin {
  productType: string;
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

export interface DailySale {
  date: string;
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

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
}
