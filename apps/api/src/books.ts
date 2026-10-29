import { BadRequestException } from "@nestjs/common";
import { chartOfAccountsFor, splitInclusiveVat } from "@nines/shared";
import type { Prisma } from "./generated/prisma/client";
import { prisma } from "./prisma";
import { cents, dateOnly, dayString } from "./common";

export function shiftJournalSourceDocument(shiftId: string) {
  return `SHIFT:${shiftId}`;
}

type Tx = Prisma.TransactionClient;

export async function ensureChartOfAccounts(
  stationId: string,
  fuelModuleEnabled: boolean,
  tx: Tx | typeof prisma = prisma,
) {
  const accounts = chartOfAccountsFor(fuelModuleEnabled);
  for (const account of accounts) {
    await tx.ledgerAccount.upsert({
      where: { stationId_code: { stationId, code: account.code } },
      create: {
        stationId,
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
        classification: account.classification,
      },
      update: {
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
        classification: account.classification,
        active: true,
      },
    });
  }
}

async function nextEntryNumber(stationId: string, tx: Tx) {
  const count = await tx.journalEntry.count({ where: { stationId } });
  return `JE-${String(count + 1).padStart(5, "0")}`;
}

export type JournalLineInput = {
  code: string;
  debitCentavos?: bigint;
  creditCentavos?: bigint;
  memo?: string;
};

export async function postJournalEntry(
  stationId: string,
  input: {
    businessDate: string;
    description: string;
    source?: string;
    sourceDocument?: string;
    note?: string;
    lines: JournalLineInput[];
  },
  tx: Tx | typeof prisma = prisma,
) {
  const debit = input.lines.reduce((sum, line) => sum + (line.debitCentavos ?? 0n), 0n);
  const credit = input.lines.reduce((sum, line) => sum + (line.creditCentavos ?? 0n), 0n);
  if (debit !== credit) {
    throw new BadRequestException("Journal entry must balance (debits equal credits).");
  }
  if (debit === 0n) {
    throw new BadRequestException("Add at least one debit and credit line.");
  }

  const codes = [...new Set(input.lines.map((line) => line.code))];
  const accounts = await tx.ledgerAccount.findMany({
    where: { stationId, code: { in: codes } },
  });
  const byCode = new Map(accounts.map((account) => [account.code, account]));
  for (const code of codes) {
    if (!byCode.has(code)) {
      throw new BadRequestException(`Account ${code} is not on the chart of accounts.`);
    }
  }

  const entryNumber = await nextEntryNumber(stationId, tx as Tx);
  return tx.journalEntry.create({
    data: {
      stationId,
      entryNumber,
      businessDate: dateOnly(input.businessDate),
      description: input.description,
      source: input.source ?? "MANUAL",
      sourceDocument: input.sourceDocument ?? "",
      note: input.note ?? "",
      lines: {
        create: input.lines.map((line) => ({
          accountId: byCode.get(line.code)!.id,
          debitCentavos: line.debitCentavos ?? 0n,
          creditCentavos: line.creditCentavos ?? 0n,
          memo: line.memo ?? "",
        })),
      },
    },
    include: { lines: { include: { account: true } } },
  });
}

export function serializeJournalEntry(
  entry: Awaited<ReturnType<typeof postJournalEntry>>,
) {
  return {
    id: entry.id,
    entryNumber: entry.entryNumber,
    businessDate: dayString(entry.businessDate),
    description: entry.description,
    source: entry.source,
    sourceDocument: entry.sourceDocument,
    note: entry.note,
    lines: entry.lines.map((line) => ({
      id: line.id,
      accountId: line.accountId,
      code: line.account.code,
      name: line.account.name,
      debitCentavos: cents(line.debitCentavos),
      creditCentavos: cents(line.creditCentavos),
      memo: line.memo,
    })),
  };
}

