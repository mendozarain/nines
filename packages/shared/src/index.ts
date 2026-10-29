export const VAT_NUMERATOR = 12n;
export const VAT_DENOMINATOR = 112n;
export const SC_PWD_DISCOUNT_BPS = 2000n; // 20%

export const SHIFT_NAMES = ["Morning", "Afternoon", "Night"] as const;
export type ShiftName = (typeof SHIFT_NAMES)[number];

export const INDUSTRIES = ["GENERAL", "RETAIL", "SERVICES", "FUEL_STATION"] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const INDUSTRY_LABELS: Record<Industry, string> = {
  GENERAL: "General business",
  RETAIL: "Retail / store",
  SERVICES: "Services",
  FUEL_STATION: "Fuel station",
};

export const TAX_TREATMENTS = ["VATABLE", "VAT_EXEMPT", "ZERO_RATED"] as const;
export type TaxTreatment = (typeof TAX_TREATMENTS)[number];

export const TAX_TREATMENT_LABELS: Record<TaxTreatment, string> = {
  VATABLE: "VATable (12% included in price)",
  VAT_EXEMPT: "VAT-exempt",
  ZERO_RATED: "Zero-rated",
};

export const CUSTOMER_TYPES = ["INDIVIDUAL", "ORGANIZATION"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const PAYMENT_METHODS = ["CASH", "CARD", "EWALLET", "CHARGE"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const EXPENSE_CATEGORIES = [
  "Wages",
  "Utilities",
  "Supplies",
  "Repairs",
  "Delivery",
  "Rent",
  "Taxes and permits",
  "Other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const SUGGESTED_PRODUCTS = [
  { name: "Diesel", price: "55.85" },
  { name: "Unleaded", price: "61.40" },
  { name: "Premium", price: "66.75" },
] as const;

export const PH_TIN_REGEX = /^\d{3}-\d{3}-\d{3}(-\d{3,5})?$/;

/** Generic Philippine small-business chart of accounts. Fuel accounts are appended when the fuel module is on. */
export const CORE_CHART_OF_ACCOUNTS = [
  { code: "1000", name: "Cash on hand - cashier", type: "ASSET", normalBalance: "Debit", classification: "Current" },
  { code: "1010", name: "Petty cash fund", type: "ASSET", normalBalance: "Debit", classification: "Current" },
  { code: "1020", name: "Cash in bank", type: "ASSET", normalBalance: "Debit", classification: "Current" },
  { code: "1030", name: "Card / e-wallet clearing", type: "ASSET", normalBalance: "Debit", classification: "Current" },
  { code: "1100", name: "Trade receivables", type: "ASSET", normalBalance: "Debit", classification: "Current" },
  { code: "1110", name: "Other receivables", type: "ASSET", normalBalance: "Debit", classification: "Current" },
  { code: "1230", name: "Merchandise / supplies inventory", type: "ASSET", normalBalance: "Debit", classification: "Current" },
  { code: "1240", name: "Input VAT", type: "ASSET", normalBalance: "Debit", classification: "Current" },
  { code: "1300", name: "Prepayments and deposits", type: "ASSET", normalBalance: "Debit", classification: "Current" },
  { code: "1400", name: "Property and equipment", type: "ASSET", normalBalance: "Debit", classification: "Non-current" },
  { code: "1410", name: "Accumulated depreciation", type: "CONTRA_ASSET", normalBalance: "Credit", classification: "Non-current" },
  { code: "1500", name: "Other assets", type: "ASSET", normalBalance: "Debit", classification: "Current" },
  { code: "2000", name: "Accounts payable - suppliers", type: "LIABILITY", normalBalance: "Credit", classification: "Current" },
  { code: "2010", name: "Accounts payable - other", type: "LIABILITY", normalBalance: "Credit", classification: "Current" },
  { code: "2020", name: "Accrued expenses", type: "LIABILITY", normalBalance: "Credit", classification: "Current" },
  { code: "2030", name: "Customer deposits", type: "LIABILITY", normalBalance: "Credit", classification: "Current" },
  { code: "2040", name: "Output VAT", type: "LIABILITY", normalBalance: "Credit", classification: "Current" },
  { code: "2050", name: "Withholding taxes payable", type: "LIABILITY", normalBalance: "Credit", classification: "Current" },
  { code: "2060", name: "Payroll / statutory liabilities", type: "LIABILITY", normalBalance: "Credit", classification: "Current" },
  { code: "2100", name: "Loans payable", type: "LIABILITY", normalBalance: "Credit", classification: "Current" },
  { code: "2200", name: "Income tax payable", type: "LIABILITY", normalBalance: "Credit", classification: "Current" },
  { code: "3000", name: "Owner's capital", type: "EQUITY", normalBalance: "Credit", classification: "Equity" },
  { code: "3100", name: "Additional capital", type: "EQUITY", normalBalance: "Credit", classification: "Equity" },
  { code: "3200", name: "Retained earnings", type: "EQUITY", normalBalance: "Credit", classification: "Equity" },
  { code: "3300", name: "Current year profit/loss", type: "EQUITY", normalBalance: "Credit", classification: "Equity" },
  { code: "4030", name: "Sales - goods and services", type: "REVENUE", normalBalance: "Credit", classification: "P&L" },
  { code: "4040", name: "Other income", type: "REVENUE", normalBalance: "Credit", classification: "P&L" },
  { code: "5030", name: "Cost of goods sold", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
  { code: "6000", name: "Salaries and benefits", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
  { code: "6010", name: "Rent / lease expense", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
  { code: "6020", name: "Electricity and utilities", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
  { code: "6030", name: "Repairs and maintenance", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
  { code: "6040", name: "Supplies and operating costs", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
  { code: "6050", name: "Permits, licenses and insurance", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
  { code: "6060", name: "Depreciation expense", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
  { code: "6070", name: "Payment processing fees", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
  { code: "6100", name: "Professional / administrative", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
  { code: "7000", name: "Finance costs", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
  { code: "7200", name: "Other expenses", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
  { code: "8000", name: "Income tax expense", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
] as const;

export const FUEL_CHART_OF_ACCOUNTS = [
  { code: "1200", name: "Fuel inventory - gasoline", type: "ASSET", normalBalance: "Debit", classification: "Current" },
  { code: "1210", name: "Fuel inventory - diesel", type: "ASSET", normalBalance: "Debit", classification: "Current" },
  { code: "1220", name: "Fuel inventory - other fuels", type: "ASSET", normalBalance: "Debit", classification: "Current" },
  { code: "4000", name: "Fuel sales - gasoline", type: "REVENUE", normalBalance: "Credit", classification: "P&L" },
  { code: "4010", name: "Fuel sales - diesel", type: "REVENUE", normalBalance: "Credit", classification: "P&L" },
  { code: "4020", name: "Fuel sales - other fuels", type: "REVENUE", normalBalance: "Credit", classification: "P&L" },
  { code: "5000", name: "Cost of fuel sold - gasoline", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
  { code: "5010", name: "Cost of fuel sold - diesel", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
  { code: "5020", name: "Cost of fuel sold - other fuels", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
  { code: "6080", name: "Fuel freight / delivery / handling", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
  { code: "6090", name: "Inventory shortages / losses", type: "EXPENSE", normalBalance: "Debit", classification: "P&L" },
] as const;

export const TAX_CALENDAR_ITEMS = [
  { area: "Books of accounts", record: "Register / maintain applicable books", frequency: "Before use / per current BIR rules", caution: "Excel or an app alone does not prove BIR compliance." },
  { area: "Sales invoices", record: "BIR-compliant invoice for sales", frequency: "At the legally required time", caution: "Confirm current invoicing and EOPT Act rules." },
  { area: "VAT", record: "VAT returns if registered", frequency: "Per current BIR calendar", caution: "Confirm VAT status and input-tax substantiation." },
  { area: "Percentage tax", record: "Percentage tax if non-VAT registered", frequency: "Per current BIR calendar", caution: "Applies when the business is not VAT-registered." },
  { area: "Corporate / income tax", record: "Quarterly and annual returns as applicable", frequency: "Per current BIR calendar", caution: "Check MCIT and special rules with an accountant." },
  { area: "Withholding tax", record: "Expanded, compensation, final withholding", frequency: "Per current BIR calendar", caution: "Rates depend on payee and transaction." },
  { area: "Payroll", record: "Compensation withholding, SSS, PhilHealth, Pag-IBIG", frequency: "Per current schedules", caution: "Use current contribution tables." },
  { area: "Local permits", record: "Business permit and other local permits", frequency: "Renewal / as required", caution: "Check city or municipality rules." },
  { area: "Fuel-specific records", record: "Delivery receipts, dips, pump calibration", frequency: "Per delivery / maintenance", caution: "Only when the fuel module is on." },
  { area: "Annual financial statements", record: "SEC filing and audit as applicable", frequency: "Annual", caution: "Depends on company facts." },
  { area: "Record retention", record: "Books, invoices, delivery and bank records", frequency: "Statutory period", caution: "Confirm the current retention period." },
] as const;

/** A single pump shift selling more than this is almost always a typo. */
export const MAX_SHIFT_LITRES_CENTILITRES = 2_000_000n;

export class MoneyInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyInputError";
  }
}

/** Round half away from zero (half up for positive amounts). */
export function divRound(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new MoneyInputError("Cannot divide by zero.");
  }
  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  const quotient = absolute / denominator;
  const remainder = absolute % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

export function litresSold(openingCentilitres: bigint, closingCentilitres: bigint): bigint {
  if (openingCentilitres < 0n || closingCentilitres < 0n) {
    throw new MoneyInputError("Meter readings cannot be negative.");
  }
  if (closingCentilitres < openingCentilitres) {
    throw new MoneyInputError("Closing reading is lower than the opening reading.");
  }
  return closingCentilitres - openingCentilitres;
}

/**
 * Litres are stored as centilitres (hundredths of a litre).
 * Price is centavos per litre. Result is whole centavos, rounded half up.
 */
export function litresToAmountCentavos(centilitres: bigint, pricePerLitreCentavos: bigint): bigint {
  if (centilitres < 0n) throw new MoneyInputError("Litres cannot be negative.");
  if (pricePerLitreCentavos < 0n) throw new MoneyInputError("Price cannot be negative.");
  return divRound(centilitres * pricePerLitreCentavos, 100n);
}

/** Split a VAT-inclusive amount. Output VAT is 12/112 of the gross. */
export function splitInclusiveVat(grossCentavos: bigint): { netCentavos: bigint; vatCentavos: bigint } {
  if (grossCentavos < 0n) throw new MoneyInputError("Sales cannot be negative.");
  const vatCentavos = divRound(grossCentavos * VAT_NUMERATOR, VAT_DENOMINATOR);
  return { vatCentavos, netCentavos: grossCentavos - vatCentavos };
}

/** Positive means cash over; negative means cash short. */
export function overShort(
  expectedCentavos: bigint,
  cashCentavos: bigint,
  cardCentavos: bigint,
  creditCentavos: bigint,
): bigint {
  return cashCentavos + cardCentavos + creditCentavos - expectedCentavos;
}

/** Positive means the customer still owes the station. */
export function receivableBalance(chargesCentavos: bigint, paymentsCentavos: bigint): bigint {
  return chargesCentavos - paymentsCentavos;
}

/** Positive means the station still owes the supplier. */
export function payableBalance(billsCentavos: bigint, paymentsCentavos: bigint): bigint {
  return billsCentavos - paymentsCentavos;
}

const DECIMAL = /^(\d{1,12})(?:\.(\d{1,2}))?$/;

function parseScaled(input: string, scale: bigint, emptyMessage: string, invalidMessage: string): bigint {
  const cleaned = input.replace(/₱/g, "").replace(/,/g, "").trim();
  if (!cleaned) throw new MoneyInputError(emptyMessage);
  const match = DECIMAL.exec(cleaned);
  if (!match) throw new MoneyInputError(invalidMessage);
  const whole = match[1] ?? "0";
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return BigInt(whole) * scale + BigInt(fraction);
}

export function parseCentavos(input: string): bigint {
  return parseScaled(input, 100n, "Enter an amount.", "Use an amount like 1,234.56.");
}

export function parseCentilitres(input: string): bigint {
  return parseScaled(input, 100n, "Enter the meter reading.", "Use a reading like 12,450.20.");
}

export function formatCentavos(value: bigint | string | number): string {
  const centavos = typeof value === "bigint" ? value : BigInt(value);
  const negative = centavos < 0n;
  const absolute = negative ? -centavos : centavos;
  const whole = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}₱${whole}.${fraction}`;
}

export function formatLitres(value: bigint | string | number): string {
  const centilitres = typeof value === "bigint" ? value : BigInt(value);
  const negative = centilitres < 0n;
  const absolute = negative ? -centilitres : centilitres;
  const whole = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/** Plain 2-decimal string for form fields, without the peso sign or commas. */
export function toInputAmount(value: bigint | string | number): string {
  const scaled = typeof value === "bigint" ? value : BigInt(value);
  const negative = scaled < 0n;
  const absolute = negative ? -scaled : scaled;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${absolute / 100n}.${fraction}`;
}

export function describeOverShort(centavos: bigint | string): { tone: "over" | "short" | "even"; label: string } {
  const value = typeof centavos === "bigint" ? centavos : BigInt(centavos);
  if (value === 0n) return { tone: "even", label: "Balanced" };
  if (value > 0n) return { tone: "over", label: `Over ${formatCentavos(value)}` };
  return { tone: "short", label: `Short ${formatCentavos(-value)}` };
}

export function describeBalance(centavos: bigint | string, kind: "receivable" | "payable"): string {
  const value = typeof centavos === "bigint" ? centavos : BigInt(centavos);
  if (value === 0n) return "Paid up";
  if (value > 0n) {
    return kind === "receivable"
      ? `${formatCentavos(value)} still owed to you`
      : `${formatCentavos(value)} still to pay`;
  }
  return `${formatCentavos(-value)} overpaid`;
}

export function manilaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function manilaMonth(now = new Date()): string {
  return manilaToday(now).slice(0, 7);
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatMonth(isoMonth: string): string {
  const [year, month] = isoMonth.slice(0, 7).split("-").map(Number);
  if (!year || !month) return isoMonth;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isShiftName(value: string): value is ShiftName {
  return (SHIFT_NAMES as readonly string[]).includes(value);
}

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

export function isIndustry(value: string): value is Industry {
  return (INDUSTRIES as readonly string[]).includes(value);
}

export function isTaxTreatment(value: string): value is TaxTreatment {
  return (TAX_TREATMENTS as readonly string[]).includes(value);
}

export function isValidPhTin(value: string): boolean {
  return value === "" || PH_TIN_REGEX.test(value);
}

/** 20% SC/PWD discount on the VATable price, then VAT is removed on the discounted amount. */
export function applySeniorPwdDiscount(grossInclusiveCentavos: bigint): {
  discountCentavos: bigint;
  netOfDiscountCentavos: bigint;
  vatCentavos: bigint;
  netSalesCentavos: bigint;
  totalCentavos: bigint;
} {
  if (grossInclusiveCentavos < 0n) throw new MoneyInputError("Sales cannot be negative.");
  const discountCentavos = divRound(grossInclusiveCentavos * SC_PWD_DISCOUNT_BPS, 10_000n);
  const netOfDiscountCentavos = grossInclusiveCentavos - discountCentavos;
  // After the 20% discount, the remaining amount is VAT-exempt for SC/PWD.
  return {
    discountCentavos,
    netOfDiscountCentavos,
    vatCentavos: 0n,
    netSalesCentavos: netOfDiscountCentavos,
    totalCentavos: netOfDiscountCentavos,
  };
}

export function taxBreakdown(
  grossInclusiveCentavos: bigint,
  treatment: TaxTreatment,
  options: { seniorOrPwd?: boolean } = {},
): {
  discountCentavos: bigint;
  scPwdDiscountCentavos: bigint;
  grossCentavos: bigint;
  vatCentavos: bigint;
  netCentavos: bigint;
  totalCentavos: bigint;
  vatableSalesCentavos: bigint;
  vatExemptSalesCentavos: bigint;
  zeroRatedSalesCentavos: bigint;
} {
  if (options.seniorOrPwd) {
    const sc = applySeniorPwdDiscount(grossInclusiveCentavos);
    return {
      discountCentavos: 0n,
      scPwdDiscountCentavos: sc.discountCentavos,
      grossCentavos: grossInclusiveCentavos,
      vatCentavos: 0n,
      netCentavos: sc.netSalesCentavos,
      totalCentavos: sc.totalCentavos,
      vatableSalesCentavos: 0n,
      vatExemptSalesCentavos: sc.netSalesCentavos,
      zeroRatedSalesCentavos: 0n,
    };
  }
  if (treatment === "VAT_EXEMPT") {
    return {
      discountCentavos: 0n,
      scPwdDiscountCentavos: 0n,
      grossCentavos: grossInclusiveCentavos,
      vatCentavos: 0n,
      netCentavos: grossInclusiveCentavos,
      totalCentavos: grossInclusiveCentavos,
      vatableSalesCentavos: 0n,
      vatExemptSalesCentavos: grossInclusiveCentavos,
      zeroRatedSalesCentavos: 0n,
    };
  }
  if (treatment === "ZERO_RATED") {
    return {
      discountCentavos: 0n,
      scPwdDiscountCentavos: 0n,
      grossCentavos: grossInclusiveCentavos,
      vatCentavos: 0n,
      netCentavos: grossInclusiveCentavos,
      totalCentavos: grossInclusiveCentavos,
      vatableSalesCentavos: 0n,
      vatExemptSalesCentavos: 0n,
      zeroRatedSalesCentavos: grossInclusiveCentavos,
    };
  }
  const split = splitInclusiveVat(grossInclusiveCentavos);
  return {
    discountCentavos: 0n,
    scPwdDiscountCentavos: 0n,
    grossCentavos: grossInclusiveCentavos,
    vatCentavos: split.vatCentavos,
    netCentavos: split.netCentavos,
    totalCentavos: grossInclusiveCentavos,
    vatableSalesCentavos: split.netCentavos,
    vatExemptSalesCentavos: 0n,
    zeroRatedSalesCentavos: 0n,
  };
}

export type AgingBucket = "current" | "1-30" | "31-60" | "61-90" | "90+";

export function agingBucket(dueDateIso: string | null | undefined, asOfIso: string): AgingBucket {
  if (!dueDateIso) return "current";
  const days = Math.floor(
    (Date.parse(`${asOfIso}T00:00:00.000Z`) - Date.parse(`${dueDateIso}T00:00:00.000Z`)) / 86_400_000,
  );
  if (days <= 0) return "current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export function emptyAging(): Record<AgingBucket, bigint> {
  return { current: 0n, "1-30": 0n, "31-60": 0n, "61-90": 0n, "90+": 0n };
}

export function annualStraightLineDepreciation(costCentavos: bigint, residualCentavos: bigint, usefulLifeYears: number): bigint {
  if (usefulLifeYears <= 0) return 0n;
  const depreciable = costCentavos - residualCentavos;
  if (depreciable <= 0n) return 0n;
  return divRound(depreciable, BigInt(usefulLifeYears));
}

export function chartOfAccountsFor(fuelModuleEnabled: boolean) {
  return fuelModuleEnabled ? [...CORE_CHART_OF_ACCOUNTS, ...FUEL_CHART_OF_ACCOUNTS] : [...CORE_CHART_OF_ACCOUNTS];
}
