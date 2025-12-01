# Phase 1: POS Interface - Implementation Plan

**Last Updated:** October 30, 2025
**Version:** 2.1
**Status:** Days 1-4 Complete ✅ | Ready for Client Demo

---

## Executive Summary

The POS (Point of Sale) Interface is the primary staff-facing application for recording frame sales at checkout. This interface serves as the **landing page/home page** of the Jazzy Eyes web application and provides a fast, mobile-optimized workflow for recording sales with visual confirmation.

**Development Approach:** UI-First with Mock Data
This phase focuses on building a fully functional UI using mock/dummy data to enable rapid client feedback and iteration before committing to database design. Database integration will occur in Phase 3.

**Key Deliverables:**
- Mobile-first POS interface optimized for iPhone and iPad
- 3-screen sale recording flow (ID Entry → Confirmation → Success)
- Mock data for UI testing and client validation
- Manual price override capability
- Comprehensive error handling and validation
- Future-ready structure for navigation to Admin Portal and Analytics Dashboard
- No database dependency - fully functional with hardcoded sample data

---

## User Flow Overview

### Primary Workflow: Recording a Sale

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Screen 1: ID Entry                                         │
│  ↓                                                          │
│  User enters Frame ID                                       │
│  ↓                                                          │
│  Real-time validation & database lookup                     │
│  ↓                                                          │
│  Screen 2: Confirmation & Review                            │
│  ↓                                                          │
│  Display frame details                                      │
│  Optional: Override price                                   │
│  ↓                                                          │
│  User confirms sale                                         │
│  ↓                                                          │
│  Screen 3: Sale Complete                                    │
│  ↓                                                          │
│  Success message + "Record Another Sale" action             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Estimated Time per Transaction:** < 30 seconds

---

## Detailed Screen Specifications

---

### Screen 1: ID Entry (Landing Page)

**Purpose:** Primary entry point for POS system and default home page of the application

#### Layout
```
┌─────────────────────────────────────────────┐
│  Jazzy Eyes POS                      [≡]    │  ← Future: Menu for Dashboard/Admin
│                                             │
│                                             │
│         [🔍 Enter Frame ID]                 │
│                                             │
│     ┌─────────────────────────────────┐     │
│     │  ID-                            │     │  ← Large input field
│     └─────────────────────────────────┘     │
│                                             │
│     Type the Frame ID from                  │
│     the label on the glasses                │
│                                             │
│                                             │
│                                             │
│     [        Find Frame        ]            │  ← Primary CTA button
│                                             │
└─────────────────────────────────────────────┘
```

#### Features
- **Large, Touch-Friendly Input Field**
  - Auto-focus on page load
  - Minimum 18px font size for mobile readability
  - Supports keyboard 
  - Clear button to reset input

- **Real-Time Validation**
  - Check Frame ID format (e.g., XXXX pattern)

- **Future Navigation Element**
  - Hamburger menu icon (≡) in top-right corner
  - For v1: Non-functional placeholder
  - For v2+: Opens menu to access Admin Portal and Analytics Dashboard

#### Error States
- **Invalid Format:** "Please enter a valid Frame ID (e.g., 0542)"
- **Empty Input:** "Frame ID is required"
- **Network Error:** "Unable to connect. Please check your internet connection."

#### Technical Requirements
- Component: `POSLanding.tsx` or `FrameIdEntry.tsx`
- Form validation: React Hook Form + Zod schema
- Auto-focus input field on mount
- Enter key triggers search
- Mobile-optimized keyboard (uppercase, numeric)

---

### Screen 2: Confirmation & Review

**Purpose:** Display frame details for visual verification before recording sale

#### Layout
```
┌─────────────────────────────────────────────┐
│  ← Back                                     │
│                                             │
│  Confirm Sale                               │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │  Frame ID: 0542                     │   │
│  │  Brand: Tom Ford                    │   │
│  │  Model: Henry TF0248                │   │
│  │  Color: Havana Brown                │   │
│  │  Gender: Men                        │   │
│  │  Type: Sunglasses                   │   │
│  │                                     │   │
│  │  Retail Price: $485.00              │   │
│  │                                     │   │
│  │  ☐ Override price                   │   │  ← NEW FEATURE
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│                                             │
│  [    Cancel    ]  [  Confirm Sale  ]      │  ← Confirm button is primary action
│                                             │
└─────────────────────────────────────────────┘
```

