import type { AccountType } from "../generated/prisma/client.js";

// Starter chart of accounts for a small Philippine gas station.
// Owners can rename or add accounts later; codes group by type (1 asset ... 6 expense).
export const DEFAULT_CHART: ReadonlyArray<{ code: string; name: string; type: AccountType }> = [
  { code: "1010", name: "Cash on hand", type: "ASSET" },
  { code: "1020", name: "Cash in bank", type: "ASSET" },
  { code: "1030", name: "GCash / Maya clearing", type: "ASSET" },
  { code: "1040", name: "Card sales clearing", type: "ASSET" },
  { code: "1100", name: "Accounts receivable", type: "ASSET" },
  { code: "1200", name: "Fuel inventory", type: "ASSET" },
  { code: "1210", name: "Lubricants and merchandise inventory", type: "ASSET" },
  { code: "1300", name: "Input VAT", type: "ASSET" },
  { code: "1310", name: "Creditable withholding tax (from customers' 2307)", type: "ASSET" },
  { code: "1400", name: "Prepaid expenses", type: "ASSET" },
  { code: "1500", name: "Property and equipment", type: "ASSET" },
  { code: "1510", name: "Accumulated depreciation", type: "ASSET" },

  { code: "2010", name: "Accounts payable", type: "LIABILITY" },
  { code: "2100", name: "Output VAT", type: "LIABILITY" },
  { code: "2110", name: "VAT payable", type: "LIABILITY" },
  { code: "2200", name: "Expanded withholding tax payable", type: "LIABILITY" },
  { code: "2210", name: "Withholding tax on compensation payable", type: "LIABILITY" },
  { code: "2300", name: "SSS, PhilHealth and Pag-IBIG payable", type: "LIABILITY" },
  { code: "2400", name: "Accrued expenses", type: "LIABILITY" },
  { code: "2500", name: "Loans payable", type: "LIABILITY" },
  { code: "2600", name: "Customer deposits", type: "LIABILITY" },

  { code: "3010", name: "Owner's capital", type: "EQUITY" },
  { code: "3020", name: "Owner's drawings", type: "EQUITY" },
  { code: "3100", name: "Retained earnings", type: "EQUITY" },

  { code: "4010", name: "Fuel sales", type: "REVENUE" },
  { code: "4020", name: "Lubricants and merchandise sales", type: "REVENUE" },
  { code: "4030", name: "Service income", type: "REVENUE" },
  { code: "4100", name: "Sales discounts", type: "REVENUE" },

  { code: "5010", name: "Cost of fuel sold", type: "EXPENSE" },
  { code: "5020", name: "Cost of lubricants and merchandise sold", type: "EXPENSE" },

  { code: "6010", name: "Salaries and wages", type: "EXPENSE" },
  { code: "6020", name: "SSS, PhilHealth and Pag-IBIG contributions", type: "EXPENSE" },
  { code: "6030", name: "Electricity", type: "EXPENSE" },
  { code: "6040", name: "Water", type: "EXPENSE" },
  { code: "6050", name: "Rent", type: "EXPENSE" },
  { code: "6060", name: "Repairs and maintenance", type: "EXPENSE" },
  { code: "6070", name: "Supplies", type: "EXPENSE" },
  { code: "6080", name: "Communication", type: "EXPENSE" },
  { code: "6090", name: "Transportation and delivery", type: "EXPENSE" },
  { code: "6100", name: "Taxes and licenses", type: "EXPENSE" },
  { code: "6110", name: "Depreciation", type: "EXPENSE" },
  { code: "6120", name: "Bank charges", type: "EXPENSE" },
  { code: "6130", name: "Professional fees", type: "EXPENSE" },
  { code: "6140", name: "Insurance", type: "EXPENSE" },
  { code: "6900", name: "Cash short or over", type: "EXPENSE" },
  { code: "6990", name: "Miscellaneous expense", type: "EXPENSE" },
];
