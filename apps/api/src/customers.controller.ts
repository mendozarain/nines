import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  addDays,
  agingBucket,
  emptyAging,
  formatCentavos,
  manilaToday,
  receivableBalance,
  type AgingBucket,
} from "@nines/shared";
import type { AuthUser } from "./auth";
import { postCollectionJournal } from "./books";
import { AuthGuard, cents, CurrentUser, dateOnly, dayString, notFound, parseBody, stationFor } from "./common";
import { prisma } from "./prisma";
import { chargeSchema, customerSchema, paymentSchema } from "./schemas";

function validateCustomerProfile(input: ReturnType<typeof customerSchema.parse>) {
  if (
    (input.taxTreatment === "VAT_EXEMPT" || input.taxTreatment === "ZERO_RATED") &&
    (!input.taxExemptReason.trim() || !input.taxExemptReference.trim())
  ) {
    throw new BadRequestException(
      "VAT-exempt and zero-rated customers need both a reason and a certificate or BIR reference.",
    );
  }
  if (input.isSeniorOrPwd && !input.seniorPwdIdNumber.trim()) {
    throw new BadRequestException("Enter the senior citizen or PWD ID number.");
  }
}

async function balances(stationId: string) {
  const [charges, payments] = await Promise.all([
    prisma.creditCharge.groupBy({
      by: ["customerId"],
      where: { customer: { stationId } },
      _sum: { amountCentavos: true },
    }),
    prisma.customerPayment.groupBy({
      by: ["customerId"],
      where: { customer: { stationId } },
      _sum: { amountCentavos: true },
    }),
  ]);
  const chargeMap = new Map(charges.map((row) => [row.customerId, row._sum.amountCentavos ?? 0n]));
  const paymentMap = new Map(payments.map((row) => [row.customerId, row._sum.amountCentavos ?? 0n]));
  return { chargeMap, paymentMap };
}

async function agingForCustomer(
  customerId: string,
  asOf: string,
): Promise<{ aging: Record<AgingBucket, string>; openCharges: bigint }> {
  const charges = await prisma.creditCharge.findMany({
    where: { customerId },
    orderBy: [{ businessDate: "asc" }, { createdAt: "asc" }],
  });
  const payments = await prisma.customerPayment.findMany({
    where: { customerId },
    orderBy: [{ businessDate: "asc" }, { createdAt: "asc" }],
  });
  let remainingPayments = payments.reduce((sum, payment) => sum + payment.amountCentavos, 0n);
  const aging = emptyAging();
  let openCharges = 0n;
  for (const charge of charges) {
    let open = charge.amountCentavos;
    if (remainingPayments > 0n) {
      const applied = remainingPayments >= open ? open : remainingPayments;
      open -= applied;
      remainingPayments -= applied;
    }
    if (open <= 0n) continue;
    openCharges += open;
    const due = charge.dueDate ? dayString(charge.dueDate) : dayString(charge.businessDate);
    const bucket = agingBucket(due, asOf);
    aging[bucket] += open;
  }
  return {
    aging: {
      current: cents(aging.current),
      "1-30": cents(aging["1-30"]),
      "31-60": cents(aging["31-60"]),
      "61-90": cents(aging["61-90"]),
      "90+": cents(aging["90+"]),
    },
    openCharges,
  };
}

function serializeCustomerBase(customer: {
  id: string;
  type: string;
  name: string;
  contactPerson: string;
  tin: string;
  address: string;
  phone: string;
  email: string;
  notes: string;
  allowsCharge: boolean;
  creditLimitCentavos: bigint;
  paymentTermsDays: number;
  taxTreatment: string;
  taxExemptReason: string;
  taxExemptReference: string;
  taxExemptExpiry: Date | null;
  isSeniorOrPwd: boolean;
  seniorPwdIdNumber: string;
  withholdingRateBps: number;
}) {
  return {
    id: customer.id,
    type: customer.type,
    name: customer.name,
    contactPerson: customer.contactPerson,
    tin: customer.tin,
    address: customer.address,
    phone: customer.phone,
    email: customer.email,
    notes: customer.notes,
    allowsCharge: customer.allowsCharge,
    creditLimitCentavos: cents(customer.creditLimitCentavos),
    paymentTermsDays: customer.paymentTermsDays,
    taxTreatment: customer.taxTreatment,
    taxExemptReason: customer.taxExemptReason,
    taxExemptReference: customer.taxExemptReference,
    taxExemptExpiry: customer.taxExemptExpiry ? dayString(customer.taxExemptExpiry) : null,
    isSeniorOrPwd: customer.isSeniorOrPwd,
    seniorPwdIdNumber: customer.seniorPwdIdNumber,
    withholdingRateBps: customer.withholdingRateBps,
  };
}

