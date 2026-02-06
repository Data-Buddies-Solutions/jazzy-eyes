# Implementation Plan: Add Quantity Tracking to Frames

## Summary

Add a `currentQty` field to track multiple units of the same frame, with support for:
- **Selling multiple units** (decrement qty, capture sale price/date per transaction, auto-set "Sold Out" when qty=0)
- **Write-off** (remove damaged/lost frames with audit trail)
- **Revert write-off** (undo a write-off, restore qty)
- **Restock** (add more units with invoice date and cost price, auto-set back to "Active" or updates qty if there it qty > 1)

---

## Key Design Decisions

| Decision | Approach |
|----------|----------|
| Status when qty > 0 | Stays "Active" until all units sold |
| Status when qty = 0 | "Sold Out" status (no inventory left) |
| Damaged/lost frames | "Write Off" action with required reason (audit trail) |
| Undo write-off | "Revert Write-Off" action restores qty and creates audit record |
| Cost tracking | **FIFO** (First In, First Out) - oldest inventory cost used first for margin calculation |
| Restock pricing | Each restock captures its own cost price and invoice date (supplier prices change) |
| Status auto-transitions | qty=0 via sale/write-off -> "Sold Out"; restock from "Sold Out" -> "Active" |

---

## User Workflows

### Selling a Frame
1. Staff finds frame in inventory
2. Clicks "Sell" button
3. Modal shows current stock (e.g., "3 available")
4. Staff enters:
   - **Qty to sell** (default 1)
   - **Sale price** (defaults to retail price, can override for discounts)
   - **Sale date** (defaults to today, can backdate if needed)
5. System creates SALE transaction with price/date, decrements `currentQty`
6. Cost for margin calculation uses **FIFO** (oldest inventory cost first)
7. If qty reaches 0, status auto-changes to "Sold Out"

### Writing Off Damaged/Lost Frames
1. Staff finds frame
2. Clicks "Write Off" button
3. Selects reason (Damaged, Lost/Missing, Defective, Other)
4. Enters qty to write off
5. System decrements qty, creates WRITE_OFF transaction with reason
6. Audit trail preserved for inventory shrinkage reporting
7. If qty reaches 0, status auto-changes to "Sold Out"

### Reverting a Write-Off
1. Staff realizes a write-off was done in error 
2. Finds the frame and clicks "Revert Write-Off" (or via transaction history)
3. Selects which write-off transaction to revert
4. System creates REVERT_WRITE_OFF transaction (audit trail), increments `currentQty`
5. If frame was "Sold Out", status changes back to "Active"

