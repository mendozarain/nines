import "dotenv/config";
import { addDays, litresToAmountCentavos, manilaToday } from "@nines/shared";
import { auth } from "../src/auth";
import { prisma } from "../src/prisma";

const DEMO_EMAIL = "demo@nines.local";
const DEMO_PASSWORD = "station123";

const PRODUCT_PRICES = [
  { name: "Diesel", price: 5585n },
  { name: "Unleaded", price: 6140n },
  { name: "Premium", price: 6675n },
] as const;

const PUMPS = [
  { name: "Pump 1", product: "Diesel" },
  { name: "Pump 2", product: "Diesel" },
  { name: "Pump 3", product: "Unleaded" },
  { name: "Pump 4", product: "Premium" },
] as const;

function volume(dayIndex: number, pumpIndex: number, shiftIndex: number): bigint {
  const base = [820, 540, 610, 240][pumpIndex] ?? 200;
  const shiftFactor = [1.08, 0.92, 0.48][shiftIndex] ?? 1;
  const wave = 1 + 0.05 * Math.sin((dayIndex + 1) * (pumpIndex + 2));
  return BigInt(Math.round(base * shiftFactor * wave * 100));
}

export async function seedDemo() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const signedUp = await auth.api.signUpEmail({
    body: {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      name: "Marina Bautista",
    },
  });
  if (!signedUp?.user?.id) {
    throw new Error("Could not create the demo account.");
  }

  const today = manilaToday();
  const station = await prisma.station.create({
    data: {
      ownerId: signedUp.user.id,
      name: "Bautista Fuel Point",
      tin: "449-221-308-000",
      address: "128 Marcos Highway, Barangay Mayamot, Antipolo City, Rizal",
      vatRegistered: true,
    },
  });

  const products = new Map<string, { id: string; price: bigint }>();
  for (const [index, product] of PRODUCT_PRICES.entries()) {
    const created = await prisma.fuelProduct.create({
      data: {
        stationId: station.id,
        name: product.name,
        pricePerLitreCentavos: product.price,
        sortOrder: index,
      },
    });
    products.set(product.name, { id: created.id, price: product.price });
  }

  const pumps = [];
  for (const [index, pump] of PUMPS.entries()) {
    const product = products.get(pump.product)!;
    pumps.push(
      await prisma.pump.create({
        data: {
          stationId: station.id,
          name: pump.name,
          productId: product.id,
          sortOrder: index,
        },
      }),
    );
  }

  const juan = await prisma.customer.create({
    data: { stationId: station.id, name: "Mang Juan Transport", phone: "0917 555 0142", notes: "Jeepney units, pays every Friday." },
  });
  const ambulance = await prisma.customer.create({
    data: { stationId: station.id, name: "Barangay San Roque", phone: "02 8123 4400", notes: "Ambulance and service vehicle." },
  });
  await prisma.customer.create({
    data: { stationId: station.id, name: "Santos Family Store", phone: "0918 200 1188", notes: "Paid up. Occasional diesel for the delivery van." },
  });

  const meters = [1_250_000n, 980_000n, 640_200n, 410_050n];
  const shiftPlan: { name: "Morning" | "Afternoon" | "Night"; sortOrder: number }[] = [
    { name: "Morning", sortOrder: 0 },
    { name: "Afternoon", sortOrder: 1 },
  ];

  for (let age = 13; age >= 0; age -= 1) {
    const dayIndex = 13 - age;
    const businessDate = new Date(`${addDays(today, -age)}T00:00:00.000Z`);
    const shifts = age < 3 ? [...shiftPlan, { name: "Night" as const, sortOrder: 2 }] : shiftPlan;
    for (const [shiftIndex, shift] of shifts.entries()) {
      const readings = pumps.map((pump, pumpIndex) => {
        const productName = PUMPS[pumpIndex].product;
        const price = products.get(productName)!.price;
        const litres = volume(dayIndex, pumpIndex, shiftIndex);
        const opening = meters[pumpIndex];
        const closing = opening + litres;
        meters[pumpIndex] = closing;
        return {
          pumpId: pump.id,
          openingCentilitres: opening,
          closingCentilitres: closing,
          litresCentilitres: litres,
          pricePerLitreCentavos: price,
          amountCentavos: litresToAmountCentavos(litres, price),
        };
      });
      const expected = readings.reduce((sum, reading) => sum + reading.amountCentavos, 0n);
      const credit = shift.name === "Afternoon" && dayIndex % 3 === 0 ? 250_000n : shift.name === "Morning" && dayIndex % 7 === 2 ? 80_000n : 0n;
      const card = (expected / 100n) * 12n;
      const short = dayIndex % 6 === 0 && shift.name === "Morning" ? 1_500n : 0n;
      const over = dayIndex % 6 === 3 && shift.name === "Afternoon" ? 2_000n : 0n;
      const cash = expected - card - credit - short + over;

      const created = await prisma.shift.create({
        data: {
          stationId: station.id,
          businessDate,
          name: shift.name,
          sortOrder: shift.sortOrder,
          cashCentavos: cash,
          cardCentavos: card,
          creditCentavos: credit,
          notes: short ? "Cashier counted the drawer twice." : "",
          readings: { create: readings },
        },
      });

      if (credit === 250_000n) {
        await prisma.creditCharge.create({
          data: {
            customerId: juan.id,
            shiftId: created.id,
            businessDate,
            amountCentavos: credit,
            note: "Diesel on account",
          },
        });
      } else if (credit === 80_000n) {
        await prisma.creditCharge.create({
          data: {
            customerId: ambulance.id,
            shiftId: created.id,
            businessDate,
            amountCentavos: credit,
            note: "Ambulance diesel",
          },
        });
      }
    }
  }

  await prisma.customerPayment.create({
    data: {
      customerId: juan.id,
      businessDate: new Date(`${addDays(today, -7)}T00:00:00.000Z`),
      amountCentavos: 500_000n,
      note: "Friday collection",
    },
  });
  await prisma.customerPayment.create({
    data: {
      customerId: ambulance.id,
      businessDate: new Date(`${addDays(today, -2)}T00:00:00.000Z`),
      amountCentavos: 80_000n,
      note: "Barangay check",
    },
  });

  const expenses = [
    { daysAgo: 12, category: "Wages", amount: 850_000n, payee: "Station crew", note: "Weekly wages" },
    { daysAgo: 5, category: "Wages", amount: 850_000n, payee: "Station crew", note: "Weekly wages" },
    { daysAgo: 9, category: "Utilities", amount: 640_000n, payee: "Meralco", note: "Electric bill" },
    { daysAgo: 8, category: "Utilities", amount: 85_000n, payee: "Manila Water", note: "Water bill" },
    { daysAgo: 4, category: "Supplies", amount: 125_000n, payee: "Antipolo Trading", note: "Receipt rolls and gloves" },
    { daysAgo: 3, category: "Repairs", amount: 340_000n, payee: "Reyes Pump Service", note: "Pump 2 nozzle" },
    { daysAgo: 1, category: "Delivery", amount: 48_000n, payee: "Rider", note: "Bank deposit run" },
    { daysAgo: 0, category: "Supplies", amount: 36_000n, payee: "Sari-sari", note: "Coffee and soap for the comfort room" },
  ];
  for (const expense of expenses) {
    await prisma.expense.create({
      data: {
        stationId: station.id,
        businessDate: new Date(`${addDays(today, -expense.daysAgo)}T00:00:00.000Z`),
        category: expense.category,
        amountCentavos: expense.amount,
        payee: expense.payee,
        note: expense.note,
      },
    });
  }

  const pacific = await prisma.supplier.create({
    data: {
      stationId: station.id,
      name: "Pacific Fuel Supply",
      tin: "220-118-445-000",
      notes: "Diesel and gasoline deliveries.",
    },
  });
  const lube = await prisma.supplier.create({
    data: { stationId: station.id, name: "Metro Lube Supply", tin: "", notes: "Engine oil and additives." },
  });

  const bigBill = await prisma.bill.create({
    data: {
      supplierId: pacific.id,
      businessDate: new Date(`${addDays(today, -12)}T00:00:00.000Z`),
      dueDate: new Date(`${addDays(today, 2)}T00:00:00.000Z`),
      amountCentavos: 18_000_000n,
      reference: "DR-10442",
      note: "Diesel delivery, 10,000 L",
    },
  });
  await prisma.bill.create({
    data: {
      supplierId: pacific.id,
      businessDate: new Date(`${addDays(today, -3)}T00:00:00.000Z`),
      dueDate: new Date(`${addDays(today, 11)}T00:00:00.000Z`),
      amountCentavos: 9_500_000n,
      reference: "DR-10488",
      note: "Unleaded and Premium",
    },
  });
  await prisma.supplierPayment.create({
    data: {
      supplierId: pacific.id,
      billId: bigBill.id,
      businessDate: new Date(`${addDays(today, -6)}T00:00:00.000Z`),
      amountCentavos: 10_000_000n,
      note: "Partial payment, BPI transfer",
    },
  });
  const oilBill = await prisma.bill.create({
    data: {
      supplierId: lube.id,
      businessDate: new Date(`${addDays(today, -10)}T00:00:00.000Z`),
      amountCentavos: 186_000n,
      reference: "SI-3391",
      note: "Engine oil, 12 boxes",
    },
  });
  await prisma.supplierPayment.create({
    data: {
      supplierId: lube.id,
      billId: oilBill.id,
      businessDate: new Date(`${addDays(today, -10)}T00:00:00.000Z`),
      amountCentavos: 186_000n,
      note: "Paid in cash on delivery",
    },
  });

  console.log("Seeded Bautista Fuel Point.");
  console.log(`Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

if (require.main === module) {
  seedDemo()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
