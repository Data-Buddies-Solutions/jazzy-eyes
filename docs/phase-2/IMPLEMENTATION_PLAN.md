# Phase 2: Admin Portal Implementation Plan

**Last Updated:** November 5, 2025
**Status:** ✅ Complete - Ready for Client Feedback
**Approach:** UI-First Development with Mock Data

---

## Overview

Build the Admin Portal interface for inventory management using mock data. Focus on streamlined single-frame operations with client feedback before database integration.

**Goal:** Complete admin workflows with mock data, gather user feedback, then connect to database in Phase 3.

---

## Core Features

### 1. Add New Frame
**Priority:** HIGH
Single-frame entry form with validation and label instruction.

**Form Fields:**
- Brand (Dropdown: Tom Ford, Cartier, Oliver Peoples, Ray-Ban, + "Other")
- Model (Text input)
- Color (Text input)
- Gender (Radio: Men / Women / Unisex)
- Frame Type (Radio: Optical / Sunglasses)
- Cost Price (Currency input with validation)
- Retail Price (Currency input with validation)
- Supplier (Text input)
- Notes (Optional text area)

**Flow:**
1. Fill out form with validation
2. Click "Save & Generate Label"
3. System shows generated Frame ID (mock: auto-increment from existing)
4. Display instruction: "Create label with ID: XXXX"
5. Show success confirmation
6. Options: "Add Another Frame" or "View All Frames"

**Validation:**
- Required fields: Brand, Model, Color, Gender, Frame Type, Cost Price, Retail Price
- Cost Price < Retail Price
- Prices must be positive numbers

---

### 2. Frame Lookup & Management
**Priority:** HIGH
Search, view, edit, and manage existing frames.

**Search & Filter:**
- Search bar: Search by Brand or Model (fuzzy match)
- Filter dropdown: Status (All / Active / Sold / Discontinued)
- Results table with sortable columns

**Results Table Columns:**
- Frame ID
- Brand
- Model
- Color
- Type
- Status (badge with color)
- Retail Price
- Actions (View/Edit, Mark as Sold, Mark as Discontinued)

**Actions Per Frame:**
- **View/Edit Details:** Open edit form (same as Add New Frame)
- **Mark as Sold:** Opens manual sale entry modal
  - Confirms frame details
  - Optional: Override sale price
  - Records sale date (defaults to today)
  - Updates status to "Sold"
- **Mark as Discontinued:**
  - Confirmation prompt
  - Updates status to "Discontinued"
  - Frame remains in inventory but flagged

**Use Cases:**
- "I forgot to record a sale at POS" → Search frame, mark as sold
- "Brand discontinued by supplier" → Search brand, mark frames as discontinued
- "Need to update pricing" → Search frame, edit retail price

---

### 3. Navigation & Layout

**Sidebar Navigation (Traditional):**
```
┌─────────────────────────────────────┐
│ 🏪 Jazzy Eyes Admin                 │
├─────────────────────────────────────┤
│ ➕ Add New Frame                     │
│ 🔍 Manage Inventory                 │
│ 📊 View Analytics (Phase 4)         │
└─────────────────────────────────────┘
```

**Mobile Responsive:**
- Collapsible hamburger menu on mobile/tablet
- Touch-friendly buttons and inputs
- Optimized for iPad (primary admin device)

---

## Technical Specifications

### Mock Data Strategy
- Use existing 4 mock frames from POS (`mockFrames.ts`)
- Local state management for CRUD operations
- Simulate 500ms API delay for realistic UX
- Auto-generate Frame IDs (e.g., next available: "0543")
- Changes persist in session only (reset on page refresh)

### File Structure
```
app/
  admin/
    layout.tsx           # Admin layout with sidebar
    page.tsx            # Redirect to /admin/add-new
    add-new/
      page.tsx          # Add New Frame form
    manage/
      page.tsx          # Frame lookup & management

components/
  admin/
    Sidebar.tsx         # Navigation sidebar
    FrameForm.tsx       # Reusable form for add/edit
    FrameTable.tsx      # Search results table
    ManualSaleModal.tsx # Mark as sold modal

data/
  mockApi.ts           # Add CRUD operations
  mockFrames.ts        # Existing mock data

lib/
  validations/
    admin.ts           # Form validation schemas (Zod)

types/
  admin.ts             # Admin-specific types
```