#### Features

**Frame Details Display**
- Clean, card-based layout with all frame information
- High contrast text for easy readability
- Large font sizes (16px minimum for body text)
- Clear hierarchy (Frame ID and Brand most prominent)

**Manual Price Override** ⭐ NEW
- Checkbox: "Override price"
- When checked, reveals price input field:
  ```
  ☑ Override price
  Sale Price: [$___.__]
  Original Price: $485.00 (shown as reference)
  ```
- Validation:
  - Must be positive number
  - Must be > $0.00
  - Confirmation modal: "Override price to $XXX.XX? Original: $485.00"

**Action Buttons**
- **Cancel:** Returns to ID Entry screen (no changes saved)
- **Confirm Sale:** Primary action button
  - Large, prominent button
  - Sky blue (#C1F1FF) accent color
  - Disabled state while processing

#### Error States
- **Frame Not Found:**
  ```
  Frame ID "0542" not found

  This frame may not exist in the system.

  [Try Again]  [Find Frame] <- Same as on home screen
  ```
- **Frame Already Sold:**
  ```
  Frame Already Sold

  This frame was sold on Jan 15, 2025

  [View Details]  [Back to Search]
  ```
- **Frame Discontinued:**
  ```
  Frame Discontinued

  This frame has been marked as discontinued.
  Do you want to proceed with the sale?

  [Cancel]  [Sell Anyway]
  ```

#### Technical Requirements
- Component: `SaleConfirmation.tsx`
- Fetch frame data via API: `GET /api/frames/:frameId`
- Loading state while fetching (skeleton UI or spinner)
- Optimistic UI updates for price override
- Form validation for price override field

---

### Screen 3: Sale Complete

**Purpose:** Confirm successful sale recording and provide next action

#### Layout
```
┌─────────────────────────────────────────────┐
│                                             │
│              ✓                              │
│        Sale Recorded                        │
│                                             │
│                                             │
│  Frame ID: 0542                          │
│  Brand: Tom Ford                            │
│  Sale Price: $485.00                        │
│  Date: Jan 15, 2025 at 2:23 PM              │
│                                             │
│                                             │
│                                             │
│  [   Record Another Sale   ]                │  ← Primary CTA
│                                             │
│                                             │  
│                                             │
└─────────────────────────────────────────────┘
```

#### Features
- **Success Confirmation**
  - Clear "Sale Recorded" message
  - Sale summary (Frame ID, Brand, Price, Timestamp)

- **Quick Actions**
  - **Record Another Sale:** Returns to Screen 1 (ID Entry)
    - Primary action, most common next step
    - Clears previous form state


#### Technical Requirements
- Component: `SaleSuccess.tsx`
- Display sale confirmation data from API response
- Clear form state on "Record Another Sale"

---

## Technical Architecture

### Component Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page (Screen 1: ID Entry)
│   ├── pos/
│   │   ├── confirm/
│   │   │   └── page.tsx            # Screen 2: Confirmation
│   │   └── success/
│   │       └── page.tsx            # Screen 3: Success
│   └── layout.tsx                  # Root layout
│
├── components/
│   ├── pos/
│   │   ├── FrameIdInput.tsx        # ID entry input field + validation
│   │   ├── FrameDetailsCard.tsx    # Display frame info
│   │   ├── PriceOverrideInput.tsx  # Manual price override component
│   │   ├── SaleConfirmButton.tsx   # Confirm sale CTA
│   │   └── ErrorMessage.tsx        # Error display component
│   │
│   └── ui/                         # shadcn/ui components
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       └── alert.tsx
│
├── lib/
│   ├── data/                       # Mock data for Phase 1
│   │   ├── mockFrames.ts           # Sample frame data
│   │   └── mockApi.ts              # Mock API functions
│   ├── validations/
│   │   └── pos.ts                  # Zod schemas for POS forms
│   ├── api-client.ts               # API wrapper (Phase 3)
│   └── utils.ts                    # Utility functions
│
└── types/
    └── pos.ts                      # TypeScript types for POS
```

---

### Mock Data Strategy for Phase 1

**Objective:** Build fully functional UI without database dependency to enable rapid iteration and client feedback.

#### Mock Data Implementation

**1. Sample Frame Data**
Create a hardcoded collection of sample frames in `lib/data/mockFrames.ts`:

```typescript
// lib/data/mockFrames.ts
export const MOCK_FRAMES = [
  {
    frameId: "0542",
    brand: "Tom Ford",
    model: "Henry TF0248",
    color: "Havana Brown",
    gender: "Men",
    frameType: "Sunglasses",
    costPrice: 285.00,
    retailPrice: 485.00,
    status: "Active",
    dateAdded: "2025-01-10T12:00:00Z",
    supplier: "Safilo Group",
    notes: null
  },
  {
    frameId: "1234",
    brand: "Cartier",
    model: "Santos",
    color: "Gold/Black",
    gender: "Men",
    frameType: "Optical",
    costPrice: 450.00,
    retailPrice: 1200.00,
    status: "Active",
    dateAdded: "2025-01-15T12:00:00Z",
    supplier: "Richemont",
    notes: "Limited edition"
  },
  {
    frameId: "5678",
    brand: "Oliver Peoples",
    model: "Gregory Peck",
    color: "Tortoise",
    gender: "Unisex",
    frameType: "Optical",
    costPrice: 195.00,
    retailPrice: 415.00,
    status: "Active",
    dateAdded: "2025-01-12T12:00:00Z",
    supplier: "Luxottica",
    notes: null
  },
  {
    frameId: "9999",
    brand: "Ray-Ban",
    model: "Wayfarer",
    color: "Black",
    gender: "Unisex",
    frameType: "Sunglasses",
    costPrice: 85.00,
    retailPrice: 185.00,
    status: "Sold",
    dateAdded: "2025-01-08T12:00:00Z",
    supplier: "Luxottica",
    notes: null
  }
];
```

**2. Mock API Functions**
Create simulated API functions that return mock data with realistic delays:

```typescript
// lib/data/mockApi.ts
import { MOCK_FRAMES } from './mockFrames';

export async function mockGetFrame(frameId: string): Promise<Frame | null> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Find frame by ID (case-insensitive)
  const frame = MOCK_FRAMES.find(
    f => f.frameId.toLowerCase() === frameId.toLowerCase()
  );

  if (!frame) {
    throw new Error('Frame not found');
  }

  return frame;
}

