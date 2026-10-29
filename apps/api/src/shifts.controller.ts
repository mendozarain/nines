import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { litresSold, litresToAmountCentavos, overShort, type ShiftName } from "@nines/shared";
import type { AuthUser } from "./auth";
import {
  postShiftSalesJournal,
  removeJournalsBySourceDocument,
  shiftJournalSourceDocument,
} from "./books";
import { AuthGuard, cents, CurrentUser, dateOnly, dayString, notFound, parseBody, stationFor } from "./common";
import { prisma } from "./prisma";
import { rangeQuerySchema, shiftSchema } from "./schemas";

const SHIFT_ORDER: Record<ShiftName, number> = { Morning: 0, Afternoon: 1, Night: 2 };

type ShiftBody = ReturnType<typeof shiftSchema.parse>;

function serializeShift(shift: {
  id: string;
  businessDate: Date;
  name: string;
  cashCentavos: bigint;
  cardCentavos: bigint;
  creditCentavos: bigint;
  notes: string;
  readings: {
    pumpId: string;
    openingCentilitres: bigint;
    closingCentilitres: bigint;
    litresCentilitres: bigint;
    pricePerLitreCentavos: bigint;
    amountCentavos: bigint;
    pump: { name: string; product: { name: string } };
  }[];
  charges: {
    id: string;
    customerId: string;
    amountCentavos: bigint;
    note: string;
    customer: { name: string };
  }[];
}) {
  const expected = shift.readings.reduce((sum, reading) => sum + reading.amountCentavos, 0n);
  const tendered = shift.cashCentavos + shift.cardCentavos + shift.creditCentavos;
  return {
    id: shift.id,
    businessDate: dayString(shift.businessDate),
    name: shift.name,
    notes: shift.notes,
    cashCentavos: cents(shift.cashCentavos),
    cardCentavos: cents(shift.cardCentavos),
    creditCentavos: cents(shift.creditCentavos),
    expectedCentavos: cents(expected),
    tenderedCentavos: cents(tendered),
    overShortCentavos: cents(overShort(expected, shift.cashCentavos, shift.cardCentavos, shift.creditCentavos)),
    readings: shift.readings.map((reading) => ({
      pumpId: reading.pumpId,
      pumpName: reading.pump.name,
      productName: reading.pump.product.name,
      openingCentilitres: cents(reading.openingCentilitres),
      closingCentilitres: cents(reading.closingCentilitres),
      litresCentilitres: cents(reading.litresCentilitres),
      pricePerLitreCentavos: cents(reading.pricePerLitreCentavos),
      amountCentavos: cents(reading.amountCentavos),
    })),
    charges: shift.charges.map((charge) => ({
      id: charge.id,
      customerId: charge.customerId,
      customerName: charge.customer.name,
      amountCentavos: cents(charge.amountCentavos),
      note: charge.note,
    })),
  };
}

const shiftInclude = {
  readings: { include: { pump: { include: { product: true } } } },
  charges: { include: { customer: true } },
} as const;

async function buildRows(stationId: string, input: ShiftBody, shiftId?: string) {
  const pumps = await prisma.pump.findMany({
    where: { stationId, active: true },
    include: { product: true },
  });
  if (pumps.length === 0) {
    throw new BadRequestException("Turn on at least one pump before recording a shift.");
  }
  const byId = new Map(input.readings.map((reading) => [reading.pumpId, reading]));
  if (byId.size !== input.readings.length) {
    throw new BadRequestException("Each pump can only be entered once.");
  }
  for (const pump of pumps) {
    if (!byId.has(pump.id)) {
      throw new BadRequestException(`Enter the meter reading for ${pump.name}. If it did not run, set closing equal to opening.`);
    }
  }
  for (const reading of input.readings) {
    if (!pumps.some((pump) => pump.id === reading.pumpId)) {
      throw new BadRequestException("One of the pumps is turned off or does not belong to this station.");
    }
  }

  const readingRows = input.readings.map((reading) => {
    const pump = pumps.find((item) => item.id === reading.pumpId)!;
    let litres: bigint;
    try {
      litres = litresSold(reading.opening, reading.closing);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Check the meter readings.";
      throw new BadRequestException(`${pump.name}: ${message}`);
    }
    if (litres > 2_000_000n) {
      throw new BadRequestException(`${pump.name} shows more than 20,000 litres. Check the opening and closing readings.`);
    }
    const amount = litresToAmountCentavos(litres, reading.price);
    return {
      pumpId: pump.id,
      openingCentilitres: reading.opening,
      closingCentilitres: reading.closing,
      litresCentilitres: litres,
      pricePerLitreCentavos: reading.price,
      amountCentavos: amount,
    };
  });

  const expected = readingRows.reduce((sum, row) => sum + row.amountCentavos, 0n);
  const chargeTotal = input.charges.reduce((sum, charge) => sum + charge.amount, 0n);
  if (chargeTotal !== input.credit) {
    throw new BadRequestException(
      input.credit === 0n
        ? "Remove the credit customers, or enter a credit amount."
        : "Credit sales have to be assigned to customers, and those amounts must add up to the credit total.",
    );
  }

  const duplicate = await prisma.shift.findFirst({
    where: {
      stationId,
      businessDate: dateOnly(input.businessDate),
      name: input.name,
      NOT: shiftId ? { id: shiftId } : undefined,
    },
  });
  if (duplicate) {
    throw new BadRequestException(`A ${input.name.toLowerCase()} shift is already recorded for this date.`);
  }

  return { readingRows, expected };
}

