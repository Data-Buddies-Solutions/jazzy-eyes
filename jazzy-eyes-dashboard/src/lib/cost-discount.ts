export type CostDiscount = {
  costDiscountPercent: number | null;
  costDiscountStartDate: Date | null;
};

// A brand's cost discount applies to frames received on or after its start date,
// whenever they sell. Without a receive date there is no evidence for a discount.
export function discountedCost(cost: number, receivedDate: Date | null, discount: CostDiscount): number {
  const { costDiscountPercent: percent, costDiscountStartDate: start } = discount;
  if (!percent || percent <= 0 || !start || !receivedDate || receivedDate < start) return cost;
  return cost * (1 - percent / 100);
}
