# Jazzy Eyes: Project Scope & Specifications

**Last Updated:** October 28, 2025
**Version:** 2.0
**Status:** Active Development

---

## Executive Summary

Modern, intelligent data pipeline and analytics platform for a boutique optical business. This system transforms manual tracking processes into a seamless, data-driven operation that eliminates inefficiency, unlocks business insights, and enables smarter inventory and purchasing decisions.

**Core Value Proposition:**
- Real-time sales and inventory tracking
- Data-driven purchasing recommendations
- Eliminate manual errors and inefficiency
- Transform inventory management into a strategic growth engine

---

## System Architecture Overview

The complete system consists of four integrated components:

### 1. **Label-Based Inventory System**
Physical label printer system (replacing QR codes) that tags each frame with a unique ID linked to the central database.

### 2. **Point of Sale (POS) Interface** ⭐ NEW
Simple, elegant staff-facing UI for recording frame sales at checkout with real-time confirmation.

### 3. **Admin Portal** ⭐ NEW
Simple management interface for inventory operations, data entry, and system maintenance.

### 4. **Analytics Dashboard**
Executive-facing visualization platform for business insights, performance metrics, and purchasing intelligence.

### 5. **Central Database**
Backend data store connecting all components with full audit trail and event logging.

---

## Detailed Component Specifications

---

## 1. Label-Based Inventory System

### Overview
Each pair of glasses receives a printed label with a unique Frame ID. Labels are generated from a standard label printer and affixed to frames during intake.

### Requirements
- **Label Format:** Unique alphanumeric (e.g., `FR-0001`, `0542`)
- **Printer:** Brother P-Touch label printer
- **Label Content:** Frame ID only (links back to full database record)
- **Label Trigger:** Generated automatically during new frame entry in Admin Portal
- **Database Link:** Each Frame ID maps to complete frame record in central database

### Data Schema (Frame Record)
```javascript
{
  frameId: "FR-0001",           // Unique identifier (printed on label)
  brand: "Cartier",
  model: "Santos",
  color: "Gold/Black",
  gender: "Men" | "Women" | "Unisex",
  frameType: "Optical" | "Sunglasses",
  costPrice: 450.00,
  retailPrice: 1200.00,
  dateAdded: "2025-01-15",
  status: "Active" | "Sold" | "Discontinued",
  supplier: "Safilo Group",
  notes: "Optional internal notes"
}
```

---

## 2. Point of Sale (POS) Interface ⭐ NEW COMPONENT

### Purpose
Enable staff to quickly and accurately record frame sales at the point of checkout with immediate visual confirmation.

### User Flow
1. **Sale occurs** → Staff accesses POS interface
2. **ID Entry** → Staff types or scans Frame ID from label
3. **Confirmation Screen** → System displays frame details for verification
4. **Confirm Sale** → Staff confirms, sale is recorded
5. **Success** → Visual confirmation with sale receipt details

### Key Features

#### Screen 1: ID Entry
- **Large, clear input field** for Frame ID entry
- Support for keyboard entry 
- Real-time validation (checks if ID exists in database)
- Error handling for invalid/missing IDs
- "Frame not found" helper with lookup assistance

#### Screen 2: Confirmation & Review
Display full frame details before finalizing:
```
┌─────────────────────────────────────┐
│  Confirm Sale                       │
│                                     │
│  Frame ID: FR-0542                  │
│  Brand: Tom Ford                    │
│  Model: Henry TF0248                │
│  Color: Havana Brown                │
│  Gender: Men                        │
│  Type: Sunglasses                   │
│                                     │
│  Retail Price: $485.00              │
│                                     │
│  [Cancel]  [Confirm Sale] ←         │
└─────────────────────────────────────┘
```

#### Screen 3: Sale Complete
- Visual success confirmation
- "Record Another Sale" quick action
- Return to ID entry screen

### Technical Requirements
- **Fast Load Time:** < 1 second response on Frame ID lookup
- **Mobile Responsive:** Optimized for iPhone and iPad (primary devices)
- **Simple Navigation:** Minimal clicks, touch-friendly for mobile
- **Error Recovery:** Clear guidance when frame not found
- **Audit Trail:** Log timestamp and device (no staff authentication for v1)
- **Network Requirement:** Requires internet connection (no offline mode for v1)

