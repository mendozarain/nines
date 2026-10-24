import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { manilaMonth } from "@nines/shared";
import type { AuthUser } from "./auth";
import { AuthGuard, cents, CurrentUser, dateOnly, dayString, monthBounds, notFound, parseBody, stationFor } from "./common";
import { prisma } from "./prisma";
import { expenseSchema, monthQuerySchema } from "./schemas";

@Controller("expenses")
@UseGuards(AuthGuard)
export class ExpensesController {
  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: Record<string, string | undefined>) {
    const station = await stationFor(user.id);
    const { month } = parseBody(monthQuerySchema, { month: query.month });
    const selected = month ?? manilaMonth();
    const { start, end } = monthBounds(selected);
    const expenses = await prisma.expense.findMany({
      where: { stationId: station.id, businessDate: { gte: start, lt: end } },
      orderBy: [{ businessDate: "desc" }, { createdAt: "desc" }],
    });
    const total = expenses.reduce((sum, expense) => sum + expense.amountCentavos, 0n);
    return {
      month: selected,
      totalCentavos: cents(total),
      expenses: expenses.map((expense) => ({
        id: expense.id,
        businessDate: dayString(expense.businessDate),
        category: expense.category,
        payee: expense.payee,
        note: expense.note,
        amountCentavos: cents(expense.amountCentavos),
      })),
    };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const input = parseBody(expenseSchema, body);
    const expense = await prisma.expense.create({
      data: {
        stationId: station.id,
        businessDate: dateOnly(input.businessDate),
        category: input.category,
        payee: input.payee,
        note: input.note,
        amountCentavos: input.amount,
      },
    });
    return {
      id: expense.id,
      businessDate: dayString(expense.businessDate),
      category: expense.category,
      payee: expense.payee,
      note: expense.note,
      amountCentavos: cents(expense.amountCentavos),
    };
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const station = await stationFor(user.id);
    const expense = await prisma.expense.findFirst({ where: { id, stationId: station.id } });
    if (!expense) notFound("That expense was not found.");
    await prisma.expense.delete({ where: { id } });
    return { ok: true };
  }
}
