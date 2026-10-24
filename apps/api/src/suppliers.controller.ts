import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { payableBalance } from "@nines/shared";
import type { AuthUser } from "./auth";
import { AuthGuard, cents, CurrentUser, dateOnly, dayString, notFound, parseBody, stationFor } from "./common";
import { prisma } from "./prisma";
import { billSchema, paymentSchema, supplierSchema } from "./schemas";

@Controller("suppliers")
@UseGuards(AuthGuard)
export class SuppliersController {
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const station = await stationFor(user.id);
    const suppliers = await prisma.supplier.findMany({
      where: { stationId: station.id },
      include: { bills: true, payments: true },
      orderBy: { name: "asc" },
    });
    const rows = suppliers.map((supplier) => {
      const bills = supplier.bills.reduce((sum, bill) => sum + bill.amountCentavos, 0n);
      const payments = supplier.payments.reduce((sum, payment) => sum + payment.amountCentavos, 0n);
      return {
        id: supplier.id,
        name: supplier.name,
        tin: supplier.tin,
        notes: supplier.notes,
        billsCentavos: cents(bills),
        paymentsCentavos: cents(payments),
        balanceCentavos: cents(payableBalance(bills, payments)),
      };
    });
    const outstanding = rows.reduce((sum, row) => {
      const balance = BigInt(row.balanceCentavos);
      return balance > 0n ? sum + balance : sum;
    }, 0n);
    return { outstandingCentavos: cents(outstanding), suppliers: rows };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const input = parseBody(supplierSchema, body);
    const supplier = await prisma.supplier.create({
      data: { stationId: station.id, name: input.name, tin: input.tin, notes: input.notes },
    });
    return { id: supplier.id, name: supplier.name };
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const station = await stationFor(user.id);
    const supplier = await prisma.supplier.findFirst({
      where: { id, stationId: station.id },
      include: {
        bills: { orderBy: [{ businessDate: "desc" }, { createdAt: "desc" }] },
        payments: { orderBy: [{ businessDate: "desc" }, { createdAt: "desc" }] },
      },
    });
    if (!supplier) notFound("That supplier was not found.");
    const bills = supplier.bills.reduce((sum, bill) => sum + bill.amountCentavos, 0n);
    const payments = supplier.payments.reduce((sum, payment) => sum + payment.amountCentavos, 0n);
    return {
      id: supplier.id,
      name: supplier.name,
      tin: supplier.tin,
      notes: supplier.notes,
      billsCentavos: cents(bills),
      paymentsCentavos: cents(payments),
      balanceCentavos: cents(payableBalance(bills, payments)),
      bills: supplier.bills.map((bill) => ({
        id: bill.id,
        businessDate: dayString(bill.businessDate),
        dueDate: bill.dueDate ? dayString(bill.dueDate) : null,
        reference: bill.reference,
        note: bill.note,
        amountCentavos: cents(bill.amountCentavos),
      })),
      payments: supplier.payments.map((payment) => ({
        id: payment.id,
        businessDate: dayString(payment.businessDate),
        amountCentavos: cents(payment.amountCentavos),
        note: payment.note,
        billId: payment.billId,
      })),
    };
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const existing = await prisma.supplier.findFirst({ where: { id, stationId: station.id } });
    if (!existing) notFound("That supplier was not found.");
    const input = parseBody(supplierSchema, body);
    await prisma.supplier.update({
      where: { id },
      data: { name: input.name, tin: input.tin, notes: input.notes },
    });
    return this.get(user, id);
  }

  @Post(":id/bills")
  async addBill(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const supplier = await prisma.supplier.findFirst({ where: { id, stationId: station.id } });
    if (!supplier) notFound("That supplier was not found.");
    const input = parseBody(billSchema, body);
    await prisma.bill.create({
      data: {
        supplierId: id,
        businessDate: dateOnly(input.businessDate),
        dueDate: input.dueDate ? dateOnly(input.dueDate) : null,
        amountCentavos: input.amount,
        reference: input.reference,
        note: input.note,
      },
    });
    return this.get(user, id);
  }

  @Post(":id/payments")
  async addPayment(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const supplier = await prisma.supplier.findFirst({ where: { id, stationId: station.id } });
    if (!supplier) notFound("That supplier was not found.");
    const input = parseBody(paymentSchema, body);
    await prisma.supplierPayment.create({
      data: {
        supplierId: id,
        businessDate: dateOnly(input.businessDate),
        amountCentavos: input.amount,
        note: input.note,
      },
    });
    return this.get(user, id);
  }

  @Delete(":id/bills/:billId")
  async removeBill(@CurrentUser() user: AuthUser, @Param("id") id: string, @Param("billId") billId: string) {
    const station = await stationFor(user.id);
    const bill = await prisma.bill.findFirst({
      where: { id: billId, supplierId: id, supplier: { stationId: station.id } },
    });
    if (!bill) notFound("That bill was not found.");
    await prisma.bill.delete({ where: { id: billId } });
    return this.get(user, id);
  }

  @Delete(":id/payments/:paymentId")
  async removePayment(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("paymentId") paymentId: string,
  ) {
    const station = await stationFor(user.id);
    const payment = await prisma.supplierPayment.findFirst({
      where: { id: paymentId, supplierId: id, supplier: { stationId: station.id } },
    });
    if (!payment) notFound("That payment was not found.");
    await prisma.supplierPayment.delete({ where: { id: paymentId } });
    return this.get(user, id);
  }
}
