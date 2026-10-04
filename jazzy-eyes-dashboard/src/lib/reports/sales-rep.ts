const DAY = 86_400_000;
const INCEPTION = '2026-01-08';
export type RepTransaction = {
  id: number;
  transactionType: string;
  transactionDate: Date;
  quantity: number;
  status: string;
  revertedFromId: number | null;
};
export type RepProduct = {
  compositeId: string;
  brandId: number;
  styleNumber: string;
  colorCode: string;
  eyeSize: string;
  currentQty: number;
  transactions: RepTransaction[];
};
export type RepUnit = {
  status: 'In stock' | 'Sold';
  receivedDate: string | null;
  soldDate: string | null;
  daysOnShelf: number | null;
};
export type RepRow = {
  frameId: string; brand: string; model: string; color: string; size: string;
  currentQty: number; received: number; sold: number;
  lastReceived: string | null; lastSold: string | null;
  daysOnShelf: number | null;
  ageBand: string;
  units: RepUnit[];
};
export type RepReport = {
  brandName: string; startDate: string; endDate: string;
  asOf: string; frames: RepRow[];
};
export function parseReportDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
type Lot = { date: string | null; quantity: number };

export function buildRepRow(product: RepProduct, brand: string, start: string, end: string, asOf: string): RepRow {
  let received = 0, sold = 0;
  let lastReceived: string | null = null, lastSold: string | null = null;
  let uncertain = false;
  const lots: Lot[] = [];
  const soldUnits: RepUnit[] = [];
  const removed = new Map<number, Lot[]>();
  const transactions = product.transactions.filter(t => t.status === 'completed' && dateKey(t.transactionDate) <= asOf)
    .sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime() || a.id - b.id);
  for (const t of transactions) {
    const date = dateKey(t.transactionDate);
    const inPeriod = date >= start && date <= end;
    if (t.transactionType === 'ORDER' || t.transactionType === 'RESTOCK') {
      lastReceived = date;
      if (inPeriod && date > INCEPTION) received += t.quantity;
      lots.push({ date, quantity: t.quantity });
    } else if (t.transactionType === 'SALE' || t.transactionType === 'WRITE_OFF') {
      if (t.transactionType === 'SALE') {
        lastSold = date;
        if (inPeriod) sold += t.quantity;
      }
      let remaining = t.quantity;
      const consumed: Lot[] = [];
      for (const lot of lots) {
        if (remaining <= 0) break;
        const quantity = Math.min(lot.quantity, remaining);
        if (quantity) consumed.push({ date: lot.date, quantity });
        lot.quantity -= quantity;
        remaining -= quantity;
      }
      if (remaining > 0) { consumed.push({ date: null, quantity: remaining }); uncertain = true; }
      if (t.transactionType === 'WRITE_OFF') removed.set(t.id, consumed);
      if (t.transactionType === 'SALE' && inPeriod) {
        for (const lot of consumed) {
          for (let i = 0; i < lot.quantity; i++) {
            const receivedDate = uncertain ? null : lot.date;
            soldUnits.push({ status: 'Sold', receivedDate, soldDate: date,
              daysOnShelf: receivedDate ? Math.max(0, Math.floor((Date.parse(date) - Date.parse(receivedDate)) / DAY)) : null });
          }
        }
      }
    } else if (t.transactionType === 'REVERT_WRITE_OFF') {
      const original = t.revertedFromId === null ? [] : (removed.get(t.revertedFromId) ?? []);
      let remaining = t.quantity;
      for (const lot of original) {
        const quantity = Math.min(lot.quantity, remaining);
        if (quantity > 0) lots.push({ date: lot.date, quantity });
        lot.quantity -= quantity;
        remaining -= quantity;
      }
      if (remaining > 0) lots.push({ date: null, quantity: remaining });
      lots.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    }
  }
  const remainingLots = lots.filter(lot => lot.quantity > 0);
  const matchesStock = remainingLots.reduce((sum, lot) => sum + lot.quantity, 0) === product.currentQty;
  const oldest = remainingLots.map(lot => lot.date).sort()[0];
  const known = product.currentQty > 0 && matchesStock && !uncertain && remainingLots.every(lot => lot.date !== null) && oldest;
  const daysOnShelf = known ? Math.max(0, Math.floor((Date.parse(asOf) - Date.parse(oldest)) / DAY)) : null;
  const stockUnits: RepUnit[] = [];
  if (known) {
    for (const lot of remainingLots) {
      for (let i = 0; i < lot.quantity; i++) {
        stockUnits.push({ status: 'In stock', receivedDate: lot.date, soldDate: null,
          daysOnShelf: Math.max(0, Math.floor((Date.parse(asOf) - Date.parse(lot.date!)) / DAY)) });
      }
    }
  } else {
    for (let i = 0; i < product.currentQty; i++) {
      stockUnits.push({ status: 'In stock', receivedDate: null, soldDate: null, daysOnShelf: null });
    }
  }
  return {
    units: [...stockUnits, ...soldUnits],
    frameId: product.compositeId, brand, model: product.styleNumber, color: product.colorCode,
    size: product.eyeSize, currentQty: product.currentQty, received, sold, lastReceived, lastSold,
    daysOnShelf,
    ageBand: daysOnShelf === null ? (product.currentQty > 0 ? 'Unknown' : 'Out of stock')
      : daysOnShelf >= 90 ? '90+ days' : daysOnShelf >= 60 ? '60–89 days' : daysOnShelf >= 30 ? '30–59 days' : 'Under 30 days',
  };
}
export function selectRepRows(rows: RepRow[], activityOnly = false): RepRow[] {
  return rows.filter(row => (row.received > 0 || row.sold > 0) || (!activityOnly && row.currentQty > 0))
    .sort((a, b) => Number(b.currentQty > 0) - Number(a.currentQty > 0)
      || (b.daysOnShelf ?? -1) - (a.daysOnShelf ?? -1)
      || a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model, 'en', { numeric: true })
      || a.frameId.localeCompare(b.frameId));
}
