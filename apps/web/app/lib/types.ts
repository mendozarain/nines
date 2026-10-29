import type { CustomerType, Industry, PaymentMethod, TaxTreatment } from "@nines/shared";

export type TaxRegime = "VAT" | "PERCENTAGE_TAX";

export type StationSummary = {
  id: string;
  name: string;
  tin: string;
  address: string;
  vatRegistered: boolean;
  industry?: Industry | string;
  fuelModuleEnabled?: boolean;
  taxRegime?: TaxRegime | string;
  percentageTaxRateBps?: number;
};

export type Me = {
  user: { id: string; name: string; email: string } | null;
  station: StationSummary | null;
  today: string;
  month: string;
};

export type Product = {
  id: string;
  name: string;
  pricePerLitreCentavos: string;
  active: boolean;
  sortOrder: number;
};

export type Pump = {
  id: string;
  name: string;
  productId: string;
  productName: string;
  active: boolean;
  sortOrder: number;
  lastClosingCentilitres: string | null;
};

export type StationDetails = StationSummary & {
  products: Product[];
  pumps: Pump[];
};

export type ShiftCharge = {
  id: string;
  customerId: string;
  customerName: string;
  amountCentavos: string;
  note: string;
};

export type ShiftReading = {
  pumpId: string;
  pumpName: string;
  productName: string;
  openingCentilitres: string;
  closingCentilitres: string;
  litresCentilitres: string;
  pricePerLitreCentavos: string;
  amountCentavos: string;
};

export type Shift = {
  id: string;
  businessDate: string;
  name: string;
  notes: string;
  cashCentavos: string;
  cardCentavos: string;
  creditCentavos: string;
  expectedCentavos: string;
  tenderedCentavos: string;
  overShortCentavos: string;
  readings: ShiftReading[];
  charges: ShiftCharge[];
};

export type Expense = {
  id: string;
  businessDate: string;
  category: string;
  payee: string;
  note: string;
  amountCentavos: string;
};

export type CustomerSummary = {
  id: string;
  name: string;
  phone: string;
  notes: string;
  chargesCentavos: string;
  paymentsCentavos: string;
  balanceCentavos: string;
  type?: CustomerType | string;
  tin?: string;
  email?: string;
  allowsCharge?: boolean;
  creditLimitCentavos?: string;
  taxTreatment?: TaxTreatment | string;
  isSeniorOrPwd?: boolean;
};

export type AgingBucket = {
  current?: string;
  "1-30"?: string;
  "31-60"?: string;
  "61-90"?: string;
  "90+"?: string;
  currentCentavos?: string;
  days1to30Centavos?: string;
  days31to60Centavos?: string;
  days61to90Centavos?: string;
  over90Centavos?: string;
};

export type CustomerDetail = CustomerSummary & {
  contactPerson?: string;
  address?: string;
  paymentTermsDays?: number;
  taxExemptReason?: string;
  taxExemptReference?: string;
  taxExemptExpiry?: string | null;
  seniorPwdIdNumber?: string;
  withholdingRateBps?: number;
  aging?: AgingBucket;
  charges: {
    id: string;
    businessDate: string;
    amountCentavos: string;
    note: string;
    shiftId: string | null;
    shiftName: string | null;
    invoiceId?: string | null;
    dueDate?: string | null;
  }[];
  payments: {
    id: string;
    businessDate: string;
    amountCentavos: string;
    note: string;
    withholdingCentavos?: string;
    bir2307Reference?: string;
  }[];
};

export type CustomerStatement = {
  customer: CustomerDetail;
  asOf: string;
  lines: {
    date: string;
    description: string;
    debitCentavos: string;
    creditCentavos: string;
    balanceCentavos: string;
  }[];
};

export type SupplierSummary = {
  id: string;
  name: string;
  tin: string;
  notes: string;
  billsCentavos: string;
  paymentsCentavos: string;
  balanceCentavos: string;
};

export type SupplierDetail = SupplierSummary & {
  bills: {
    id: string;
    businessDate: string;
    dueDate: string | null;
    reference: string;
    note: string;
    amountCentavos: string;
  }[];
  payments: { id: string; businessDate: string; amountCentavos: string; note: string; billId: string | null }[];
};

export type CatalogItem = {
  id: string;
  name: string;
  unit: string;
  priceCentavos: string;
  taxType: TaxTreatment | string;
  active: boolean;
  sortOrder?: number;
  stockQtyScaled?: string;
};

export type SalesInvoiceLine = {
  id?: string;
  itemId?: string | null;
  fuelProductId?: string | null;
  description: string;
  unit: string;
  qtyScaled: string;
  unitPriceCentavos: string;
  amountCentavos: string;
  vatCentavos?: string;
};

