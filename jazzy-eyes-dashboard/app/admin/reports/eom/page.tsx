'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Printer, FileText } from 'lucide-react';

interface SaleItem {
  id: number;
  type: 'Inventory' | 'RX';
  date: string;
  brandName: string;
  styleNumber: string;
  colorCode: string;
  eyeSize: string;
  gender: string;
  frameType: string;
  productType: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
}

interface BrandSummary {
  brandName: string;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPercent: number;
}

interface ReportData {
  period: {
    year: number;
    month: number;
    monthName: string;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalSales: number;
    totalUnits: number;
    inventoryUnits: number;
    rxUnits: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    averageMargin: number;
    averageSalePrice: number;
  };
  brandSummary: BrandSummary[];
  sales: SaleItem[];
}

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export default function EOMReportPage() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState('1'); // Default to January
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/eom?year=${year}&month=${month}`);
      const data = await response.json();
      if (data.success) {
        setReport(data.report);
      } else {
        setError(data.error || 'Failed to fetch report');
      }
    } catch (err) {
      setError('Failed to fetch report');
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [year, month]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
    });
  };

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          /* Basic setup */
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          /* Page setup */
          @page {
            size: letter landscape;
            margin: 0.5in 0.4in;
          }

          /* Compact sizing */
          .print-area {
            font-size: 9px;
          }
          .print-area h1 {
            font-size: 16px;
          }
          .print-area h2 {
            font-size: 11px;
            margin-bottom: 4px;
          }

          /* Summary cards row */
          .print-area .summary-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 10px;
          }
          .print-area .summary-cards > div {
            padding: 6px;
            border: 1px solid #000;
          }
          .print-area .summary-cards .text-2xl {
            font-size: 16px;
          }

          /* Tables */
          .print-area table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
          }
          .print-area th,
          .print-area td {
            padding: 3px 5px;
            text-align: left;
            white-space: nowrap;
          }
          .print-area th {
            border-bottom: 2px solid #000;
            font-weight: bold;
          }
          .print-area td {
            border-bottom: 1px solid #ddd;
          }

          /* Brand table - keep on same page */
          .print-area .brand-section {
            page-break-inside: avoid;
          }

          /* Sales table header repeats */
          .print-area .sales-table thead {
            display: table-header-group;
          }

          /* Hide tfoot completely - we don't need it repeating */
          .print-area .sales-table tfoot {
            display: none;
          }

          /* Cards */
          .print-area .print-card {
            border: 1px solid #000;
            padding: 8px;
            margin-bottom: 10px;
            border-radius: 0;
            box-shadow: none;
          }

          /* Header */
          .print-area .report-header {
            text-align: center;
            padding-bottom: 8px;
            margin-bottom: 10px;
            border-bottom: 2px solid #000;
          }

          /* Type badges - simple text */
          .print-area .type-badge {
            font-size: 7px;
            padding: 1px 3px;
            border-radius: 2px;
          }

          /* Keep colors for visual distinction */
          .print-area .text-green-600 { color: #16a34a; }
          .print-area .text-red-600 { color: #dc2626; }
          .print-area .text-blue-600 { color: #2563eb; }
        }
      `}</style>

      <div className="space-y-6">
        {/* Controls - Hidden when printing */}
        <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              End of Month Report
            </h1>
            <p className="text-gray-600 text-sm">
              Detailed sales report for frames sold
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[140px] border-2 border-black">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px] border-2 border-black">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handlePrint}
              disabled={loading || !report}
              className="bg-sky-deeper hover:bg-sky-deeper/90 text-black font-semibold border-2 border-black"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print / PDF
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading report...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-6 border-2 border-red-500 bg-red-50">
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        {/* Report Content */}
        {!loading && report && (
          <div ref={printRef} className="print-area space-y-6">
            {/* Report Header */}
            <div className="report-header text-center border-b-2 border-black pb-4">
              <h1 className="text-2xl font-bold">Jazzy Eyes</h1>
              <h2 className="text-xl font-semibold mt-1">
                End of Month Sales Report
              </h2>
              <p className="text-gray-600 mt-1">
                {report.period.monthName} {report.period.year}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Generated: {new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600">Total Units Sold</p>
                <p className="text-2xl font-bold">{report.summary.totalUnits}</p>
                <p className="text-xs text-gray-500">
                  {report.summary.inventoryUnits} Inventory | {report.summary.rxUnits} RX
                </p>
              </Card>
              <Card className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(report.summary.totalRevenue)}
                </p>
              </Card>
              <Card className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(report.summary.totalCost)}
                </p>
              </Card>
              <Card className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600">Gross Profit</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(report.summary.totalProfit)}
                </p>
                <p className="text-xs text-gray-500">
                  {report.summary.averageMargin.toFixed(1)}% margin
                </p>
              </Card>
            </div>

            {/* Brand Summary Table */}
            <div className="brand-section">
              <Card className="print-card p-4 border-2 border-black">
                <h2 className="text-lg font-bold mb-3">Sales by Brand</h2>
                <div className="overflow-x-auto">
                  <table className="brand-table w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left py-2 px-2">Brand</th>
                      <th className="text-right py-2 px-2">Units</th>
                      <th className="text-right py-2 px-2">Revenue</th>
                      <th className="text-right py-2 px-2">Cost</th>
                      <th className="text-right py-2 px-2">Profit</th>
                      <th className="text-right py-2 px-2">Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.brandSummary.map((brand) => (
                      <tr key={brand.brandName} className="border-b border-gray-200">
                        <td className="py-2 px-2 font-medium">{brand.brandName}</td>
                        <td className="text-right py-2 px-2">{brand.units}</td>
                        <td className="text-right py-2 px-2">{formatCurrency(brand.revenue)}</td>
                        <td className="text-right py-2 px-2">{formatCurrency(brand.cost)}</td>
                        <td className="text-right py-2 px-2">{formatCurrency(brand.profit)}</td>
                        <td className="text-right py-2 px-2">{brand.marginPercent.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-black font-bold">
                      <td className="py-2 px-2">TOTAL</td>
                      <td className="text-right py-2 px-2">{report.summary.totalUnits}</td>
                      <td className="text-right py-2 px-2">{formatCurrency(report.summary.totalRevenue)}</td>
                      <td className="text-right py-2 px-2">{formatCurrency(report.summary.totalCost)}</td>
                      <td className="text-right py-2 px-2">{formatCurrency(report.summary.totalProfit)}</td>
                      <td className="text-right py-2 px-2">{report.summary.averageMargin.toFixed(1)}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
            </div>

            {/* Detailed Sales Table */}
            <Card className="print-card p-4 border-2 border-black">
              <h2 className="text-lg font-bold mb-3">Detailed Sales ({report.sales.length} transactions)</h2>
              <div className="overflow-x-auto">
                <table className="sales-table w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left py-2 px-1">Date</th>
                      <th className="text-left py-2 px-1">Type</th>
                      <th className="text-left py-2 px-1">Brand</th>
                      <th className="text-left py-2 px-1">Style #</th>
                      <th className="text-left py-2 px-1">Color</th>
                      <th className="text-left py-2 px-1">Size</th>
                      <th className="text-center py-2 px-1">Qty</th>
                      <th className="text-right py-2 px-1">Price</th>
                      <th className="text-right py-2 px-1">Cost</th>
                      <th className="text-right py-2 px-1">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sales.map((sale, index) => (
                      <tr key={`${sale.type}-${sale.id}`} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="py-1.5 px-1">{formatDate(sale.date)}</td>
                        <td className="py-1.5 px-1">
                          <span className={`type-badge px-1.5 py-0.5 rounded text-xs font-medium ${
                            sale.type === 'RX'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {sale.type}
                          </span>
                        </td>
                        <td className="py-1.5 px-1 font-medium">{sale.brandName}</td>
                        <td className="py-1.5 px-1">{sale.styleNumber}</td>
                        <td className="py-1.5 px-1">{sale.colorCode}</td>
                        <td className="py-1.5 px-1">{sale.eyeSize}</td>
                        <td className="text-center py-1.5 px-1">{sale.quantity}</td>
                        <td className="text-right py-1.5 px-1">{formatCurrency(sale.totalRevenue)}</td>
                        <td className="text-right py-1.5 px-1">{formatCurrency(sale.totalCost)}</td>
                        <td className="text-right py-1.5 px-1 font-medium">{formatCurrency(sale.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Final Totals - only shows once at end */}
              <div className="mt-4 pt-3 border-t-2 border-black flex justify-end">
                <div className="text-sm font-bold space-x-6">
                  <span>TOTAL: {report.summary.totalUnits} units</span>
                  <span>Revenue: {formatCurrency(report.summary.totalRevenue)}</span>
                  <span>Cost: {formatCurrency(report.summary.totalCost)}</span>
                  <span>Profit: {formatCurrency(report.summary.totalProfit)}</span>
                </div>
              </div>
            </Card>

            {/* Footer */}
            <div className="report-footer text-center text-sm text-gray-500 pt-4 border-t">
              <p>Jazzy Eyes - End of Month Report - {report.period.monthName} {report.period.year}</p>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!loading && report && report.sales.length === 0 && (
          <Card className="p-8 border-2 border-black text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">No Sales Found</h3>
            <p className="text-gray-600">
              No frames were sold during {report.period.monthName} {report.period.year}
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
