export const VAT_NUMERATOR = 12n;
export const VAT_DENOMINATOR = 112n;

export const SHIFT_NAMES = ["Morning", "Afternoon", "Night"] as const;
export type ShiftName = (typeof SHIFT_NAMES)[number];

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
