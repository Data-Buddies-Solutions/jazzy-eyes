# Jazzy Eyes - Optical Inventory & Analytics Platform

Modern, intelligent data pipeline and analytics system for boutique optical businesses.

---

## Project Overview

Jazzy Eyes transforms manual inventory tracking into a seamless, data-driven operation. The platform provides real-time sales tracking, inventory management, and business intelligence for optical retailers.

**Core Features:**
- 📱 Mobile-optimized Point of Sale (POS) interface
- 🏷️ Label-based inventory system (Brother P-Touch integration)
- ⚙️ Admin portal for inventory management
- 📊 Analytics dashboard for business insights
- 🗄️ Centralized PostgreSQL database with Prisma ORM

---

## Current Status

**Version:** 2.1
**Phase:** Phase 1 & 2 Complete ✅
**Status:** Ready for Client Feedback
**Next Step:** Client review → Phase 3 (Database Integration)

### What's Been Completed

**Phase 1: POS Interface** ✅
- Frame ID lookup and search
- Sale confirmation with frame details
- Success confirmation screen
- Mobile-optimized for iPhone/iPad
- Navigation to Admin Portal via hamburger menu

**Phase 2: Admin Portal** ✅
- Add new frames with auto-generated 4-digit Frame IDs
- Search and manage inventory (by brand/model, filter by status)
- Edit frame details
- Manual sale entry with price override
- Mark frames as discontinued
- Responsive sidebar navigation

**Mock Data:** All features working with session-based persistence (4 sample frames)

---

## Documentation

### Primary Documents
- **[docs/phase-0/PROJECT_SCOPE.md](docs/phase-0/PROJECT_SCOPE.md)** - Complete project specifications (⭐ START HERE)
- **[docs/CHANGELOG.md](docs/CHANGELOG.md)** - Version history and scope changes
- **[docs/PROPOSAL_v1_ORIGINAL.md](docs/PROPOSAL_v1_ORIGINAL.md)** - Original proposal (archived)

### Implementation Plans
- **[docs/phase-1/IMPLEMENTATION_PLAN.md](docs/phase-1/IMPLEMENTATION_PLAN.md)** - POS Interface specifications (Phase 1)
- **[docs/phase-2/IMPLEMENTATION_PLAN.md](docs/phase-2/IMPLEMENTATION_PLAN.md)** - Admin Portal specifications (Phase 2)
- **[jazzy-eyes-dashboard/IMPLEMENTATION_PLAN.md](jazzy-eyes-dashboard/IMPLEMENTATION_PLAN.md)** - Analytics dashboard specifications (Phase 4)

---

## Project Structure

