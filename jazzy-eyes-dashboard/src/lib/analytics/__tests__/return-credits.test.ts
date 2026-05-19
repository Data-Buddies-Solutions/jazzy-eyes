import { describe, it, expect } from 'vitest';
import { calculateReturnCreditSummaries, type CreditLedgerEvent } from '../return-credits';

const d = (s: string) => new Date(s);

describe('calculateReturnCreditSummaries (window-scoped)', () => {
  it('returns empty array when no events', () => {
    expect(calculateReturnCreditSummaries([], d('2026-01-01'), d('2026-01-31'))).toEqual([]);
  });

  it('credits a return into balance with nothing to apply against', () => {
    const events: CreditLedgerEvent[] = [
      { brandName: 'Gucci', date: d('2026-01-10'), type: 'RETURN_CREDIT', amount: 100 },
    ];
    const [g] = calculateReturnCreditSummaries(events, d('2026-01-01'), d('2026-01-31'));
    expect(g.startingCreditBalance).toBe(0);
    expect(g.returnCredits).toBe(100);
    expect(g.creditsApplied).toBe(0);
    expect(g.endingCreditBalance).toBe(100);
  });

  it('applies credit up to total COGS, ignoring order within the window', () => {
    const events: CreditLedgerEvent[] = [
      { brandName: 'Gucci', date: d('2026-01-05'), type: 'COST', amount: 60 },
      { brandName: 'Gucci', date: d('2026-01-10'), type: 'COST', amount: 80 },
      { brandName: 'Gucci', date: d('2026-01-25'), type: 'RETURN_CREDIT', amount: 100 },
    ];
    const [g] = calculateReturnCreditSummaries(events, d('2026-01-01'), d('2026-01-31'));
    expect(g.startingCreditBalance).toBe(0);
    expect(g.returnCredits).toBe(100);
    expect(g.creditsApplied).toBe(100); // applies retroactively to total COGS of 140
    expect(g.endingCreditBalance).toBe(0);
  });

  it('caps applied at total available; carry-forward when credit > COGS', () => {
    const events: CreditLedgerEvent[] = [
      { brandName: 'Gucci', date: d('2026-01-05'), type: 'RETURN_CREDIT', amount: 500 },
      { brandName: 'Gucci', date: d('2026-01-15'), type: 'COST', amount: 200 },
    ];
    const [g] = calculateReturnCreditSummaries(events, d('2026-01-01'), d('2026-01-31'));
    expect(g.returnCredits).toBe(500);
    expect(g.creditsApplied).toBe(200);
    expect(g.endingCreditBalance).toBe(300);
  });

  it('zero carry when COGS >= total available credit', () => {
    const events: CreditLedgerEvent[] = [
      { brandName: 'Gucci', date: d('2026-01-05'), type: 'RETURN_CREDIT', amount: 100 },
      { brandName: 'Gucci', date: d('2026-01-15'), type: 'COST', amount: 500 },
    ];
    const [g] = calculateReturnCreditSummaries(events, d('2026-01-01'), d('2026-01-31'));
    expect(g.creditsApplied).toBe(100);
    expect(g.endingCreditBalance).toBe(0);
  });

  it('starting balance carries forward from prior periods', () => {
    const events: CreditLedgerEvent[] = [
      { brandName: 'Gucci', date: d('2025-12-15'), type: 'RETURN_CREDIT', amount: 200 },
      { brandName: 'Gucci', date: d('2026-01-10'), type: 'COST', amount: 50 },
      { brandName: 'Gucci', date: d('2026-01-25'), type: 'RETURN_CREDIT', amount: 30 },
    ];
    const [g] = calculateReturnCreditSummaries(events, d('2026-01-01'), d('2026-01-31'));
    expect(g.startingCreditBalance).toBe(200);
    expect(g.returnCredits).toBe(30);
    expect(g.creditsApplied).toBe(50);
    expect(g.endingCreditBalance).toBe(180);
  });

  it('starting balance reflects prior credits net of prior COGS', () => {
    const events: CreditLedgerEvent[] = [
      { brandName: 'Gucci', date: d('2025-12-15'), type: 'RETURN_CREDIT', amount: 100 },
      { brandName: 'Gucci', date: d('2025-12-20'), type: 'COST', amount: 40 },
    ];
    const [g] = calculateReturnCreditSummaries(events, d('2026-01-01'), d('2026-01-31'));
    expect(g.startingCreditBalance).toBe(60);
    expect(g.returnCredits).toBe(0);
    expect(g.creditsApplied).toBe(0);
    expect(g.endingCreditBalance).toBe(60);
  });

  it('ignores events after endDate', () => {
    const events: CreditLedgerEvent[] = [
      { brandName: 'Gucci', date: d('2026-01-10'), type: 'RETURN_CREDIT', amount: 50 },
      { brandName: 'Gucci', date: d('2026-02-05'), type: 'COST', amount: 30 },
    ];
    const [g] = calculateReturnCreditSummaries(events, d('2026-01-01'), d('2026-01-31'));
    expect(g.startingCreditBalance).toBe(0);
    expect(g.returnCredits).toBe(50);
    expect(g.creditsApplied).toBe(0);
    expect(g.endingCreditBalance).toBe(50);
  });

  it('endings chain to next period startings (Fendi-style)', () => {
    // Pre-period: COGS $1000, no credits → $1000 deficit
    // March: COGS $50, RC $189 (credits beat cogs by $139)
    // April: COGS $200, no new credits
    const events: CreditLedgerEvent[] = [
      { brandName: 'Fendi', date: d('2026-02-10'), type: 'COST', amount: 1000 },
      { brandName: 'Fendi', date: d('2026-03-10'), type: 'COST', amount: 50 },
      { brandName: 'Fendi', date: d('2026-03-25'), type: 'RETURN_CREDIT', amount: 189 },
      { brandName: 'Fendi', date: d('2026-04-15'), type: 'COST', amount: 200 },
    ];
    const [march] = calculateReturnCreditSummaries(events, d('2026-03-01'), d('2026-03-31'));
    const [april] = calculateReturnCreditSummaries(events, d('2026-04-01'), d('2026-04-30'));

    // March identity
    expect(march.startingCreditBalance + march.returnCredits).toBe(
      march.creditsApplied + march.endingCreditBalance
    );
    // Chain: March ending == April starting
    expect(april.startingCreditBalance).toBe(march.endingCreditBalance);
  });

  it('handles multiple brands independently', () => {
    const events: CreditLedgerEvent[] = [
      { brandName: 'Gucci', date: d('2026-01-05'), type: 'RETURN_CREDIT', amount: 100 },
      { brandName: 'Tom Ford', date: d('2026-01-10'), type: 'COST', amount: 50 },
      { brandName: 'Tom Ford', date: d('2026-01-15'), type: 'RETURN_CREDIT', amount: 70 },
    ];
    const summaries = calculateReturnCreditSummaries(events, d('2026-01-01'), d('2026-01-31'));
    expect(summaries).toHaveLength(2);
    const g = summaries.find((s) => s.brandName === 'Gucci')!;
    const tf = summaries.find((s) => s.brandName === 'Tom Ford')!;
    expect(g.endingCreditBalance).toBe(100);
    expect(tf.creditsApplied).toBe(50);
    expect(tf.returnCredits).toBe(70);
    expect(tf.endingCreditBalance).toBe(20);
  });
});
