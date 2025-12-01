# Database Schema Design - Jazzy Eyes Inventory System

## Overview
This document outlines the database schema for the Jazzy Eyes inventory management system. The schema is designed to track eyewear products from multiple companies and brands, with complete order and sales transaction history.

## Design Principles

### Key Decisions
1. **Hierarchical Structure**: Companies → Brands → Products → Inventory Transactions
2. **Composite Product ID**: Products are uniquely identified by `{brand_id}-{style_number}-{color_code}-{eye_size}`
3. **Transaction History**: Full audit trail of all orders and sales
4. **FIFO Inventory**: First In, First Out cost basis for calculating Cost of Goods Sold (COGS)
5. **PostgreSQL + Prisma**: Using PostgreSQL for relational data with Prisma ORM

### Staff Input Flow
Staff will input products using the format: **Brand ID - Style# - Color# - Eyesize**

Example: `1001-GG0001-BLK-52`

Where:
- `1001` = Brand ID (Gucci)
- `GG0001` = Style number (as printed on frame)
- `BLK` = Color code
- `52` = Eye size

The system will automatically:
- Validate the brand_id exists in the brands table
- Derive the company_id (1000 for Kering) from the brand_id
- Create the composite_id as the unique product identifier

**Rationale for Brand ID Input:**
- Staff enters the numeric brand_id (1001) rather than brand name ("Gucci")
- Faster to type and eliminates spelling variations
- Staff can reference a brand ID cheat sheet or dropdown
- Once we observe what's printed on physical frames, we may optimize to auto-detect brand from style number prefix (e.g., "GG" → Gucci)

---

## Schema Tables

### 1. brands

Stores parent companies and their brand portfolio with discount rates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Brand ID (1001, 1002, etc.) |
| company_name | VARCHAR(255) | NOT NULL | Parent company name (e.g., "Kering") |
| company_id | INTEGER | NOT NULL | Company ID (1000, 2000, etc.) - derived from brand_id range |
| brand_name | VARCHAR(255) | NOT NULL, UNIQUE | Brand name (e.g., "Gucci") |
| allocation_quantity | INTEGER | NULL | ALLO - Standing inventory target (units to stock) |
| discount_percentage | DECIMAL(5,2) | NULL | Discount % for pricing (to be collected manually) |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Record update timestamp |

**Initial Data (from Database and fields.xlsx):**

Companies and Brands with ALLO (allocation quantity):
- Kering (1000): Gucci (1001, ALLO: 40), YSL (1002, ALLO: 40), Chloe (1003, ALLO: 40), Maui Jim (1004, ALLO: 60)
- Etnia (2000): Lool (2001, ALLO: 60), Etnia (2002, ALLO: 80), Chroma (2003, ALLO: 15), Pellicer (2004, ALLO: 15)
- Marcolin (3000): Tom Ford (3001, ALLO: 90)
- Thelios (4000): Fendi (4001), Fred (4002)
- Morel (5000): Morel (5000, ALLO: 70)
- Luxottica (6000): Rayban (6001), Oakley (6002)
- Salt (7000): Salt (7000, ALLO: 25)
- Silhouette (8000): Silhouette (8000, ALLO: 90)
- Derigo Rem (9000): Chopard (9000, ALLO: 24)
- SD Eyes (10000): Café (10001, ALLO: 45), NRG (10002, ALLO: 45), CLD (10003, ALLO: 45), Pepe Jeans (10004)
- McGee (11000): Vera Bradley (11001)
- Clarity (12000): Konishi (12001, ALLO: 15)

**Note:** Discount percentages will be collected manually during initial inventory entry of 1700 glasses.

---

### 2. products

Defines unique product variants (style + color + size combinations).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| composite_id | VARCHAR(255) | PRIMARY KEY | Format: `{brand_id}-{style_number}-{color_code}-{eye_size}` |
| brand_id | INTEGER | NOT NULL, FOREIGN KEY → brands.id | Reference to brand |
| style_number | VARCHAR(100) | NOT NULL | Manufacturer style number |
| color_code | VARCHAR(50) | NOT NULL | Color code/identifier |
| eye_size | VARCHAR(20) | NOT NULL | Eye size (e.g., "52", "54") |
| gender | VARCHAR(20) | NULL | Men/Women/Uni |
| frame_type | VARCHAR(50) | NULL | Zyl/Metal/Rimless |
| product_type | VARCHAR(20) | NULL | Sun/Opth (Sunglasses/Optical) |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Record update timestamp |

**Example Record:**
```
composite_id: "1001-GG0001-BLK-52"
brand_id: 1001 (Gucci)
style_number: "GG0001"
color_code: "BLK"
eye_size: "52"
gender: "Uni"
frame_type: "Metal"
product_type: "Sun"
```

**Indexes:**
- Primary: composite_id
- Secondary: brand_id (for brand queries)
- Secondary: style_number (for style searches)

---

### 3. inventory_transactions

Records all inventory movements (orders and sales) with full transaction history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing transaction ID |
| product_id | VARCHAR(255) | NOT NULL, FOREIGN KEY → products.composite_id | Product reference |
| transaction_type | ENUM | NOT NULL | 'ORDER' or 'SALE' |
| transaction_date | DATE | NOT NULL | Date of transaction |
| quantity | INTEGER | NOT NULL, CHECK > 0 | Quantity (always positive) |
| unit_cost | DECIMAL(10,2) | NULL | Cost per unit (for orders) |
| unit_price | DECIMAL(10,2) | NULL | Sale price per unit (for sales) |
| status | VARCHAR(50) | DEFAULT 'completed' | pending/completed/cancelled |
| notes | TEXT | NULL | Optional transaction notes |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Record update timestamp |