### Design System
- **Colors:** Sky blue accent (#C1F1FF, #87CEEB) + black borders
- **Components:** shadcn/ui (Button, Input, Select, Table, Dialog, Badge)
- **Forms:** React Hook Form + Zod validation
- **Layout:** Responsive grid with Tailwind CSS
- **Typography:** Consistent with POS interface

---

## Pages & Routes

### `/admin` → Redirects to `/admin/add-new`

### `/admin/add-new`
- Add New Frame form
- Success confirmation with generated Frame ID
- Label creation instruction

### `/admin/manage`
- Search bar + status filter
- Frame results table
- Inline actions (Edit, Mark as Sold, Mark as Discontinued)
- Modals for confirming actions

---

## Future Scope (Phase 3+)

**Not included in Phase 2:**
- Bulk import from CSV/spreadsheet
- UPC code auto-fill (API integration)
- Auto-print labels
- User authentication
- Settings/configuration page
- Audit log viewing
- Advanced filtering (date ranges, price ranges)

**Note for Phase 3:**
When connecting to database, replace mock data with API calls to Next.js routes backed by Prisma.

---

## Success Criteria

**UI/UX Validation:**
- [x] Can add a new frame in < 2 minutes
- [x] Search finds frames by brand/model accurately
- [x] Marking frame as sold/discontinued is intuitive
- [x] Form validation prevents bad data
- [x] Mobile/iPad experience is smooth
- [ ] Client approves workflow before database work (awaiting feedback)

**Technical Completion:**
- [x] All forms have proper validation
- [x] Mock data persists during session
- [x] Responsive design tested on iPhone/iPad
- [x] Error states are clear and helpful
- [x] Success confirmations are visible
- [x] Code is clean and reusable for Phase 3

---

## Implementation Summary

**Status:** ✅ Complete (November 5, 2025)

**Completed Features:**
- [x] Admin Portal layout with responsive sidebar navigation
- [x] Add New Frame form with full validation and auto-generated 4-digit Frame IDs
- [x] Frame Lookup & Management with search/filter capabilities
- [x] Edit frame functionality
- [x] Mark frames as Sold (manual sale entry with price override)
- [x] Mark frames as Discontinued
- [x] Session-based mock data persistence
- [x] Mobile/iPad responsive design
- [x] Navigation between POS and Admin Portal

**Key Improvements Made:**
- Frame IDs formatted as 4-digit numbers (0542, 1234, 2345, 3456)
- Price input validation with automatic string-to-number conversion
- Clean white backgrounds with light blue accents
- Sidebar using flexbox layout for proper display
- POS hamburger menu navigates to Admin Portal

---

## Deliverables ✅

1. **Admin Portal UI** ✅
   - `/admin/add-new` - Add New Frame interface
   - `/admin/manage` - Frame Lookup & Management interface
   - Responsive sidebar navigation

2. **Components** ✅
   - `FrameForm.tsx` - Reusable form for add/edit
   - `FrameTable.tsx` - Table with search/filter
   - `ManualSaleModal.tsx` - Manual sale entry
   - `Sidebar.tsx` - Navigation sidebar

3. **Mock API Extensions** ✅
   - `mockAddFrame()` - Add frame with auto-generated ID
   - `mockUpdateFrame()` - Update frame details
   - `mockMarkAsSold()` - Manual sale recording
   - `mockMarkAsDiscontinued()` - Status update
   - `mockSearchFrames()` - Search/filter functionality

4. **Validation & Types** ✅
   - `admin.ts` - Zod validation schemas
   - `admin.ts` - TypeScript type definitions

---

## Next Steps

1. **Client Review** - Gather feedback on Admin Portal workflows
2. **Iterate** - Make any requested UI/UX adjustments
3. **Prepare for Phase 3** - Database setup and integration when approved

---

**Document Control:**
Version 1.1 - November 5, 2025
Owner: Kyle Shechtman
Status: Complete - Awaiting Client Feedback
