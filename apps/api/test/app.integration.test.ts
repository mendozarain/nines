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
    expect(expense.status).toBe(201);

    const customer = await agent.post("/api/customers").send({ name: "Juan Cruz", phone: "0917 000 0000" });
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
});