@Controller("customers")
@UseGuards(AuthGuard)
export class CustomersController {
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const station = await stationFor(user.id);
    const asOf = manilaToday();
    const [customers, { chargeMap, paymentMap }] = await Promise.all([
      prisma.customer.findMany({ where: { stationId: station.id }, orderBy: { name: "asc" } }),
      balances(station.id),
    ]);
    const rows = [];
    for (const customer of customers) {
      const charges = chargeMap.get(customer.id) ?? 0n;
      const payments = paymentMap.get(customer.id) ?? 0n;
      const { aging } = await agingForCustomer(customer.id, asOf);
      rows.push({
        ...serializeCustomerBase(customer),
        chargesCentavos: cents(charges),
        paymentsCentavos: cents(payments),
        balanceCentavos: cents(receivableBalance(charges, payments)),
        aging,
      });
    }
    const outstanding = rows.reduce((sum, row) => {
      const balance = BigInt(row.balanceCentavos);
      return balance > 0n ? sum + balance : sum;
    }, 0n);
    const agingSummary = emptyAging();
    for (const row of rows) {
      for (const key of Object.keys(agingSummary) as AgingBucket[]) {
        agingSummary[key] += BigInt(row.aging[key]);
      }
    }
    return {
      outstandingCentavos: cents(outstanding),
      aging: {
        current: cents(agingSummary.current),
        "1-30": cents(agingSummary["1-30"]),
        "31-60": cents(agingSummary["31-60"]),
        "61-90": cents(agingSummary["61-90"]),
        "90+": cents(agingSummary["90+"]),
      },
      customers: rows,
    };
  }

  @Get("aging")
  async agingSummary(@CurrentUser() user: AuthUser) {
    const listed = await this.list(user);
    return {
      outstandingCentavos: listed.outstandingCentavos,
      aging: listed.aging,
    };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const input = parseBody(customerSchema, body);
    validateCustomerProfile(input);
    const customer = await prisma.customer.create({
      data: {
        stationId: station.id,
        type: input.type,
        name: input.name,
        contactPerson: input.contactPerson,
        tin: input.tin,
        address: input.address,
        phone: input.phone,
        email: input.email,
        notes: input.notes,
        allowsCharge: input.allowsCharge,
        creditLimitCentavos: input.creditLimit,
        paymentTermsDays: input.paymentTermsDays,
        taxTreatment: input.taxTreatment,
        taxExemptReason: input.taxExemptReason,
        taxExemptReference: input.taxExemptReference,
        taxExemptExpiry: input.taxExemptExpiry ? dateOnly(input.taxExemptExpiry) : null,
        isSeniorOrPwd: input.isSeniorOrPwd,
        seniorPwdIdNumber: input.seniorPwdIdNumber,
        withholdingRateBps: input.withholdingRateBps,
      },
    });
    return { id: customer.id, name: customer.name };
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const station = await stationFor(user.id);
    const customer = await prisma.customer.findFirst({
      where: { id, stationId: station.id },
      include: {
        charges: { include: { shift: true, invoice: true }, orderBy: [{ businessDate: "desc" }, { createdAt: "desc" }] },
        payments: { orderBy: [{ businessDate: "desc" }, { createdAt: "desc" }] },
      },
    });
    if (!customer) notFound("That customer was not found.");
    const charges = customer.charges.reduce((sum, charge) => sum + charge.amountCentavos, 0n);
    const payments = customer.payments.reduce((sum, payment) => sum + payment.amountCentavos, 0n);
    const asOf = manilaToday();
    const { aging } = await agingForCustomer(customer.id, asOf);
    return {
      ...serializeCustomerBase(customer),
      chargesCentavos: cents(charges),
      paymentsCentavos: cents(payments),
      balanceCentavos: cents(receivableBalance(charges, payments)),
      aging,
      charges: customer.charges.map((charge) => ({
        id: charge.id,
        businessDate: dayString(charge.businessDate),
        dueDate: charge.dueDate ? dayString(charge.dueDate) : null,
        amountCentavos: cents(charge.amountCentavos),
        note: charge.note,
        shiftId: charge.shiftId,
        shiftName: charge.shift?.name ?? null,
        invoiceId: charge.invoiceId,
        invoiceNumber: charge.invoice?.number ?? null,
      })),
      payments: customer.payments.map((payment) => ({
        id: payment.id,
        businessDate: dayString(payment.businessDate),
        amountCentavos: cents(payment.amountCentavos),
        withholdingCentavos: cents(payment.withholdingCentavos),
        bir2307Reference: payment.bir2307Reference,
        note: payment.note,
      })),
    };
  }

  @Get(":id/statement")
  async statement(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const detail = await this.get(user, id);
    const asOf = manilaToday();
    type StatementLine = {
      date: string;
      description: string;
      debitCentavos: string;
      creditCentavos: string;
      sortAt: string;
    };
    const raw: StatementLine[] = [
      ...detail.charges.map((charge) => ({
        date: charge.businessDate,
        description: charge.note || (charge.invoiceNumber ? `Invoice ${charge.invoiceNumber}` : "Charge sale"),
        debitCentavos: charge.amountCentavos,
        creditCentavos: "0",
        sortAt: `${charge.businessDate}T00:00:00.000Z`,
      })),
      ...detail.payments.map((payment) => ({
        date: payment.businessDate,
        description: payment.bir2307Reference
          ? `Collection (BIR 2307 ${payment.bir2307Reference})`
          : payment.note || "Collection",
        debitCentavos: "0",
        creditCentavos: payment.amountCentavos,
        sortAt: `${payment.businessDate}T12:00:00.000Z`,
      })),
    ].sort((a, b) => a.sortAt.localeCompare(b.sortAt) || a.description.localeCompare(b.description));

    let running = 0n;
    const lines = raw.map(({ sortAt: _sortAt, ...line }) => {
      running += BigInt(line.debitCentavos) - BigInt(line.creditCentavos);
      return { ...line, balanceCentavos: cents(running) };
    });

    return {
      asOf,
      customer: {
        id: detail.id,
        name: detail.name,
        type: detail.type,
        tin: detail.tin,
        address: detail.address,
        phone: detail.phone,
        contactPerson: detail.contactPerson,
        paymentTermsDays: detail.paymentTermsDays,
        creditLimitCentavos: detail.creditLimitCentavos,
        balanceCentavos: detail.balanceCentavos,
        chargesCentavos: detail.chargesCentavos,
        paymentsCentavos: detail.paymentsCentavos,
        charges: detail.charges,
        payments: detail.payments,
      },
      aging: detail.aging,
      balanceCentavos: detail.balanceCentavos,
      lines,
      charges: detail.charges,
      payments: detail.payments,
    };
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const existing = await prisma.customer.findFirst({ where: { id, stationId: station.id } });
    if (!existing) notFound("That customer was not found.");
    const input = parseBody(customerSchema, body);
    validateCustomerProfile(input);
    await prisma.customer.update({
      where: { id },
      data: {
        type: input.type,
        name: input.name,
        contactPerson: input.contactPerson,
        tin: input.tin,
        address: input.address,
        phone: input.phone,
        email: input.email,
        notes: input.notes,
        allowsCharge: input.allowsCharge,
        creditLimitCentavos: input.creditLimit,
        paymentTermsDays: input.paymentTermsDays,
        taxTreatment: input.taxTreatment,
        taxExemptReason: input.taxExemptReason,
        taxExemptReference: input.taxExemptReference,
        taxExemptExpiry: input.taxExemptExpiry ? dateOnly(input.taxExemptExpiry) : null,
        isSeniorOrPwd: input.isSeniorOrPwd,
        seniorPwdIdNumber: input.seniorPwdIdNumber,
        withholdingRateBps: input.withholdingRateBps,
      },
    });
    return this.get(user, id);
  }

  @Post(":id/charges")
  async addCharge(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const customer = await prisma.customer.findFirst({ where: { id, stationId: station.id } });
    if (!customer) notFound("That customer was not found.");
    if (!customer.allowsCharge) {
      throw new BadRequestException(`${customer.name} is not set up for charge sales.`);
    }
    const input = parseBody(chargeSchema, body);
    const [chargeSum, paymentSum] = await Promise.all([
      prisma.creditCharge.aggregate({ where: { customerId: id }, _sum: { amountCentavos: true } }),
      prisma.customerPayment.aggregate({ where: { customerId: id }, _sum: { amountCentavos: true } }),
    ]);
    const balance = receivableBalance(chargeSum._sum.amountCentavos ?? 0n, paymentSum._sum.amountCentavos ?? 0n);
    const projected = balance + input.amount;
    if (projected > customer.creditLimitCentavos && !input.allowOverLimit) {
      const remaining = customer.creditLimitCentavos - balance;
      const remainingLabel = remaining > 0n ? formatCentavos(remaining) : formatCentavos(0n);
      throw new BadRequestException(
        `This charge would go over the credit limit. Remaining credit is ${remainingLabel}.`,
      );
    }
    const dueDateIso =
      input.dueDate ??
      (customer.paymentTermsDays > 0 ? addDays(input.businessDate, customer.paymentTermsDays) : input.businessDate);
    await prisma.creditCharge.create({
      data: {
        customerId: id,
        businessDate: dateOnly(input.businessDate),
        dueDate: dateOnly(dueDateIso),
        amountCentavos: input.amount,
        note: input.note,
      },
    });
    return this.get(user, id);
  }

  @Post(":id/payments")
  async addPayment(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const customer = await prisma.customer.findFirst({ where: { id, stationId: station.id } });
    if (!customer) notFound("That customer was not found.");
    const input = parseBody(paymentSchema, body);
    if (input.withholding > input.amount) {
      throw new BadRequestException("Withholding cannot be more than the payment amount.");
    }
    await prisma.$transaction(async (tx) => {
      await tx.customerPayment.create({
        data: {
          customerId: id,
          businessDate: dateOnly(input.businessDate),
          amountCentavos: input.amount,
          withholdingCentavos: input.withholding,
          bir2307Reference: input.bir2307Reference,
          note: input.note,
        },
      });
      await postCollectionJournal(
        station.id,
        {
          businessDate: input.businessDate,
          customerName: customer.name,
          amountCentavos: input.amount,
          withholdingCentavos: input.withholding,
          reference: input.bir2307Reference || undefined,
        },
        tx,
      );
    });
    return this.get(user, id);
  }

  @Delete(":id/payments/:paymentId")
  async removePayment(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("paymentId") paymentId: string,
  ) {
    const station = await stationFor(user.id);
    const payment = await prisma.customerPayment.findFirst({
      where: { id: paymentId, customerId: id, customer: { stationId: station.id } },
    });
    if (!payment) notFound("That payment was not found.");
    await prisma.customerPayment.delete({ where: { id: paymentId } });
    return this.get(user, id);
  }

  @Delete(":id/charges/:chargeId")
  async removeCharge(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("chargeId") chargeId: string,
  ) {
    const station = await stationFor(user.id);
    const charge = await prisma.creditCharge.findFirst({
      where: { id: chargeId, customerId: id, customer: { stationId: station.id } },
    });
    if (!charge) notFound("That charge was not found.");
    if (charge.shiftId) {
      throw new BadRequestException("This charge came from a shift. Delete the shift to remove it.");
    }
    if (charge.invoiceId) {
      throw new BadRequestException("This charge came from an invoice. Delete the invoice to remove it.");
    }
    await prisma.creditCharge.delete({ where: { id: chargeId } });
    return this.get(user, id);
  }
}
