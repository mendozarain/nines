import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  addDays,
  formatCentavos,
  manilaMonth,
  manilaToday,
  payableBalance,
  receivableBalance,
  splitInclusiveVat,
} from "@nines/shared";
import type { AuthUser } from "./auth";
import { AuthGuard, cents, CurrentUser, dateOnly, dayString, monthBounds, parseBody, stationFor } from "./common";
import { prisma } from "./prisma";
import { dateQuerySchema, monthQuerySchema } from "./schemas";

async function salesBetween(stationId: string, start: Date, end: Date) {
  return prisma.shift.findMany({
    where: { stationId, businessDate: { gte: start, lt: end } },
    include: {
      readings: { include: { pump: { include: { product: true } } } },
    },
    orderBy: [{ businessDate: "asc" }, { sortOrder: "asc" }],
  });
}

function summarize(shifts: Awaited<ReturnType<typeof salesBetween>>) {
  const products = new Map<string, { litres: bigint; amount: bigint }>();
  let sales = 0n;
  let cash = 0n;
  let card = 0n;
  let credit = 0n;
  for (const shift of shifts) {
    cash += shift.cashCentavos;
    card += shift.cardCentavos;
    credit += shift.creditCentavos;
    for (const reading of shift.readings) {
      sales += reading.amountCentavos;
      const name = reading.pump.product.name;
      const current = products.get(name) ?? { litres: 0n, amount: 0n };
      current.litres += reading.litresCentilitres;
      current.amount += reading.amountCentavos;
      products.set(name, current);
    }
  }
  const tendered = cash + card + credit;
  return {
    sales,
    cash,
    card,
    credit,
    overShort: tendered - sales,
    products: [...products.entries()].map(([name, totals]) => ({
      name,
      litresCentilitres: cents(totals.litres),
      amountCentavos: cents(totals.amount),
    })),
  };
}

async function invoiceTaxSplits(stationId: string, start: Date, end: Date) {
  const invoices = await prisma.salesInvoice.findMany({
    where: { stationId, businessDate: { gte: start, lt: end } },
  });
  let gross = 0n;
  let vat = 0n;
  let net = 0n;
  let vatable = 0n;
  let exempt = 0n;
  let zeroRated = 0n;
  let scPwd = 0n;
  for (const invoice of invoices) {
    gross += invoice.grossCentavos;
    vat += invoice.vatCentavos;
    net += invoice.netCentavos;
    scPwd += invoice.scPwdDiscountCentavos;
    if (invoice.isSeniorOrPwd || invoice.taxTreatment === "VAT_EXEMPT") {
      exempt += invoice.netCentavos;
    } else if (invoice.taxTreatment === "ZERO_RATED") {
      zeroRated += invoice.netCentavos;
    } else {
      vatable += invoice.netCentavos;
    }
  }
  return {
    invoiceCount: invoices.length,
    grossCentavos: gross,
    vatCentavos: vat,
    netCentavos: net,
    vatableSalesCentavos: vatable,
    vatExemptSalesCentavos: exempt,
    zeroRatedSalesCentavos: zeroRated,
    scPwdDiscountCentavos: scPwd,
  };
}

