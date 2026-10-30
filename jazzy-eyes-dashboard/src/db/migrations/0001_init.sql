-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('ORDER', 'SALE');

-- CreateTable
CREATE TABLE "brands" (
    "id" INTEGER NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "company_id" INTEGER NOT NULL,
    "brand_name" VARCHAR(255) NOT NULL,
    "allocation_quantity" INTEGER NOT NULL,
    "discount_percentage" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "composite_id" VARCHAR(255) NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "style_number" VARCHAR(100) NOT NULL,
    "color_code" VARCHAR(50) NOT NULL,
    "eye_size" VARCHAR(20) NOT NULL,
    "gender" VARCHAR(20) NOT NULL,
    "frame_type" VARCHAR(50) NOT NULL,
    "product_type" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("composite_id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" SERIAL NOT NULL,
    "product_id" VARCHAR(255) NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "transaction_date" DATE NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'completed',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brands_brand_name_key" ON "brands"("brand_name");

-- CreateIndex
CREATE INDEX "products_brand_id_idx" ON "products"("brand_id");

-- CreateIndex
CREATE INDEX "products_style_number_idx" ON "products"("style_number");

-- CreateIndex
CREATE INDEX "inventory_transactions_product_id_idx" ON "inventory_transactions"("product_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_transaction_date_idx" ON "inventory_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "inventory_transactions_transaction_type_idx" ON "inventory_transactions"("transaction_type");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("composite_id") ON DELETE RESTRICT ON UPDATE CASCADE;
