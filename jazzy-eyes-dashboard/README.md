# Jazzy Eyes Dashboard

An inventory management and admin portal for Jazzy Eyes optical business. Built with Next.js, TypeScript, and Prisma.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5.9
- **Database:** PostgreSQL with Prisma ORM
- **Styling:** Tailwind CSS 4 with shadcn/ui components
- **Forms:** React Hook Form with Zod validation
- **Charts:** Recharts
- **Animation:** Framer Motion

## Features

### Admin Portal (`/admin`)

- **Add New Frame** - Add frames to inventory with brand, model, color, sizing, and pricing
- **Sell Prescription (RX)** - Record prescription sales without affecting inventory (tracked separately for analytics)
- **Manage Inventory** - Search, filter, edit frames and record sales (supports search by brand or color)
- **Analytics** - View sales trends, brand performance, margins, and inventory health
- **Brand Management** - Manage brands and company allocations
- **Write-offs** - Track and manage inventory write-offs with multiple reasons (damaged, lost, defective, return)

### Inventory Management

- Track frame quantities with FIFO cost tracking
- Record sales, restocks, and write-offs with full transaction history
- Support for multiple transaction types: ORDER, SALE, WRITE_OFF, RESTOCK, REVERT_WRITE_OFF
- CSV import support for bulk inventory updates

### Database Models

- **Brand** - Stores brand information with company associations and allocation quantities
- **Product** - Frame inventory with style, color, sizing, and current quantity
- **FrameStatus** - Configurable status labels (Active, Sold, Discontinued, etc.)
- **InventoryTransaction** - Complete audit trail of all inventory movements
- **RxSale** - Prescription sales records (independent from inventory)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

```bash
cd jazzy-eyes-dashboard
npm install
```

### Environment Setup

Create a `.env` file based on `.env.example`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/jazzy_eyes"
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed initial data (optional)
npm run db:seed
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
jazzy-eyes-dashboard/
├── app/                    # Next.js App Router pages
│   ├── admin/              # Admin portal routes
│   │   ├── add-new/        # Add new frame page
│   │   ├── analytics/      # Analytics dashboard
│   │   ├── brands/         # Brand management
│   │   ├── manage/         # Inventory management
│   │   ├── sell-rx/        # Prescription sales
│   │   └── write-offs/     # Write-off tracking
│   ├── api/                # API routes
│   │   ├── analytics/      # Analytics endpoints
│   │   ├── brands/         # Brand CRUD
│   │   ├── frames/         # Frame CRUD and search
│   │   ├── rx-sales/       # RX sales endpoints
│   │   ├── statuses/       # Status management
│   │   └── write-offs/     # Write-off endpoints
│   └── page.tsx            # Login page
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.ts             # Database seeder
│   └── import-inventory.ts # CSV import script
├── src/
│   ├── components/
│   │   ├── admin/          # Admin-specific components
│   │   ├── analytics/      # Chart components
│   │   └── ui/             # shadcn/ui components
│   ├── context/            # React context providers
│   ├── lib/
│   │   ├── utils/          # Utility functions
│   │   └── validations/    # Zod schemas
│   └── types/              # TypeScript type definitions
└── public/                 # Static assets
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:seed` | Seed the database |

## Design System

The dashboard uses a consistent design system:

- **Primary color:** Sky blue (`#87CEEB`)
- **Secondary color:** Soft sky (`#C1F1FF`)
- **Borders:** 2px solid black for buttons and cards
- **Font:** Inter

## API Endpoints

### Frames
- `GET /api/frames` - List all frames
- `POST /api/frames` - Create a new frame
- `GET /api/frames/[id]` - Get frame details
- `PUT /api/frames/[id]` - Update frame
- `DELETE /api/frames/[id]` - Delete frame
- `GET /api/frames/search` - Search frames

### Brands
- `GET /api/brands` - List all brands
- `POST /api/brands` - Create a new brand
- `GET /api/brands/[id]` - Get brand details
- `PUT /api/brands/[id]` - Update brand
- `DELETE /api/brands/[id]` - Delete brand

### RX Sales
- `GET /api/rx-sales` - List all RX sales
- `POST /api/rx-sales` - Record a new RX sale

### Analytics
- `GET /api/analytics/sales-trends` - Sales trends data
- `GET /api/analytics/brand-performance` - Brand performance metrics
- `GET /api/analytics/margins` - Margin analysis
- `GET /api/analytics/inventory-health` - Inventory health metrics
- `GET /api/analytics/sell-through` - Sell-through rates

## Deployment

The application is configured for deployment on Vercel. The `.vercel` directory contains deployment configuration.

## Contact

For questions or issues, contact Kyle Shechtman.
