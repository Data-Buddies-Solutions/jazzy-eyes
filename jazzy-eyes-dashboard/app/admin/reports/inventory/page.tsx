'use client';

import { useState, useEffect } from 'react';
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

interface Brand {
  id: number;
  brandName: string;
  companyName: string;
}

interface Frame {
  frameId: string;
  model: string;
  color: string;
  qty: number;
  frameType: string;
  productType: string;
  status: string;
  statusColorScheme: string;
  retailPrice: number;
}

interface ReportData {
  brandName: string;
  summary: {
    totalFrames: number;
    activeCount: number;
    soldOutCount: number;
    discontinuedCount: number;
  };
  frames: Frame[];
}

export default function InventoryReportPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch brands on mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch('/api/brands');
        const data = await response.json();
        if (data.success) {
          setBrands(data.brands);
        }
      } catch (err) {
        console.error('Error fetching brands:', err);
      } finally {
        setBrandsLoading(false);
      }
    };
    fetchBrands();
  }, []);

  // Fetch report when brand changes
  useEffect(() => {
    if (!selectedBrandId) {
      setReport(null);
      return;
    }

    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/reports/inventory?brandId=${selectedBrandId}`
        );
        const data = await response.json();
        if (data.success) {
          setReport(data);
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
    fetchReport();
  }, [selectedBrandId]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          @page {
            size: letter landscape;
            margin: 0.5in 0.4in;
          }

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

          .print-area .inventory-table thead {
            display: table-header-group;
          }

          .print-area .print-card {
            border: 1px solid #000;
            padding: 8px;
            margin-bottom: 10px;
            border-radius: 0;
            box-shadow: none;
          }

          .print-area .report-header {
            text-align: center;
            padding-bottom: 8px;
            margin-bottom: 10px;
            border-bottom: 2px solid #000;
          }

          .print-area .text-green-600 {
            color: #16a34a;
          }
          .print-area .text-red-600 {
            color: #dc2626;
          }
          .print-area .text-blue-600 {
            color: #2563eb;
          }
          .print-area .text-yellow-600 {
            color: #ca8a04;
          }
        }
      `}</style>

      <div className="space-y-6">
        {/* Controls - Hidden when printing */}
        <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Inventory Report
            </h1>
            <p className="text-gray-600 text-sm">
              View and print inventory by brand
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={selectedBrandId}
              onValueChange={setSelectedBrandId}
            >
              <SelectTrigger className="w-[200px] border-2 border-black">
                <SelectValue
                  placeholder={brandsLoading ? 'Loading...' : 'Select Brand'}
                />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id.toString()}>
                    {brand.brandName}
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

        {/* No Brand Selected */}
        {!selectedBrandId && !loading && (
          <Card className="p-8 border-2 border-black text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">Select a Brand</h3>
            <p className="text-gray-600">
              Choose a brand from the dropdown to view its inventory report
            </p>
          </Card>
        )}

        {/* Report Content */}
        {!loading && report && report.frames.length > 0 && (
          <div className="print-area space-y-6">
            {/* Report Header */}
            <div className="report-header text-center border-b-2 border-black pb-4">
              <h1 className="text-2xl font-bold">Jazzy Eyes</h1>
              <h2 className="text-xl font-semibold mt-1">
                Inventory Report — {report.brandName}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Generated:{' '}
                {new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600">Total Frames</p>
                <p className="text-2xl font-bold">
                  {report.summary.totalFrames}
                </p>
              </Card>
              <Card className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {report.summary.activeCount}
                </p>
              </Card>
              <Card className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600">Sold Out</p>
                <p className="text-2xl font-bold text-red-600">
                  {report.summary.soldOutCount}
                </p>
              </Card>
              <Card className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600">Discontinued</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {report.summary.discontinuedCount}
                </p>
              </Card>
            </div>

            {/* Inventory Table */}
            <Card className="print-card p-4 border-2 border-black">
              <h2 className="text-lg font-bold mb-3">
                Frames ({report.frames.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="inventory-table w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left py-2 px-1">Frame ID</th>
                      <th className="text-left py-2 px-1">Model</th>
                      <th className="text-left py-2 px-1">Color</th>
                      <th className="text-center py-2 px-1">Qty</th>
                      <th className="text-left py-2 px-1">Type</th>
                      <th className="text-left py-2 px-1">Status</th>
                      <th className="text-right py-2 px-1">Retail Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.frames.map((frame, index) => (
                      <tr
                        key={frame.frameId}
                        className={index % 2 === 0 ? 'bg-gray-50' : ''}
                      >
                        <td className="py-1.5 px-1 font-medium">
                          {frame.frameId}
                        </td>
                        <td className="py-1.5 px-1">{frame.model}</td>
                        <td className="py-1.5 px-1">{frame.color}</td>
                        <td className="text-center py-1.5 px-1">{frame.qty}</td>
                        <td className="py-1.5 px-1">
                          {frame.productType} / {frame.frameType}
                        </td>
                        <td className="py-1.5 px-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              frame.status === 'Active'
                                ? 'bg-green-100 text-green-700'
                                : frame.status === 'Discontinued'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {frame.status}
                          </span>
                        </td>
                        <td className="text-right py-1.5 px-1">
                          {formatCurrency(frame.retailPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Footer */}
            <div className="report-footer text-center text-sm text-gray-500 pt-4 border-t">
              <p>Jazzy Eyes — Inventory Report — {report.brandName}</p>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!loading && report && report.frames.length === 0 && (
          <Card className="p-8 border-2 border-black text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">No Frames Found</h3>
            <p className="text-gray-600">
              No inventory found for {report.brandName}
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
