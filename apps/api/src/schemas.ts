import { z } from "zod";
import {
  EXPENSE_CATEGORIES,
  MoneyInputError,
  SHIFT_NAMES,
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
  .regex(/^\d{3}-\d{3}-\d{3}(-\d{3,5})?$/, "Use the TIN format 123-456-789-000.");

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

const nameField = z.string().trim().min(2, "Enter at least 2 characters.").max(80, "That name is too long.");

export const stationSetupSchema = z.object({
  name: nameField,
  tin: tinField,
  address: z.string().trim().min(8, "Enter the station address.").max(240),
  vatRegistered: z.boolean(),
  products: z
    .array(
      z.object({
        name: nameField,
        price: pesos(false),
      }),
    )
    .min(1, "Add at least one fuel product."),
  pumps: z
    .array(
      z.object({
        name: nameField,
        productName: z.string().trim().min(1, "Choose a fuel for each pump."),
      }),
    )
    .min(1, "Add at least one pump."),
});

export const stationPatchSchema = z.object({
  name: nameField,
  tin: tinField,
  address: z.string().trim().min(8, "Enter the station address.").max(240),
  vatRegistered: z.boolean(),
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
});

export const customerSchema = z.object({
  name: nameField,
  phone: z.string().trim().max(40).optional().default(""),
  notes: z.string().trim().max(240).optional().default(""),
});

export const chargeSchema = z.object({
  businessDate: dateField,
  amount: pesos(false),
  note: z.string().trim().max(200).optional().default(""),
});

export const paymentSchema = z.object({
  businessDate: dateField,
  amount: pesos(false),
  note: z.string().trim().max(200).optional().default(""),
});

export const supplierSchema = z.object({
  name: nameField,
  tin: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{3}-\d{3}-\d{3}(-\d{3,5})?$/.test(value), {
      message: "Use the TIN format 123-456-789-000, or leave it blank.",
    }),
  notes: z.string().trim().max(240).optional().default(""),
});

export const billSchema = z.object({
  businessDate: dateField,
  dueDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine((value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value), { message: "Choose a due date." }),
  amount: pesos(false),
  reference: z.string().trim().max(40).optional().default(""),
  note: z.string().trim().max(240).optional().default(""),
});

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
