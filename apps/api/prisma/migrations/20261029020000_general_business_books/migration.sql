-- AlterTable Station: industry-neutral business fields (table name kept for deployed DB)
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "industry" TEXT NOT NULL DEFAULT 'FUEL_STATION';
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "fuelModuleEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "taxRegime" TEXT NOT NULL DEFAULT 'VAT';
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "percentageTaxRateBps" INTEGER NOT NULL DEFAULT 300;

-- AlterTable Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "contactPerson" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "tin" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "address" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "allowsCharge" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "creditLimitCentavos" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "paymentTermsDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "taxTreatment" TEXT NOT NULL DEFAULT 'VATABLE';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "taxExemptReason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "taxExemptReference" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "taxExemptExpiry" DATE;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "isSeniorOrPwd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "seniorPwdIdNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "withholdingRateBps" INTEGER NOT NULL DEFAULT 0;

-- AlterTable CreditCharge
ALTER TABLE "CreditCharge" ADD COLUMN IF NOT EXISTS "invoiceId" TEXT;
ALTER TABLE "CreditCharge" ADD COLUMN IF NOT EXISTS "dueDate" DATE;

-- AlterTable CustomerPayment
ALTER TABLE "CustomerPayment" ADD COLUMN IF NOT EXISTS "withholdingCentavos" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "CustomerPayment" ADD COLUMN IF NOT EXISTS "bir2307Reference" TEXT NOT NULL DEFAULT '';

-- AlterTable Expense
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "netCentavos" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "inputVatCentavos" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "withholdingCentavos" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "invoiceReference" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "accountCode" TEXT NOT NULL DEFAULT '';
UPDATE "Expense" SET "netCentavos" = "amountCentavos" WHERE "netCentavos" = 0 AND "amountCentavos" <> 0;

-- AlterTable Bill
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "netCentavos" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "vatCentavos" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "withholdingCentavos" BIGINT NOT NULL DEFAULT 0;
UPDATE "Bill" SET "netCentavos" = "amountCentavos" WHERE "netCentavos" = 0 AND "amountCentavos" <> 0;

-- CreateTable Item
CREATE TABLE IF NOT EXISTS "Item" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pc',
    "priceCentavos" BIGINT NOT NULL,
    "taxType" TEXT NOT NULL DEFAULT 'VATABLE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "stockQtyScaled" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable SalesInvoice
