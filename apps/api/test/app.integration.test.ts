import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { manilaMonth, manilaToday } from "@nines/shared";
import { createApp } from "../src/main";
import { prisma } from "../src/prisma";

let app: INestApplication;
const emails: string[] = [];

beforeAll(async () => {
  app = await createApp();
  await app.init();
});

afterAll(async () => {
  if (emails.length > 0) {
    // Journal lines restrict ledger-account deletes; clear journals before cascading the owner.
    await prisma.journalLine.deleteMany({
      where: { entry: { station: { owner: { email: { in: emails } } } } },
    });
    await prisma.journalEntry.deleteMany({
      where: { station: { owner: { email: { in: emails } } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  }
  await app.close();
  await prisma.$disconnect();
});

async function signUp() {
  const email = `owner-${Date.now()}-${Math.random().toString(16).slice(2)}@test.nines`;
  emails.push(email);
  const agent = request.agent(app.getHttpServer());
  const response = await agent
    .post("/api/auth/sign-up/email")
    .set("Origin", "http://localhost:3000")
    .send({ email, password: "password123", name: "Test Owner" });
  expect(response.status, JSON.stringify(response.body)).toBeLessThan(400);
  return agent;
}

async function setupStation(agent: request.Agent, vatRegistered = true) {
  const response = await agent.post("/api/station").send({
    name: "Test Gas",
    tin: "123-456-789-000",
    address: "1 Test Street, Quezon City",
    vatRegistered,
    products: [
      { name: "Diesel", price: "55.85" },
      { name: "Unleaded", price: "61.40" },
    ],
    pumps: [
      { name: "Pump 1", productName: "Diesel" },
      { name: "Pump 2", productName: "Unleaded" },
    ],
  });
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  return response.body as {
    pumps: { id: string; name: string; productName: string; pricePerLitreCentavos?: string }[];
    products: { id: string; name: string; pricePerLitreCentavos: string }[];
    industry: string;
    fuelModuleEnabled: boolean;
  };
}

describe("station API", () => {
  it("requires a signed-in owner", async () => {
    const response = await request(app.getHttpServer()).get("/api/me");
    expect(response.status).toBe(401);
  });

  it("records a shift from meter readings and reports the amount, VAT, and over/short", async () => {
    const agent = await signUp();
    const me = await agent.get("/api/me");
    expect(me.body.station).toBeNull();

    const station = await setupStation(agent);
    expect(station.industry).toBe("FUEL_STATION");
    expect(station.fuelModuleEnabled).toBe(true);
    const diesel = station.pumps.find((pump) => pump.name === "Pump 1")!;
    const unleaded = station.pumps.find((pump) => pump.name === "Pump 2")!;
    const today = manilaToday();

    const shift = await agent.post("/api/shifts").send({
      businessDate: today,
      name: "Morning",
      cash: "5000.00",
      card: "585.00",
      credit: "0",
      readings: [
        { pumpId: diesel.id, opening: "1000.00", closing: "1100.00", price: "55.85" },
        { pumpId: unleaded.id, opening: "50.00", closing: "50.00", price: "61.40" },
      ],
      charges: [],
    });
    expect(shift.status, JSON.stringify(shift.body)).toBe(201);
    expect(shift.body.expectedCentavos).toBe("558500");
    expect(shift.body.readings[0].litresCentilitres).toBe("10000");
    expect(shift.body.readings[0].amountCentavos).toBe("558500");
    expect(shift.body.overShortCentavos).toBe("0");

    const short = await agent.post("/api/shifts").send({
      businessDate: today,
      name: "Afternoon",
      cash: "5580.00",
      card: "0",
      credit: "0",
      readings: [
        { pumpId: diesel.id, opening: "1100.00", closing: "1200.00", price: "55.85" },
        { pumpId: unleaded.id, opening: "50.00", closing: "50.00", price: "61.40" },
      ],
    });
    expect(short.status, JSON.stringify(short.body)).toBe(201);
    expect(short.body.overShortCentavos).toBe("-500");

    const backwards = await agent.post("/api/shifts").send({
      businessDate: today,
      name: "Night",
      cash: "0",
      card: "0",
      credit: "0",
      readings: [
        { pumpId: diesel.id, opening: "1200.00", closing: "1190.00", price: "55.85" },
        { pumpId: unleaded.id, opening: "50.00", closing: "50.00", price: "61.40" },
      ],
    });
    expect(backwards.status).toBe(400);
    expect(backwards.body.message).toMatch(/lower than the opening/i);

    const duplicate = await agent.post("/api/shifts").send({
      businessDate: today,
      name: "Morning",
      cash: "0",
      card: "0",
      credit: "0",
      readings: [
        { pumpId: diesel.id, opening: "1200.00", closing: "1200.00", price: "55.85" },
        { pumpId: unleaded.id, opening: "50.00", closing: "50.00", price: "61.40" },
      ],
    });
    expect(duplicate.status).toBe(400);

    const mismatch = await agent.post("/api/shifts").send({
      businessDate: today,
      name: "Night",
      cash: "0",
      card: "0",
      credit: "100.00",
      readings: [
        { pumpId: diesel.id, opening: "1200.00", closing: "1200.00", price: "55.85" },
        { pumpId: unleaded.id, opening: "50.00", closing: "50.00", price: "61.40" },
      ],
      charges: [],
    });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.message).toMatch(/credit/i);

    const expense = await agent.post("/api/expenses").send({
      businessDate: today,
      category: "Supplies",
      amount: "120.00",
      payee: "Store",
      note: "Soap",
    });
    expect(expense.status, JSON.stringify(expense.body)).toBe(201);

    const customer = await agent.post("/api/customers").send({
      name: "Juan Cruz",
      phone: "0917 000 0000",
      allowsCharge: true,
      creditLimit: "5000.00",
    });
    expect(customer.status).toBe(201);
    await agent.post(`/api/customers/${customer.body.id}/charges`).send({
      businessDate: today,
      amount: "1000.00",
      note: "Manual charge",
    });
    const paid = await agent.post(`/api/customers/${customer.body.id}/payments`).send({
      businessDate: today,
      amount: "400.00",
      note: "Cash",
    });
    expect(paid.body.balanceCentavos).toBe("60000");

    const supplier = await agent.post("/api/suppliers").send({ name: "Pacific Fuel", tin: "220-118-445-000" });
    await agent.post(`/api/suppliers/${supplier.body.id}/bills`).send({
      businessDate: today,
      amount: "2500.00",
      reference: "DR-1",
    });
    const supplierAfterPay = await agent.post(`/api/suppliers/${supplier.body.id}/payments`).send({
      businessDate: today,
      amount: "1000.00",
    });
    expect(supplierAfterPay.body.balanceCentavos).toBe("150000");

    const vat = await agent.get("/api/reports/vat").query({ month: manilaMonth() });
    expect(vat.status).toBe(200);
    // Two shifts of ₱5,585.00 = ₱11,170.00. VAT is 12/112 of that.
    expect(vat.body.grossSalesCentavos).toBe("1117000");
    // 12/112 of ₱11,170.00, rounded half up on the combined sales (not each shift).
    expect(vat.body.outputVatCentavos).toBe("119679");
    expect(vat.body.netSalesCentavos).toBe("997321");

    const dashboard = await agent.get("/api/dashboard");
    expect(dashboard.body.todaySalesCentavos).toBe("1117000");
    expect(dashboard.body.todayExpensesCentavos).toBe("12000");
    expect(dashboard.body.todayOverShortCentavos).toBe("-500");
    expect(dashboard.body.receivablesCentavos).toBe("60000");
    expect(dashboard.body.payablesCentavos).toBe("150000");

    const daily = await agent.get("/api/reports/daily").query({ date: today });
    expect(daily.body.salesCentavos).toBe("1117000");
    expect(daily.body.products.find((product: { name: string }) => product.name === "Diesel").litresCentilitres).toBe(
      "20000",
    );

    const notVat = await agent.patch("/api/station").send({
      name: "Test Gas",
      tin: "123-456-789-000",
      address: "1 Test Street, Quezon City",
      vatRegistered: false,
    });
    expect(notVat.status).toBe(200);
    const vatOff = await agent.get("/api/reports/vat").query({ month: manilaMonth() });
    expect(vatOff.body.vatRegistered).toBe(false);
    expect(vatOff.body.outputVatCentavos).toBe("0");
  });

  it("sets up a general business without pumps", async () => {
    const agent = await signUp();
    const response = await agent.post("/api/station").send({
      name: "Corner Store",
      tin: "111-222-333-000",
      address: "9 Mabini Street, Cainta, Rizal",
      vatRegistered: true,
      industry: "GENERAL",
      fuelModuleEnabled: false,
      products: [],
      pumps: [],
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body.industry).toBe("GENERAL");
    expect(response.body.fuelModuleEnabled).toBe(false);
    expect(response.body.products).toEqual([]);
    expect(response.body.pumps).toEqual([]);

    const me = await agent.get("/api/me");
    expect(me.body.station.industry).toBe("GENERAL");
    expect(me.body.station.fuelModuleEnabled).toBe(false);
    expect(me.body.station.taxRegime).toBe("VAT");

    const accounts = await agent.get("/api/books/accounts");
    expect(accounts.status).toBe(200);
    expect(accounts.body.accounts.some((row: { code: string }) => row.code === "4030")).toBe(true);
    expect(accounts.body.accounts.some((row: { code: string }) => row.code === "4000")).toBe(false);
  });

  it("blocks charges over the credit limit and validates tax-exempt profiles", async () => {
    const agent = await signUp();
    await setupStation(agent);
    const today = manilaToday();

    const badExempt = await agent.post("/api/customers").send({
      name: "Exempt Co",
      type: "ORGANIZATION",
      taxTreatment: "VAT_EXEMPT",
      allowsCharge: true,
      creditLimit: "1000.00",
    });
    expect(badExempt.status).toBe(400);
    expect(badExempt.body.message).toMatch(/reason|reference|certificate/i);

    const customer = await agent.post("/api/customers").send({
      name: "Fleet Co",
      type: "ORGANIZATION",
      allowsCharge: true,
      creditLimit: "1000.00",
      paymentTermsDays: 30,
      taxTreatment: "VAT_EXEMPT",
      taxExemptReason: "Cooperative exemption",
      taxExemptReference: "BIR-COE-1",
    });
    expect(customer.status, JSON.stringify(customer.body)).toBe(201);

    const ok = await agent.post(`/api/customers/${customer.body.id}/charges`).send({
      businessDate: today,
      amount: "800.00",
    });
    expect(ok.status, JSON.stringify(ok.body)).toBe(201);
    expect(ok.body.balanceCentavos).toBe("80000");

    const blocked = await agent.post(`/api/customers/${customer.body.id}/charges`).send({
      businessDate: today,
      amount: "300.00",
    });
    expect(blocked.status).toBe(400);
    expect(blocked.body.message).toMatch(/credit limit/i);

    const forced = await agent.post(`/api/customers/${customer.body.id}/charges`).send({
      businessDate: today,
      amount: "300.00",
      allowOverLimit: true,
    });
    expect(forced.status, JSON.stringify(forced.body)).toBe(201);
  });

  it("creates a sales invoice with VAT split and balances the trial balance", async () => {
    const agent = await signUp();
    const station = await agent.post("/api/station").send({
      name: "Retail Shop",
      tin: "999-888-777-000",
      address: "12 Luna Street, Pasig City",
      vatRegistered: true,
      industry: "RETAIL",
      fuelModuleEnabled: false,
    });
    expect(station.status, JSON.stringify(station.body)).toBe(201);

    const item = await agent.post("/api/items").send({
      name: "Bottled water",
      unit: "pc",
      price: "20.00",
      taxType: "VATABLE",
      stockQty: "50.00",
    });
    expect(item.status, JSON.stringify(item.body)).toBe(201);

    const today = manilaToday();
    const invoice = await agent.post("/api/sales").send({
      businessDate: today,
      paymentMethod: "CASH",
      buyerName: "Cash customer",
      lines: [
        {
          itemId: item.body.id,
          description: "Bottled water",
          unit: "pc",
          qty: "10.00",
          unitPrice: "20.00",
        },
      ],
    });
    expect(invoice.status, JSON.stringify(invoice.body)).toBe(201);
    expect(invoice.body.number).toBe("INV-00001");
    expect(invoice.body.grossCentavos).toBe("20000");
    // 12/112 of ₱200.00
    expect(invoice.body.vatCentavos).toBe("2143");
    expect(invoice.body.netCentavos).toBe("17857");
    expect(invoice.body.totalCentavos).toBe("20000");

    const vat = await agent.get("/api/reports/vat").query({ month: manilaMonth() });
    expect(vat.body.vatableSalesCentavos).toBe("17857");
    expect(vat.body.outputVatCentavos).toBe("2143");

    const tb = await agent.get("/api/books/trial-balance");
    expect(tb.status).toBe(200);
    expect(tb.body.balanced).toBe(true);
    expect(BigInt(tb.body.totalDebitCentavos)).toBe(BigInt(tb.body.totalCreditCentavos));
    expect(tb.body.rows.some((row: { code: string }) => row.code === "1000")).toBe(true);
    expect(tb.body.rows.some((row: { code: string }) => row.code === "4030")).toBe(true);
    expect(tb.body.rows.some((row: { code: string }) => row.code === "2040")).toBe(true);
  });
});
