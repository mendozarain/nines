import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { AuthUser } from "./auth";
import { AuthGuard, cents, CurrentUser, dateOnly, dayString, notFound, parseBody, stationFor } from "./common";
import { prisma } from "./prisma";
import { cashReconSchema, dateQuerySchema } from "./schemas";

function serializeRecon(row: {
  id: string;
  businessDate: Date;
  shiftId: string | null;
  shiftName: string;
  cashier: string;
  openingFloatCentavos: bigint;
  cashSalesCentavos: bigint;
  otherReceiptsCentavos: bigint;
  paidOutCentavos: bigint;
  countedCentavos: bigint;
  depositCentavos: bigint;
  depositDate: Date | null;
  bankReference: string;
  reviewedBy: string;
  note: string;
}) {
  const expected =
    row.openingFloatCentavos + row.cashSalesCentavos + row.otherReceiptsCentavos - row.paidOutCentavos;
  return {
    id: row.id,
    businessDate: dayString(row.businessDate),
    shiftId: row.shiftId,
    shiftName: row.shiftName,
    cashier: row.cashier,
    openingFloatCentavos: cents(row.openingFloatCentavos),
    cashSalesCentavos: cents(row.cashSalesCentavos),
    otherReceiptsCentavos: cents(row.otherReceiptsCentavos),
    paidOutCentavos: cents(row.paidOutCentavos),
    expectedCentavos: cents(expected),
    countedCentavos: cents(row.countedCentavos),
    overShortCentavos: cents(row.countedCentavos - expected),
    depositCentavos: cents(row.depositCentavos),
    depositDate: row.depositDate ? dayString(row.depositDate) : null,
    bankReference: row.bankReference,
    reviewedBy: row.reviewedBy,
    note: row.note,
  };
}

@Controller("cash")
@UseGuards(AuthGuard)
export class CashController {
  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: Record<string, string | undefined>) {
    const station = await stationFor(user.id);
    const { date } = parseBody(dateQuerySchema, { date: query.date });
    const where = {
      stationId: station.id,
      ...(date ? { businessDate: dateOnly(date) } : {}),
    };
    const rows = await prisma.cashReconciliation.findMany({
      where,
      orderBy: [{ businessDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    return { date: date ?? null, reconciliations: rows.map(serializeRecon) };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const input = parseBody(cashReconSchema, body);
    if (input.shiftId) {
      const shift = await prisma.shift.findFirst({
        where: { id: input.shiftId, stationId: station.id },
      });
      if (!shift) notFound("That shift was not found.");
    }
    const row = await prisma.cashReconciliation.create({
      data: {
        stationId: station.id,
        businessDate: dateOnly(input.businessDate),
        shiftId: input.shiftId,
        shiftName: input.shiftName,
        cashier: input.cashier,
        openingFloatCentavos: input.openingFloat,
        cashSalesCentavos: input.cashSales,
        otherReceiptsCentavos: input.otherReceipts,
        paidOutCentavos: input.paidOut,
        countedCentavos: input.counted,
        depositCentavos: input.deposit,
        depositDate: input.depositDate ? dateOnly(input.depositDate) : null,
        bankReference: input.bankReference,
        reviewedBy: input.reviewedBy,
        note: input.note,
      },
    });
    return serializeRecon(row);
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const station = await stationFor(user.id);
    const row = await prisma.cashReconciliation.findFirst({
      where: { id, stationId: station.id },
    });
    if (!row) notFound("That cash reconciliation was not found.");
    return serializeRecon(row);
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const existing = await prisma.cashReconciliation.findFirst({
      where: { id, stationId: station.id },
    });
    if (!existing) notFound("That cash reconciliation was not found.");
    const input = parseBody(cashReconSchema, body);
    const row = await prisma.cashReconciliation.update({
      where: { id },
      data: {
        businessDate: dateOnly(input.businessDate),
        shiftId: input.shiftId,
        shiftName: input.shiftName,
        cashier: input.cashier,
        openingFloatCentavos: input.openingFloat,
        cashSalesCentavos: input.cashSales,
        otherReceiptsCentavos: input.otherReceipts,
        paidOutCentavos: input.paidOut,
        countedCentavos: input.counted,
        depositCentavos: input.deposit,
        depositDate: input.depositDate ? dateOnly(input.depositDate) : null,
        bankReference: input.bankReference,
        reviewedBy: input.reviewedBy,
        note: input.note,
      },
    });
    return serializeRecon(row);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const station = await stationFor(user.id);
    const row = await prisma.cashReconciliation.findFirst({
      where: { id, stationId: station.id },
    });
    if (!row) notFound("That cash reconciliation was not found.");
    await prisma.cashReconciliation.delete({ where: { id } });
    return { ok: true };
  }
}