export async function mockRecordSale(
  frameId: string,
  salePrice?: number
): Promise<SaleResponse> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const frame = MOCK_FRAMES.find(f => f.frameId === frameId);

  if (!frame) {
    throw new Error('Frame not found');
  }

  if (frame.status === 'Sold') {
    throw new Error('Frame already sold');
  }

  // Simulate successful sale recording
  const saleId = `SL-${Date.now()}`;

  return {
    saleId,
    frameId: frame.frameId,
    salePrice: salePrice || frame.retailPrice,
    salePriceOverride: salePrice !== undefined && salePrice !== frame.retailPrice,
    saleDate: new Date().toISOString(),
    frame: {
      brand: frame.brand,
      model: frame.model
    }
  };
}
```

**3. Component Integration**
Use mock functions in components exactly as you would real API calls:

```typescript
// In your component
import { mockGetFrame, mockRecordSale } from '@/lib/data/mockApi';

// Later replace with:
// import { getFrame, recordSale } from '@/lib/api/frames';

// Usage is identical
const frame = await mockGetFrame(frameId);
```

**4. Transition Strategy to Real Database**
- Mock functions use identical type signatures to real API
- When Phase 3 begins, simply swap import statements
- All component logic remains unchanged
- Zero refactoring required for database integration

#### Benefits of Mock Data Approach

✓ **Rapid Development:** No database setup delays
✓ **Client Feedback:** Deploy UI immediately for review
✓ **Parallel Work:** Database schema can be designed based on UI needs
✓ **Risk Reduction:** Validate UX before committing to backend
✓ **Easy Testing:** Predictable data for QA and demos
✓ **Clean Transition:** Swap imports when ready for database

---


## UI/UX Design Specifications

### Design System

#### Color Palette
- **Primary Brand Color:** Tailwind white
- **Success:** Green (#10B981)
- **Error:** Red (#EF4444)
- **Warning:** Yellow (#F59E0B)
- **Neutral:** Sky Blue (#C1F1FF)

#### Typography
- **Font Family:** Inter (system font fallback)
- **Heading 1:** 32px, bold (Page titles)
- **Heading 2:** 24px, semi-bold (Section titles)
- **Body:** 16px, regular (Main text)
- **Label:** 14px, medium (Form labels)
- **Caption:** 12px, regular (Helper text)

#### Spacing
- **Base Unit:** 4px (Tailwind spacing scale)
- **Card Padding:** 24px (p-6)
- **Input Height:** 48px (h-12) - Touch-friendly
- **Button Height:** 48px minimum
- **Screen Padding:** 16px mobile, 24px desktop

#### Buttons
- **Primary:** White background
- **Secondary:** Sky blue background
- **Focus State:** 2px sky blue ring

#### Cards
- **Border:** 1px solid gray-200
- **Border Radius:** 8px (rounded-lg)
- **Shadow:** Subtle drop shadow (shadow-sm)
- **Padding:** 24px

### Mobile Optimization

#### Responsive Breakpoints
```css
/* Mobile First Approach */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

