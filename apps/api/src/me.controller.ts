import { Controller, Get, UseGuards } from "@nestjs/common";
import { manilaMonth, manilaToday } from "@nines/shared";
import { AuthGuard, CurrentUser } from "./common";
import type { AuthUser } from "./auth";
import { prisma } from "./prisma";

@Controller()
@UseGuards(AuthGuard)
export class MeController {
  @Get("me")
  async me(@CurrentUser() user: AuthUser) {
    const station = await prisma.station.findUnique({ where: { ownerId: user.id } });
    return {
      user: { id: user.id, name: user.name, email: user.email },
      station: station
        ? {
            id: station.id,
            name: station.name,
            tin: station.tin,
            address: station.address,
            vatRegistered: station.vatRegistered,
            industry: station.industry,
            fuelModuleEnabled: station.fuelModuleEnabled,
            taxRegime: station.taxRegime,
            percentageTaxRateBps: station.percentageTaxRateBps,
          }
        : null,
      today: manilaToday(),
      month: manilaMonth(),
    };
  }
}
