import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { annualStraightLineDepreciation } from "@nines/shared";
import type { AuthUser } from "./auth";
import { AuthGuard, cents, CurrentUser, dateOnly, dayString, notFound, parseBody, stationFor } from "./common";
import { prisma } from "./prisma";
import { fixedAssetPatchSchema, fixedAssetSchema } from "./schemas";

function serializeAsset(asset: {
  id: string;
  assetCode: string;
  description: string;
  location: string;
  acquiredDate: Date;
  supplierName: string;
  invoiceReference: string;
  costCentavos: bigint;
  residualCentavos: bigint;
  usefulLifeYears: number;
  method: string;
  accumulatedDepreciationCentavos: bigint;
  custodian: string;
  lastCheckDate: Date | null;
  note: string;
}) {
  const annual = annualStraightLineDepreciation(
    asset.costCentavos,
    asset.residualCentavos,
    asset.usefulLifeYears,
  );
  const bookValue = asset.costCentavos - asset.accumulatedDepreciationCentavos;
  return {
    id: asset.id,
    assetCode: asset.assetCode,
    description: asset.description,
    location: asset.location,
    acquiredDate: dayString(asset.acquiredDate),
    supplierName: asset.supplierName,
    invoiceReference: asset.invoiceReference,
    costCentavos: cents(asset.costCentavos),
    residualCentavos: cents(asset.residualCentavos),
    usefulLifeYears: asset.usefulLifeYears,
    method: asset.method,
    accumulatedDepreciationCentavos: cents(asset.accumulatedDepreciationCentavos),
    annualDepreciationCentavos: cents(annual),
    bookValueCentavos: cents(bookValue),
    custodian: asset.custodian,
    lastCheckDate: asset.lastCheckDate ? dayString(asset.lastCheckDate) : null,
    note: asset.note,
  };
}

@Controller("assets")
@UseGuards(AuthGuard)
export class AssetsController {
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const station = await stationFor(user.id);
    const assets = await prisma.fixedAsset.findMany({
      where: { stationId: station.id },
      orderBy: { assetCode: "asc" },
    });
    return { assets: assets.map(serializeAsset) };
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const input = parseBody(fixedAssetSchema, body);
    const asset = await prisma.fixedAsset.create({
      data: {
        stationId: station.id,
        assetCode: input.assetCode,
        description: input.description,
        location: input.location,
        acquiredDate: dateOnly(input.acquiredDate),
        supplierName: input.supplierName,
        invoiceReference: input.invoiceReference,
        costCentavos: input.cost,
        residualCentavos: input.residual,
        usefulLifeYears: input.usefulLifeYears,
        method: input.method,
        custodian: input.custodian,
        lastCheckDate: input.lastCheckDate ? dateOnly(input.lastCheckDate) : null,
        note: input.note,
      },
    });
    return serializeAsset(asset);
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const station = await stationFor(user.id);
    const asset = await prisma.fixedAsset.findFirst({ where: { id, stationId: station.id } });
    if (!asset) notFound("That asset was not found.");
    return serializeAsset(asset);
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    const station = await stationFor(user.id);
    const existing = await prisma.fixedAsset.findFirst({ where: { id, stationId: station.id } });
    if (!existing) notFound("That asset was not found.");
    const input = parseBody(fixedAssetPatchSchema, body);
    const asset = await prisma.fixedAsset.update({
      where: { id },
      data: {
        assetCode: input.assetCode,
        description: input.description,
        location: input.location,
        acquiredDate: input.acquiredDate ? dateOnly(input.acquiredDate) : undefined,
        supplierName: input.supplierName,
        invoiceReference: input.invoiceReference,
        costCentavos: input.cost,
        residualCentavos: input.residual,
        usefulLifeYears: input.usefulLifeYears,
        method: input.method,
        custodian: input.custodian,
        lastCheckDate: input.lastCheckDate ? dateOnly(input.lastCheckDate) : undefined,
        note: input.note,
      },
    });
    return serializeAsset(asset);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const station = await stationFor(user.id);
    const asset = await prisma.fixedAsset.findFirst({ where: { id, stationId: station.id } });
    if (!asset) notFound("That asset was not found.");
    await prisma.fixedAsset.delete({ where: { id } });
    return { ok: true };
  }
}
