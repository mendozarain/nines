import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { SessionGuard } from "./auth/session.guard.js";
import { CompaniesController } from "./companies/companies.controller.js";
import { HealthController } from "./health.controller.js";
import { LedgerController } from "./ledger/ledger.controller.js";

@Module({
  controllers: [HealthController, CompaniesController, LedgerController],
  providers: [{ provide: APP_GUARD, useClass: SessionGuard }],
})
export class AppModule {}