### Restocking Same Frame
1. Staff receives shipment from supplier
2. Finds existing frame in system (doesn't need to re-enter all details)
3. Clicks "Restock" button
4. Enters:
   - **Qty received**
   - **Invoice date** (when supplier invoiced)
   - **Cost price** (defaults to last cost, can update if supplier price changed)
   - **Notes** (optional - e.g., "Invoice #12345")
5. System creates RESTOCK transaction, increments `currentQty`
6. If frame was "Sold Out", status auto-changes back to "Active"

---

## Files to Modify 

### 1. Database Schema
**File:** `jazzy-eyes-dashboard/prisma/schema.prisma`

Changes:
- Add `currentQty Int @default(1)` to Product model
- Add `WRITE_OFF`, `RESTOCK`, and `REVERT_WRITE_OFF` to TransactionType enum
- Add `writeOffReason String?` to InventoryTransaction (for audit)
- Add `remainingQty Int` to InventoryTransaction (for FIFO tracking)

```prisma
enum TransactionType {
  ORDER
  SALE
  WRITE_OFF         // NEW - damaged/lost inventory
  RESTOCK           // NEW - adding more inventory
  REVERT_WRITE_OFF  // NEW - undo a write-off
}

model Product {
  // ... existing fields ...
  currentQty   Int @default(1) @map("current_qty")  // NEW - total available qty
}

model InventoryTransaction {
  // ... existing fields ...
  writeOffReason String? @map("write_off_reason") @db.VarChar(100)  // NEW - reason for write-off
  remainingQty   Int?    @map("remaining_qty")                      // NEW - for FIFO: how many units left from this batch
  revertedFromId Int?    @map("reverted_from_id")                   // NEW - links REVERT_WRITE_OFF to original WRITE_OFF
}
```

#### FIFO Tracking Explained

Each ORDER and RESTOCK transaction has a `remainingQty` field:
- When ORDER created with qty=3: `remainingQty=3`
- When RESTOCK created with qty=2: `remainingQty=2`

When selling, we consume from oldest batches first:
1. Find ORDER/RESTOCK transactions with `remainingQty > 0`, ordered by `transactionDate ASC`
2. Decrement `remainingQty` from oldest first
3. Use that batch's `unitCost` for margin calculation

**Example:**
```
Jan 1:  ORDER qty=3, cost=$50  -> remainingQty=3
Mar 1:  RESTOCK qty=2, cost=$55 -> remainingQty=2

Sell 2 on Mar 15:
  -> Consume 2 from Jan ORDER (oldest), remainingQty becomes 1
  -> Cost for this sale = $50 (from Jan batch)

Sell 2 on Mar 20:
  -> Consume 1 from Jan ORDER, remainingQty becomes 0
  -> Consume 1 from Mar RESTOCK, remainingQty becomes 1
  -> Cost for this sale = avg($50 + $55) = $52.50 (or weighted)
```

### 2. Seed File - Rename "Sold" to "Sold Out"
**File:** `jazzy-eyes-dashboard/prisma/seed.ts`

Change "Sold" to "Sold Out" in the `defaultStatuses` array. This clarifies that the status means "no inventory left" (qty=0), while actual sales are tracked via SALE transactions.

### 3. API Route - Add New Actions
**File:** `jazzy-eyes-dashboard/app/api/frames/[id]/route.ts`

Modify PATCH handler:

| Action | Changes |
|--------|---------|
| `mark_as_sold` | Accept `quantity`, `salePrice`, `saleDate`; validate stock; use FIFO for cost; decrement `currentQty`; auto-set "Sold Out" if qty=0 |
| `write_off` (NEW) | Accept `quantity`, `reason`, `notes`; create WRITE_OFF transaction; decrement qty; auto-set "Sold Out" if qty=0 |
| `revert_write_off` (NEW) | Accept `writeOffTransactionId`; create REVERT_WRITE_OFF transaction; increment qty; auto-set "Active" if was "Sold Out" |
| `restock` (NEW) | Accept `quantity`, `invoiceDate`, `costPrice`, `notes`; create RESTOCK transaction with `remainingQty`; increment `currentQty`; auto-set "Active" if was "Sold Out" |
| `change_status` | Keep "Sold Out" as protected (can't manually set) |

### 4. Search API - Include Qty
**File:** `jazzy-eyes-dashboard/app/api/frames/search/route.ts`

Add `currentQty: product.currentQty` to the response object so the table can display it.

### 5. Types
**File:** `jazzy-eyes-dashboard/src/types/admin.ts`

```typescript
// Add to Frame interface
currentQty: number;

// Update ManualSaleData
interface ManualSaleData {
  frameId: string;
  quantity: number;      // NEW
  salePrice?: number;
  saleDate?: string;
}

// New types
interface WriteOffData {
  frameId: string;
  quantity: number;
  reason: 'damaged' | 'lost' | 'defective' | 'other';
  notes?: string;
}

interface RevertWriteOffData {
  frameId: string;
  writeOffTransactionId: number;  // Which write-off to revert
  notes?: string;
}

interface RestockData {
  frameId: string;
  quantity: number;
  invoiceDate?: string;
  costPrice?: number;    // NEW - optional, defaults to last cost
  notes?: string;
}
```

### 6. Validation Schemas
**File:** `jazzy-eyes-dashboard/src/lib/validations/admin.ts`

Add quantity validation to `manualSaleSchema`, create `writeOffSchema` and `restockSchema`.

### 7. UI Components

#### FrameTable (`jazzy-eyes-dashboard/src/components/admin/FrameTable.tsx`)
- Add "Qty" column after Color with color-coded badges:
  - Green: qty >= 3 (good stock)
  - Yellow: qty = 1-2 (low stock)
  - Red: qty = 0 (out of stock)
- Rename "Mark as Sold" to "Sell" button (only when qty > 0)
- Add "Write Off" button (only when qty > 0)
- Add "Restock" button (always visible - even for "Sold Out" items)
- Add "History" button to view transaction history (for reverting write-offs)

#### ManualSaleModal (`jazzy-eyes-dashboard/src/components/admin/ManualSaleModal.tsx`)
- Add quantity input with +/- buttons for easy adjustment
- Show "X of Y available" helper text
- Max bound to `frame.currentQty` to prevent overselling in UI

#### WriteOffModal (NEW - `jazzy-eyes-dashboard/src/components/admin/WriteOffModal.tsx`)
- Quantity selector with +/- buttons
- Required reason dropdown (Damaged, Lost/Missing, Defective, Other)
- Optional notes field for additional context
- Shows total loss amount (cost * qty) so staff understands impact

#### RestockModal (NEW - `jazzy-eyes-dashboard/src/components/admin/RestockModal.tsx`)
- Quantity selector with +/- buttons
- Invoice date (defaults to today, can backdate)
- Cost price input (defaults to last cost, editable if supplier price changed)
- Optional notes field (e.g., "Invoice #12345")
- Shows new stock level and inventory value added

#### TransactionHistoryModal (NEW - `jazzy-eyes-dashboard/src/components/admin/TransactionHistoryModal.tsx`)
- Shows all transactions for a frame (ORDER, SALE, RESTOCK, WRITE_OFF, REVERT_WRITE_OFF)
- For WRITE_OFF transactions: "Revert" button (only if not already reverted)
- Displays: date, type, qty, cost, price, reason/notes

### 8. Manage Page
**File:** `jazzy-eyes-dashboard/app/admin/manage/page.tsx`

- Add `handleWriteOff` function
- Add `handleRevertWriteOff` function
- Add `handleRestock` function
- Update `handleMarkAsSold` to accept quantity, salePrice, saleDate
- Pass new handlers to FrameTable component

---

## Status Auto-Transition Logic

```
┌─────────────┐     qty > 0        ┌─────────────┐
│   Active    │ ◄──────────────────│  Sold Out   │
└─────────────┘  (restock or       └─────────────┘
      │           revert write-off)      ▲
      │                                  │
      │ qty = 0                          │
      │ (sale or write-off)              │
      └──────────────────────────────────┘
```

**Important Notes:**
- "Sold Out" = status meaning qty=0 (no inventory left)
- "Sold" = a SALE transaction happened (tracked separately for analytics/margins)
- Manual statuses (Reserved, Damaged, On Hold, Discontinued) are NOT auto-changed by these transitions
- Only "Sold Out" status triggers auto-change to "Active" on restock/revert
- Staff can still manually change status for special situations (e.g., reserving a frame for a customer)

---

## Edge Cases Handled

| Edge Case | Solution |
|-----------|----------|
| Selling more than available | API validates qty <= currentQty; UI max-bounds the input field |
| Multiple users selling last item | Prisma transaction ensures atomicity - first one wins, second gets error |
| Restock without original ORDER | API returns error (shouldn't happen in normal use) |
| Write-off without reason | API requires reason field; UI has required dropdown |
| Negative quantity | Database constraint + API validation prevent this |
| Status conflicts | "Sold Out" is protected - can only be set via system, not manual dropdown |
| Reverting already-reverted write-off | Track `revertedFromId` to prevent double-revert |
| FIFO with mixed batches | Sale transaction records which batches were consumed and at what cost |

---

## Migration Plan

1. Run `npx prisma migrate dev --name add_quantity_tracking`
2. Existing frames automatically get `currentQty = 1` (database default)
3. Existing ORDER transactions get `remainingQty = 1` (for FIFO tracking)
4. Rename "Sold" status to "Sold Out" (or run migration if data exists)

**Backward Compatibility:** All existing frames continue to work as single-unit items. The qty feature is additive.

**Migration Script for Existing Data:**
```sql
-- Set remainingQty for existing ORDER transactions
-- If frame has SALE transaction, remainingQty = 0 (already sold)
-- If frame has no SALE transaction, remainingQty = 1 (still available)
UPDATE inventory_transactions it
SET remaining_qty = CASE
  WHEN EXISTS (
    SELECT 1 FROM inventory_transactions s
    WHERE s.product_id = it.product_id AND s.transaction_type = 'SALE'
  ) THEN 0
  ELSE 1
END
WHERE it.transaction_type = 'ORDER';
```

---

## Verification Steps

After implementation, test these scenarios:

### 1. Test Sale Flow with FIFO
- [ ] Add frame with qty=3, cost=$50
- [ ] Sell 1 @ $150 -> verify qty=2, status=Active, margin uses $50 cost
- [ ] Restock 2 more @ cost=$55
- [ ] Sell 2 -> verify FIFO: first uses remaining $50 stock, then $55 stock
- [ ] Sell last 2 -> verify qty=0, status="Sold Out"

### 2. Test Write-Off Flow
- [ ] Add frame with qty=5
- [ ] Write off 2 as "Damaged" -> verify qty=3, status=Active
- [ ] Check transaction record has reason in writeOffReason field
- [ ] Write off remaining 3 -> verify qty=0, status="Sold Out"

### 3. Test Revert Write-Off Flow
- [ ] From a frame with a write-off, open History
- [ ] Click "Revert" on the write-off transaction
- [ ] Verify qty is restored, status changes back to Active
- [ ] Verify REVERT_WRITE_OFF transaction created with link to original
- [ ] Try to revert same write-off again -> should be blocked

### 4. Test Restock Flow
- [ ] From "Sold Out" frame, click Restock
- [ ] Add qty=3 with new invoice date and cost price -> verify qty=3, status=Active
- [ ] Check RESTOCK transaction has invoice date and cost
- [ ] Verify remainingQty=3 on the RESTOCK transaction (for FIFO)

### 5. Test Status Protection
- [ ] Try to manually set status to "Sold Out" via dropdown -> should be blocked
- [ ] Verify other statuses (Reserved, Damaged, On Hold) can still be set manually
- [ ] Verify "Active" can be set manually

### 6. Test Edge Cases
- [ ] Try to sell 5 when qty=3 -> should show error message
- [ ] Try to write-off without selecting reason -> should show validation error
- [ ] Concurrent sale attempts on last item -> only one should succeed

---

## Future Enhancements (Not in this scope)

- **Bulk restock:** Add multiple frames from shipment in one action
- **Low stock alerts:** Notification when qty falls below threshold
- **Inventory reports:** Stock value, shrinkage tracking, turnover analysis
- **User tracking:** Record who performed each transaction
- **Undo sale:** Ability to reverse a sale (more complex than write-off revert)
- **Transfer between locations:** If multiple store locations in future