/** Cash / card / e-wallet / AR → sales + output VAT. */
export async function postSaleJournal(
  stationId: string,
  input: {
    businessDate: string;
    invoiceNumber: string;
    paymentMethod: string;
    totalCentavos: bigint;
    netCentavos: bigint;
    vatCentavos: bigint;
  },
  tx: Tx | typeof prisma = prisma,
) {
  if (input.totalCentavos <= 0n) return null;
  const tenderCode =
    input.paymentMethod === "CHARGE"
      ? "1100"
      : input.paymentMethod === "CARD" || input.paymentMethod === "EWALLET"
        ? "1030"
        : "1000";

  const salesCredit = input.netCentavos > 0n ? input.netCentavos : input.totalCentavos - input.vatCentavos;
  const lines: JournalLineInput[] = [
    { code: tenderCode, debitCentavos: input.totalCentavos, memo: `Invoice ${input.invoiceNumber}` },
    { code: "4030", creditCentavos: salesCredit, memo: "Sales" },
  ];
  if (input.vatCentavos > 0n) {
    lines.push({ code: "2040", creditCentavos: input.vatCentavos, memo: "Output VAT" });
  }

  return postJournalEntry(
    stationId,
    {
      businessDate: input.businessDate,
      description: `Sale ${input.invoiceNumber}`,
      source: "SALE",
      sourceDocument: input.invoiceNumber,
      lines,
    },
    tx,
  );
}

export async function postCollectionJournal(
  stationId: string,
  input: {
    businessDate: string;
    customerName: string;
    amountCentavos: bigint;
    withholdingCentavos: bigint;
    reference?: string;
  },
  tx: Tx | typeof prisma = prisma,
) {
  if (input.withholdingCentavos > input.amountCentavos) {
    throw new BadRequestException("Withholding cannot be more than the payment amount.");
  }
  if (input.amountCentavos <= 0n) {
    throw new BadRequestException("Collection amount must be greater than zero.");
  }
  const cash = input.amountCentavos - input.withholdingCentavos;
  const lines: JournalLineInput[] = [];
  if (cash > 0n) {
    lines.push({ code: "1000", debitCentavos: cash, memo: "Collection" });
  }
  if (input.withholdingCentavos > 0n) {
    lines.push({
      code: "1110",
      debitCentavos: input.withholdingCentavos,
      memo: input.reference ? `BIR 2307 ${input.reference}` : "Creditable withholding",
    });
  }
  lines.push({ code: "1100", creditCentavos: input.amountCentavos, memo: input.customerName });
  return postJournalEntry(
    stationId,
    {
      businessDate: input.businessDate,
      description: `Collection from ${input.customerName}`,
      source: "COLLECTION",
      sourceDocument: input.reference ?? "",
      lines,
    },
    tx,
  );
}

export async function postExpenseJournal(
  stationId: string,
  input: {
    businessDate: string;
    payee: string;
    amountCentavos: bigint;
    netCentavos: bigint;
    inputVatCentavos: bigint;
    withholdingCentavos: bigint;
    accountCode?: string;
  },
  tx: Tx | typeof prisma = prisma,
) {
  if (input.withholdingCentavos > input.amountCentavos) {
    throw new BadRequestException("Withholding cannot be more than the expense amount.");
  }
  const expenseCode = input.accountCode && input.accountCode.length > 0 ? input.accountCode : "6040";
  const cashPaid = input.amountCentavos - input.withholdingCentavos;
  const expenseDebit =
    input.netCentavos > 0n
      ? input.netCentavos
      : input.amountCentavos - input.inputVatCentavos;
  const lines: JournalLineInput[] = [
    { code: expenseCode, debitCentavos: expenseDebit > 0n ? expenseDebit : input.amountCentavos },
  ];
  if (input.inputVatCentavos > 0n) {
    lines.push({ code: "1240", debitCentavos: input.inputVatCentavos, memo: "Input VAT" });
  }
  if (input.withholdingCentavos > 0n) {
    lines.push({ code: "2050", creditCentavos: input.withholdingCentavos, memo: "Withholding" });
  }
  if (cashPaid > 0n) {
    lines.push({ code: "1000", creditCentavos: cashPaid, memo: input.payee || "Expense" });
  }
  return postJournalEntry(
    stationId,
    {
      businessDate: input.businessDate,
      description: `Expense — ${input.payee || expenseCode}`,
      source: "EXPENSE",
      lines,
    },
    tx,
  );
}

/**
 * Pump-shift sales: debit cash / card clearing / AR for tendered amounts,
 * credit sales + output VAT for meter sales, and park over/short in P&L.
 * sourceDocument is SHIFT:<shiftId> so updates can replace the entry.
 */