async function chargeRows(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  stationId: string,
  input: ShiftBody,
  businessDate: Date,
) {
  const charges = [];
  for (const charge of input.charges) {
    const name = charge.newCustomerName?.trim();
    let customerId = charge.customerId;
    if (name) {
      const created = await tx.customer.create({ data: { stationId, name } });
      customerId = created.id;
    }
    if (!customerId) {
      throw new BadRequestException("Choose a customer for each credit sale, or type a new customer name.");
    }
    const customer = await tx.customer.findFirst({ where: { id: customerId, stationId } });
    if (!customer) throw new BadRequestException("That credit customer was not found.");
    charges.push({
      customerId,
      businessDate,
      amountCentavos: charge.amount,
      note: charge.note,
    });
  }
  return charges;
}

@Controller("shifts")
@UseGuards(AuthGuard)
export class ShiftsController {
  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: Record<string, string | undefined>) {
    const station = await stationFor(user.id);
    const range = parseBody(rangeQuerySchema, {
      from: query.from,
      to: query.to,
    });
    const shifts = await prisma.shift.findMany({
      where: {
        stationId: station.id,
        businessDate: {
          gte: range.from ? dateOnly(range.from) : undefined,
          lte: range.to ? dateOnly(range.to) : undefined,
        },
      },
      include: shiftInclude,
      orderBy: [{ businessDate: "desc" }, { sortOrder: "asc" }],
    });
    return shifts.map(serializeShift);
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const station = await stationFor(user.id);
    const shift = await prisma.shift.findFirst({
      where: { id, stationId: station.id },
      include: shiftInclude,
    });
    if (!shift) notFound("That shift was not found.");
    return serializeShift(shift);
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const input = parseBody(shiftSchema, body);
    const { readingRows, expected } = await buildRows(station.id, input);
    const businessDate = dateOnly(input.businessDate);
    const shift = await prisma.$transaction(async (tx) => {
      const charges = await chargeRows(tx, station.id, input, businessDate);
      const created = await tx.shift.create({
        data: {
          stationId: station.id,
          businessDate,
          name: input.name,
          sortOrder: SHIFT_ORDER[input.name],
          cashCentavos: input.cash,
          cardCentavos: input.card,
          creditCentavos: input.credit,
          notes: input.notes,
          readings: { create: readingRows },
          charges: { create: charges },
        },
        include: shiftInclude,
      });
      await postShiftSalesJournal(
        station.id,
        {
          businessDate: input.businessDate,
          shiftId: created.id,
          shiftName: input.name,
          cashCentavos: input.cash,
          cardCentavos: input.card,
          creditCentavos: input.credit,
          expectedSalesCentavos: expected,
          vatRegistered: station.vatRegistered,
        },
        tx,
      );
      return created;
    });
    return serializeShift(shift);
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const existing = await prisma.shift.findFirst({ where: { id, stationId: station.id } });
    if (!existing) notFound("That shift was not found.");
    const input = parseBody(shiftSchema, body);
    const { readingRows, expected } = await buildRows(station.id, input, id);
    const businessDate = dateOnly(input.businessDate);
    const shift = await prisma.$transaction(async (tx) => {
      await removeJournalsBySourceDocument(station.id, shiftJournalSourceDocument(id), tx);
      await tx.shiftReading.deleteMany({ where: { shiftId: id } });
      await tx.creditCharge.deleteMany({ where: { shiftId: id } });
      const charges = await chargeRows(tx, station.id, input, businessDate);
      const updated = await tx.shift.update({
        where: { id },
        data: {
          businessDate,
          name: input.name,
          sortOrder: SHIFT_ORDER[input.name],
          cashCentavos: input.cash,
          cardCentavos: input.card,
          creditCentavos: input.credit,
          notes: input.notes,
          readings: { create: readingRows },
          charges: { create: charges },
        },
        include: shiftInclude,
      });
      await postShiftSalesJournal(
        station.id,
        {
          businessDate: input.businessDate,
          shiftId: updated.id,
          shiftName: input.name,
          cashCentavos: input.cash,
          cardCentavos: input.card,
          creditCentavos: input.credit,
          expectedSalesCentavos: expected,
          vatRegistered: station.vatRegistered,
        },
        tx,
      );
      return updated;
    });
    return serializeShift(shift);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const station = await stationFor(user.id);
    const existing = await prisma.shift.findFirst({ where: { id, stationId: station.id } });
    if (!existing) notFound("That shift was not found.");
    await prisma.$transaction(async (tx) => {
      await removeJournalsBySourceDocument(station.id, shiftJournalSourceDocument(id), tx);
      await tx.shift.delete({ where: { id } });
    });
    return { ok: true };
  }
}