#### Touch Targets
- **Minimum Size:** 44px x 44px (Apple HIG recommendation)
- **Preferred Size:** 48px x 48px
- **Spacing Between:** 8px minimum

#### iPhone/iPad Specific
- **Safe Areas:** Account for notch on iPhone X+ models
- **Keyboard Behavior:** Input fields scroll into view when keyboard appears
- **Auto-Zoom Prevention:** `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">`

#### Performance Targets
- **First Contentful Paint:** < 1.5 seconds
- **Time to Interactive:** < 2.5 seconds
- **Lighthouse Score:** > 90 for Performance and Accessibility

---

## Error Handling Strategy

### Error Categories

#### 1. Validation Errors (Client-Side)
**Examples:**
- Invalid Frame ID format
- Empty required fields
- Invalid price format

**Handling:**
- Display inline error messages below input fields
- Red border on invalid inputs
- Prevent form submission until valid
- Clear, actionable error messages

#### 2. Network Errors
**Examples:**
- Unable to connect to server
- Request timeout
- Server unreachable

**Handling:**
- Display prominent error banner at top of screen
- Provide "Retry" action button
- Auto-retry with exponential backoff (React Query)
- Offline detection with clear messaging

#### 3. Business Logic Errors
**Examples:**
- Frame not found
- Frame already sold
- Frame discontinued

**Handling:**
- Display contextual error message in card format
- Provide relevant next actions (e.g., "Search Again", "Add New Frame")
- Log error for debugging
- Consider modal dialog for critical errors

#### 4. Server Errors (5xx)
**Examples:**
- Database connection failure
- Internal server error
- API endpoint unavailable

**Handling:**
- Generic user-friendly message: "Something went wrong. Please try again."
- Log full error details to console/monitoring service
- Provide "Contact Support" option
- Auto-retry for transient failures

### Error Message Examples

```typescript
const ERROR_MESSAGES = {
  // Validation
  INVALID_FRAME_ID: 'Please enter a valid Frame ID (e.g., FR-0542)',
  REQUIRED_FIELD: 'This field is required',
  INVALID_PRICE: 'Please enter a valid price greater than $0',

  // Not Found
  FRAME_NOT_FOUND: 'Frame not found. Please check the Frame ID and try again.',

  // Business Logic
  FRAME_ALREADY_SOLD: (date: string) =>
    `This frame was already sold on ${date}. Please verify the Frame ID.`,
  FRAME_DISCONTINUED:
    'This frame has been discontinued. Do you want to proceed with the sale?',

  // Network
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection and try again.',
  SERVER_ERROR: 'Something went wrong. Please try again in a moment.',
  TIMEOUT: 'Request timed out. Please check your connection and try again.',
};
```

---

## Testing Strategy

### Unit Tests

**Test Coverage for:**
- Form validation logic (Zod schemas)
- Price override calculations
- Frame ID formatting/normalization
- Utility functions

**Tools:** Vitest + React Testing Library

**Example Test Cases:**
```typescript
describe('Frame ID Validation', () => {
  it('accepts valid frame ID format', () => {
    expect(frameIdSchema.parse('FR-0542')).toBe('FR-0542');
  });

  it('converts lowercase to uppercase', () => {
    expect(frameIdSchema.parse('fr-0542')).toBe('FR-0542');
  });

  it('rejects invalid formats', () => {
    expect(() => frameIdSchema.parse('0542')).toThrow();
    expect(() => frameIdSchema.parse('FR-ABC')).toThrow();
  });
});
```

