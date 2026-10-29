import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { divRound } from "@nines/shared";
import type { AuthUser } from "./auth";
import { postJournalEntry } from "./books";
import { AuthGuard, cents, CurrentUser, dateOnly, dayString, notFound, parseBody, stationFor } from "./common";
import { prisma } from "./prisma";
import { fuelDeliverySchema, tankDipSchema, tankPatchSchema, tankSchema } from "./schemas";

function serializeTank(tank: {
  id: string;
  productId: string;
  name: string;
  capacityCentilitres: bigint;
  bookCentilitres: bigint;
  avgCostPerLitreCentavos: bigint;
  active: boolean;
  product?: { name: string };
}) {
  return {
    id: tank.id,
    productId: tank.productId,
    productName: tank.product?.name ?? null,
    name: tank.name,
    capacityCentilitres: cents(tank.capacityCentilitres),
    bookCentilitres: cents(tank.bookCentilitres),
    avgCostPerLitreCentavos: cents(tank.avgCostPerLitreCentavos),
    active: tank.active,
  };
}

function inventoryAccountFor(productName: string) {
  const lower = productName.toLowerCase();
  if (lower.includes("diesel")) return "1210";
  if (lower.includes("gas") || lower.includes("unleaded") || lower.includes("premium")) return "1200";
  return "1220";
}

@Controller("fuel")
@UseGuards(AuthGuard)
export class FuelController {
  @Get("tanks")
  async listTanks(@CurrentUser() user: AuthUser) {
    const station = await stationFor(user.id);
    const tanks = await prisma.tank.findMany({
      where: { stationId: station.id },
      include: { product: true },
      orderBy: { name: "asc" },
    });
    return { tanks: tanks.map(serializeTank) };
  }

  @Post("tanks")
  async createTank(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const input = parseBody(tankSchema, body);
    const product = await prisma.fuelProduct.findFirst({
      where: { id: input.productId, stationId: station.id },
    });
    if (!product) throw new BadRequestException("Choose a fuel product for this tank.");
    const tank = await prisma.tank.create({
      data: {
        stationId: station.id,
        productId: product.id,
        name: input.name,
        capacityCentilitres: input.capacityLitres,
        bookCentilitres: input.bookLitres,
        avgCostPerLitreCentavos: input.avgCostPerLitre,
        active: input.active,
      },
      include: { product: true },
    });
    return serializeTank(tank);
  }

  @Patch("tanks/:id")
  async updateTank(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const existing = await prisma.tank.findFirst({ where: { id, stationId: station.id } });
    if (!existing) notFound("That tank was not found.");
    const input = parseBody(tankPatchSchema, body);
    if (input.productId) {
      const product = await prisma.fuelProduct.findFirst({
        where: { id: input.productId, stationId: station.id },
      });
      if (!product) throw new BadRequestException("Choose a fuel product for this tank.");
    }
    const tank = await prisma.tank.update({
      where: { id },
      data: {
        productId: input.productId,
        name: input.name,
        capacityCentilitres: input.capacityLitres,
        bookCentilitres: input.bookLitres,
        avgCostPerLitreCentavos: input.avgCostPerLitre,
        active: input.active,
      },
      include: { product: true },
    });
    return serializeTank(tank);
  }

