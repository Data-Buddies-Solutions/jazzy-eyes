# Project Scope Changelog

This document tracks major changes to the Jazzy Eyes project scope and specifications.

---

## Version 2.0 - October 28, 2025

### Major Changes from Original Proposal (v1.0)

#### 1. Inventory Tracking Method: QR Codes → Label Printer System
**Original Plan:**
- Each frame receives a QR code with embedded data (brand, model, color, price, Frame ID)
- Staff scans QR at point of sale
- Event logged automatically via scan

**New Approach:**
- Each frame receives a printed label with unique Frame ID only
- Uses Brother P-Touch label printer
- Frame ID links back to full database record
- Manual entry at POS (keyboard input on iPhone/iPad)

**Rationale:**
- Label printers are more reliable and cost-effective than QR infrastructure
- Easier for staff to read and manually enter if scanner unavailable
- No dependency on QR scanning hardware/software
- Simpler failure modes and troubleshooting
- Lower technology overhead for small business

---

#### 2. NEW COMPONENT: Point of Sale (POS) Interface
**What Was Added:**
A dedicated staff-facing web interface for recording sales at checkout.

**Key Features:**
- Frame ID entry screen (keyboard input)
- Real-time database lookup and validation
- Confirmation screen displaying full frame details before sale
- Visual success confirmation after recording
- Error handling for invalid/missing Frame IDs
- Mobile-optimized for iPhone and iPad

**Why It's Needed:**
- Original proposal assumed automatic capture via QR scan
- Label-based system requires intentional data entry step
- Provides verification step to catch errors before finalizing sale
- Creates better user experience for staff at checkout
- Ensures data accuracy through confirmation screen

---

#### 3. NEW COMPONENT: Admin Portal
**What Was Added:**
A comprehensive management interface for inventory operations.

**Key Sections:**
1. **Add New Frames**
   - Form-based entry for new inventory
   - Auto-generates Frame ID
   - Triggers label printing
   - Streamlined onboarding workflow

2. **Frame Lookup & Management**
   - Search by ID, brand, model, color
   - Edit existing frame details
   - Mark frames as Discontinued
   - Manual sale entry (for missed POS transactions)

3. **Sales History & Audit Log**
   - Review past transactions
   - Edit/void sales (future)
   - Export data
   - System activity tracking

4. **Settings & Configuration**
   - Manage brand lists
   - Printer settings
   - System preferences

**Why It's Needed:**
- Original proposal lacked clear workflow for adding new inventory
- Need centralized place for data maintenance and corrections
- Staff need ability to fix mistakes (forgot to enter sale, etc.)
- Provides operational flexibility and administrative control
- Essential for day-to-day business operations

---

#### 4. Enhanced Workflows

**New Inventory Onboarding:**
```
OLD: [Receive frames] → [Generate QR codes] → [Print & affix] → [Ready for sale]

NEW: [Receive frames] → [Enter in Admin Portal] → [Auto-print label] →
     [Affix label to frame] → [Frame active in database]
```

**Point of Sale:**
```
OLD: [Sale occurs] → [Scan QR code] → [Automatic event logged]

NEW: [Sale occurs] → [Open POS Interface on iPad/iPhone] → [Enter Frame ID] →
     [Confirm frame details on screen] → [Record sale] → [Success confirmation]
```

**Handling Missed Sales:**
```
OLD: No clear process (QR scan was the only capture method)

NEW: [Staff realizes mistake] → [Access Admin Portal] → [Lookup frame] →
     [Manually mark as sold] → [Backfill sale date and details]
```

---

#### 5. Technology Stack Decisions

**Confirmed Decisions:**
- **Framework:** Next.js 14+ (React + TypeScript)
- **Database:** PostgreSQL with Prisma ORM
- **Deployment:** Vercel (cloud-based web app)
- **UI Library:** shadcn/ui + Tailwind CSS
- **Label Printer:** Brother P-Touch
- **Primary Devices:** iPhone and iPad (mobile-optimized)
- **Authentication:** None for v1 (added in future versions)

**Original (Undecided Options):**
- Multiple framework options listed
- Multiple database options (SQLite, PostgreSQL, Firebase)
- Deployment unclear (local vs. cloud)
- QR scanning hardware/software

---

#### 6. Updated Project Phases & Priorities

**Original Order:**
1. QR Generation & Labeling
2. Data Pipeline & Database
3. Analytics Dashboard

**New Order (v2.0):**
1. **Database Setup** (PostgreSQL + Prisma) - CURRENT PRIORITY
2. **Admin Portal** (Add frames, search, edit) - HIGH PRIORITY
3. **POS Interface** (Record sales on mobile) - HIGH PRIORITY
4. **Label Printing Integration** (Brother P-Touch)
5. **Analytics Dashboard** (FINAL PHASE - after operational tools work)

**Key Priority Shift:**
- Staff-facing operational tools (POS + Admin) now come BEFORE analytics
- Business can start tracking data immediately once POS/Admin are live
- Analytics dashboard deferred until real operational data is flowing
- Ensures practical business value is delivered first

---

#### 7. Data Migration Strategy

**New Requirement:**
- Import existing ~1,700 frames from Google Sheets into database
- Client is manually entering inventory data into Google Sheets currently
- Need import/migration script as part of Phase 1 (Database Setup)
- This was not part of original proposal (assumed greenfield start)

---

#### 8. Mobile-First Design Approach

**Original:** Desktop-first, tablet-friendly
**New:** Mobile-first (iPhone and iPad primary devices)

**Implications:**
- Large touch targets for mobile interaction
- Simplified navigation for small screens
- Fast loading on mobile networks
- High contrast for readability on handheld devices
- Touch-optimized form inputs

---

## Version 1.0 - October 16, 2025

### Initial Proposal
- QR-based inventory tracking system
- Centralized database for frame and sales data
- Analytics dashboard for business insights
- Three-phase project plan
- Focus on analytics and reporting

See `docs/PROPOSAL_v1_ORIGINAL.md` for full original proposal.

---

## Summary of Changes (v1.0 → v2.0)

### Added
✅ Point of Sale (POS) Interface for staff
✅ Admin Portal for inventory management
✅ Mobile-first design (iPhone/iPad optimization)
✅ Brother P-Touch label printer integration
✅ Data migration from Google Sheets
✅ Manual sale entry for missed transactions
✅ Frame lookup and search functionality
✅ Edit/update frame records capability

### Changed
🔄 QR codes → Label printer system (simpler, more reliable)
🔄 Analytics dashboard: Priority 3 → Priority 5 (deferred)
🔄 Desktop-first → Mobile-first design
🔄 Multiple tech options → Confirmed stack (Next.js, Prisma, Vercel)

### Removed
❌ QR code generation workflow
❌ QR scanning hardware requirements
❌ Mobile QR scanner app
❌ Embedded data in codes (now just Frame ID)

---

## Future Considerations (Not Yet Scoped)

Items discussed but not yet formally added to scope:

- **Authentication:** Staff logins, role-based access
- **Multi-location support:** If business expands to second location
- **Customer database:** Track customer purchase history, preferences
- **Repair/service tracking:** Log when frames go out for repair
- **Returns/exchanges:** Workflow for handling returned frames
- **Advanced analytics:** Predictive reorder AI, seasonal trend analysis
- **Native mobile app:** iOS/Android app (currently web-based)
- **Integration with accounting:** QuickBooks, Xero, etc.
- **Payment tracking:** Log payment method, integrate with payment processor
- **Offline mode:** Work without internet (currently requires connection)

---

**Document Owner:** Kyle Shechtman
**Last Updated:** October 28, 2025
**Next Review:** As needed during development