### Integration Tests

**Test Coverage for:**
- Complete sale recording flow (ID Entry → Confirm → Success)
- API endpoint interactions (mocked)
- Error state handling
- Price override workflow

**Example Test Scenarios:**
```typescript
describe('POS Sale Recording Flow', () => {
  it('successfully records a sale with default price', async () => {
    // 1. Enter Frame ID
    // 2. Verify frame details display
    // 3. Confirm sale
    // 4. Verify success message
  });

  it('successfully records a sale with price override', async () => {
    // 1. Enter Frame ID
    // 2. Check "Override price"
    // 3. Enter custom price
    // 4. Confirm sale
    // 5. Verify override price is saved
  });

  it('displays error when frame not found', async () => {
    // 1. Enter invalid Frame ID
    // 2. Verify error message displays
    // 3. Verify CTA to try again
  });
});
```

### Manual Testing Checklist

**Device Testing:**
- [ ] iPhone SE (small screen)
- [ ] iPhone 14 Pro (notch)
- [ ] iPad Air (tablet)
- [ ] Safari browser (primary)
- [ ] Chrome browser (secondary)

**User Flow Testing:**
- [ ] Complete sale with default price
- [ ] Complete sale with price override
- [ ] Handle invalid Frame ID
- [ ] Handle frame not found
- [ ] Handle frame already sold
- [ ] Handle network error
- [ ] Test keyboard navigation
- [ ] Test form validation
- [ ] Test back button behavior
- [ ] Test auto-redirect (if implemented)

**Performance Testing:**
- [ ] Frame lookup < 1 second
- [ ] Sale recording < 2 seconds
- [ ] Page loads quickly on 3G network
- [ ] No layout shift during loading
- [ ] Smooth animations and transitions

---

## Implementation Timeline

**Status:** Days 1-4 Complete ✅ | Ready for Client Demo

**Completed:** All 3 screens (ID Entry, Confirmation, Success) with full mock data integration
**Next:** Day 5 - Testing & refinement, then client feedback session

---

### Week 1: Foundation & Screen 1 (3-4 days) ✅ COMPLETE

**Day 1-2: Setup & Core Components**
- [x] Set up Next.js routes (/, /pos/confirm, /pos/success)
- [x] Create component structure
- [x] Install dependencies (React Hook Form, Zod, shadcn/ui)
- [x] Set up Tailwind config with custom colors
- [x] Create basic layout with future navigation placeholder
- [x] **Create mock data files** (`lib/data/mockFrames.ts`, `lib/data/mockApi.ts`)

**Day 3-4: Screen 1 - ID Entry**
- [x] Build `FrameIdInput` component with validation
- [x] Implement form handling with React Hook Form
- [x] Create Zod schema for Frame ID validation
- [x] Add loading states and error handling
- [x] Mobile optimization and touch target sizing
- [ ] Write unit tests for validation logic

### Week 2: Screens 2 & 3 with Mock Data (4-5 days) ✅ MOSTLY COMPLETE

**Day 1-2: Screen 2 - Confirmation**
- [x] Build `FrameDetailsCard` component
- [x] **Integrate mock frame fetching function** (no API needed)
- [x] Add loading skeleton UI (simulate network delay)
- [x] Handle error states (not found, already sold, discontinued)
- [ ] Build `PriceOverrideInput` component (deferred to next iteration)
- [ ] Implement price override logic and validation (deferred to next iteration)
- [ ] Add confirmation modal for large price deviations (not needed without override)
- [ ] Write integration tests for confirmation flow

**Day 3-4: Screen 3 - Success & Sale Recording**
- [x] Build `SaleSuccess` component
- [x] **Integrate mock sale recording function** (no API needed)
- [x] Add success confirmation UI
- [x] Implement "Record Another Sale" flow (reset state)


**Day 5: Testing & Refinement**
- [ ] End-to-end testing on iPhone and iPad
- [ ] Test all error scenarios with mock data
- [ ] Performance optimization
- [ ] Fix any bugs or UX issues
- [ ] Accessibility audit (keyboard navigation, screen reader)
- [ ] **Prepare client demo with sample data**