```
Jazzy Eyes/
├── .claude/                          # Claude Code configuration
├── docs/                             # Project documentation
│   ├── phase-0/
│   │   ├── PROJECT_SCOPE.md          # ⭐ Complete project specifications (START HERE)
│   │   └── PROPOSAL_v1_ORIGINAL.md   # Original proposal (archived)
│   ├── phase-1/
│   │   └── IMPLEMENTATION_PLAN.md    # POS Interface specifications
│   ├── phase-2/
│   │   └── IMPLEMENTATION_PLAN.md    # Admin Portal specifications
│   └── CHANGELOG.md                  # Version history and scope changes
│
├── jazzy-eyes-dashboard/             # Main application (Next.js 15 + React 19)
│   ├── .next/                        # Next.js build output (gitignored)
│   ├── app/                          # App Router directory
│   │   ├── layout.tsx                # Root layout with fonts & metadata
│   │   ├── page.tsx                  # Home page (POS IdEntry)
│   │   ├── globals.css               # Global styles (Tailwind)
│   │   ├── admin/                    # Admin Portal routes
│   │   │   ├── layout.tsx            # Admin layout with sidebar
│   │   │   ├── page.tsx              # Admin home (redirects to add-new)
│   │   │   ├── add-new/page.tsx      # Add new frame page
│   │   │   └── manage/page.tsx       # Manage inventory page
│   │   ├── pos/
│   │   │   ├── confirm/page.tsx      # Sale confirmation page
│   │   │   └── success/page.tsx      # Success confirmation page
│   │   └── dashboard/page.tsx        # Analytics dashboard
│   ├── public/                       # Static assets
│   ├── src/                          # Source code
│   │   ├── assets/                   # Images, fonts, etc.
│   │   ├── components/               # React components
│   │   │   ├── admin/                # Admin Portal components
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── FrameForm.tsx
│   │   │   │   ├── FrameTable.tsx
│   │   │   │   └── ManualSaleModal.tsx
│   │   │   ├── dashboard/            # Analytics dashboard components
│   │   │   │   ├── BrandPerformanceTable.tsx
│   │   │   │   ├── CategoryBreakdown.tsx
│   │   │   │   ├── InventoryAlerts.tsx
│   │   │   │   ├── KPICard.tsx
│   │   │   │   └── SalesTrendChart.tsx
│   │   │   ├── pos/                  # POS interface components
│   │   │   │   ├── ErrorMessage.tsx
│   │   │   │   └── FrameIdInput.tsx
│   │   │   └── ui/                   # Reusable UI components (shadcn/ui)
│   │   │       ├── alert.tsx
│   │   │       ├── badge.tsx
│   │   │       ├── button.tsx
│   │   │       ├── dialog.tsx
│   │   │       ├── input.tsx
│   │   │       ├── label.tsx
│   │   │       ├── radio-group.tsx
│   │   │       ├── select.tsx
│   │   │       ├── table.tsx
│   │   │       └── textarea.tsx
│   │   ├── data/                     # Mock data (Phase 1 & 2)
│   │   │   ├── brands.ts             # Brand configuration
│   │   │   ├── mockApi.ts            # Mock API with CRUD operations
│   │   │   ├── mockData.ts           # Mock analytics data
│   │   │   └── mockFrames.ts         # Mock frame inventory
│   │   ├── lib/                      # Utility functions
│   │   │   ├── validations/          # Form validation schemas
│   │   │   │   ├── admin.ts          # Admin validation (Zod)
│   │   │   │   └── pos.ts            # POS validation (Zod)
│   │   │   ├── calculations.ts       # Business logic calculations
│   │   │   └── utils.ts              # Helper functions
│   │   ├── pages/                    # Page components
│   │   │   ├── pos/                  # POS flow pages
│   │   │   │   ├── IdEntry.tsx       # Frame ID entry (landing page)
│   │   │   │   ├── Confirm.tsx       # Sale confirmation
│   │   │   │   └── Success.tsx       # Success confirmation
│   │   │   └── Dashboard.tsx         # Analytics dashboard
│   │   ├── types/                    # TypeScript type definitions
│   │   │   ├── admin.ts              # Admin-specific types
│   │   │   ├── index.ts              # General types
│   │   │   └── pos.ts                # POS-specific types
│   │
│   ├── .gitignore                    # Git ignore rules
│   ├── IMPLEMENTATION_PLAN.md        # Dashboard implementation specs
│   ├── next.config.js                # Next.js configuration
│   ├── package.json                  # Dependencies and scripts
│   ├── postcss.config.js             # PostCSS configuration
│   ├── README.md                     # Dashboard-specific README
│   ├── tailwind.config.js            # Tailwind CSS configuration
│   └── tsconfig.json                 # TypeScript configuration
│
└── README.md                         # ⭐ This file - Project overview
```

### Key Files Reference

**Documentation (Start Here)**
- `docs/phase-0/PROJECT_SCOPE.md` - Complete project specifications
- `docs/CHANGELOG.md` - Version history and evolution
- `docs/phase-1/IMPLEMENTATION_PLAN.md` - POS interface specifications
- `docs/phase-2/IMPLEMENTATION_PLAN.md` - Admin Portal specifications

**Application Code - POS Interface**
- `jazzy-eyes-dashboard/app/page.tsx` - POS landing page (Jazzy Eyes Frame Look Up)
- `jazzy-eyes-dashboard/app/pos/confirm/page.tsx` - Sale confirmation page
- `jazzy-eyes-dashboard/app/pos/success/page.tsx` - Success page

