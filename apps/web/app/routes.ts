import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  layout("routes/app-layout.tsx", [
    index("routes/dashboard.tsx"),
    route("setup", "routes/setup.tsx"),
    route("shifts", "routes/shifts.tsx"),
    route("shifts/new", "routes/shift-new.tsx"),
    route("shifts/:id/edit", "routes/shift-edit.tsx"),
    route("shifts/:id", "routes/shift-detail.tsx"),
    route("expenses", "routes/expenses.tsx"),
    route("receivables", "routes/receivables.tsx"),
    route("receivables/:id", "routes/customer.tsx"),
    route("payables", "routes/payables.tsx"),
    route("payables/:id", "routes/supplier.tsx"),
    route("reports", "routes/reports.tsx"),
    route("station", "routes/station.tsx"),
    route("*", "routes/not-found.tsx"),
  ]),
] satisfies RouteConfig;
