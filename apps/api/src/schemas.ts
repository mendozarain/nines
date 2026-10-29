import { z } from "zod";
import {
  CUSTOMER_TYPES,
  EXPENSE_CATEGORIES,
  INDUSTRIES,
  MoneyInputError,
  PAYMENT_METHODS,
  PH_TIN_REGEX,
  SHIFT_NAMES,
  TAX_TREATMENTS,
  parseCentavos,
  parseCentilitres,
} from "@nines/shared";

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.");

const monthField = z.string().regex(/^\d{4}-\d{2}$/, "Choose a month.");

const tinField = z
  .string()
  .trim()
  .regex(PH_TIN_REGEX, "Use the TIN format 123-456-789-000.");

const optionalTinField = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => value === "" || PH_TIN_REGEX.test(value), {
    message: "Use the TIN format 123-456-789-000, or leave it blank.",
  });

function scaled(parse: (value: string) => bigint, allowZero: boolean) {
  return z.string().trim().transform((value, ctx) => {
    try {
      const parsed = parse(value);
      if (!allowZero && parsed <= 0n) {
        ctx.addIssue({ code: "custom", message: "Enter an amount greater than zero." });
        return z.NEVER;
      }
      if (parsed < 0n) {
        ctx.addIssue({ code: "custom", message: "Amount cannot be negative." });
        return z.NEVER;
      }
      return parsed;
    } catch (error) {
      const message = error instanceof MoneyInputError ? error.message : "Enter a valid number.";
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
  });
}

const pesos = (allowZero: boolean) => scaled(parseCentavos, allowZero);
const litres = scaled(parseCentilitres, true);
const qtyScaled = scaled(parseCentilitres, false);

const nameField = z.string().trim().min(2, "Enter at least 2 characters.").max(80, "That name is too long.");

const productRow = z.object({
  name: nameField,
  price: pesos(false),
});

const pumpRow = z.object({
  name: nameField,
  productName: z.string().trim().min(1, "Choose a fuel for each pump."),
});

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Choose a due date.",
  });

export const stationSetupSchema = z
  .object({
    name: nameField,
    tin: tinField,
    address: z.string().trim().min(8, "Enter the station address.").max(240),
    vatRegistered: z.boolean(),
    industry: z.enum(INDUSTRIES).optional().default("FUEL_STATION"),
    fuelModuleEnabled: z.boolean().optional(),
    taxRegime: z.enum(["VAT", "PERCENTAGE_TAX"]).optional(),
    percentageTaxRateBps: z.number().int().min(0).max(10_000).optional(),
    products: z.array(productRow).optional().default([]),
    pumps: z.array(pumpRow).optional().default([]),
    openingBalances: z
      .array(
        z.object({
          code: z.string().trim().min(1),
          debit: pesos(true).optional(),
          credit: pesos(true).optional(),
        }),
      )
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (data.industry === "FUEL_STATION") {
      if (data.products.length < 1) {
        ctx.addIssue({ code: "custom", path: ["products"], message: "Add at least one fuel product." });
      }
      if (data.pumps.length < 1) {
        ctx.addIssue({ code: "custom", path: ["pumps"], message: "Add at least one pump." });
      }
    }
  });

export const stationPatchSchema = z.object({
  name: nameField,
  tin: tinField,
  address: z.string().trim().min(8, "Enter the station address.").max(240),
  vatRegistered: z.boolean(),
  industry: z.enum(INDUSTRIES).optional(),
  fuelModuleEnabled: z.boolean().optional(),
  taxRegime: z.enum(["VAT", "PERCENTAGE_TAX"]).optional(),
  percentageTaxRateBps: z.number().int().min(0).max(10_000).optional(),
});

export const productCreateSchema = z.object({
  name: nameField,
  price: pesos(false),
});

export const productPatchSchema = z.object({
  name: nameField.optional(),
  price: pesos(false).optional(),
  active: z.boolean().optional(),
});

export const pumpCreateSchema = z.object({
  name: nameField,
  productId: z.string().min(1, "Choose a fuel for this pump."),
});

