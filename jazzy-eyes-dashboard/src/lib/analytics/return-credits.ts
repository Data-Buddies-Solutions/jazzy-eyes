export type CreditEventType = 'COST' | 'RETURN_CREDIT';

export interface CreditLedgerEvent {
  brandName: string;
  date: Date;
  type: CreditEventType;
  amount: number;
}

export interface BrandCreditSummary {
  brandName: string;
  startingCreditBalance: number;
  returnCredits: number;
  creditsApplied: number;
  endingCreditBalance: number;
}

/**
 * Window-scoped credit ledger per brand, chain-consistent across periods.
 *
 * Definitions:
 *   cumCreds(t) = sum of all RETURN_CREDIT events with date < t
 *   cumCogs(t)  = sum of all COST events with date < t
 *   used(t)     = min(cumCreds(t), cumCogs(t))   // credit "consumed" through t
 *   balance(t)  = cumCreds(t) − used(t)          // outstanding credit at t
 *
 * For a window [start, end]:
 *   startingCreditBalance = balance(start)
 *   endingCreditBalance   = balance(end+ε)        // includes events on endDate
 *   returnCredits         = sum credits in window
 *   creditsApplied        = used(end) − used(start)
 *
 * Invariants:
 *   - starting + returnCredits = applied + ending  (rows add up)
 *   - ending of period N = starting of period N+1  (chains across months)
 *   - balance ≥ 0 (capped at 0 when cogs ≥ credits cumulatively)
 *   - order of events WITHIN a window does NOT affect totals
 */
export function calculateReturnCreditSummaries(
  events: CreditLedgerEvent[],
  startDate: Date,
  endDate: Date
): BrandCreditSummary[] {
  const byBrand = new Map<string, CreditLedgerEvent[]>();
  for (const ev of events) {
    if (!byBrand.has(ev.brandName)) byBrand.set(ev.brandName, []);
    byBrand.get(ev.brandName)!.push(ev);
  }

  const summaries: BrandCreditSummary[] = [];

  for (const [brandName, brandEvents] of byBrand) {
    let priorCredits = 0;
    let priorCogs = 0;
    let windowCredits = 0;
    let windowCogs = 0;

    for (const ev of brandEvents) {
      const isCredit = ev.type === 'RETURN_CREDIT';
      if (ev.date < startDate) {
        if (isCredit) priorCredits += ev.amount;
        else priorCogs += ev.amount;
      } else if (ev.date <= endDate) {
        if (isCredit) windowCredits += ev.amount;
        else windowCogs += ev.amount;
      }
    }

    const cumCredsStart = priorCredits;
    const cumCogsStart = priorCogs;
    const cumCredsEnd = priorCredits + windowCredits;
    const cumCogsEnd = priorCogs + windowCogs;

    const usedStart = Math.min(cumCredsStart, cumCogsStart);
    const usedEnd = Math.min(cumCredsEnd, cumCogsEnd);

    summaries.push({
      brandName,
      startingCreditBalance: cumCredsStart - usedStart,
      returnCredits: windowCredits,
      creditsApplied: usedEnd - usedStart,
      endingCreditBalance: cumCredsEnd - usedEnd,
    });
  }

  return summaries.sort((a, b) => a.brandName.localeCompare(b.brandName));
}
