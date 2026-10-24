import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { receivableBalance } from "@nines/shared";
import type { AuthUser } from "./auth";
import { AuthGuard, cents, CurrentUser, dateOnly, dayString, notFound, parseBody, stationFor } from "./common";
import { prisma } from "./prisma";
import { chargeSchema, customerSchema, paymentSchema } from "./schemas";

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

@Controller("customers")
@UseGuards(AuthGuard)
export class CustomersController {
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const station = await stationFor(user.id);
    const [customers, { chargeMap, paymentMap }] = await Promise.all([
      prisma.customer.findMany({ where: { stationId: station.id }, orderBy: { name: "asc" } }),
      balances(station.id),
    ]);
    const rows = customers.map((customer) => {
      const charges = chargeMap.get(customer.id) ?? 0n;
      const payments = paymentMap.get(customer.id) ?? 0n;
      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        notes: customer.notes,
        chargesCentavos: cents(charges),
        paymentsCentavos: cents(payments),
        balanceCentavos: cents(receivableBalance(charges, payments)),
      };
    });
    const outstanding = rows.reduce((sum, row) => {
      const balance = BigInt(row.balanceCentavos);
      return balance > 0n ? sum + balance : sum;
    }, 0n);
    return { outstandingCentavos: cents(outstanding), customers: rows };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const input = parseBody(customerSchema, body);
    const customer = await prisma.customer.create({
      data: { stationId: station.id, name: input.name, phone: input.phone, notes: input.notes },
    });
    return { id: customer.id, name: customer.name };
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const station = await stationFor(user.id);
    const customer = await prisma.customer.findFirst({
      where: { id, stationId: station.id },
      include: {
        charges: { include: { shift: true }, orderBy: [{ businessDate: "desc" }, { createdAt: "desc" }] },
        payments: { orderBy: [{ businessDate: "desc" }, { createdAt: "desc" }] },
      },
    });
    if (!customer) notFound("That customer was not found.");
    const charges = customer.charges.reduce((sum, charge) => sum + charge.amountCentavos, 0n);
    const payments = customer.payments.reduce((sum, payment) => sum + payment.amountCentavos, 0n);
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes,
      chargesCentavos: cents(charges),
      paymentsCentavos: cents(payments),
      balanceCentavos: cents(receivableBalance(charges, payments)),
      charges: customer.charges.map((charge) => ({
        id: charge.id,
        businessDate: dayString(charge.businessDate),
        amountCentavos: cents(charge.amountCentavos),
        note: charge.note,
        shiftId: charge.shiftId,
        shiftName: charge.shift?.name ?? null,
      })),
      payments: customer.payments.map((payment) => ({
        id: payment.id,
        businessDate: dayString(payment.businessDate),
        amountCentavos: cents(payment.amountCentavos),
        note: payment.note,
      })),
    };
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const existing = await prisma.customer.findFirst({ where: { id, stationId: station.id } });
    if (!existing) notFound("That customer was not found.");
    const input = parseBody(customerSchema, body);
    await prisma.customer.update({
      where: { id },
      data: { name: input.name, phone: input.phone, notes: input.notes },
    });
    return this.get(user, id);
  }

  @Post(":id/charges")
  async addCharge(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const customer = await prisma.customer.findFirst({ where: { id, stationId: station.id } });
    if (!customer) notFound("That customer was not found.");
    const input = parseBody(chargeSchema, body);
    await prisma.creditCharge.create({
      data: {
        customerId: id,
        businessDate: dateOnly(input.businessDate),
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
    await prisma.customerPayment.create({
      data: {
        customerId: id,
        businessDate: dateOnly(input.businessDate),
        amountCentavos: input.amount,
        note: input.note,
      },
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
    await prisma.creditCharge.delete({ where: { id: chargeId } });
    return this.get(user, id);
  }
}