**Application Code - Admin Portal**
- `jazzy-eyes-dashboard/app/admin/layout.tsx` - Admin layout with sidebar
- `jazzy-eyes-dashboard/app/admin/add-new/page.tsx` - Add new frame page
- `jazzy-eyes-dashboard/app/admin/manage/page.tsx` - Manage inventory page
- `jazzy-eyes-dashboard/src/components/admin/FrameForm.tsx` - Reusable frame form
- `jazzy-eyes-dashboard/src/components/admin/FrameTable.tsx` - Inventory table
- `jazzy-eyes-dashboard/src/components/admin/ManualSaleModal.tsx` - Manual sale modal

**Application Code - Analytics Dashboard**
- `jazzy-eyes-dashboard/app/dashboard/page.tsx` - Analytics dashboard

**Mock Data**
- `jazzy-eyes-dashboard/src/data/mockFrames.ts` - Sample frame inventory
- `jazzy-eyes-dashboard/src/data/mockApi.ts` - Mock API with CRUD operations
- `jazzy-eyes-dashboard/src/data/mockData.ts` - Analytics mock data

**Type Definitions**
- `jazzy-eyes-dashboard/src/types/admin.ts` - Admin types
- `jazzy-eyes-dashboard/src/types/pos.ts` - POS types (Frame, Transaction)
- `jazzy-eyes-dashboard/src/types/index.ts` - General types

**Configuration**
- `jazzy-eyes-dashboard/next.config.js` - Next.js configuration
- `jazzy-eyes-dashboard/tailwind.config.js` - Color theme and styling
- `jazzy-eyes-dashboard/tsconfig.json` - TypeScript configuration
- `jazzy-eyes-dashboard/package.json` - Dependencies and scripts

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Web Application                   │
│                    (Next.js + Vercel)               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐   │
│  │     POS      │  │    Admin     │  │Analytics │   │
│  │  Interface   │  │   Portal     │  │Dashboard │   │
│  │ (iPhone/iPad)│  │  (Manage)    │  │(Insights)│   │
│  └──────────────┘  └──────────────┘  └──────────┘   │
│                                                     │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
        ┌─────────────────────────┐
        │   Prisma Postgres       │
        │   (Serverless Database) │
        │   + Prisma ORM          │
        │   on AWS Infrastructure │
        └─────────────────────────┘
    