CREATE TABLE IF NOT EXISTS "SalesInvoice" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "customerId" TEXT,
    "shiftId" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "buyerName" TEXT NOT NULL DEFAULT '',
    "buyerTin" TEXT NOT NULL DEFAULT '',
    "buyerAddress" TEXT NOT NULL DEFAULT '',
    "taxTreatment" TEXT NOT NULL DEFAULT 'VATABLE',
    "isSeniorOrPwd" BOOLEAN NOT NULL DEFAULT false,
    "seniorPwdIdNumber" TEXT NOT NULL DEFAULT '',
    "discountCentavos" BIGINT NOT NULL DEFAULT 0,
    "scPwdDiscountCentavos" BIGINT NOT NULL DEFAULT 0,
    "grossCentavos" BIGINT NOT NULL DEFAULT 0,
    "vatCentavos" BIGINT NOT NULL DEFAULT 0,
    "netCentavos" BIGINT NOT NULL DEFAULT 0,
    "totalCentavos" BIGINT NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SalesInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SalesInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemId" TEXT,
    "fuelProductId" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pc',
    "qtyScaled" BIGINT NOT NULL,
    "unitPriceCentavos" BIGINT NOT NULL,
    "amountCentavos" BIGINT NOT NULL,
    "vatCentavos" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "SalesInvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Tank" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacityCentilitres" BIGINT NOT NULL DEFAULT 0,
    "bookCentilitres" BIGINT NOT NULL DEFAULT 0,
    "avgCostPerLitreCentavos" BIGINT NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tank_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FuelDelivery" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "supplierId" TEXT,
    "productId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "invoiceReference" TEXT NOT NULL DEFAULT '',
    "drLitresCentilitres" BIGINT NOT NULL,
    "measuredLitresCentilitres" BIGINT NOT NULL,
    "unitCostPerLitreCentavos" BIGINT NOT NULL,
    "freightCentavos" BIGINT NOT NULL DEFAULT 0,
    "inputVatCentavos" BIGINT NOT NULL DEFAULT 0,
    "withholdingCentavos" BIGINT NOT NULL DEFAULT 0,
    "dueDate" DATE,
    "receivedBy" TEXT NOT NULL DEFAULT '',
    "checkedBy" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "billId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FuelDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TankDip" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "openingCentilitres" BIGINT NOT NULL,
    "deliveriesCentilitres" BIGINT NOT NULL DEFAULT 0,
    "salesCentilitres" BIGINT NOT NULL DEFAULT 0,
    "bookClosingCentilitres" BIGINT NOT NULL,
    "physicalCentilitres" BIGINT NOT NULL,
    "avgCostPerLitreCentavos" BIGINT NOT NULL DEFAULT 0,
    "investigatedBy" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TankDip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CashReconciliation" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "shiftId" TEXT,
    "shiftName" TEXT NOT NULL DEFAULT '',
    "cashier" TEXT NOT NULL DEFAULT '',
    "openingFloatCentavos" BIGINT NOT NULL DEFAULT 0,
    "cashSalesCentavos" BIGINT NOT NULL DEFAULT 0,
    "otherReceiptsCentavos" BIGINT NOT NULL DEFAULT 0,
    "paidOutCentavos" BIGINT NOT NULL DEFAULT 0,
    "countedCentavos" BIGINT NOT NULL DEFAULT 0,
    "depositCentavos" BIGINT NOT NULL DEFAULT 0,
    "depositDate" DATE,
    "bankReference" TEXT NOT NULL DEFAULT '',
    "reviewedBy" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CashReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LedgerAccount" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "normalBalance" TEXT NOT NULL,
    "classification" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JournalEntry" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "sourceDocument" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "JournalLine" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debitCentavos" BIGINT NOT NULL DEFAULT 0,
    "creditCentavos" BIGINT NOT NULL DEFAULT 0,
    "memo" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FixedAsset" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "acquiredDate" DATE NOT NULL,
    "supplierName" TEXT NOT NULL DEFAULT '',
    "invoiceReference" TEXT NOT NULL DEFAULT '',
    "costCentavos" BIGINT NOT NULL,
    "residualCentavos" BIGINT NOT NULL DEFAULT 0,
    "usefulLifeYears" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'STRAIGHT_LINE',
    "accumulatedDepreciationCentavos" BIGINT NOT NULL DEFAULT 0,
    "custodian" TEXT NOT NULL DEFAULT '',
    "lastCheckDate" DATE,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PayrollEntry" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "payPeriod" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL DEFAULT '',
    "employeeName" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT '',
    "shiftName" TEXT NOT NULL DEFAULT '',
    "basicPayCentavos" BIGINT NOT NULL,
    "allowancesCentavos" BIGINT NOT NULL DEFAULT 0,
    "withholdingCentavos" BIGINT NOT NULL DEFAULT 0,
    "sssEmployeeCentavos" BIGINT NOT NULL DEFAULT 0,
    "philhealthEmployeeCentavos" BIGINT NOT NULL DEFAULT 0,
    "pagibigEmployeeCentavos" BIGINT NOT NULL DEFAULT 0,
    "otherDeductionsCentavos" BIGINT NOT NULL DEFAULT 0,
    "sssEmployerCentavos" BIGINT NOT NULL DEFAULT 0,
    "philhealthEmployerCentavos" BIGINT NOT NULL DEFAULT 0,
    "pagibigEmployerCentavos" BIGINT NOT NULL DEFAULT 0,
    "costCenter" TEXT NOT NULL DEFAULT '',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayrollEntry_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "Item_stationId_idx" ON "Item"("stationId");
