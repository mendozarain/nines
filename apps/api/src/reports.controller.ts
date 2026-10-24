import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { addDays, manilaMonth, manilaToday, payableBalance, receivableBalance, splitInclusiveVat } from "@nines/shared";
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
    const [monthShifts, seriesShifts, monthExpenses, allExpensesToday, charges, payments, bills, supplierPayments] =
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
      ]);

    const monthSummary = summarize(monthShifts);
    const todayShifts = monthShifts.filter((shift) => dayString(shift.businessDate) === today);
    const todaySummary = summarize(todayShifts);
    const todayExpenses = allExpensesToday.reduce((sum, expense) => sum + expense.amountCentavos, 0n);
    const monthExpenseTotal = monthExpenses.reduce((sum, expense) => sum + expense.amountCentavos, 0n);
    const vat = station.vatRegistered ? splitInclusiveVat(monthSummary.sales) : { netCentavos: monthSummary.sales, vatCentavos: 0n };
    const receivable = receivableBalance(charges._sum.amountCentavos ?? 0n, payments._sum.amountCentavos ?? 0n);
    const payable = payableBalance(bills._sum.amountCentavos ?? 0n, supplierPayments._sum.amountCentavos ?? 0n);

    const byDay = new Map<string, bigint>();
    for (let offset = 13; offset >= 0; offset -= 1) {
      byDay.set(addDays(today, -offset), 0n);
    }
    for (const shift of seriesShifts) {
      const key = dayString(shift.businessDate);
      const amount = shift.readings.reduce((sum, reading) => sum + reading.amountCentavos, 0n);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0n) + amount);
    }

    return {
      today,
      month,
      vatRegistered: station.vatRegistered,
      todaySalesCentavos: cents(todaySummary.sales),
      todayExpensesCentavos: cents(todayExpenses),
      todayOverShortCentavos: cents(todaySummary.overShort),
      monthSalesCentavos: cents(monthSummary.sales),
      monthExpensesCentavos: cents(monthExpenseTotal),
      monthNetSalesCentavos: cents(vat.netCentavos),
      monthOutputVatCentavos: cents(vat.vatCentavos),
      receivablesCentavos: cents(receivable),
      payablesCentavos: cents(payable),
      series: [...byDay.entries()].map(([date, salesCentavos]) => ({
        date,
        salesCentavos: cents(salesCentavos),
      })),
    };
  }

  @Get("reports/daily")
  async daily(@CurrentUser() user: AuthUser, @Query() query: Record<string, string | undefined>) {
    const station = await stationFor(user.id);
    const { date } = parseBody(dateQuerySchema, { date: query.date });
    const selected = date ?? manilaToday();
    const day = dateOnly(selected);
    const next = dateOnly(addDays(selected, 1));
    const [shifts, expenses] = await Promise.all([
      salesBetween(station.id, day, next),
      prisma.expense.findMany({
        where: { stationId: station.id, businessDate: day },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const summary = summarize(shifts);
    const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amountCentavos, 0n);
    return {
      date: selected,
      shiftCount: shifts.length,
      ...{
        salesCentavos: cents(summary.sales),
        cashCentavos: cents(summary.cash),
        cardCentavos: cents(summary.card),
        creditCentavos: cents(summary.credit),
        overShortCentavos: cents(summary.overShort),
        products: summary.products,
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
    const [shifts, expenses] = await Promise.all([
      salesBetween(station.id, start, end),
      prisma.expense.aggregate({
        where: { stationId: station.id, businessDate: { gte: start, lt: end } },
        _sum: { amountCentavos: true },
      }),
    ]);
    const summary = summarize(shifts);
    return {
      month: selected,
      shiftCount: shifts.length,
      salesCentavos: cents(summary.sales),
      expensesCentavos: cents(expenses._sum.amountCentavos),
      cashCentavos: cents(summary.cash),
      cardCentavos: cents(summary.card),
      creditCentavos: cents(summary.credit),
      overShortCentavos: cents(summary.overShort),
      products: summary.products,
    };
  }

  @Get("reports/vat")
  async vat(@CurrentUser() user: AuthUser, @Query() query: Record<string, string | undefined>) {
    const station = await stationFor(user.id);
    const { month } = parseBody(monthQuerySchema, { month: query.month });
    const selected = month ?? manilaMonth();
    const { start, end } = monthBounds(selected);
    const shifts = await salesBetween(station.id, start, end);
    const summary = summarize(shifts);
    if (!station.vatRegistered) {
      return {
        month: selected,
        vatRegistered: false,
        grossSalesCentavos: cents(summary.sales),
        netSalesCentavos: cents(summary.sales),
        outputVatCentavos: "0",
        rateLabel: "Not VAT-registered",
        note: "This station is not VAT-registered, so no output VAT is computed. Fuel sales are shown as the full amount collected.",
      };
    }
    const split = splitInclusiveVat(summary.sales);
    return {
      month: selected,
      vatRegistered: true,
      grossSalesCentavos: cents(summary.sales),
      netSalesCentavos: cents(split.netCentavos),
      outputVatCentavos: cents(split.vatCentavos),
      rateLabel: "12%",
      note: "Pump prices are VAT-inclusive. Output VAT is 12/112 of gross fuel sales, rounded to the centavo.",
    };
  }
}