export const pumpPatchSchema = z.object({
  name: nameField.optional(),
  productId: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export const shiftSchema = z.object({
  businessDate: dateField,
  name: z.enum(SHIFT_NAMES, { message: "Choose Morning, Afternoon, or Night." }),
  notes: z.string().trim().max(400).optional().default(""),
  cash: pesos(true),
  card: pesos(true),
  credit: pesos(true),
  readings: z
    .array(
      z.object({
        pumpId: z.string().min(1),
        opening: litres,
        closing: litres,
        price: pesos(false),
      }),
    )
    .min(1, "Enter a reading for each pump."),
  charges: z
    .array(
      z.object({
        customerId: z.string().optional(),
        newCustomerName: z.string().trim().max(80).optional(),
        amount: pesos(false),
        note: z.string().trim().max(200).optional().default(""),
      }),
    )
    .optional()
    .default([]),
});

export const expenseSchema = z.object({
  businessDate: dateField,
  category: z.enum(EXPENSE_CATEGORIES, { message: "Choose a category." }),
  amount: pesos(false),
  payee: z.string().trim().max(80).optional().default(""),
  note: z.string().trim().max(240).optional().default(""),
  net: pesos(true).optional(),
  inputVat: pesos(true).optional(),
  withholding: pesos(true).optional(),
  invoiceReference: z.string().trim().max(40).optional().default(""),
  accountCode: z.string().trim().max(16).optional().default(""),
});

export const customerSchema = z.object({
  type: z.enum(CUSTOMER_TYPES).optional().default("INDIVIDUAL"),
  name: nameField,
  contactPerson: z.string().trim().max(80).optional().default(""),
  tin: optionalTinField,
  address: z.string().trim().max(240).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(240).optional().default(""),
  allowsCharge: z.boolean().optional().default(false),
  creditLimit: pesos(true).optional().default(0n),
  paymentTermsDays: z.number().int().min(0).max(365).optional().default(0),
  taxTreatment: z.enum(TAX_TREATMENTS).optional().default("VATABLE"),
  taxExemptReason: z.string().trim().max(240).optional().default(""),
  taxExemptReference: z.string().trim().max(80).optional().default(""),
  taxExemptExpiry: optionalDate,
  isSeniorOrPwd: z.boolean().optional().default(false),
  seniorPwdIdNumber: z.string().trim().max(40).optional().default(""),
  withholdingRateBps: z.union([z.literal(0), z.literal(100), z.literal(200)]).optional().default(0),
});

export const chargeSchema = z.object({
  businessDate: dateField,
  amount: pesos(false),
  note: z.string().trim().max(200).optional().default(""),
  dueDate: optionalDate,
  allowOverLimit: z.boolean().optional().default(false),
});

export const paymentSchema = z.object({
  businessDate: dateField,
  amount: pesos(false),
  note: z.string().trim().max(200).optional().default(""),
  withholding: pesos(true).optional().default(0n),
  bir2307Reference: z.string().trim().max(80).optional().default(""),
});

export const supplierSchema = z.object({
  name: nameField,
  tin: optionalTinField,
  notes: z.string().trim().max(240).optional().default(""),
});

export const billSchema = z.object({
  businessDate: dateField,
  dueDate: optionalDate,
  amount: pesos(false),
  reference: z.string().trim().max(40).optional().default(""),
  note: z.string().trim().max(240).optional().default(""),
  net: pesos(true).optional(),
  vat: pesos(true).optional(),
  withholding: pesos(true).optional(),
});

export const salesInvoiceSchema = z.object({
  businessDate: dateField,
  customerId: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  buyerName: z.string().trim().max(80).optional().default(""),
  buyerTin: optionalTinField,
  buyerAddress: z.string().trim().max(240).optional().default(""),
  taxTreatment: z.enum(TAX_TREATMENTS).optional(),
  isSeniorOrPwd: z.boolean().optional().default(false),
  seniorPwdIdNumber: z.string().trim().max(40).optional().default(""),
  note: z.string().trim().max(240).optional().default(""),
  forceOverLimit: z.boolean().optional().default(false),
  lines: z
    .array(
      z.object({
        itemId: z.string().optional(),
        fuelProductId: z.string().optional(),
        description: z.string().trim().min(1, "Describe each line.").max(120),
        unit: z.string().trim().min(1).max(20).optional().default("pc"),
        qty: qtyScaled,
        unitPrice: pesos(true),
      }),
    )
    .min(1, "Add at least one line."),
});

export const itemSchema = z.object({
  name: nameField,
  unit: z.string().trim().min(1).max(20).optional().default("pc"),
  price: pesos(true),
  taxType: z.enum(TAX_TREATMENTS).optional().default("VATABLE"),
  active: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional(),
  stockQty: qtyScaled.optional(),
});

export const itemPatchSchema = itemSchema.partial();

export const tankSchema = z.object({
  productId: z.string().min(1, "Choose a fuel product."),
  name: nameField,
  capacityLitres: litres.optional().default(0n),
  bookLitres: litres.optional().default(0n),
  avgCostPerLitre: pesos(true).optional().default(0n),
  active: z.boolean().optional().default(true),
});

export const tankPatchSchema = z.object({
  productId: z.string().min(1).optional(),
  name: nameField.optional(),
  capacityLitres: litres.optional(),
  bookLitres: litres.optional(),
  avgCostPerLitre: pesos(true).optional(),
  active: z.boolean().optional(),
});

export const fuelDeliverySchema = z.object({
  businessDate: dateField,
  tankId: z.string().min(1, "Choose a tank."),
  productId: z.string().min(1, "Choose a fuel product."),
  supplierId: z.string().optional(),
  invoiceReference: z.string().trim().max(40).optional().default(""),
  drLitres: litres,
  measuredLitres: litres,
  unitCostPerLitre: pesos(false),
  freight: pesos(true).optional().default(0n),
  inputVat: pesos(true).optional().default(0n),
  withholding: pesos(true).optional().default(0n),
  dueDate: optionalDate,
  receivedBy: z.string().trim().max(80).optional().default(""),
  checkedBy: z.string().trim().max(80).optional().default(""),
  note: z.string().trim().max(240).optional().default(""),
});

export const tankDipSchema = z.object({
  businessDate: dateField,
  tankId: z.string().min(1, "Choose a tank."),
  openingLitres: litres,
  deliveriesLitres: litres.optional().default(0n),
  salesLitres: litres.optional().default(0n),
  physicalLitres: litres,
  investigatedBy: z.string().trim().max(80).optional().default(""),
  note: z.string().trim().max(240).optional().default(""),
});

export const cashReconSchema = z.object({
  businessDate: dateField,
  shiftId: z.string().optional(),
  shiftName: z.string().trim().max(40).optional().default(""),
  cashier: z.string().trim().max(80).optional().default(""),
  openingFloat: pesos(true).optional().default(0n),
  cashSales: pesos(true).optional().default(0n),
  otherReceipts: pesos(true).optional().default(0n),
  paidOut: pesos(true).optional().default(0n),
  counted: pesos(true),
  deposit: pesos(true).optional().default(0n),
  depositDate: optionalDate,
  bankReference: z.string().trim().max(40).optional().default(""),
  reviewedBy: z.string().trim().max(80).optional().default(""),
  note: z.string().trim().max(240).optional().default(""),
});

export const journalEntrySchema = z.object({
  businessDate: dateField,
  description: z.string().trim().min(2, "Describe the entry.").max(200),
  sourceDocument: z.string().trim().max(80).optional().default(""),
  note: z.string().trim().max(240).optional().default(""),
  lines: z
    .array(
      z.object({
        code: z.string().trim().min(1, "Choose an account."),
        debit: pesos(true).optional().default(0n),
        credit: pesos(true).optional().default(0n),
        memo: z.string().trim().max(120).optional().default(""),
      }),
    )
    .min(2, "Add at least two lines."),
});

export const fixedAssetSchema = z.object({
  assetCode: z.string().trim().min(1).max(40),
  description: z.string().trim().min(2).max(200),
  location: z.string().trim().max(120).optional().default(""),
  acquiredDate: dateField,
  supplierName: z.string().trim().max(80).optional().default(""),
  invoiceReference: z.string().trim().max(40).optional().default(""),
  cost: pesos(false),
  residual: pesos(true).optional().default(0n),
  usefulLifeYears: z.number().int().min(1).max(100),
  method: z.literal("STRAIGHT_LINE").optional().default("STRAIGHT_LINE"),
  custodian: z.string().trim().max(80).optional().default(""),
  lastCheckDate: optionalDate,
  note: z.string().trim().max(240).optional().default(""),
});

export const fixedAssetPatchSchema = fixedAssetSchema.partial();

export const payrollSchema = z.object({
  payPeriod: z.string().trim().min(4).max(20),
  employeeId: z.string().trim().max(40).optional().default(""),
  employeeName: nameField,
  position: z.string().trim().max(80).optional().default(""),
  shiftName: z.string().trim().max(40).optional().default(""),
  basicPay: pesos(false),
  allowances: pesos(true).optional().default(0n),
  withholding: pesos(true).optional().default(0n),
  sssEmployee: pesos(true).optional().default(0n),
  philhealthEmployee: pesos(true).optional().default(0n),
  pagibigEmployee: pesos(true).optional().default(0n),
  otherDeductions: pesos(true).optional().default(0n),
  sssEmployer: pesos(true).optional().default(0n),
  philhealthEmployer: pesos(true).optional().default(0n),
  pagibigEmployer: pesos(true).optional().default(0n),
  costCenter: z.string().trim().max(40).optional().default(""),
  approvedBy: z.string().trim().max(80).optional().default(""),
  note: z.string().trim().max(240).optional().default(""),
});

export const payrollPatchSchema = payrollSchema.partial();

export const monthQuerySchema = z.object({
  month: monthField.optional(),
});

export const dateQuerySchema = z.object({
  date: dateField.optional(),
});

export const rangeQuerySchema = z.object({
  from: dateField.optional(),
  to: dateField.optional(),
});

export const asOfQuerySchema = z.object({
  asOf: dateField.optional(),
});
