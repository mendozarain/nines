import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { AuthUser } from "./auth";
import { AuthGuard, cents, CurrentUser, notFound, parseBody, stationFor } from "./common";
import { prisma } from "./prisma";
import { itemPatchSchema, itemSchema } from "./schemas";

function serializeItem(item: {
  id: string;
  name: string;
  unit: string;
  priceCentavos: bigint;
  taxType: string;
  active: boolean;
  sortOrder: number;
  stockQtyScaled: bigint;
}) {
  return {
    id: item.id,
    name: item.name,
    unit: item.unit,
    priceCentavos: cents(item.priceCentavos),
    taxType: item.taxType,
    active: item.active,
    sortOrder: item.sortOrder,
    stockQtyScaled: cents(item.stockQtyScaled),
  };
}

@Controller("items")
@UseGuards(AuthGuard)
export class ItemsController {
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const station = await stationFor(user.id);
    const items = await prisma.item.findMany({
      where: { stationId: station.id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return { items: items.map(serializeItem) };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const input = parseBody(itemSchema, body);
    const count = await prisma.item.count({ where: { stationId: station.id } });
    const clash = await prisma.item.findFirst({
      where: { stationId: station.id, name: { equals: input.name, mode: "insensitive" } },
    });
    if (clash) throw new BadRequestException(`${input.name} is already on your item list.`);
    const item = await prisma.item.create({
      data: {
        stationId: station.id,
        name: input.name,
        unit: input.unit,
        priceCentavos: input.price,
        taxType: input.taxType,
        active: input.active,
        sortOrder: input.sortOrder ?? count,
        stockQtyScaled: input.stockQty ?? 0n,
      },
    });
    return serializeItem(item);
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const station = await stationFor(user.id);
    const item = await prisma.item.findFirst({ where: { id, stationId: station.id } });
    if (!item) notFound("That item was not found.");
    return serializeItem(item);
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const existing = await prisma.item.findFirst({ where: { id, stationId: station.id } });
    if (!existing) notFound("That item was not found.");
    const input = parseBody(itemPatchSchema, body);
    if (input.name) {
      const clash = await prisma.item.findFirst({
        where: {
          stationId: station.id,
          NOT: { id },
          name: { equals: input.name, mode: "insensitive" },
        },
      });
      if (clash) throw new BadRequestException(`${input.name} is already on your item list.`);
    }
    const item = await prisma.item.update({
      where: { id },
      data: {
        name: input.name,
        unit: input.unit,
        priceCentavos: input.price,
        taxType: input.taxType,
        active: input.active,
        sortOrder: input.sortOrder,
        stockQtyScaled: input.stockQty,
      },
    });
    return serializeItem(item);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const station = await stationFor(user.id);
    const item = await prisma.item.findFirst({ where: { id, stationId: station.id } });
    if (!item) notFound("That item was not found.");
    await prisma.item.update({ where: { id }, data: { active: false } });
    return { ok: true };
  }
}
