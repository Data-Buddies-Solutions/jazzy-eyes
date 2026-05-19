'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Printer, FileText, PackageCheck } from 'lucide-react';

interface Brand {
  id: number;
  brandName: string;
  companyName: string;
}

interface Frame {
  frameId: string;
  model: string;
  color: string;
  frameType: string;
  productType: string;
  status: string;
  statusColorScheme: string;
  beginningQty: number;
  added: number;
  returned: number;
  sold: number;
  otherAdjustments: number;
  endingQty: number;
  currentQty: number;
  retailPrice: number;
  costPrice: number;
  inventoryValue: number;
}

interface SpecialOrder {
  id: number;
  frameId: string;
  brand: string;
  model: string;
  color: string;
  frameType: string;
  productType: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  transactionDate: string;
  invoiceNumber: string | null;
  status: string;
  notes: string | null;
}

interface ReportData {
  brandName: string;
  period: { startDate: string; endDate: string };
  summary: {
    totalFrames: number;
    beginningQty: number;
    added: number;
    returned: number;
    sold: number;
    otherAdjustments: number;
    endingQty: number;
    currentQty: number;
    inventoryValue: number;
    specialOrderCount: number;
  };
  frames: Frame[];
  specialOrders: SpecialOrder[];
}

export default function InventoryReportPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specialOrdersMode, setSpecialOrdersMode] = useState(false);
  const [allSpecialOrders, setAllSpecialOrders] = useState<SpecialOrder[]>([]);
  const [specialOrdersLoading, setSpecialOrdersLoading] = useState(false);

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

  // Fetch inventory report when brand changes (normal mode)
  useEffect(() => {
    if (specialOrdersMode) return;
    if (!selectedBrandId) {
      setReport(null);
      return;
    }

    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const yearNum = parseInt(selectedYear);
        const startDate = new Date(yearNum, 0, 1).toISOString();
        const endDate = new Date(yearNum, 11, 31, 23, 59, 59).toISOString();
        const response = await fetch(
          `/api/reports/inventory?brandId=${selectedBrandId}&startDate=${startDate}&endDate=${endDate}`
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
  }, [selectedBrandId, specialOrdersMode, selectedYear]);

  // Fetch special orders (all or filtered by brand)
  const fetchSpecialOrders = useCallback(async (brandId?: string) => {
    setSpecialOrdersLoading(true);
    setError(null);
    try {
      const url = brandId
        ? `/api/reports/special-orders?brandId=${brandId}`
        : '/api/reports/special-orders';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setAllSpecialOrders(data.specialOrders);
      } else {
        setError(data.error || 'Failed to fetch special orders');
      }
    } catch (err) {
      setError('Failed to fetch special orders');
      console.error('Error fetching special orders:', err);
    } finally {
      setSpecialOrdersLoading(false);
    }
  }, []);

  // Refetch special orders when brand changes in special orders mode
  useEffect(() => {
    if (!specialOrdersMode) return;
    fetchSpecialOrders(selectedBrandId || undefined);
  }, [selectedBrandId, specialOrdersMode, fetchSpecialOrders]);

  const handleSpecialOrdersToggle = () => {
    if (specialOrdersMode) {
      // Switch back to inventory mode
      setSpecialOrdersMode(false);
      setAllSpecialOrders([]);
    } else {
      // Switch to special orders mode
      setSpecialOrdersMode(true);
      fetchSpecialOrders(selectedBrandId || undefined);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const isLoading = loading || specialOrdersLoading;
  const selectedBrandName = brands.find(
    (b) => b.id.toString() === selectedBrandId
  )?.brandName;

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
            grid-template-columns: repeat(5, 1fr);
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
              {specialOrdersMode ? 'Special Orders Report' : 'Inventory Report'}
            </h1>
            <p className="text-gray-600 text-sm">
              {specialOrdersMode
                ? 'View all special orders — optionally filter by brand'
                : 'View and print inventory by brand'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!specialOrdersMode && (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[110px] border-2 border-black">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select
              value={selectedBrandId}
              onValueChange={(val) => setSelectedBrandId(val === 'all' ? '' : val)}
            >
              <SelectTrigger className="w-[200px] border-2 border-black">
                <SelectValue
                  placeholder={brandsLoading ? 'Loading...' : specialOrdersMode ? 'All Brands' : 'Select Brand'}
                />
              </SelectTrigger>
              <SelectContent>
                {specialOrdersMode && (
                  <SelectItem value="all">All Brands</SelectItem>
                )}
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id.toString()}>
                    {brand.brandName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleSpecialOrdersToggle}
              variant={specialOrdersMode ? 'default' : 'outline'}
              className={
                specialOrdersMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white font-semibold border-2 border-black'
                  : 'font-semibold border-2 border-black'
              }
            >
              <PackageCheck className="w-4 h-4 mr-2" />
              Special Orders
            </Button>

            <Button
              onClick={handlePrint}
              disabled={isLoading || (!report && !specialOrdersMode) || (specialOrdersMode && allSpecialOrders.length === 0)}
              className="bg-sky-deeper hover:bg-sky-deeper/90 text-black font-semibold border-2 border-black"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print / PDF
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
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

        {/* No Brand Selected (inventory mode only) */}
        {!specialOrdersMode && !selectedBrandId && !isLoading && (
          <Card className="p-8 border-2 border-black text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">Select a Brand</h3>
            <p className="text-gray-600">
              Choose a brand from the dropdown to view its inventory report
            </p>
          </Card>
        )}

        {/* === SPECIAL ORDERS MODE === */}
        {specialOrdersMode && !specialOrdersLoading && (
          <div className="print-area space-y-6">
            {/* Report Header */}
            <div className="report-header text-center border-b-2 border-black pb-4">
              <h1 className="text-2xl font-bold">Jazzy Eyes</h1>
              <h2 className="text-xl font-semibold mt-1">
                Special Orders Report{selectedBrandName ? ` — ${selectedBrandName}` : ' — All Brands'}
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

            {/* Summary */}
            <div className="summary-cards grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600">Total Special Orders</p>
                <p className="text-2xl font-bold text-blue-600">
                  {allSpecialOrders.length}
                </p>
              </Card>
              <Card className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    allSpecialOrders.reduce((sum, o) => sum + o.unitCost * o.quantity, 0)
                  )}
                </p>
              </Card>
              <Card className="p-4 border-2 border-black">
                <p className="text-sm text-gray-600">Total Retail</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    allSpecialOrders.reduce((sum, o) => sum + o.unitPrice * o.quantity, 0)
                  )}
                </p>
              </Card>
            </div>

            {/* Special Orders Table */}
            {allSpecialOrders.length === 0 ? (
              <Card className="p-8 border-2 border-black text-center">
                <PackageCheck className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold">No Special Orders</h3>
                <p className="text-gray-600">
                  {selectedBrandName
                    ? `No special orders found for ${selectedBrandName}`
                    : 'No special orders found'}
                </p>
              </Card>
            ) : (
              <Card className="print-card p-4 border-2 border-black">
                <h2 className="text-lg font-bold mb-3">
                  Special Orders ({allSpecialOrders.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="inventory-table w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="text-left py-2 px-1">Frame ID</th>
                        <th className="text-left py-2 px-1">Brand</th>
                        <th className="text-left py-2 px-1">Model</th>
                        <th className="text-left py-2 px-1">Color</th>
                        <th className="text-center py-2 px-1">Qty</th>
                        <th className="text-right py-2 px-1">Cost</th>
                        <th className="text-right py-2 px-1">Retail</th>
                        <th className="text-left py-2 px-1">Date</th>
                        <th className="text-left py-2 px-1">Invoice</th>
                        <th className="text-left py-2 px-1">Status</th>
                        <th className="text-left py-2 px-1">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allSpecialOrders.map((order, index) => (
                        <tr
                          key={order.id}
                          className={index % 2 === 0 ? 'bg-gray-50' : ''}
                        >
                          <td className="py-1.5 px-1 font-medium">
                            {order.frameId}
                          </td>
                          <td className="py-1.5 px-1">{order.brand}</td>
                          <td className="py-1.5 px-1">{order.model}</td>
                          <td className="py-1.5 px-1">{order.color}</td>
                          <td className="text-center py-1.5 px-1">
                            {order.quantity}
                          </td>
                          <td className="text-right py-1.5 px-1">
                            {formatCurrency(order.unitCost)}
                          </td>
                          <td className="text-right py-1.5 px-1">
                            {formatCurrency(order.unitPrice)}
                          </td>
                          <td className="py-1.5 px-1">
                            {new Date(order.transactionDate).toLocaleDateString()}
                          </td>
                          <td className="py-1.5 px-1">
                            {order.invoiceNumber || '—'}
                          </td>
                          <td className="py-1.5 px-1">
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                order.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : order.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="py-1.5 px-1 text-gray-600 truncate max-w-[150px]">
                            {order.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Footer */}
            <div className="report-footer text-center text-sm text-gray-500 pt-4 border-t">
              <p>
                Jazzy Eyes — Special Orders Report
                {selectedBrandName ? ` — ${selectedBrandName}` : ''}
              </p>
            </div>
          </div>
        )}

        {/* === INVENTORY MODE === */}
        {!specialOrdersMode && !loading && report && (report.frames.length > 0 || report.specialOrders.length > 0) && (
          <div className="print-area space-y-6">
            {/* Report Header */}
            <div className="report-header text-center border-b-2 border-black pb-4">
              <h1 className="text-2xl font-bold">Jazzy Eyes</h1>
              <h2 className="text-xl font-semibold mt-1">
                Inventory Report — {report.brandName} — {selectedYear}
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

            {/* Inventory Flow Summary */}
            <Card className="print-card p-4 border-2 border-black">
              <h2 className="text-lg font-bold mb-1">Inventory Flow — {selectedYear}</h2>
              <p className="text-xs text-gray-500 mb-3">
                {selectedYear === '2026'
                  ? 'Beginning = initial inventory seeded on Jan 8, 2026 (system start). Added/Sold/Returned reflect activity after that day.'
                  : `Beginning = qty on hand at start of ${selectedYear}. Added/Sold/Returned reflect activity during ${selectedYear}.`}
              </p>
              <div className="summary-cards grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="p-3 border-2 border-black">
                  <p className="text-xs text-gray-600">Beginning</p>
                  <p className="text-2xl font-bold">{report.summary.beginningQty}</p>
                </Card>
                <Card className="p-3 border-2 border-black bg-green-50">
                  <p className="text-xs text-gray-600">+ Added</p>
                  <p className="text-2xl font-bold text-green-700">{report.summary.added}</p>
                </Card>
                <Card className="p-3 border-2 border-black bg-blue-50">
                  <p className="text-xs text-gray-600">− Returned</p>
                  <p className="text-2xl font-bold text-blue-700">{report.summary.returned}</p>
                </Card>
                <Card className="p-3 border-2 border-black bg-red-50">
                  <p className="text-xs text-gray-600">− Sold</p>
                  <p className="text-2xl font-bold text-red-700">{report.summary.sold}</p>
                </Card>
                <Card className="p-3 border-2 border-black bg-gray-100">
                  <p className="text-xs text-gray-600">= Ending</p>
                  <p className="text-2xl font-bold">{report.summary.endingQty}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    On hand now: {report.summary.currentQty}
                  </p>
                </Card>
              </div>
              {report.summary.otherAdjustments !== 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Note: {report.summary.otherAdjustments} unit(s) lost to damage/defective/other write-offs (net).
                </p>
              )}
              {report.summary.specialOrderCount > 0 && (
                <p className="text-sm text-gray-600 mt-3">
                  Special orders: {report.summary.specialOrderCount}
                </p>
              )}
            </Card>

            {/* Frames Table */}
            {(() => {
              const visibleFrames = report.frames.filter(
                (f) => !(f.currentQty === 0 && f.status === 'Discontinued')
              );
              return (
            <Card className="print-card p-4 border-2 border-black">
              <h2 className="text-lg font-bold mb-3">
                Frames ({visibleFrames.length})
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
                    {visibleFrames.map((frame, index) => {
                      const displayStatus =
                        frame.status === 'Discontinued'
                          ? 'Discontinued'
                          : frame.currentQty === 0
                          ? 'Sold Out'
                          : 'Active';
                      const statusClass =
                        displayStatus === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : displayStatus === 'Sold Out'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700';
                      return (
                        <tr
                          key={frame.frameId}
                          className={index % 2 === 0 ? 'bg-gray-50' : ''}
                        >
                          <td className="py-1.5 px-1 font-medium">{frame.frameId}</td>
                          <td className="py-1.5 px-1">{frame.model}</td>
                          <td className="py-1.5 px-1">{frame.color}</td>
                          <td className="text-center py-1.5 px-1">{frame.currentQty}</td>
                          <td className="py-1.5 px-1">
                            {frame.productType} / {frame.frameType}
                          </td>
                          <td className="py-1.5 px-1">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusClass}`}>
                              {displayStatus}
                            </span>
                          </td>
                          <td className="text-right py-1.5 px-1">{formatCurrency(frame.retailPrice)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
              );
            })()}

            {/* Special Orders in Inventory Mode */}
            {report.specialOrders.length > 0 && (
              <Card className="print-card p-4 border-2 border-black">
                <h2 className="text-lg font-bold mb-3">
                  Special Orders ({report.specialOrders.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="inventory-table w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="text-left py-2 px-1">Frame ID</th>
                        <th className="text-left py-2 px-1">Model</th>
                        <th className="text-left py-2 px-1">Color</th>
                        <th className="text-center py-2 px-1">Qty</th>
                        <th className="text-right py-2 px-1">Cost</th>
                        <th className="text-right py-2 px-1">Retail</th>
                        <th className="text-left py-2 px-1">Date</th>
                        <th className="text-left py-2 px-1">Invoice</th>
                        <th className="text-left py-2 px-1">Status</th>
                        <th className="text-left py-2 px-1">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.specialOrders.map((order, index) => (
                        <tr
                          key={order.id}
                          className={index % 2 === 0 ? 'bg-gray-50' : ''}
                        >
                          <td className="py-1.5 px-1 font-medium">
                            {order.frameId}
                          </td>
                          <td className="py-1.5 px-1">{order.model}</td>
                          <td className="py-1.5 px-1">{order.color}</td>
                          <td className="text-center py-1.5 px-1">
                            {order.quantity}
                          </td>
                          <td className="text-right py-1.5 px-1">
                            {formatCurrency(order.unitCost)}
                          </td>
                          <td className="text-right py-1.5 px-1">
                            {formatCurrency(order.unitPrice)}
                          </td>
                          <td className="py-1.5 px-1">
                            {new Date(order.transactionDate).toLocaleDateString()}
                          </td>
                          <td className="py-1.5 px-1">
                            {order.invoiceNumber || '—'}
                          </td>
                          <td className="py-1.5 px-1">
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                order.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : order.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="py-1.5 px-1 text-gray-600 truncate max-w-[150px]">
                            {order.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Footer */}
            <div className="report-footer text-center text-sm text-gray-500 pt-4 border-t">
              <p>Jazzy Eyes — Inventory Report — {report.brandName}</p>
            </div>
          </div>
        )}

        {/* No Data State (inventory mode) */}
        {!specialOrdersMode && !loading && report && report.frames.length === 0 && report.specialOrders.length === 0 && (
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