export type SalesInvoice = {
  id: string;
  number: string;
  businessDate: string;
  customerId: string | null;
  customerName?: string | null;
  paymentMethod: PaymentMethod | string;
  buyerName: string;
  buyerTin: string;
  buyerAddress: string;
  taxTreatment: TaxTreatment | string;
  isSeniorOrPwd: boolean;
  seniorPwdIdNumber: string;
  discountCentavos: string;
  scPwdDiscountCentavos: string;
  grossCentavos: string;
  vatCentavos: string;
  netCentavos: string;
  totalCentavos: string;
  note: string;
  lines: SalesInvoiceLine[];
};

export type Tank = {
  id: string;
  name: string;
  productId: string;
  productName?: string;
  capacityCentilitres: string;
  bookCentilitres: string;
  avgCostPerLitreCentavos: string;
  active: boolean;
};

export type FuelDelivery = {
  id: string;
  businessDate: string;
  tankId: string;
  tankName?: string;
  productId: string;
  productName?: string;
  supplierId?: string | null;
  invoiceReference: string;
  drLitresCentilitres: string;
  measuredLitresCentilitres: string;
  unitCostPerLitreCentavos: string;
  freightCentavos: string;
  note: string;
};

export type TankDip = {
  id: string;
  businessDate: string;
  tankId: string;
  tankName?: string;
  openingCentilitres: string;
  deliveriesCentilitres: string;
  salesCentilitres: string;
  bookClosingCentilitres: string;
  physicalCentilitres: string;
  note: string;
};

export type CashReconciliation = {
  id: string;
  businessDate: string;
  shiftId?: string | null;
  shiftName: string;
  cashier: string;
  openingFloatCentavos: string;
  cashSalesCentavos: string;
  expectedCashCentavos?: string;
  countedCashCentavos?: string;
  overShortCentavos?: string;
  note?: string;
};

export type LedgerAccount = {
  id?: string;
  code: string;
  name: string;
  type: string;
  normalBalance?: string;
  classification?: string;
  balanceCentavos?: string;
};

export type JournalLine = {
  accountCode: string;
  accountName?: string;
  debitCentavos: string;
  creditCentavos: string;
  memo?: string;
};

export type JournalEntry = {
  id: string;
  businessDate: string;
  reference: string;
  memo: string;
  lines: JournalLine[];
};

export type TrialBalanceRow = {
  code: string;
  name: string;
  debitCentavos: string;
  creditCentavos: string;
};

export type StatementSection = {
  label: string;
  rows: { code?: string; name: string; amountCentavos: string }[];
  totalCentavos: string;
};

export type IncomeStatement = {
  period: string;
  revenue: StatementSection;
  expenses: StatementSection;
  netIncomeCentavos: string;
};

export type BalanceSheet = {
  asOf: string;
  assets: StatementSection;
  liabilities: StatementSection;
  equity: StatementSection;
};

export type FixedAsset = {
  id: string;
  name: string;
  acquiredDate: string;
  costCentavos: string;
  accumulatedDepreciationCentavos: string;
  usefulLifeMonths: number;
  note: string;
};

export type PayrollEntry = {
  id: string;
  businessDate: string;
  employeeName: string;
  grossCentavos: string;
  sssCentavos: string;
  philhealthCentavos: string;
  pagibigCentavos: string;
  withholdingCentavos: string;
  netCentavos: string;
  note: string;
};

export type TaxCalendarItem = {
  area: string;
  record: string;
  frequency: string;
  caution: string;
};

export type Dashboard = {
  today: string;
  month: string;
  vatRegistered: boolean;
  todaySalesCentavos: string;
  todayExpensesCentavos: string;
  todayOverShortCentavos: string;
  monthSalesCentavos: string;
  monthExpensesCentavos: string;
  monthNetSalesCentavos: string;
  monthOutputVatCentavos: string;
  receivablesCentavos: string;
  payablesCentavos: string;
  series: { date: string; salesCentavos: string }[];
};

export type DailyReport = {
  date: string;
  shiftCount: number;
  salesCentavos: string;
  cashCentavos: string;
  cardCentavos: string;
  creditCentavos: string;
  overShortCentavos: string;
  products: { name: string; litresCentilitres: string; amountCentavos: string }[];
  expensesCentavos: string;
  expenses: { id: string; category: string; payee: string; note: string; amountCentavos: string }[];
  shifts: { id: string; name: string; salesCentavos: string }[];
};

export type MonthlyReport = {
  month: string;
  shiftCount: number;
  salesCentavos: string;
  expensesCentavos: string;
  cashCentavos: string;
  cardCentavos: string;
  creditCentavos: string;
  overShortCentavos: string;
  products: { name: string; litresCentilitres: string; amountCentavos: string }[];
};

export type VatReport = {
  month: string;
  vatRegistered: boolean;
  grossSalesCentavos: string;
  netSalesCentavos: string;
  outputVatCentavos: string;
  rateLabel: string;
  note: string;
};

declare global {
  interface Window {
    ninesDesktop?: boolean;
  }
}
