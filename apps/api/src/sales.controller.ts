import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import {
  addDays,
  divRound,
  formatCentavos,
  manilaToday,
  receivableBalance,
  taxBreakdown,
  type TaxTreatment,
} from "@nines/shared";
import type { AuthUser } from "./auth";
import { postSaleJournal } from "./books";
import { AuthGuard, cents, CurrentUser, dateOnly, dayString, notFound, parseBody, stationFor } from "./common";
import type { Prisma } from "./generated/prisma/client";
import { prisma } from "./prisma";
import { dateQuerySchema, salesInvoiceSchema } from "./schemas";

async function nextInvoiceNumber(stationId: string, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const count = await tx.salesInvoice.count({ where: { stationId } });
  return `INV-${String(count + 1).padStart(5, "0")}`;
}

function serializeInvoice(invoice: {
  id: string;
  number: string;
  businessDate: Date;
  customerId: string | null;
  customer?: { id: string; name: string } | null;
  paymentMethod: string;
  buyerName: string;
  buyerTin: string;
  buyerAddress: string;
  taxTreatment: string;
  isSeniorOrPwd: boolean;
  seniorPwdIdNumber: string;
  discountCentavos: bigint;
  scPwdDiscountCentavos: bigint;
  grossCentavos: bigint;
  vatCentavos: bigint;
  netCentavos: bigint;
  totalCentavos: bigint;
  note: string;
  lines: {
    id: string;
    itemId: string | null;
    fuelProductId: string | null;
    description: string;
    unit: string;
    qtyScaled: bigint;
    unitPriceCentavos: bigint;
    amountCentavos: bigint;
    vatCentavos: bigint;
  }[];
}) {
  return {
    id: invoice.id,
    number: invoice.number,
    businessDate: dayString(invoice.businessDate),
    customerId: invoice.customerId,
    customerName: invoice.customer?.name ?? null,
    paymentMethod: invoice.paymentMethod,
    buyerName: invoice.buyerName,
    buyerTin: invoice.buyerTin,
    buyerAddress: invoice.buyerAddress,
    taxTreatment: invoice.taxTreatment,
    isSeniorOrPwd: invoice.isSeniorOrPwd,
    seniorPwdIdNumber: invoice.seniorPwdIdNumber,
    discountCentavos: cents(invoice.discountCentavos),
    scPwdDiscountCentavos: cents(invoice.scPwdDiscountCentavos),
    grossCentavos: cents(invoice.grossCentavos),
    vatCentavos: cents(invoice.vatCentavos),
    netCentavos: cents(invoice.netCentavos),
    totalCentavos: cents(invoice.totalCentavos),
    note: invoice.note,
    lines: invoice.lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      fuelProductId: line.fuelProductId,
      description: line.description,
      unit: line.unit,
      qtyScaled: cents(line.qtyScaled),
      unitPriceCentavos: cents(line.unitPriceCentavos),
      amountCentavos: cents(line.amountCentavos),
      vatCentavos: cents(line.vatCentavos),
    })),
  };
}