### Week 3: Polish, Documentation & Client Feedback (2-3 days)


**Documentation:**
- [ ] Component documentation (inline comments)
- [ ] Mock data structure documentation
- [ ] User guide for staff (simple one-pager for demo)
- [ ] Developer README for POS module
- [ ] **Transition guide for Phase 3** (how to swap mock data for real API)

---


## Future Enhancements (Post-Phase 1)

### Phase 2: Admin Portal UI
- Build Admin Portal with mock data (similar approach to POS)
- Add new frame interface
- Frame search and lookup
- Edit frame records interface
- Mock data for all CRUD operations

### Phase 3: Database Integration
- Set up Prisma Postgres database
- Implement API endpoints (`/api/frames/:id`, `/api/sales`)
- **Replace mock data imports with real API calls**
- Add functional navigation between POS, Admin, and Dashboard
- Implement authentication/password protection
- Import existing ~1,700 frames from Google Sheets

### Phase 4: Analytics Dashboard
- Build KPI cards and charts
- Connect to real database for operational data

---

## Dependencies & Prerequisites

### External Dependencies (Phase 1)
**No database or backend required!** This phase focuses on UI-only development.

- ✅ Next.js project setup
- ✅ Vercel deployment (optional for client demos)
- ❌ No database needed (using mock data)
- ❌ No API endpoints needed (using mock functions)
- ❌ No authentication needed

### External Dependencies (Phase 3 - Future)
- Prisma Postgres database setup
- API endpoints `/api/frames/:id` and `/api/sales` implemented
- Database schema with `frames` and `sales` tables
- Authentication/authorization configured

### Technical Stack
- Next.js 14+ (App Router)
- React 18+
- TypeScript 5+
- Tailwind CSS 3+
- shadcn/ui components
- React Hook Form
- Zod validation
- ~~React Query (TanStack Query)~~ - Not needed for Phase 1 (mock data is synchronous)

---

---

## Appendix A: Wireframes

### Screen Flow Diagram

```
     ┌──────────────────┐
     │   Landing Page   │
     │  (POS Home)      │
     │                  │
     │  Enter Frame ID  │
     └────────┬─────────┘
              │
              ▼
     ┌──────────────────┐
     │   Frame Lookup   │ ──────► [Error: Not Found]
     │   (API Call)     │ ──────► [Error: Network]
     └────────┬─────────┘
              │
              ▼
     ┌──────────────────┐
     │  Confirmation    │
     │                  │
     │  Display Frame   │
     │  Details         │
     │                  │
     │  ☐ Override Price│ ◄────┐
     │                  │      │ (Optional)
     │  [Confirm Sale]  │      │
     └────────┬─────────┘      │
              │                │
              ▼                │
     ┌──────────────────┐      │
     │  Record Sale     │      │
     │  (API Call)      │ ─────┘
     └────────┬─────────┘
              │
              ▼
     ┌──────────────────┐
     │  Sale Complete   │
     │                  │
     │  ✓ Success!      │
     │                  │
     │  [Record Another]│
     └────────┬─────────┘
              │
              ▼
     (Return to Landing Page)
```

---

## Appendix B: Sample Data Structures

### Frame Object (TypeScript)
```typescript
interface Frame {
  frameId: string;          // "FR-0542"
  brand: string;            // "Tom Ford"
  model: string;            // "Henry TF0248"
  color: string;            // "Havana Brown"
  gender: "Men" | "Women" | "Unisex";
  frameType: "Optical" | "Sunglasses";
  costPrice: number;        // 285.00
  retailPrice: number;      // 485.00
  status: "Active" | "Sold" | "Discontinued";
  dateAdded: string;        // ISO 8601 timestamp
  supplier: string;         // "Safilo Group"
  notes: string | null;     // Optional internal notes
}
```

### Sale Object (TypeScript)
```typescript
interface Sale {
  saleId: string;           // "SL-0001"
  frameId: string;          // "FR-0542"
  salePrice: number;        // 485.00 (or overridden price)
  salePriceOverride: boolean; // true if price was manually changed
  saleDate: string;         // ISO 8601 timestamp
  originalRetailPrice?: number; // Optional: for tracking overrides
}
```