export async function postShiftSalesJournal(
  stationId: string,
  input: {
    businessDate: string;
    shiftId: string;
    shiftName: string;
    cashCentavos: bigint;
    cardCentavos: bigint;
    creditCentavos: bigint;
    expectedSalesCentavos: bigint;
    vatRegistered?: boolean;
  },
  tx: Tx | typeof prisma = prisma,
) {
  const expected = input.expectedSalesCentavos < 0n ? 0n : input.expectedSalesCentavos;
  const cash = input.cashCentavos < 0n ? 0n : input.cashCentavos;
  const card = input.cardCentavos < 0n ? 0n : input.cardCentavos;
  const credit = input.creditCentavos < 0n ? 0n : input.creditCentavos;
  if (expected === 0n && cash === 0n && card === 0n && credit === 0n) {
    return null;
  }

  const tendered = cash + card + credit;
  const difference = tendered - expected;
  const split =
    input.vatRegistered === false || expected === 0n
      ? { netCentavos: expected, vatCentavos: 0n }
      : splitInclusiveVat(expected);

  const lines: JournalLineInput[] = [];
  if (cash > 0n) lines.push({ code: "1000", debitCentavos: cash, memo: "Cash counted" });
  if (card > 0n) lines.push({ code: "1030", debitCentavos: card, memo: "Card / e-wallet" });
  if (credit > 0n) lines.push({ code: "1100", debitCentavos: credit, memo: "Charge sales" });
  if (difference < 0n) {
    lines.push({ code: "7200", debitCentavos: -difference, memo: "Cash short" });
  }
  if (split.netCentavos > 0n) {
    lines.push({ code: "4030", creditCentavos: split.netCentavos, memo: "Shift sales" });
  }
  if (split.vatCentavos > 0n) {
    lines.push({ code: "2040", creditCentavos: split.vatCentavos, memo: "Output VAT" });
  }
  if (difference > 0n) {
    lines.push({ code: "4040", creditCentavos: difference, memo: "Cash over" });
  }

  return postJournalEntry(
    stationId,
    {
      businessDate: input.businessDate,
      description: `${input.shiftName} shift sales`,
      source: "SALE",
      sourceDocument: shiftJournalSourceDocument(input.shiftId),
      lines,
    },
    tx,
  );
}

export async function removeJournalsBySourceDocument(
  stationId: string,
  sourceDocument: string,
  tx: Tx | typeof prisma = prisma,
) {
  const entries = await tx.journalEntry.findMany({
    where: { stationId, sourceDocument },
    select: { id: true },
  });
  for (const entry of entries) {
    await tx.journalLine.deleteMany({ where: { entryId: entry.id } });
    await tx.journalEntry.delete({ where: { id: entry.id } });
  }
}

/** Opening float / capital so cash expenses have cash to draw from. */
export async function postOpeningCashJournal(
  stationId: string,
  input: { businessDate: string; cashCentavos: bigint; note?: string },
  tx: Tx | typeof prisma = prisma,
) {
  if (input.cashCentavos <= 0n) return null;
  return postJournalEntry(
    stationId,
    {
      businessDate: input.businessDate,
      description: input.note ?? "Opening cash on hand",
      source: "OPENING",
      sourceDocument: "OPENING-CASH",
      lines: [
        { code: "1000", debitCentavos: input.cashCentavos, memo: "Opening cash" },
        { code: "3000", creditCentavos: input.cashCentavos, memo: "Owner's capital" },
      ],
    },
    tx,
  );
}

export async function trialBalance(stationId: string, asOf?: string) {
  const where: Prisma.JournalLineWhereInput = {
    entry: {
      stationId,
      ...(asOf ? { businessDate: { lte: dateOnly(asOf) } } : {}),
    },
  };
  const lines = await prisma.journalLine.findMany({
    where,
    include: { account: true },
  });
  const map = new Map<
    string,
    { code: string; name: string; type: string; debit: bigint; credit: bigint }
  >();
  for (const line of lines) {
    const current = map.get(line.accountId) ?? {
      code: line.account.code,
      name: line.account.name,
      type: line.account.type,
      debit: 0n,
      credit: 0n,
    };
    current.debit += line.debitCentavos;
    current.credit += line.creditCentavos;
    map.set(line.accountId, current);
  }
  const rows = [...map.values()]
    .map((row) => {
      const net = row.debit - row.credit;
      const debitCentavos = net > 0n ? net : 0n;
      const creditCentavos = net < 0n ? -net : 0n;
      return {
        code: row.code,
        name: row.name,
        type: row.type,
        debitCentavos: cents(debitCentavos),
        creditCentavos: cents(creditCentavos),
      };
    })
    .filter((row) => row.debitCentavos !== "0" || row.creditCentavos !== "0")
    .sort((a, b) => a.code.localeCompare(b.code));

  const totalDebit = rows.reduce((sum, row) => sum + BigInt(row.debitCentavos), 0n);
  const totalCredit = rows.reduce((sum, row) => sum + BigInt(row.creditCentavos), 0n);
  return {
    asOf: asOf ?? null,
    rows,
    totalDebitCentavos: cents(totalDebit),
    totalCreditCentavos: cents(totalCredit),
    balanced: totalDebit === totalCredit,
  };
}