@Controller("sales")
@UseGuards(AuthGuard)
export class SalesController {
  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: Record<string, string | undefined>) {
    const station = await stationFor(user.id);
    const { date } = parseBody(dateQuerySchema, { date: query.date });
    const selected = date ?? manilaToday();
    const invoices = await prisma.salesInvoice.findMany({
      where: { stationId: station.id, businessDate: dateOnly(selected) },
      include: { customer: true, lines: true },
      orderBy: [{ createdAt: "desc" }],
    });
    const total = invoices.reduce((sum, invoice) => sum + invoice.totalCentavos, 0n);
    return {
      date: selected,
      totalCentavos: cents(total),
      invoices: invoices.map((invoice) => serializeInvoice(invoice)),
    };
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const station = await stationFor(user.id);
    const invoice = await prisma.salesInvoice.findFirst({
      where: { id, stationId: station.id },
      include: { customer: true, lines: true },
    });
    if (!invoice) notFound("That invoice was not found.");
    return serializeInvoice(invoice);
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const input = parseBody(salesInvoiceSchema, body);

    let customer: Awaited<ReturnType<typeof prisma.customer.findFirst>> = null;
    if (input.customerId) {
      customer = await prisma.customer.findFirst({
        where: { id: input.customerId, stationId: station.id },
      });
      if (!customer) throw new BadRequestException("Choose a customer on your books.");
    }

    if (input.isSeniorOrPwd && !input.seniorPwdIdNumber.trim() && !customer?.seniorPwdIdNumber) {
      throw new BadRequestException("Enter the senior citizen or PWD ID number.");
    }

    const taxTreatment = (input.taxTreatment ??
      customer?.taxTreatment ??
      "VATABLE") as TaxTreatment;
    const isSeniorOrPwd = input.isSeniorOrPwd || Boolean(customer?.isSeniorOrPwd);
    const seniorPwdIdNumber =
      input.seniorPwdIdNumber || customer?.seniorPwdIdNumber || "";

    if (input.paymentMethod === "CHARGE") {
      if (!customer) throw new BadRequestException("Charge sales need a customer.");
      if (!customer.allowsCharge) {
        throw new BadRequestException(`${customer.name} is not set up for charge sales.`);
      }
    }

    const lineAmounts = input.lines.map((line) => {
      const amountCentavos = divRound(line.qty * line.unitPrice, 100n);
      return { ...line, amountCentavos };
    });
    const grossCentavos = lineAmounts.reduce((sum, line) => sum + line.amountCentavos, 0n);
    if (grossCentavos <= 0n) {
      throw new BadRequestException("Invoice total must be greater than zero.");
    }

    const tax = taxBreakdown(grossCentavos, taxTreatment, { seniorOrPwd: isSeniorOrPwd });

    // Allocate VAT across lines proportionally for reporting.
    let allocatedVat = 0n;
    const linesWithVat = lineAmounts.map((line, index) => {
      if (index === lineAmounts.length - 1) {
        return { ...line, vatCentavos: tax.vatCentavos - allocatedVat };
      }
      const share =
        grossCentavos === 0n ? 0n : (line.amountCentavos * tax.vatCentavos) / grossCentavos;
      allocatedVat += share;
      return { ...line, vatCentavos: share };
    });

    if (input.paymentMethod === "CHARGE" && customer) {
      const [chargeSum, paymentSum] = await Promise.all([
        prisma.creditCharge.aggregate({ where: { customerId: customer.id }, _sum: { amountCentavos: true } }),
        prisma.customerPayment.aggregate({
          where: { customerId: customer.id },
          _sum: { amountCentavos: true },
        }),
      ]);
      const balance = receivableBalance(
        chargeSum._sum.amountCentavos ?? 0n,
        paymentSum._sum.amountCentavos ?? 0n,
      );
      const projected = balance + tax.totalCentavos;
      if (projected > customer.creditLimitCentavos && !input.forceOverLimit) {
        const remaining = customer.creditLimitCentavos - balance;
        throw new BadRequestException(
          `This sale would go over the credit limit. Remaining credit is ${formatCentavos(remaining > 0n ? remaining : 0n)}.`,
        );
      }
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const number = await nextInvoiceNumber(station.id, tx);
      const created = await tx.salesInvoice.create({
        data: {
          stationId: station.id,
          number,
          businessDate: dateOnly(input.businessDate),
          customerId: customer?.id,
          paymentMethod: input.paymentMethod,
          buyerName: input.buyerName || customer?.name || "",
          buyerTin: input.buyerTin || customer?.tin || "",
          buyerAddress: input.buyerAddress || customer?.address || "",
          taxTreatment,
          isSeniorOrPwd,
          seniorPwdIdNumber,
          discountCentavos: tax.discountCentavos,
          scPwdDiscountCentavos: tax.scPwdDiscountCentavos,
          grossCentavos: tax.grossCentavos,
          vatCentavos: tax.vatCentavos,
          netCentavos: tax.netCentavos,
          totalCentavos: tax.totalCentavos,
          note: input.note,
          lines: {
            create: linesWithVat.map((line) => ({
              itemId: line.itemId,
              fuelProductId: line.fuelProductId,
              description: line.description,
              unit: line.unit,
              qtyScaled: line.qty,
              unitPriceCentavos: line.unitPrice,
              amountCentavos: line.amountCentavos,
              vatCentavos: line.vatCentavos,
            })),
          },
        },
        include: { customer: true, lines: true },
      });

      if (input.paymentMethod === "CHARGE" && customer) {
        const dueDate =
          customer.paymentTermsDays > 0
            ? addDays(input.businessDate, customer.paymentTermsDays)
            : input.businessDate;
        await tx.creditCharge.create({
          data: {
            customerId: customer.id,
            invoiceId: created.id,
            businessDate: dateOnly(input.businessDate),
            dueDate: dateOnly(dueDate),
            amountCentavos: tax.totalCentavos,
            note: `Invoice ${number}`,
          },
        });
      }

      for (const line of linesWithVat) {
        if (line.itemId) {
          const item = await tx.item.findFirst({
            where: { id: line.itemId, stationId: station.id },
          });
          if (!item) throw new BadRequestException(`Item on line "${line.description}" was not found.`);
          await tx.item.update({
            where: { id: item.id },
            data: { stockQtyScaled: item.stockQtyScaled - line.qty },
          });
        }
      }

      await postSaleJournal(
        station.id,
        {
          businessDate: input.businessDate,
          invoiceNumber: number,
          paymentMethod: input.paymentMethod,
          totalCentavos: tax.totalCentavos,
          netCentavos: tax.netCentavos,
          vatCentavos: tax.vatCentavos,
        },
        tx,
      );

      return created;
    });

    return serializeInvoice(invoice);
  }
}
