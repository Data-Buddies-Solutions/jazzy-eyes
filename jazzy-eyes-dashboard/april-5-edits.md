# Brand Cost Discount Feature — April 5, 2026

## Context
The business receives cost discounts from certain brand suppliers effective January 2026. When inventory frames are sold, the cost basis should reflect this discount (lower cost = higher margin). This needs to flow through to all reports and analytics automatically.

**Brands & Discounts**: Gucci 12%, YSL 12%, Chloe 12%, Tom Ford 5%, Silhouette 15%
**Scope**: Inventory sales only (not RX), any sale on or after Jan 1, 2026 regardless of order date.

## Implementation Plan

### 1. Schema: Add discount fields to Brand model
**File**: `prisma/schema.prisma`

Add two fields to the `Brand` model:
- `costDiscountPercent` — Decimal, nullable, default 0 — discount percentage (e.g., 12.00)
- `costDiscountStartDate` — DateTime, nullable — effective date (e.g., 2026-01-01)

Run Prisma migration.

### 2. Seed discount data for existing brands
Update the 5 brands in the database:
| Brand | Discount | Start Date |
|-------|----------|------------|
| Gucci | 12% | 2026-01-01 |
| YSL | 12% | 2026-01-01 |
| Chloe | 12% | 2026-01-01 |
| Tom Ford | 5% | 2026-01-01 |
| Silhouette | 15% | 2026-01-01 |

### 3. Apply discount at point of sale
**File**: `app/api/frames/[id]/route.ts`

In the `mark_as_sold` action:
1. After computing FIFO `avgCost`, fetch the brand's discount info
2. If `costDiscountPercent > 0` and `saleDate >= costDiscountStartDate`, apply: `discountedCost = avgCost * (1 - costDiscountPercent / 100)`
3. Store `discountedCost` as the `unitCost` on the SALE transaction
4. Use `discountedCost` for the below-cost validation check too

### 4. Fix analytics APIs to use SALE transaction's unitCost
**Bug found**: The margins API and brand-performance API currently read cost from the ORDER transaction instead of the SALE transaction's `unitCost`. This means they ignore the existing FIFO cost calculation. Fixing this is necessary for the discount to flow through, and it's the right fix regardless.

**Files**:
- `app/api/analytics/margins/route.ts` — Use `saleTransaction.unitCost` instead of `orderTransaction.unitCost`
- `app/api/analytics/brand-performance/route.ts` — Same fix
- `app/api/reports/eom/route.ts` — Already correct (uses SALE unitCost)

### 5. Expose discount fields in brand API
**File**: `app/api/brands/route.ts`

Return `costDiscountPercent` and `costDiscountStartDate` in brand API responses so the admin UI can display/edit them in the future.

## Files to Modify
1. `prisma/schema.prisma` — Add discount fields to Brand
2. `app/api/frames/[id]/route.ts` — Apply discount at sale time
3. `app/api/analytics/margins/route.ts` — Fix to use SALE unitCost
4. `app/api/analytics/brand-performance/route.ts` — Fix to use SALE unitCost
5. `app/api/brands/route.ts` — Expose discount fields in API

## Verification
1. Run Prisma migration to apply schema changes
2. Seed discount data for the 5 brands
3. Record a test sale for a Gucci frame — verify SALE transaction unitCost reflects 12% discount
4. Check EOM report for post-Jan-2026 sale — margin should be higher
5. Check margins analytics — should use discounted cost
6. Verify pre-Jan-2026 sales are unaffected