```

---

## Technology Stack

### Frontend
- **Framework:** Next.js 15 (React 19 + TypeScript)
- **Routing:** App Router (file-based routing)
- **UI Library:** shadcn/ui + Tailwind CSS
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod validation
- **Animations:** Framer Motion

### Backend
- **API:** Next.js API Routes (serverless) - To be implemented in Phase 3
- **ORM:** Prisma ORM - To be implemented in Phase 3
- **Database:** Prisma Postgres (serverless PostgreSQL on AWS) - To be implemented in Phase 3

### Infrastructure
- **Hosting:** Vercel (web app)
- **Database Platform:** Prisma Data Platform - To be implemented in Phase 3
- **Hardware:** Brother P-Touch label printer

---

## Development Phases

### ✅ Phase 0: Planning & Specifications (Complete)
- [x] Define project scope
- [x] Document requirements
- [x] Choose technology stack
- [x] Create implementation plans

### ✅ Phase 1: POS Interface (Complete)
**UI-First Approach with Mock Data**
- [x] Frame ID entry screen (landing page)
- [x] Sale confirmation screen with price override
- [x] Success confirmation screen
- [x] Mobile optimization for iPhone/iPad
- [x] Mock data for UI testing and client feedback

### ✅ Phase 2: Admin Portal (Complete)
**UI Development with Mock Data**
- [x] Add new frame interface
- [x] Frame search and lookup
- [x] Edit frame records
- [x] Mark frames as discontinued
- [x] Manual sale entry
- [x] Mock data integration

### 📋 Phase 3: Database Setup & Integration (Next)
**Backend Implementation**
- [ ] Set up Prisma Postgres database
- [ ] Design and implement database schema
- [ ] Create Next.js API routes
- [ ] Connect POS interface to real database
- [ ] Connect Admin Portal to real database
- [ ] Import existing ~1,700 frames from Google Sheets

**Note:** Phase 3 begins after client approval of Phase 1 & 2 UI/UX

### 📋 Phase 4: Analytics Dashboard
- [ ] KPI cards (revenue, units sold, profit margin)
- [ ] Sales trends charts
- [ ] Brand performance table
- [ ] Inventory intelligence and reorder recommendations
- [ ] Connect to database for real-time data

### 📋 Phase 5: Testing, Refinement & Training
- [ ] End-to-end workflow testing
- [ ] Staff training materials
- [ ] Bug fixes and UX improvements
- [ ] Performance optimization
- [ ] Documentation

---

## Key Workflows

### Adding New Inventory
1. Staff opens Admin Portal
2. Fills out "Add New Frame" form
3. System generates Frame ID (e.g., FR-0542)
4. System triggers label printer
5. Staff affixes label to physical frame
6. Frame is active in database

### Recording a Sale
1. Customer purchases frame
2. Staff opens POS interface on iPad/iPhone
3. Enters Frame ID from label
4. Reviews frame details on confirmation screen
5. Confirms sale
6. System records transaction and marks frame as sold

### Viewing Analytics
1. Manager opens Analytics Dashboard
2. Views KPIs (revenue, units sold, profit margin)
3. Reviews brand performance and reorder recommendations
4. Makes data-driven purchasing decisions

---

## Project Goals

### Business Outcomes
✓ Eliminate manual tracking and paper logs
✓ Real-time inventory accuracy
✓ Data-driven reorder recommendations
✓ Reduce stockouts and overstock situations
✓ Transform inventory into strategic growth engine

### Technical Goals
✓ < 1 second POS response time
✓ Mobile-first, intuitive interfaces
✓ Type-safe database operations (Prisma)
✓ Scalable cloud infrastructure
✓ Easy data import/export

---

## Getting Started

### For Developers
1. Review [docs/phase-0/PROJECT_SCOPE.md](docs/phase-0/PROJECT_SCOPE.md) for complete specifications
2. Review [docs/CHANGELOG.md](docs/CHANGELOG.md) to understand scope evolution
3. Review implementation plans:
   - [docs/phase-1/IMPLEMENTATION_PLAN.md](docs/phase-1/IMPLEMENTATION_PLAN.md) - POS Interface
   - [docs/phase-2/IMPLEMENTATION_PLAN.md](docs/phase-2/IMPLEMENTATION_PLAN.md) - Admin Portal
4. Set up local development environment:
   ```bash
   cd jazzy-eyes-dashboard
   npm install
   npm run dev
   ```
5. Access interfaces:
   - POS: `http://localhost:3000`
   - Admin Portal: `http://localhost:3000/admin`
   - Analytics: `http://localhost:3000/dashboard`

### For Stakeholders (Client Feedback)

**Testing the Application:**
1. Access POS Interface: `http://localhost:3000`
   - Test Frame ID lookup (try: 0542, 1234, 2345, 3456)
   - Navigate to Admin Portal via hamburger menu
2. Access Admin Portal: `http://localhost:3000/admin`
   - Test adding a new frame
   - Test searching and managing inventory
   - Test manual sale entry
   - Test marking frames as discontinued

**Provide Feedback On:**
- UI/UX of both POS and Admin Portal
- Workflow efficiency
- Any missing features or improvements needed
- Readiness for database integration (Phase 3)

**Background Documentation:**
- [docs/phase-0/PROJECT_SCOPE.md](docs/phase-0/PROJECT_SCOPE.md) - Full project specifications
- [docs/phase-1/IMPLEMENTATION_PLAN.md](docs/phase-1/IMPLEMENTATION_PLAN.md) - POS details
- [docs/phase-2/IMPLEMENTATION_PLAN.md](docs/phase-2/IMPLEMENTATION_PLAN.md) - Admin Portal details

---

## Contact & Ownership

**Project Owner:** Kyle Shechtman
**Version:** 2.1
**Last Updated:** November 5, 2025
**Status:** Phase 1 & 2 Complete - Awaiting Client Feedback

---

## License

Proprietary - All rights reserved
