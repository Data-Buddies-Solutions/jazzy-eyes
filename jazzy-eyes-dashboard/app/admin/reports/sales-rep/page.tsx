'use client';

import { Fragment, useEffect, useState } from 'react';
import { FileText, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { selectRepRows, type RepReport } from '@/lib/reports/sales-rep';

type Brand = { id: number; brandName: string };
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const displayDate = (value: string | null) => value ? new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC' }) : '—';

export default function SalesRepReportPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState('');
  const [startDate, setStartDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() - 30); return localDate(date); });
  const [endDate, setEndDate] = useState(() => localDate(new Date()));
  const [activityOnly, setActivityOnly] = useState(true);
  const [report, setReport] = useState<RepReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/brands', { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error('Unable to load brands. Refresh to try again.');
      setBrands(data.brands);
    }).catch(error => { if (error.name !== 'AbortError') setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setBrandsLoading(false); });
    return () => controller.abort();
  }, []);
  const rows = selectRepRows(report?.frames ?? [], activityOnly);
  const totals = rows.reduce((sum, row) => ({ stock: sum.stock + row.currentQty, received: sum.received + row.received,
    sold: sum.sold + row.sold, aged: sum.aged + (row.daysOnShelf !== null && row.daysOnShelf >= 90 ? 1 : 0) }),
  { stock: 0, received: 0, sold: 0, aged: 0 });
  function clearReport() { setReport(null); setError(null); }
  async function generate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setReport(null); setError(null);
    try {
      const params = new URLSearchParams({ brandId, startDate, endDate });
      const response = await fetch(`/api/reports/sales-rep?${params}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to generate report.');
      setReport(data);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to generate report.'); }
    finally { setLoading(false); }
  }
  return <div className="rep-report space-y-6">
    <style jsx global>{`
      @media print {
        @page { size: letter landscape; margin: 0.4in; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        aside, header, .no-print { display: none !important; }
        main { padding: 0 !important; overflow: visible !important; }
        .rep-report { font-size: 9px; }
        .rep-report .table-scroll { overflow: visible !important; }
        .rep-report table { width: 100%; font-size: 8px; }
        .rep-report th, .rep-report td { padding: 4px; }
        .rep-report thead { display: table-header-group; }
        .rep-report tr { break-inside: avoid; }
        .rep-report .report-card { box-shadow: none; padding: 8px; }
      }
    `}</style>
    <div className="no-print flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6" />Sales Rep Report</h1>
        <p className="text-sm text-gray-600 mt-1">See what sold since the last visit and which frames are still on the shelf.</p></div>
      <Button onClick={() => window.print()} disabled={!report || loading} variant="outline" className="border-2 border-black"><Printer className="w-4 h-4 mr-2" />Print / PDF</Button>
    </div>
    <Card className="no-print p-4 border-2 border-black">
      <form onSubmit={generate} className="flex flex-wrap items-end gap-4">
        <fieldset disabled={loading} className="contents">
          <div className="w-full sm:w-56"><label id="brand-label" className="block text-sm font-semibold mb-1">Brand</label>
            <Select value={brandId} onValueChange={value => { setBrandId(value); clearReport(); }} disabled={brandsLoading || loading}>
              <SelectTrigger aria-labelledby="brand-label" className="border-2 border-black"><SelectValue placeholder={brandsLoading ? 'Loading…' : 'Select brand'} /></SelectTrigger>
              <SelectContent>{brands.map(brand => <SelectItem key={brand.id} value={String(brand.id)}>{brand.brandName}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><label htmlFor="rep-start" className="block text-sm font-semibold mb-1">Since last visit</label>
            <input id="rep-start" type="date" required value={startDate} max={endDate} onChange={event => { setStartDate(event.target.value); clearReport(); }} className="h-10 rounded-md border-2 border-black px-2" /></div>
          <div><label htmlFor="rep-end" className="block text-sm font-semibold mb-1">Through</label>
            <input id="rep-end" type="date" required value={endDate} min={startDate} onChange={event => { setEndDate(event.target.value); clearReport(); }} className="h-10 rounded-md border-2 border-black px-2" /></div>
          <Button type="submit" disabled={!brandId || loading || !startDate || !endDate || startDate > endDate} className="border-2 border-black font-semibold">{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Generate report</Button>
        </fieldset>
      </form>
      <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={activityOnly} onChange={event => setActivityOnly(event.target.checked)} />Activity only — frames received or sold during these dates</label>
    </Card>
    {error && <p role="alert" className="rounded-md border-2 border-red-500 bg-red-50 p-4 text-red-700">{error}</p>}
    {loading && <p role="status" className="py-8 text-center">Generating report…</p>}
    {!report && !loading && !error && <Card className="p-8 border-2 border-black text-center text-gray-600">Choose a brand and date range, then generate the report.</Card>}
    {report && <>
      <div className="border-b-2 border-black pb-4"><h2 className="text-xl font-bold">Jazzy Eyes · Sales Rep Report</h2>
        <p className="font-semibold">{report.brandName}</p>
        <p className="text-sm text-gray-600">Activity: {displayDate(report.startDate)} – {displayDate(report.endDate)} · Stock and shelf age as of {displayDate(report.asOf)}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[
        ['Units in stock', totals.stock], ['Received in period', totals.received], ['Sold in period', totals.sold], ['Variants on shelf 90+ days', totals.aged],
      ].map(([label, value]) => <Card key={label} className="report-card border-2 border-black p-4"><p className="text-sm text-gray-600">{label}</p><p className="text-2xl font-bold">{value}</p></Card>)}</div>
      <Card className="report-card border-2 border-black p-4">
        <h3 className="font-bold mb-3">Frames ({rows.length})</h3>
        {rows.length === 0 ? <p className="text-gray-600 py-6 text-center">No frames match this view.</p> : <div className="table-scroll overflow-x-auto"><table className="w-full text-sm text-left">
          <thead><tr className="border-b-2 border-black">{['Brand', 'Model', 'Color', 'Size', 'In stock', 'Received', 'Sold', 'Days on shelf', 'Age group', 'Last received', 'Last sold'].map(label => <th scope="col" key={label} className="p-2 whitespace-nowrap">{label}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <Fragment key={row.frameId}><tr className={index % 2 === 0 ? 'bg-gray-50' : ''}>
            <td className="p-2">{row.brand}</td><td className="p-2 font-semibold">{row.model}</td><td className="p-2">{row.color}</td><td className="p-2 whitespace-nowrap">{row.size}</td>
            <td className="p-2 tabular-nums">{row.currentQty}</td><td className="p-2 tabular-nums">{row.received}</td><td className="p-2 tabular-nums">{row.sold}</td>
            <td className="p-2 tabular-nums font-semibold">{row.daysOnShelf ?? (row.currentQty > 0 ? 'Unknown' : '—')}</td>
            <td className="p-2 whitespace-nowrap"><span className={row.daysOnShelf !== null && row.daysOnShelf >= 90 ? 'rounded bg-amber-100 px-2 py-1 text-amber-900' : ''}>{row.ageBand}</span></td>
            <td className="p-2 whitespace-nowrap">{displayDate(row.lastReceived)}</td><td className="p-2 whitespace-nowrap">{displayDate(row.lastSold)}</td>
          </tr>
          {(row.currentQty > 1 || row.sold > 0) && <tr className={index % 2 === 0 ? 'bg-gray-50' : ''}><td colSpan={11} className="px-4 pb-4">
            <div className="border-l-2 border-sky-300 pl-3">
              <p className="text-xs font-semibold py-2">Unit breakdown · current stock and sales in the selected period</p>
              <table className="text-xs w-full max-w-2xl"><thead><tr>{['Unit', 'Status', 'Received', 'Sold', 'Days on shelf / before sale'].map(label => <th scope="col" key={label} className="px-2 py-1 text-left">{label}</th>)}</tr></thead>
                <tbody>{row.units.map((unit, unitIndex) => <tr key={unitIndex}>
                  <td className="px-2 py-1">{unitIndex + 1}</td><td className="px-2 py-1">{unit.status}</td>
                  <td className="px-2 py-1">{displayDate(unit.receivedDate)}</td><td className="px-2 py-1">{displayDate(unit.soldDate)}</td>
                  <td className="px-2 py-1 font-semibold">{unit.daysOnShelf ?? 'Unknown'}{unit.daysOnShelf !== null ? ' days' : ''}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </td></tr>}
          </Fragment>)}</tbody></table></div>}
      </Card>
      <p className="text-xs text-gray-600">Received and sold counts apply to the selected dates, inclusive. Stock, shelf age, and last received/sold dates are current. Unit receipt dates are matched oldest-first from transaction history, not individual serial numbers. The summary age uses the oldest remaining unit; initial inventory uses its starting date. Unknown means the recorded history does not reconcile with current stock. Opening inventory is excluded from received counts. This report covers inventory frames, not separate prescription sales. Totals reflect the displayed rows.</p>
    </>}
  </div>;
}
