import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { AuthUser } from "./auth";
import { AuthGuard, cents, CurrentUser, notFound, parseBody, stationFor } from "./common";
import { prisma } from "./prisma";
import {
  productCreateSchema,
  productPatchSchema,
  pumpCreateSchema,
  pumpPatchSchema,
  stationPatchSchema,
  stationSetupSchema,
} from "./schemas";

async function lastClosings(stationId: string) {
  const readings = await prisma.shiftReading.findMany({
    where: { shift: { stationId } },
    include: { shift: { select: { businessDate: true, sortOrder: true } } },
    orderBy: [{ shift: { businessDate: "desc" } }, { shift: { sortOrder: "desc" } }],
  });
  const map = new Map<string, bigint>();
  for (const reading of readings) {
    if (!map.has(reading.pumpId)) map.set(reading.pumpId, reading.closingCentilitres);
  }
  return map;
}

export async function getStation(userId: string) {
  const station = await stationFor(userId);
  const [products, pumps, closings] = await Promise.all([
    prisma.fuelProduct.findMany({ where: { stationId: station.id }, orderBy: { sortOrder: "asc" } }),
    prisma.pump.findMany({
      where: { stationId: station.id },
      include: { product: true },
      orderBy: { sortOrder: "asc" },
    }),
    lastClosings(station.id),
  ]);
  return {
    id: station.id,
    name: station.name,
    tin: station.tin,
    address: station.address,
    vatRegistered: station.vatRegistered,
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      pricePerLitreCentavos: cents(product.pricePerLitreCentavos),
      active: product.active,
      sortOrder: product.sortOrder,
    })),
    pumps: pumps.map((pump) => ({
      id: pump.id,
      name: pump.name,
      productId: pump.productId,
      productName: pump.product.name,
      active: pump.active,
      sortOrder: pump.sortOrder,
      lastClosingCentilitres: closings.has(pump.id) ? cents(closings.get(pump.id)) : null,
    })),
  };
}

function uniqueNames(names: string[], label: string) {
  const seen = new Set<string>();
  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (seen.has(key)) throw new BadRequestException(`Two ${label} are both named ${name.trim()}.`);
    seen.add(key);
  }
}

@Controller("station")
@UseGuards(AuthGuard)
export class StationController {
  @Get()
  get(@CurrentUser() user: AuthUser) {
    return getStation(user.id);
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = parseBody(stationSetupSchema, body);
    const existing = await prisma.station.findUnique({ where: { ownerId: user.id } });
    if (existing) throw new BadRequestException("You already have a station.");
    uniqueNames(
      input.products.map((product) => product.name),
      "products",
    );
    uniqueNames(
      input.pumps.map((pump) => pump.name),
      "pumps",
    );

    await prisma.$transaction(async (tx) => {
      const station = await tx.station.create({
        data: {
          ownerId: user.id,
          name: input.name,
          tin: input.tin,
          address: input.address,
          vatRegistered: input.vatRegistered,
        },
      });
      const products = [];
      for (const [index, product] of input.products.entries()) {
        products.push(
          await tx.fuelProduct.create({
            data: {
              stationId: station.id,
              name: product.name,
              pricePerLitreCentavos: product.price,
              sortOrder: index,
            },
          }),
        );
      }
      for (const [index, pump] of input.pumps.entries()) {
        const product = products.find((item) => item.name.toLowerCase() === pump.productName.toLowerCase());
        if (!product) {
          throw new BadRequestException(`${pump.name} needs one of the fuels you added.`);
        }
        await tx.pump.create({
          data: {
            stationId: station.id,
            name: pump.name,
            productId: product.id,
            sortOrder: index,
          },
        });
      }
    });

    return getStation(user.id);
  }

  @Patch()
  async update(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = parseBody(stationPatchSchema, body);
    const station = await stationFor(user.id);
    await prisma.station.update({
      where: { id: station.id },
      data: {
        name: input.name,
        tin: input.tin,
        address: input.address,
        vatRegistered: input.vatRegistered,
      },
    });
    return getStation(user.id);
  }

  @Post("products")
  async addProduct(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = parseBody(productCreateSchema, body);
    const station = await stationFor(user.id);
    const products = await prisma.fuelProduct.findMany({ where: { stationId: station.id } });
    if (products.some((product) => product.name.toLowerCase() === input.name.toLowerCase())) {
      throw new BadRequestException(`${input.name} is already on the price board.`);
    }
    await prisma.fuelProduct.create({
      data: {
        stationId: station.id,
        name: input.name,
        pricePerLitreCentavos: input.price,
        sortOrder: products.length,
      },
    });
    return getStation(user.id);
  }

  @Patch("products/:id")
  async updateProduct(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    const input = parseBody(productPatchSchema, body);
    const station = await stationFor(user.id);
    const product = await prisma.fuelProduct.findFirst({ where: { id, stationId: station.id } });
    if (!product) notFound("That fuel was not found.");
    if (input.active === false) {
      const activePumps = await prisma.pump.count({
        where: { stationId: station.id, productId: id, active: true },
      });
      if (activePumps > 0) {
        throw new BadRequestException(`Turn off the pumps that sell ${product.name} first.`);
      }
    }
    if (input.name) {
      const clash = await prisma.fuelProduct.findFirst({
        where: { stationId: station.id, NOT: { id }, name: { equals: input.name, mode: "insensitive" } },
      });
      if (clash) throw new BadRequestException(`${input.name} is already on the price board.`);
    }
    await prisma.fuelProduct.update({
      where: { id },
      data: {
        name: input.name,
        pricePerLitreCentavos: input.price,
        active: input.active,
      },
    });
    return getStation(user.id);
  }

  @Post("pumps")
  async addPump(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = parseBody(pumpCreateSchema, body);
    const station = await stationFor(user.id);
    const product = await prisma.fuelProduct.findFirst({
      where: { id: input.productId, stationId: station.id, active: true },
    });
    if (!product) throw new BadRequestException("Choose an active fuel for this pump.");
    const pumps = await prisma.pump.findMany({ where: { stationId: station.id } });
    if (pumps.some((pump) => pump.name.toLowerCase() === input.name.toLowerCase())) {
      throw new BadRequestException(`There is already a pump named ${input.name}.`);
    }
    await prisma.pump.create({
      data: {
        stationId: station.id,
        productId: product.id,
        name: input.name,
        sortOrder: pumps.length,
      },
    });
    return getStation(user.id);
  }

  @Patch("pumps/:id")
  async updatePump(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    const input = parseBody(pumpPatchSchema, body);
    const station = await stationFor(user.id);
    const pump = await prisma.pump.findFirst({ where: { id, stationId: station.id } });
    if (!pump) notFound("That pump was not found.");
    if (input.productId) {
      const product = await prisma.fuelProduct.findFirst({
        where: { id: input.productId, stationId: station.id, active: true },
      });
      if (!product) throw new BadRequestException("Choose an active fuel for this pump.");
    }
    if (input.name) {
      const clash = await prisma.pump.findFirst({
        where: { stationId: station.id, NOT: { id }, name: { equals: input.name, mode: "insensitive" } },
      });
      if (clash) throw new BadRequestException(`There is already a pump named ${input.name}.`);
    }
    await prisma.pump.update({
      where: { id },
      data: {
        name: input.name,
        productId: input.productId,
        active: input.active,
      },
    });
    return getStation(user.id);
  }
}