@Controller()
@UseGuards(AuthGuard)
export class ReportsController {
  @Get("dashboard")
  async dashboard(@CurrentUser() user: AuthUser) {
    const station = await stationFor(user.id);
    const today = manilaToday();
    const month = manilaMonth();
    const { start, end } = monthBounds(month);
    const seriesStart = dateOnly(addDays(today, -13));
    const tomorrow = dateOnly(addDays(today, 1));
    const [monthShifts, seriesShifts, monthExpenses, allExpensesToday, charges, payments, bills, supplierPayments, invoiceSplits] =
      await Promise.all([
        salesBetween(station.id, start, end),
        salesBetween(station.id, seriesStart, tomorrow),
        prisma.expense.findMany({ where: { stationId: station.id, businessDate: { gte: start, lt: end } } }),
        prisma.expense.findMany({
          where: { stationId: station.id, businessDate: dateOnly(today) },
        }),
        prisma.creditCharge.aggregate({
          where: { customer: { stationId: station.id } },
          _sum: { amountCentavos: true },
        }),
        prisma.customerPayment.aggregate({
          where: { customer: { stationId: station.id } },
          _sum: { amountCentavos: true },
        }),
        prisma.bill.aggregate({
          where: { supplier: { stationId: station.id } },
          _sum: { amountCentavos: true },
        }),
        prisma.supplierPayment.aggregate({
          where: { supplier: { stationId: station.id } },
          _sum: { amountCentavos: true },
        }),
        invoiceTaxSplits(station.id, start, end),
      ]);

    const monthSummary = summarize(monthShifts);
    const todayShifts = monthShifts.filter((shift) => dayString(shift.businessDate) === today);
    const todaySummary = summarize(todayShifts);
    const todayExpenses = allExpensesToday.reduce((sum, expense) => sum + expense.amountCentavos, 0n);
    const monthExpenseTotal = monthExpenses.reduce((sum, expense) => sum + expense.amountCentavos, 0n);
    const combinedGross = monthSummary.sales + invoiceSplits.grossCentavos;
    const vat = station.vatRegistered
      ? {
          netCentavos: splitInclusiveVat(monthSummary.sales).netCentavos + invoiceSplits.netCentavos,
          vatCentavos: splitInclusiveVat(monthSummary.sales).vatCentavos + invoiceSplits.vatCentavos,
        }
      : { netCentavos: combinedGross, vatCentavos: 0n };
    const receivable = receivableBalance(charges._sum.amountCentavos ?? 0n, payments._sum.amountCentavos ?? 0n);
    const payable = payableBalance(bills._sum.amountCentavos ?? 0n, supplierPayments._sum.amountCentavos ?? 0n);

    const salesByDay = new Map<string, bigint>();
    const expensesByDay = new Map<string, bigint>();
    for (let offset = 13; offset >= 0; offset -= 1) {
      const key = addDays(today, -offset);
      salesByDay.set(key, 0n);
      expensesByDay.set(key, 0n);
    }
    for (const shift of seriesShifts) {
      const key = dayString(shift.businessDate);
      const amount = shift.readings.reduce((sum, reading) => sum + reading.amountCentavos, 0n);
      if (salesByDay.has(key)) salesByDay.set(key, (salesByDay.get(key) ?? 0n) + amount);
    }
    const seriesInvoices = await prisma.salesInvoice.findMany({
      where: { stationId: station.id, businessDate: { gte: seriesStart, lt: tomorrow } },
      select: { businessDate: true, totalCentavos: true },
    });
    for (const invoice of seriesInvoices) {
      const key = dayString(invoice.businessDate);
      if (salesByDay.has(key)) salesByDay.set(key, (salesByDay.get(key) ?? 0n) + invoice.totalCentavos);
    }
    const seriesExpenses = await prisma.expense.findMany({
      where: { stationId: station.id, businessDate: { gte: seriesStart, lt: tomorrow } },
      select: { businessDate: true, amountCentavos: true },
    });
    for (const expense of seriesExpenses) {
      const key = dayString(expense.businessDate);
      if (expensesByDay.has(key)) expensesByDay.set(key, (expensesByDay.get(key) ?? 0n) + expense.amountCentavos);
    }

    const todayInvoices = await prisma.salesInvoice.aggregate({
      where: { stationId: station.id, businessDate: dateOnly(today) },
      _sum: { totalCentavos: true },
    });
    const todaySales = todaySummary.sales + (todayInvoices._sum.totalCentavos ?? 0n);

    const dueSoonCutoff = dateOnly(addDays(today, 7));
    const [overdueCharges, billsDueSoon, overLimitCustomers, recentInvoices, recentExpenses] = await Promise.all([
      prisma.creditCharge.findMany({
        where: {
          customer: { stationId: station.id },
          dueDate: { lt: dateOnly(today) },
        },
        include: { customer: true },
        take: 50,
      }),
      prisma.bill.findMany({
        where: {
          supplier: { stationId: station.id },
          dueDate: { gte: dateOnly(today), lte: dueSoonCutoff },
        },
        include: { supplier: true },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
      prisma.customer.findMany({
        where: { stationId: station.id, allowsCharge: true, creditLimitCentavos: { gt: 0n } },
        include: {
          charges: { select: { amountCentavos: true } },
          payments: { select: { amountCentavos: true } },
        },
      }),
      prisma.salesInvoice.findMany({
        where: { stationId: station.id },
        orderBy: [{ businessDate: "desc" }, { createdAt: "desc" }],
        take: 6,
        include: { customer: true },
      }),
      prisma.expense.findMany({
        where: { stationId: station.id },
        orderBy: [{ businessDate: "desc" }, { createdAt: "desc" }],
        take: 6,
      }),
    ]);

    const overdueByCustomer = new Map<string, { name: string; amount: bigint }>();
    for (const charge of overdueCharges) {
      const current = overdueByCustomer.get(charge.customerId) ?? { name: charge.customer.name, amount: 0n };
      current.amount += charge.amountCentavos;
      overdueByCustomer.set(charge.customerId, current);
    }
    // Rough overdue: ignore payments allocation; still useful as attention signal.
    const attention: { id: string; kind: string; title: string; detail: string; href: string; amountCentavos?: string }[] = [];
    for (const [customerId, row] of overdueByCustomer) {
      if (row.amount <= 0n) continue;
      attention.push({
        id: `overdue-${customerId}`,
        kind: "overdue",
        title: `${row.name} has overdue charges`,
        detail: "Past due date on charge sales",
        href: `/customers/${customerId}`,
        amountCentavos: cents(row.amount),
      });
    }
    for (const customer of overLimitCustomers) {
      const charged = customer.charges.reduce((sum, row) => sum + row.amountCentavos, 0n);
      const paid = customer.payments.reduce((sum, row) => sum + row.amountCentavos, 0n);
      const balance = charged - paid;
      if (balance > customer.creditLimitCentavos) {
        attention.push({
          id: `limit-${customer.id}`,
          kind: "credit_limit",
          title: `${customer.name} is over the credit limit`,
          detail: `Limit ${formatCentavos(customer.creditLimitCentavos)}`,
          href: `/customers/${customer.id}`,
          amountCentavos: cents(balance),
        });
      }
    }
    for (const bill of billsDueSoon) {
      attention.push({
        id: `bill-${bill.id}`,
        kind: "bill_due",
        title: `${bill.supplier.name} bill due soon`,
        detail: bill.dueDate ? `Due ${dayString(bill.dueDate)}` : bill.reference || "Supplier bill",
        href: `/payables/${bill.supplierId}`,
        amountCentavos: cents(bill.amountCentavos),
      });
    }
    if (station.vatRegistered) {
      attention.push({
        id: "tax-vat",
        kind: "tax",
        title: "Check VAT filing calendar",
        detail: "Confirm current BIR due dates with your accountant",
        href: "/books/tax-calendar",
      });
    }

    const activity = [
      ...recentInvoices.map((invoice) => ({
        id: `inv-${invoice.id}`,
        kind: "sale" as const,
        title: invoice.customer?.name || invoice.buyerName || invoice.number,
        detail: `Invoice ${invoice.number}`,
        date: dayString(invoice.businessDate),
        amountCentavos: cents(invoice.totalCentavos),
        href: `/sales/${invoice.id}`,
      })),
      ...recentExpenses.map((expense) => ({
        id: `exp-${expense.id}`,
        kind: "expense" as const,
        title: expense.payee || expense.category,
        detail: expense.category,
        date: dayString(expense.businessDate),
        amountCentavos: cents(expense.amountCentavos),
        href: "/expenses",
      })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);

    return {
      today,
      month,
      vatRegistered: station.vatRegistered,
      todaySalesCentavos: cents(todaySales),
      todayExpensesCentavos: cents(todayExpenses),
      todayOverShortCentavos: cents(todaySummary.overShort),
      monthSalesCentavos: cents(monthSummary.sales + invoiceSplits.grossCentavos),
      monthExpensesCentavos: cents(monthExpenseTotal),
      monthNetSalesCentavos: cents(vat.netCentavos),
      monthOutputVatCentavos: cents(vat.vatCentavos),
      receivablesCentavos: cents(receivable),
      payablesCentavos: cents(payable),
      series: [...salesByDay.entries()].map(([date, salesCentavos]) => ({
        date,
        salesCentavos: cents(salesCentavos),
        expensesCentavos: cents(expensesByDay.get(date) ?? 0n),
      })),
      attention: attention.slice(0, 8),
      activity,
    };
  }

  @Get("reports/daily")
  async daily(@CurrentUser() user: AuthUser, @Query() query: Record<string, string | undefined>) {
    const station = await stationFor(user.id);
    const { date } = parseBody(dateQuerySchema, { date: query.date });
    const selected = date ?? manilaToday();
    const day = dateOnly(selected);
    const next = dateOnly(addDays(selected, 1));
    const [shifts, expenses, invoiceSplits] = await Promise.all([
      salesBetween(station.id, day, next),
      prisma.expense.findMany({
        where: { stationId: station.id, businessDate: day },
        orderBy: { createdAt: "asc" },
      }),
      invoiceTaxSplits(station.id, day, next),
    ]);
    const summary = summarize(shifts);
    const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amountCentavos, 0n);
    return {
      date: selected,
      shiftCount: shifts.length,
      ...{
        salesCentavos: cents(summary.sales + invoiceSplits.grossCentavos),
        cashCentavos: cents(summary.cash),
        cardCentavos: cents(summary.card),
        creditCentavos: cents(summary.credit),
        overShortCentavos: cents(summary.overShort),
        products: summary.products,
        invoiceSalesCentavos: cents(invoiceSplits.grossCentavos),
        vatableSalesCentavos: cents(invoiceSplits.vatableSalesCentavos),
        vatExemptSalesCentavos: cents(invoiceSplits.vatExemptSalesCentavos),
        zeroRatedSalesCentavos: cents(invoiceSplits.zeroRatedSalesCentavos),
        scPwdDiscountCentavos: cents(invoiceSplits.scPwdDiscountCentavos),
      },
      expensesCentavos: cents(expenseTotal),
      expenses: expenses.map((expense) => ({
        id: expense.id,
        category: expense.category,
        payee: expense.payee,
        note: expense.note,
        amountCentavos: cents(expense.amountCentavos),
      })),
      shifts: shifts.map((shift) => ({
        id: shift.id,
        name: shift.name,
        salesCentavos: cents(shift.readings.reduce((sum, reading) => sum + reading.amountCentavos, 0n)),
      })),
    };
  }

  @Get("reports/monthly")
  async monthly(@CurrentUser() user: AuthUser, @Query() query: Record<string, string | undefined>) {
    const station = await stationFor(user.id);
    const { month } = parseBody(monthQuerySchema, { month: query.month });
    const selected = month ?? manilaMonth();
    const { start, end } = monthBounds(selected);
    const [shifts, expenses, invoiceSplits] = await Promise.all([
      salesBetween(station.id, start, end),
      prisma.expense.aggregate({
        where: { stationId: station.id, businessDate: { gte: start, lt: end } },
        _sum: { amountCentavos: true },
      }),
      invoiceTaxSplits(station.id, start, end),
    ]);
    const summary = summarize(shifts);
    return {
      month: selected,
      shiftCount: shifts.length,
      salesCentavos: cents(summary.sales + invoiceSplits.grossCentavos),
      expensesCentavos: cents(expenses._sum.amountCentavos),
      cashCentavos: cents(summary.cash),
      cardCentavos: cents(summary.card),
      creditCentavos: cents(summary.credit),
      overShortCentavos: cents(summary.overShort),
      products: summary.products,
      invoiceSalesCentavos: cents(invoiceSplits.grossCentavos),
      vatableSalesCentavos: cents(invoiceSplits.vatableSalesCentavos),
      vatExemptSalesCentavos: cents(invoiceSplits.vatExemptSalesCentavos),
      zeroRatedSalesCentavos: cents(invoiceSplits.zeroRatedSalesCentavos),
      scPwdDiscountCentavos: cents(invoiceSplits.scPwdDiscountCentavos),
      outputVatCentavos: cents(invoiceSplits.vatCentavos),
    };
  }

  @Get("reports/vat")
  async vat(@CurrentUser() user: AuthUser, @Query() query: Record<string, string | undefined>) {
    const station = await stationFor(user.id);
    const { month } = parseBody(monthQuerySchema, { month: query.month });
    const selected = month ?? manilaMonth();
    const { start, end } = monthBounds(selected);
    const [shifts, invoiceSplits] = await Promise.all([
      salesBetween(station.id, start, end),
      invoiceTaxSplits(station.id, start, end),
    ]);
    const summary = summarize(shifts);
    const pumpSplit = station.vatRegistered
      ? splitInclusiveVat(summary.sales)
      : { netCentavos: summary.sales, vatCentavos: 0n };
    const gross = summary.sales + invoiceSplits.grossCentavos;
    const net = pumpSplit.netCentavos + invoiceSplits.netCentavos;
    const outputVat = station.vatRegistered ? pumpSplit.vatCentavos + invoiceSplits.vatCentavos : 0n;

    if (!station.vatRegistered) {
      return {
        month: selected,
        vatRegistered: false,
        grossSalesCentavos: cents(gross),
        netSalesCentavos: cents(gross),
        outputVatCentavos: "0",
        vatableSalesCentavos: "0",
        vatExemptSalesCentavos: cents(invoiceSplits.vatExemptSalesCentavos),
        zeroRatedSalesCentavos: cents(invoiceSplits.zeroRatedSalesCentavos),
        scPwdDiscountCentavos: cents(invoiceSplits.scPwdDiscountCentavos),
        rateLabel: "Not VAT-registered",
        note: "This station is not VAT-registered, so no output VAT is computed. Fuel sales are shown as the full amount collected.",
      };
    }
    return {
      month: selected,
      vatRegistered: true,
      grossSalesCentavos: cents(gross),
      netSalesCentavos: cents(net),
      outputVatCentavos: cents(outputVat),
      vatableSalesCentavos: cents(pumpSplit.netCentavos + invoiceSplits.vatableSalesCentavos),
      vatExemptSalesCentavos: cents(invoiceSplits.vatExemptSalesCentavos),
      zeroRatedSalesCentavos: cents(invoiceSplits.zeroRatedSalesCentavos),
      scPwdDiscountCentavos: cents(invoiceSplits.scPwdDiscountCentavos),
      rateLabel: "12%",
      note: "Pump prices are VAT-inclusive. Output VAT is 12/112 of gross fuel sales plus invoice VAT, rounded to the centavo.",
    };
  }
}