  @Get("deliveries")
  async listDeliveries(@CurrentUser() user: AuthUser) {
    const station = await stationFor(user.id);
    const deliveries = await prisma.fuelDelivery.findMany({
      where: { stationId: station.id },
      include: { product: true, tank: true, supplier: true },
      orderBy: [{ businessDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    return {
      deliveries: deliveries.map((delivery) => ({
        id: delivery.id,
        businessDate: dayString(delivery.businessDate),
        productId: delivery.productId,
        productName: delivery.product.name,
        tankId: delivery.tankId,
        tankName: delivery.tank.name,
        supplierId: delivery.supplierId,
        supplierName: delivery.supplier?.name ?? null,
        invoiceReference: delivery.invoiceReference,
        drLitresCentilitres: cents(delivery.drLitresCentilitres),
        measuredLitresCentilitres: cents(delivery.measuredLitresCentilitres),
        unitCostPerLitreCentavos: cents(delivery.unitCostPerLitreCentavos),
        freightCentavos: cents(delivery.freightCentavos),
        inputVatCentavos: cents(delivery.inputVatCentavos),
        withholdingCentavos: cents(delivery.withholdingCentavos),
        note: delivery.note,
      })),
    };
  }

  @Post("deliveries")
  async createDelivery(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const input = parseBody(fuelDeliverySchema, body);
    const tank = await prisma.tank.findFirst({
      where: { id: input.tankId, stationId: station.id },
      include: { product: true },
    });
    if (!tank) throw new BadRequestException("Choose a tank on your station.");
    if (tank.productId !== input.productId) {
      throw new BadRequestException("The product must match the tank's fuel.");
    }
    if (input.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: input.supplierId, stationId: station.id },
      });
      if (!supplier) throw new BadRequestException("Choose a supplier on your books.");
    }

    const measured = input.measuredLitres;
    const fuelCost = divRound(measured * input.unitCostPerLitre, 100n);
    const inventoryDebit = fuelCost;
    const freight = input.freight;
    const inputVat = input.inputVat;
    const withholding = input.withholding;
    const payable = inventoryDebit + freight + inputVat - withholding;

    const delivery = await prisma.$transaction(async (tx) => {
      const priorQty = tank.bookCentilitres;
      const priorCost = tank.avgCostPerLitreCentavos;
      const newQty = priorQty + measured;
      const priorValue = divRound(priorQty * priorCost, 100n);
      const avgCost =
        newQty > 0n ? divRound((priorValue + fuelCost) * 100n, newQty) : input.unitCostPerLitre;

      await tx.tank.update({
        where: { id: tank.id },
        data: {
          bookCentilitres: newQty,
          avgCostPerLitreCentavos: avgCost,
        },
      });

      let billId: string | undefined;
      if (input.supplierId) {
        const bill = await tx.bill.create({
          data: {
            supplierId: input.supplierId,
            reference: input.invoiceReference,
            businessDate: dateOnly(input.businessDate),
            dueDate: input.dueDate ? dateOnly(input.dueDate) : null,
            amountCentavos: payable + withholding,
            netCentavos: inventoryDebit + freight,
            vatCentavos: inputVat,
            withholdingCentavos: withholding,
            note: `Fuel delivery to ${tank.name}`,
          },
        });
        billId = bill.id;
      }

      const created = await tx.fuelDelivery.create({
        data: {
          stationId: station.id,
          supplierId: input.supplierId,
          productId: input.productId,
          tankId: input.tankId,
          businessDate: dateOnly(input.businessDate),
          invoiceReference: input.invoiceReference,
          drLitresCentilitres: input.drLitres,
          measuredLitresCentilitres: measured,
          unitCostPerLitreCentavos: input.unitCostPerLitre,
          freightCentavos: freight,
          inputVatCentavos: inputVat,
          withholdingCentavos: withholding,
          dueDate: input.dueDate ? dateOnly(input.dueDate) : null,
          receivedBy: input.receivedBy,
          checkedBy: input.checkedBy,
          note: input.note,
          billId,
        },
        include: { product: true, tank: true, supplier: true },
      });

      const invCode = inventoryAccountFor(tank.product.name);
      const journalLines: { code: string; debitCentavos?: bigint; creditCentavos?: bigint; memo?: string }[] = [
        { code: invCode, debitCentavos: inventoryDebit, memo: "Fuel inventory" },
      ];
      if (freight > 0n) {
        journalLines.push({ code: "6080", debitCentavos: freight, memo: "Freight / delivery" });
      }
      if (inputVat > 0n) {
        journalLines.push({ code: "1240", debitCentavos: inputVat, memo: "Input VAT" });
      }
      if (withholding > 0n) {
        journalLines.push({ code: "2050", creditCentavos: withholding, memo: "Withholding" });
      }
      journalLines.push({
        code: "2000",
        creditCentavos: payable,
        memo: input.invoiceReference || "Fuel delivery AP",
      });

      await postJournalEntry(
        station.id,
        {
          businessDate: input.businessDate,
          description: `Fuel delivery — ${tank.product.name}`,
          source: "DELIVERY",
          sourceDocument: input.invoiceReference,
          lines: journalLines,
        },
        tx,
      );

      return created;
    });

    return {
      id: delivery.id,
      businessDate: dayString(delivery.businessDate),
      tankId: delivery.tankId,
      productId: delivery.productId,
      measuredLitresCentilitres: cents(delivery.measuredLitresCentilitres),
      unitCostPerLitreCentavos: cents(delivery.unitCostPerLitreCentavos),
      billId: delivery.billId,
    };
  }

  @Get("dips")
  async listDips(@CurrentUser() user: AuthUser) {
    const station = await stationFor(user.id);
    const dips = await prisma.tankDip.findMany({
      where: { stationId: station.id },
      include: { tank: true, product: true },
      orderBy: [{ businessDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    return {
      dips: dips.map((dip) => ({
        id: dip.id,
        businessDate: dayString(dip.businessDate),
        tankId: dip.tankId,
        tankName: dip.tank.name,
        productId: dip.productId,
        productName: dip.product.name,
        openingCentilitres: cents(dip.openingCentilitres),
        deliveriesCentilitres: cents(dip.deliveriesCentilitres),
        salesCentilitres: cents(dip.salesCentilitres),
        bookClosingCentilitres: cents(dip.bookClosingCentilitres),
        physicalCentilitres: cents(dip.physicalCentilitres),
        varianceCentilitres: cents(dip.physicalCentilitres - dip.bookClosingCentilitres),
        note: dip.note,
      })),
    };
  }

  @Post("dips")
  async createDip(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const input = parseBody(tankDipSchema, body);
    const tank = await prisma.tank.findFirst({
      where: { id: input.tankId, stationId: station.id },
      include: { product: true },
    });
    if (!tank) throw new BadRequestException("Choose a tank on your station.");

    const bookClosing = input.openingLitres + input.deliveriesLitres - input.salesLitres;
    const dip = await prisma.$transaction(async (tx) => {
      const created = await tx.tankDip.create({
        data: {
          stationId: station.id,
          tankId: tank.id,
          productId: tank.productId,
          businessDate: dateOnly(input.businessDate),
          openingCentilitres: input.openingLitres,
          deliveriesCentilitres: input.deliveriesLitres,
          salesCentilitres: input.salesLitres,
          bookClosingCentilitres: bookClosing,
          physicalCentilitres: input.physicalLitres,
          avgCostPerLitreCentavos: tank.avgCostPerLitreCentavos,
          investigatedBy: input.investigatedBy,
          note: input.note,
        },
        include: { tank: true, product: true },
      });
      await tx.tank.update({
        where: { id: tank.id },
        data: { bookCentilitres: input.physicalLitres },
      });
      return created;
    });

    return {
      id: dip.id,
      businessDate: dayString(dip.businessDate),
      bookClosingCentilitres: cents(dip.bookClosingCentilitres),
      physicalCentilitres: cents(dip.physicalCentilitres),
      varianceCentilitres: cents(dip.physicalCentilitres - dip.bookClosingCentilitres),
    };
  }
}