**Transaction Types:**

**ORDER**: Stock received from supplier
- Adds to inventory
- Records unit_cost
- unit_price is NULL

**SALE**: Product sold to customer
- Removes from inventory
- Records unit_price
- unit_cost is NULL (calculated via FIFO from order history)

**Indexes:**
- Primary: id
- Secondary: product_id (for product history)
- Secondary: transaction_date (for date range queries)
- Secondary: transaction_type (for filtering orders/sales)

---

## Inventory Calculations

### Current Stock Level
```sql
SELECT
  product_id,
  SUM(CASE WHEN transaction_type = 'ORDER' THEN quantity ELSE -quantity END) as current_stock
FROM inventory_transactions
WHERE status = 'completed'
GROUP BY product_id;
```

### FIFO Cost Basis
When recording a sale, calculate COGS by matching against the oldest (first) order costs first.

**Example:**
1. Order 1: 10 units @ $50 (Jan 1)
2. Order 2: 10 units @ $60 (Feb 1)
3. Sale: 12 units @ $100 (Mar 1)

**COGS Calculation:**
- 10 units from Order 1 @ $50 = $500
- 2 units from Order 2 @ $60 = $120
- **Total COGS: $620**
- **Gross Profit: (12 × $100) - $620 = $580**

### Remaining Inventory Value
After the sale above:
- 8 units remaining from Order 2 @ $60 = $480 inventory value

---

## Relationships

```
brands (1) ←→ (many) products
products (1) ←→ (many) inventory_transactions
```

### Foreign Key Constraints
- `products.brand_id` → `brands.id` (CASCADE on update, RESTRICT on delete)
- `inventory_transactions.product_id` → `products.composite_id` (CASCADE on update, RESTRICT on delete)

**Rationale:**
- RESTRICT on delete prevents accidental deletion of brands/products with existing records
- CASCADE on update allows ID changes to propagate (though rare)

---

## Data Validation Rules

### Product Creation
1. Composite ID must follow format: `{brand_id}-{style_number}-{color_code}-{eye_size}`
   - Example: `1001-GG0001-BLK-52`
2. All components (brand_id, style, color, size) are required
3. Brand ID must exist in brands table (validated via foreign key)
4. Gender must be: Men, Women, or Uni (if provided)
5. Frame type must be: Zyl, Metal, or Rimless (if provided)
6. Product type must be: Sun or Opth (if provided)

### Transaction Creation
1. Product must exist in products table
2. Quantity must be positive integer
3. ORDER transactions require unit_cost
4. SALE transactions require unit_price
5. Cannot sell more than available stock (application-level check)
6. Transaction date cannot be in the future (application-level check)

---

## Future Considerations

### Phase 2 Features (Not in Initial Schema)
- Customer information (for sales tracking)
- Invoice/PO numbers
- Supplier information
- Multi-location inventory
- Returns/exchanges
- Warranty tracking
- Serial number tracking for high-value items

### Scalability Notes
- Composite IDs are indexed for fast lookups
- Transaction table will grow large - consider partitioning by date after 1M+ records
- Consider materialized view for current inventory levels if queries become slow
- FIFO calculation may need optimization for high-volume products

---

## Migration Plan

### Step 1: Create Tables
1. Create brands table
2. Create products table with foreign key to brands
3. Create inventory_transactions table with foreign key to products

### Step 2: Seed Initial Data
1. Import company/brand data from Excel (Database and fields.xlsx)
2. Validate all brand IDs and discount percentages
3. Verify company_id ranges (1000s, 2000s, etc.)

### Step 3: Testing
1. Create sample products for multiple brands
2. Record test orders
3. Record test sales
4. Verify FIFO calculations
5. Test current stock queries

### Step 4: Production Deployment
1. Run migrations in production
2. Import historical data (if any)
3. Begin staff training on composite ID format
4. Monitor query performance

---

## Questions & Decisions Log

**Q1: Should we use the predefined ID ranges (1000s, 2000s) or auto-increment?**
A: Keep predefined ranges as they're already established in the Excel data and provide logical grouping.

**Q2: How should we track inventory - single table or transaction history?**
A: Transaction history (Option A) to support both order and sales date tracking.

**Q3: LIFO or FIFO for cost basis?**
A: FIFO (First In, First Out) - industry standard for inventory accounting.

**Q4: Should sales be negative quantities or separate transaction type?**
A: Separate transaction_type with always-positive quantities for clarity and simpler queries.

**Q5: Do we need company_id if we have brand_id?**
A: Yes, keep for reporting and grouping purposes (all Kering brands, etc.).

**Q6: Should staff input brand name or brand ID during POS?**
A: Brand ID (numeric) for speed and accuracy. Staff enters `1001` instead of "Gucci". Future optimization may auto-detect brand from style number prefix once we observe what's printed on physical frames.

**Q7: What does ALLO mean in the Excel data?**
A: ALLO = Allocation quantity (standing inventory target in units), not discount percentage. We need both allocation_quantity and discount_percentage fields. Discount % will be collected manually during initial entry of 1700 glasses.


---

## Next Steps

1. Review and approve this schema design
2. Create Prisma schema file
3. Generate and run PostgreSQL migrations
4. Seed initial brand data
5. Build API endpoints for CRUD operations
6. Implement FIFO calculation logic
7. Create staff input forms with composite ID formatting
