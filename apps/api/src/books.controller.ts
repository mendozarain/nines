import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { manilaToday, TAX_CALENDAR_ITEMS } from "@nines/shared";
import type { AuthUser } from "./auth";
import {
  balanceSheet,
  incomeStatement,
  postJournalEntry,
  serializeJournalEntry,
  trialBalance,
} from "./books";
import { AuthGuard, CurrentUser, parseBody, stationFor } from "./common";
import { prisma } from "./prisma";
import { asOfQuerySchema, journalEntrySchema, rangeQuerySchema } from "./schemas";

@Controller("books")
@UseGuards(AuthGuard)
export class BooksController {
  @Get("accounts")
  async accounts(@CurrentUser() user: AuthUser) {
    const station = await stationFor(user.id);
    const accounts = await prisma.ledgerAccount.findMany({
      where: { stationId: station.id, active: true },
      orderBy: { code: "asc" },
    });
    return {
      accounts: accounts.map((account) => ({
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
        classification: account.classification,
      })),
    };
  }

  @Get("journal")
  async listJournal(@CurrentUser() user: AuthUser, @Query() query: Record<string, string | undefined>) {
    const station = await stationFor(user.id);
    const { from, to } = parseBody(rangeQuerySchema, { from: query.from, to: query.to });
    const entries = await prisma.journalEntry.findMany({
      where: {
        stationId: station.id,
        ...(from || to
          ? {
              businessDate: {
                ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
                ...(to ? { lte: new Date(`${to}T00:00:00.000Z`) } : {}),
              },
            }
          : {}),
      },
      include: { lines: { include: { account: true } } },
      orderBy: [{ businessDate: "desc" }, { entryNumber: "desc" }],
      take: 200,
    });
    return {
      entries: entries.map((entry) => serializeJournalEntry(entry)),
    };
  }

  @Post("journal")
  async createJournal(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const input = parseBody(journalEntrySchema, body);
    const entry = await postJournalEntry(station.id, {
      businessDate: input.businessDate,
      description: input.description,
      sourceDocument: input.sourceDocument,
      note: input.note,
      source: "MANUAL",
      lines: input.lines.map((line) => ({
        code: line.code,
        debitCentavos: line.debit,
        creditCentavos: line.credit,
        memo: line.memo,
      })),
    });
    return serializeJournalEntry(entry);
  }

  @Get("trial-balance")
  async getTrialBalance(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    const station = await stationFor(user.id);
    const { asOf } = parseBody(asOfQuerySchema, { asOf: query.asOf });
    return trialBalance(station.id, asOf);
  }

  @Get("income-statement")
  async getIncomeStatement(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    const station = await stationFor(user.id);
    const { from, to } = parseBody(rangeQuerySchema, { from: query.from, to: query.to });
    const end = to ?? manilaToday();
    const start = from ?? `${end.slice(0, 7)}-01`;
    const statement = await incomeStatement(station.id, start, end);
    return {
      period: `${statement.from} → ${statement.to}`,
      from: statement.from,
      to: statement.to,
      revenue: {
        label: "Revenue",
        rows: statement.revenue,
        totalCentavos: statement.revenueTotalCentavos,
      },
      expenses: {
        label: "Expenses",
        rows: statement.expenses,
        totalCentavos: statement.expenseTotalCentavos,
      },
      netIncomeCentavos: statement.netIncomeCentavos,
      revenueTotalCentavos: statement.revenueTotalCentavos,
      expenseTotalCentavos: statement.expenseTotalCentavos,
    };
  }

  @Get("balance-sheet")
  async getBalanceSheet(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    const station = await stationFor(user.id);
    const { asOf } = parseBody(asOfQuerySchema, { asOf: query.asOf });
    const sheet = await balanceSheet(station.id, asOf ?? manilaToday());
    return {
      asOf: sheet.asOf,
      assets: {
        label: "Assets",
        rows: sheet.assets,
        totalCentavos: sheet.assetTotalCentavos,
      },
      liabilities: {
        label: "Liabilities",
        rows: sheet.liabilities,
        totalCentavos: sheet.liabilityTotalCentavos,
      },
      equity: {
        label: "Equity",
        rows: sheet.equity,
        totalCentavos: sheet.equityTotalCentavos,
      },
      assetTotalCentavos: sheet.assetTotalCentavos,
      liabilityTotalCentavos: sheet.liabilityTotalCentavos,
      equityTotalCentavos: sheet.equityTotalCentavos,
    };
  }

  @Get("tax-calendar")
  taxCalendar() {
    return { items: TAX_CALENDAR_ITEMS };
  }
}