### Sale Recording Request (TypeScript)
```typescript
interface SaleRequest {
  frameId: string;          // Required
  salePrice?: number;       // Optional: defaults to frame.retailPrice
  salePriceOverride?: boolean; // Optional: defaults to false
  timestamp?: string;       // Optional: defaults to now()
}
```

---

## Appendix C: File Structure

```
jazzy-eyes-dashboard/
├── app/
│   ├── page.tsx                          # Screen 1: POS Landing / ID Entry
│   ├── pos/
│   │   ├── confirm/
│   │   │   └── page.tsx                  # Screen 2: Confirmation & Review
│   │   └── success/
│   │       └── page.tsx                  # Screen 3: Sale Complete
│   ├── layout.tsx                        # Root layout with future nav
│   └── globals.css                       # Global styles
│
├── components/
│   ├── pos/
│   │   ├── FrameIdInput.tsx              # Frame ID input + validation
│   │   ├── FrameDetailsCard.tsx          # Display frame information
│   │   ├── PriceOverrideInput.tsx        # Manual price override UI
│   │   ├── SaleConfirmButton.tsx         # Confirm sale CTA
│   │   ├── SaleSuccessMessage.tsx        # Success confirmation UI
│   │   ├── ErrorMessage.tsx              # Reusable error display
│   │   └── LoadingSkeleton.tsx           # Loading state UI
│   │
│   └── ui/                               # shadcn/ui components
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       ├── alert.tsx
│       └── ... (other shadcn components)
│
├── lib/
│   ├── validations/
│   │   └── pos.ts                        # Zod validation schemas
│   ├── api/
│   │   ├── frames.ts                     # Frame API functions
│   │   └── sales.ts                      # Sale API functions
│   ├── hooks/
│   │   ├── useFrame.ts                   # React Query hook for frames
│   │   └── useSale.ts                    # React Query hook for sales
│   └── utils.ts                          # Utility functions
│
├── types/
│   └── pos.ts                            # TypeScript type definitions
│
└── __tests__/
    ├── unit/
    │   └── validations.test.ts           # Unit tests for validation
    └── integration/
        └── pos-flow.test.tsx             # Integration tests for POS flow
```

---

## Implementation Notes (October 30, 2025)

### What Was Built

**Completed Components:**
- ✅ All 3 POS screens (ID Entry, Confirmation, Success)
- ✅ Mock data system with 4 sample frames
- ✅ Mock API functions with realistic delays
- ✅ Form validation with React Hook Form + Zod
- ✅ Error handling for all edge cases
- ✅ Mobile-first responsive design
- ✅ shadcn/ui-style components (Button, Input, Alert)
- ✅ Complete user flow from entry to success

**Project Structure:**
- Built using Vite + React Router (adapted from Next.js specification)
- All functionality matches Next.js App Router behavior
- Located in: `/Users/kyleshechtman/Desktop/Jazzy Eyes/jazzy-eyes-dashboard/`

**Test Frame IDs:**
- `0542` - Tom Ford Sunglasses ($485) ✓
- `1234` - Cartier Optical ($1,200) ✓
- `5678` - Oliver Peoples ($415) ✓
- `9999` - Ray-Ban (Already Sold) - Error test ⚠️
- `0000` - Not Found - Error test ⚠️

**Deferred to Next Iteration:**
- Price override functionality
- Unit/integration tests
- Auto-redirect timer on success page

**Dev Server:** Running on http://localhost:5173/

### Next Steps
1. Client demo and feedback collection
2. Implement price override feature (if needed)
3. Testing and refinement (Day 5)
4. Polish and prepare final demo (Week 3)

---

## Document Control

**Version:** 2.1
**Last Updated:** October 30, 2025
**Author:** Kyle Shechtman
**Status:** In Progress - Days 1-4 Complete ✅
**Next Review:** After client feedback session

**Change Log:**
- v2.1 (2025-10-30): Days 1-4 implementation complete - all 3 screens working with mock data
- v2.0 (2025-10-30): Updated to Phase 1 with UI-first mock data approach
- v1.0 (2025-10-30): Initial implementation plan created

---

**Related Documents:**
- [PROJECT_SCOPE.md](../../PROJECT_SCOPE.md) - Overall project specifications
- [CHANGELOG.md](../CHANGELOG.md) - Project version history
- Phase 1: Database Setup (TBD)
- Phase 2: Admin Portal (TBD)

---