CREATE UNIQUE INDEX IF NOT EXISTS "SalesInvoice_stationId_number_key" ON "SalesInvoice"("stationId", "number");
CREATE INDEX IF NOT EXISTS "SalesInvoice_stationId_businessDate_idx" ON "SalesInvoice"("stationId", "businessDate");
CREATE INDEX IF NOT EXISTS "SalesInvoice_customerId_idx" ON "SalesInvoice"("customerId");
CREATE INDEX IF NOT EXISTS "SalesInvoiceLine_invoiceId_idx" ON "SalesInvoiceLine"("invoiceId");
CREATE INDEX IF NOT EXISTS "Tank_stationId_idx" ON "Tank"("stationId");
CREATE INDEX IF NOT EXISTS "FuelDelivery_stationId_businessDate_idx" ON "FuelDelivery"("stationId", "businessDate");
CREATE INDEX IF NOT EXISTS "FuelDelivery_tankId_idx" ON "FuelDelivery"("tankId");
CREATE INDEX IF NOT EXISTS "TankDip_stationId_businessDate_idx" ON "TankDip"("stationId", "businessDate");
CREATE INDEX IF NOT EXISTS "TankDip_tankId_idx" ON "TankDip"("tankId");
CREATE UNIQUE INDEX IF NOT EXISTS "CashReconciliation_shiftId_key" ON "CashReconciliation"("shiftId");
CREATE INDEX IF NOT EXISTS "CashReconciliation_stationId_businessDate_idx" ON "CashReconciliation"("stationId", "businessDate");
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerAccount_stationId_code_key" ON "LedgerAccount"("stationId", "code");
CREATE INDEX IF NOT EXISTS "LedgerAccount_stationId_idx" ON "LedgerAccount"("stationId");
CREATE UNIQUE INDEX IF NOT EXISTS "JournalEntry_stationId_entryNumber_key" ON "JournalEntry"("stationId", "entryNumber");
CREATE INDEX IF NOT EXISTS "JournalEntry_stationId_businessDate_idx" ON "JournalEntry"("stationId", "businessDate");
CREATE INDEX IF NOT EXISTS "JournalLine_entryId_idx" ON "JournalLine"("entryId");
CREATE INDEX IF NOT EXISTS "JournalLine_accountId_idx" ON "JournalLine"("accountId");
CREATE UNIQUE INDEX IF NOT EXISTS "FixedAsset_stationId_assetCode_key" ON "FixedAsset"("stationId", "assetCode");
CREATE INDEX IF NOT EXISTS "FixedAsset_stationId_idx" ON "FixedAsset"("stationId");
CREATE INDEX IF NOT EXISTS "PayrollEntry_stationId_payPeriod_idx" ON "PayrollEntry"("stationId", "payPeriod");
CREATE INDEX IF NOT EXISTS "CreditCharge_invoiceId_idx" ON "CreditCharge"("invoiceId");

-- Foreign keys (idempotent via DO blocks)
DO $$ BEGIN
  ALTER TABLE "Item" ADD CONSTRAINT "Item_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_fuelProductId_fkey" FOREIGN KEY ("fuelProductId") REFERENCES "FuelProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CreditCharge" ADD CONSTRAINT "CreditCharge_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Tank" ADD CONSTRAINT "Tank_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Tank" ADD CONSTRAINT "Tank_productId_fkey" FOREIGN KEY ("productId") REFERENCES "FuelProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FuelDelivery" ADD CONSTRAINT "FuelDelivery_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FuelDelivery" ADD CONSTRAINT "FuelDelivery_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FuelDelivery" ADD CONSTRAINT "FuelDelivery_productId_fkey" FOREIGN KEY ("productId") REFERENCES "FuelProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FuelDelivery" ADD CONSTRAINT "FuelDelivery_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TankDip" ADD CONSTRAINT "TankDip_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TankDip" ADD CONSTRAINT "TankDip_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TankDip" ADD CONSTRAINT "TankDip_productId_fkey" FOREIGN KEY ("productId") REFERENCES "FuelProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CashReconciliation" ADD CONSTRAINT "CashReconciliation_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CashReconciliation" ADD CONSTRAINT "CashReconciliation_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