### Design Principles
- Clean, uncluttered interface
- Large touch targets for mobile/tablet use
- High contrast, easy-to-read typography on small screens
- Minimal training required
- Sky blue accent color (#C1F1FF) for brand consistency
- **Primary Devices:** iPhone and iPad (company-provided)

---

## 3. Admin Portal ⭐ NEW COMPONENT

### Purpose
Centralized management interface for inventory operations, data maintenance, and system administration.

### Key Sections

---

### 3.1 Add New Frames

**Purpose:** Streamlined workflow for entering new inventory and generating labels

**User Flow:**
1. Staff accesses "Add New Frame" form
2. Enters frame details (brand, model, color, prices, etc.)
3. System auto-generates next available Frame ID
4. Staff clicks "Save & Print Label"
5. System saves to database and prompts staff to create label Frame ID
6. Staff affixes printed label to physical frame
7. Frame is now active in inventory

**Form Fields:**
```
Brand:          [Dropdown: Cartier, Tom Ford, Oliver Peoples...]
Model:          [Text Input]
Color:          [Text Input]
Gender:         [Radio: Men / Women / Unisex]
Frame Type:     [Radio: Optical / Sunglasses]
Cost Price:     [$___.__]
Retail Price:   [$___.__]
Supplier:       [Text Input or Dropdown]
Notes:          [Text Area - Optional]
```

**After Submit:**
- Display generated Frame ID prominently
- Onboard staff to create label Frame ID and label frame
- Show confirmation: "Frame FR-0543 added successfully"
- Option: "Add Another Frame" or "View Frame Details"

---

### 3.2 Frame Lookup & Management

**Purpose:** Search, view, and modify frame records

**Features:**
- **Search Bar:** Search by Frame ID, Brand, Model, Color
- **Filter Options:** By status (Active/Sold/Discontinued), gender, frame type
- **Results Table:** Display matching frames with key details
- **Actions Per Frame:**
  - View full details
  - Edit information
  - Mark as Discontinued
  - Mark as Sold (if missed at POS)

**Use Cases:**
- **"I forgot to enter the Frame ID at checkout"**
  → Search for frame, manually mark as sold, backfill sale date

- **"This brand is being discontinued by supplier"**
  → Bulk select frames, mark as Discontinued status

- **"Need to update pricing on existing inventory"**
  → Search frames, edit retail price

---


### 3.3 Settings & Configuration

**Purpose:** System administration and preferences

**Potential Features:**
- Manage brand list (add/remove brands)
- System preferences

---

### 3.4 Admin Portal Access Control

**Version 1:** No authentication required (open access)
**Version 2 (Future):** Simple password protection
**Version 3 (Future):** Role-based access (Manager, Staff, View-Only)

---

## 4. Analytics Dashboard

### Purpose
Executive-facing data visualization for business intelligence and purchasing decisions.

**Detailed specifications in:** `jazzy-eyes-dashboard/IMPLEMENTATION_PLAN.md`

**Key Features:**
- KPI Summary (Revenue, Units Sold, Avg Sale, Profit Margin)
- Brand Performance Table with reorder recommendations
- Sales trends and historical analysis
- Inventory health and slow-mover alerts
- Category breakdowns (gender, frame type, price tier)

**Integration Points:**
- Reads from central database (no write access)
- Real-time or near-real-time updates
- Aggregates sales data from POS transactions
- Calculates metrics (sell-through rate, inventory turn, etc.)

---

## 5. Central Database

### Purpose
Single source of truth for all frame, sales, and operational data.

### Core Tables

#### `frames` Table
Stores all frame inventory records (see Frame Record schema above)

#### `sales` Table
Logs every transaction recorded via POS interface
```javascript
{
  saleId: "SL-0001",
  frameId: "FR-0542",
  saleDate: "2025-01-15T14:23:00Z",
  salePrice: 485.00,           // Actual sale price (may differ 
}
```

#### `audit_log` Table (Optional but Recommended)
Tracks all system changes for accountability
```javascript
{
  logId: "LOG-0001",
  timestamp: "2025-01-15T14:23:00Z",
  action: "FRAME_ADDED" | "SALE_RECORDED" | "FRAME_EDITED" | "STATUS_CHANGED",
  userId: "Staff-01",
  targetId: "FR-0542",
  details: { /* relevant change data */ }
}
```

### Database Technology
- **Selected:** PostgreSQL with Prisma ORM
- **Hosting:** Cloud-based (accessible via web app)
- **Benefits:** Type-safe queries, automatic migrations, excellent TypeScript integration

---

## Updated Project Phases

**Approach:** UI-First Development Strategy
Build and validate user interfaces with mock data to gather client feedback before investing in backend infrastructure.

---

### Phase 1: POS Interface UI Development ⭐ CURRENT PRIORITY

**Status:** UI-First Approach with Mock Data

**Deliverables:**
- Frame ID entry screen (landing page, mobile-optimized)
- Sale confirmation screen with frame details
- Manual price override functionality
- Success confirmation screen
- Complete 3-screen workflow with mock data
- Mobile optimization for iPhone and iPad
- Error handling and validation (UI-only)
- **Documentation:** See `docs/phase-1/IMPLEMENTATION_PLAN.md`

**Mock Data Strategy:**
- Hardcoded sample frames for UI testing
- Simulated API responses
- Client-side validation without database
- Enable rapid iteration based on feedback

**Timeline:** 2-3 weeks

**Goal:** Validate UI/UX with client before database design

---

### Phase 2: Admin Portal UI Development ⭐ HIGH PRIORITY

**Status:** UI-First Approach with Mock Data

**Deliverables:**
- "Add New Frame" interface with form validation
- Frame lookup and search functionality (mock data)
- Edit/update frame records (UI only)
- Mark frames as Discontinued (UI only)
- Manual sale entry interface
- Mobile-responsive design for iPad/iPhone
- Mock data integration for all CRUD operations

**Mock Data Strategy:**
- Sample inventory data for testing
- Simulated search and filter results
- Local state management (no database)

**Timeline:** 2-3 weeks

**Goal:** Complete all user-facing workflows before backend implementation

---

### Phase 3: Database Setup & Full Integration ⭐ HIGH PRIORITY

**Status:** Backend Implementation

**Deliverables:**
- Set up Prisma Postgres database (serverless PostgreSQL on AWS)
- Design and implement database schema (frames, sales, audit logs)
- Define Frame ID format and generation logic
- Create Next.js API routes for CRUD operations
- **Connect POS Interface to real database** (replace mock data)
- **Connect Admin Portal to real database** (replace mock data)
- Implement authentication/authorization
- **Data Migration:** Import existing ~1,700 frames from Google Sheets
- Deploy to Vercel with database integration

**Timeline:** 2-3 weeks

**Goal:** Replace all mock data with real database integration

---

### Phase 4: Analytics Dashboard (FINAL FEATURE PHASE)

**Status:** Data Visualization & Business Intelligence

**Deliverables:**
- Reference `jazzy-eyes-dashboard/IMPLEMENTATION_PLAN.md`
- KPI cards (revenue, units sold, profit margin, avg sale)
- Sales trends charts and historical analysis
- Brand performance table with sell-through rates
- Inventory intelligence and reorder recommendations
- Category breakdowns (gender, frame type, price tier)
- Connect to database for real-time operational data
- Deploy alongside POS/Admin on Vercel

**Timeline:** 2-3 weeks

**Note:** Dashboard development begins only after Phases 1-3 are complete and operational data is flowing.

---

### Phase 5: Testing, Refinement & Training

**Status:** Quality Assurance & Launch Preparation

**Deliverables:**
- End-to-end workflow testing (POS → Admin → Analytics)
- Cross-browser and device testing (iPhone, iPad, desktop)
- Performance optimization and load testing
- Staff training materials and documentation
- Bug fixes and UX improvements based on feedback
- User acceptance testing with staff
- Production deployment checklist
- Post-launch monitoring setup

**Timeline:** 1-2 weeks

**Goal:** Ensure system is production-ready and staff are trained

---

## Success Criteria

### Business Outcomes
✓ Staff can add new inventory in < 2 minutes per frame
✓ Sales recording at POS takes < 30 seconds per transaction
✓ Zero manual tracking or paper logs required
✓ Real-time inventory accuracy (100% database sync)
✓ Clear reorder recommendations based on sell-through data
✓ Reduction in stockouts and overstock situations

### Technical Requirements
✓ POS interface loads in < 1 second
✓ Admin Portal is intuitive with minimal training
✓ Label printer integrates seamlessly
✓ Database handles 2,000+ frame records with fast queries
✓ Analytics dashboard updates within 5 minutes of sale
✓ System is stable, secure, and backed up regularly

### User Experience
✓ Staff adoption is smooth and enthusiastic
✓ Interfaces are clean, modern, and easy to navigate
✓ Error messages are clear and actionable
✓ Mobile/tablet-friendly for counter use
✓ Consistent visual design across all components

---

## Technology Stack (CONFIRMED)

### Frontend (POS + Admin Portal + Dashboard)
- **Framework:** Next.js 14+ (React 18 + TypeScript)
- **UI Library:** shadcn/ui + Tailwind CSS
- **Charts:** Recharts (for Analytics Dashboard)
- **State Management:** React Query for API calls
- **Forms:** React Hook Form + Zod validation
- **Mobile Optimization:** Responsive design for iPhone and iPad

### Backend / API
- **Framework:** Next.js API Routes (serverless functions)
- **ORM:** Prisma (type-safe database client)
- **Database:** Prisma Postgres (serverless PostgreSQL)

### Database
- **Database:** Prisma Postgres (serverless PostgreSQL on AWS)
- **ORM:** Prisma ORM
- **Platform:** Prisma Data Platform (managed service)
- **Migration Strategy:** Import existing ~1,700 frames from Google Sheets

### Label Printing
- **Hardware:** Brother P-Touch label printer
- **Label Content:** Frame ID only (e.g., FR-0001)
- **Integration:** Browser print API or Node.js printer drivers

### Deployment
- **Platform:** Vercel (full-stack web app)
- **Environment:** Cloud-based (accessible from anywhere with internet)
- **Access:** Web app accessible via iPhone, iPad, desktop browsers
- **Authentication:** None for v1 (added in future versions)

---

## Decisions Made ✓

### ✓ Authentication & Multi-User
- **v1:** No authentication required for POS or Admin Portal
- **Future:** Simple password protection for Admin Portal

### ✓ Label Printer
- **Model:** Brother P-Touch label printer
- **Content:** Frame ID only (links back to database)
- **Connection:** TBD during Phase 4 implementation

### ✓ Deployment Model
- **Model:** Fully cloud-based web app on Vercel
- **Access:** Accessible from anywhere with internet connection
- **Devices:** Optimized for iPhone and iPad

### ✓ Database & ORM
- **Database:** Prisma Postgres (serverless PostgreSQL on AWS)
- **Platform:** Prisma Data Platform (managed service)
- **ORM:** Prisma ORM
- **Migration:** Import existing ~1,700 frames from Google Sheets

### ✓ Development Priority
- **UI-First Approach:** Build POS and Admin Portal UIs with mock data first
- **Phase 1-2:** POS Interface, Admin Portal (UI development with client feedback)
- **Phase 3:** Database setup and integration (connect UIs to real backend)
- **Phase 4:** Analytics Dashboard (AFTER operational tools are complete and data is flowing)

---

## Open Questions (To Be Determined)


### 1. A New Frame Detals
- Is there a way to pull frame information with UPC code
- I envision this like auto completing fields through a api once a UPC code is inputted
- Leads:
    - (https://devs.upcitemdb.com/?utm_source=chatgpt.com)
    - (https://devapi.barcodespider.com/plans)

### 2. Auto Print Labels
- Is there a way to autoprint label?

---

## Risk Management

### Technical Risks
- **Label printer integration complexity:** Mitigate with thorough testing and fallback manual label creation
- **Database performance at scale:** Use proper indexing, test with realistic data volumes


### Operational Risks
- **Staff adoption resistance:** Invest in training, keep UX extremely simple
- **Data migration from old system:** Plan careful import process, validate data integrity
- **Label printer hardware failure:** Keep backup printer or manual label creation process

### Business Risks
- **Scope creep:** Stick to phased rollout, resist adding features mid-development
- **Timeline delays:** Prioritize POS and Admin Portal over Analytics Dashboard

---

## Next Steps

1. **Review and approve this scope document**
2. **Make technology stack decisions** (database, hosting, label printer)
3. **Design database schema in detail**
4. **Create wireframes/mockups for POS and Admin Portal**
5. **Begin Phase 1: Database setup**
6. **Iterative development with regular stakeholder reviews**

---

## Change Log

See `docs/CHANGELOG.md` for detailed history of scope changes from original proposal.

**Major Changes from Original Proposal (v1.0):**
- Replaced QR code system with label printer approach
- Added dedicated Point of Sale (POS) interface
- Added comprehensive Admin Portal for inventory management
- Enhanced frame lookup and manual sale entry capabilities
- Updated workflow to prioritize staff-facing tools before analytics

---

**Document Control:**
Version 2.0 - October 28, 2025
Reviewed on October, 28 2025 by Kyle 
Owner: Kyle Shechtman