export async function incomeStatement(stationId: string, from: string, to: string) {
  const lines = await prisma.journalLine.findMany({
    where: {
      entry: {
        stationId,
        businessDate: { gte: dateOnly(from), lte: dateOnly(to) },
      },
      account: { type: { in: ["REVENUE", "EXPENSE"] } },
    },
    include: { account: true },
  });
  const map = new Map<string, { code: string; name: string; type: string; amount: bigint }>();
  for (const line of lines) {
    const current = map.get(line.accountId) ?? {
      code: line.account.code,
      name: line.account.name,
      type: line.account.type,
      amount: 0n,
    };
    if (line.account.type === "REVENUE") {
      current.amount += line.creditCentavos - line.debitCentavos;
    } else {
      current.amount += line.debitCentavos - line.creditCentavos;
    }
    map.set(line.accountId, current);
  }
  const revenue = [...map.values()]
    .filter((row) => row.type === "REVENUE")
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((row) => ({ code: row.code, name: row.name, amountCentavos: cents(row.amount) }));
  const expenses = [...map.values()]
    .filter((row) => row.type === "EXPENSE")
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((row) => ({ code: row.code, name: row.name, amountCentavos: cents(row.amount) }));
  const revenueTotal = revenue.reduce((sum, row) => sum + BigInt(row.amountCentavos), 0n);
  const expenseTotal = expenses.reduce((sum, row) => sum + BigInt(row.amountCentavos), 0n);
  return {
    from,
    to,
    revenue,
    expenses,
    revenueTotalCentavos: cents(revenueTotal),
    expenseTotalCentavos: cents(expenseTotal),
    netIncomeCentavos: cents(revenueTotal - expenseTotal),
  };
}

export async function balanceSheet(stationId: string, asOf: string) {
  const tb = await trialBalance(stationId, asOf);
  const accounts = await prisma.ledgerAccount.findMany({ where: { stationId } });
  const byCode = new Map(accounts.map((a) => [a.code, a]));
  const assets: { code: string; name: string; amountCentavos: string }[] = [];
  const liabilities: { code: string; name: string; amountCentavos: string }[] = [];
  const equity: { code: string; name: string; amountCentavos: string }[] = [];

  for (const row of tb.rows) {
    const account = byCode.get(row.code);
    if (!account) continue;
    const amount = BigInt(row.debitCentavos) - BigInt(row.creditCentavos);
    if (account.type === "ASSET" || account.type === "CONTRA_ASSET") {
      assets.push({ code: row.code, name: row.name, amountCentavos: cents(amount) });
    } else if (account.type === "LIABILITY") {
      liabilities.push({ code: row.code, name: row.name, amountCentavos: cents(-amount) });
    } else if (account.type === "EQUITY") {
      equity.push({ code: row.code, name: row.name, amountCentavos: cents(-amount) });
    }
  }

  // Fold P&L into current year profit for the balance sheet view.
  const pl = await incomeStatement(stationId, "1970-01-01", asOf);
  if (BigInt(pl.netIncomeCentavos) !== 0n) {
    equity.push({
      code: "3300",
      name: "Current year profit/loss",
      amountCentavos: pl.netIncomeCentavos,
    });
  }

  const assetTotal = assets.reduce((sum, row) => sum + BigInt(row.amountCentavos), 0n);
  const liabilityTotal = liabilities.reduce((sum, row) => sum + BigInt(row.amountCentavos), 0n);
  const equityTotal = equity.reduce((sum, row) => sum + BigInt(row.amountCentavos), 0n);
  return {
    asOf,
    assets,
    liabilities,
    equity,
    assetTotalCentavos: cents(assetTotal),
    liabilityTotalCentavos: cents(liabilityTotal),
    equityTotalCentavos: cents(equityTotal),
  };
}
