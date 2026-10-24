export type Me = {
  user: { id: string; name: string; email: string } | null;
  station: {
    id: string;
    name: string;
    tin: string;
    address: string;
    vatRegistered: boolean;
  } | null;
  today: string;
  month: string;
};

export type Product = {
  id: string;
  name: string;
  pricePerLitreCentavos: string;
  active: boolean;
  sortOrder: number;
};

export type Pump = {
  id: string;
  name: string;
  productId: string;
  productName: string;
  active: boolean;
  sortOrder: number;
  lastClosingCentilitres: string | null;
};

export type StationDetails = {
  id: string;
  name: string;
  tin: string;
  address: string;
  vatRegistered: boolean;
  products: Product[];
  pumps: Pump[];
};

export type ShiftCharge = {
  id: string;
  customerId: string;
  customerName: string;
  amountCentavos: string;
  note: string;
};

export type ShiftReading = {
  pumpId: string;
  pumpName: string;
  productName: string;
  openingCentilitres: string;
  closingCentilitres: string;
  litresCentilitres: string;
  pricePerLitreCentavos: string;
  amountCentavos: string;
};

export type Shift = {
  id: string;
  businessDate: string;
  name: string;
  notes: string;
  cashCentavos: string;
  cardCentavos: string;
  creditCentavos: string;
  expectedCentavos: string;
  tenderedCentavos: string;
  overShortCentavos: string;
  readings: ShiftReading[];
  charges: ShiftCharge[];
};

export type Expense = {
  id: string;
  businessDate: string;
  category: string;
  payee: string;
  note: string;
  amountCentavos: string;
};

export type CustomerSummary = {
  id: string;
  name: string;
  phone: string;
  notes: string;
  chargesCentavos: string;
  paymentsCentavos: string;
  balanceCentavos: string;
};

export type CustomerDetail = CustomerSummary & {
  charges: {
    id: string;
    businessDate: string;
    amountCentavos: string;
    note: string;
    shiftId: string | null;
    shiftName: string | null;
  }[];
  payments: { id: string; businessDate: string; amountCentavos: string; note: string }[];
};

export type SupplierSummary = {
  id: string;
  name: string;
  tin: string;
  notes: string;
  billsCentavos: string;
  paymentsCentavos: string;
  balanceCentavos: string;
};

export type SupplierDetail = SupplierSummary & {
  bills: {
    id: string;
    businessDate: string;
    dueDate: string | null;
    reference: string;
    note: string;
    amountCentavos: string;
  }[];
  payments: { id: string; businessDate: string; amountCentavos: string; note: string; billId: string | null }[];
};

export type Dashboard = {
  today: string;
  month: string;
  vatRegistered: boolean;
  todaySalesCentavos: string;
  todayExpensesCentavos: string;
  todayOverShortCentavos: string;
  monthSalesCentavos: string;
  monthExpensesCentavos: string;
  monthNetSalesCentavos: string;
  monthOutputVatCentavos: string;
  receivablesCentavos: string;
  payablesCentavos: string;
  series: { date: string; salesCentavos: string }[];
};

export type DailyReport = {
  date: string;
  shiftCount: number;
  salesCentavos: string;
  cashCentavos: string;
  cardCentavos: string;
  creditCentavos: string;
  overShortCentavos: string;
  products: { name: string; litresCentilitres: string; amountCentavos: string }[];
  expensesCentavos: string;
  expenses: { id: string; category: string; payee: string; note: string; amountCentavos: string }[];
  shifts: { id: string; name: string; salesCentavos: string }[];
};

export type MonthlyReport = {
  month: string;
  shiftCount: number;
  salesCentavos: string;
  expensesCentavos: string;
  cashCentavos: string;
  cardCentavos: string;
  creditCentavos: string;
  overShortCentavos: string;
  products: { name: string; litresCentilitres: string; amountCentavos: string }[];
};

export type VatReport = {
  month: string;
  vatRegistered: boolean;
  grossSalesCentavos: string;
  netSalesCentavos: string;
  outputVatCentavos: string;
  rateLabel: string;
  note: string;
};
