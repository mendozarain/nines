import { Module } from "@nestjs/common";
import { AssetsController } from "./assets.controller";
import { BooksController } from "./books.controller";
import { CashController } from "./cash.controller";
import { CustomersController } from "./customers.controller";
import { ExpensesController } from "./expenses.controller";
import { FuelController } from "./fuel.controller";
import { HealthController } from "./health.controller";
import { ItemsController } from "./items.controller";
import { MeController } from "./me.controller";
import { PayrollController } from "./payroll.controller";
import { ReportsController } from "./reports.controller";
import { SalesController } from "./sales.controller";
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
    SalesController,
    ItemsController,
    FuelController,
    CashController,
    BooksController,
    AssetsController,
    PayrollController,
    ReportsController,
  ],
})
export class AppModule {}
