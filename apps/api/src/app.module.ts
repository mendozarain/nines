import { Module } from "@nestjs/common";
import { CustomersController } from "./customers.controller";
import { ExpensesController } from "./expenses.controller";
import { HealthController } from "./health.controller";
import { MeController } from "./me.controller";
import { ReportsController } from "./reports.controller";
import { ShiftsController } from "./shifts.controller";
import { StationController } from "./station.controller";
import { SuppliersController } from "./suppliers.controller";

@Module({
  controllers: [
    HealthController,
    MeController,
    StationController,
    ShiftsController,
    ExpensesController,
    CustomersController,
    SuppliersController,
    ReportsController,
  ],
})
export class AppModule {}
