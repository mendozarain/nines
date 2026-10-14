import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/auth-layout.tsx", [
    route("login", "routes/login.tsx"),
    route("signup", "routes/signup.tsx"),
  ]),
  route("setup", "routes/setup.tsx"),
  layout("routes/app-layout.tsx", [
    index("routes/dashboard.tsx"),
    route("sales", "routes/sales.tsx"),
    route("disbursements", "routes/disbursements.tsx"),
    route("receivables", "routes/receivables.tsx"),
    route("payables", "routes/payables.tsx"),
    route("reports", "routes/reports.tsx"),
    route("accounts", "routes/accounts.tsx"),
  ]),
] satisfies RouteConfig;
