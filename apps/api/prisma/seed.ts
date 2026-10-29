import "dotenv/config";
import {
  addDays,
  litresToAmountCentavos,
  manilaToday,
  taxBreakdown,
} from "@nines/shared";
import { auth } from "../src/auth";
import {
  ensureChartOfAccounts,
  postCollectionJournal,
  postExpenseJournal,
  postOpeningCashJournal,
  postSaleJournal,
  postShiftSalesJournal,
} from "../src/books";
import { prisma } from "../src/prisma";

const DEMO_EMAIL = "demo@nines.local";
const DEMO_PASSWORD = "station123";
const SHOP_EMAIL = "shop@nines.local";
const SHOP_PASSWORD = "shop123";

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

async function wipeUser(email: string) {
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { station: true },
  });
  if (!existing) return;
  if (existing.station) {
    // JournalLine.accountId is Restrict — clear journals before cascading station delete.
    await prisma.journalLine.deleteMany({
      where: { entry: { stationId: existing.station.id } },
    });
    await prisma.journalEntry.deleteMany({ where: { stationId: existing.station.id } });
  }
  await prisma.user.delete({ where: { id: existing.id } });
}

async function createOwner(email: string, password: string, name: string) {
  await wipeUser(email);
  const signedUp = await auth.api.signUpEmail({
    body: { email, password, name },
  });
  if (!signedUp?.user?.id) {
    throw new Error(`Could not create account for ${email}.`);
  }
  return signedUp.user;
}

async function seedFuelDemo() {
  const owner = await createOwner(DEMO_EMAIL, DEMO_PASSWORD, "Marina Bautista");
  const today = manilaToday();

  const station = await prisma.station.create({
    data: {
      ownerId: owner.id,
      name: "Bautista Fuel Point",
      tin: "449-221-308-000",
      address: "128 Marcos Highway, Barangay Mayamot, Antipolo City, Rizal",
      vatRegistered: true,
      industry: "FUEL_STATION",
      fuelModuleEnabled: true,
      taxRegime: "VAT",
      percentageTaxRateBps: 300,
    },
  });
  await ensureChartOfAccounts(station.id, true);
  // Opening cashier float so expense credits to cash do not flip the account.
  await postOpeningCashJournal(station.id, {
    businessDate: addDays(today, -14),
    cashCentavos: 2_500_000n, // ₱25,000
    note: "Opening cash on hand",
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

  const dieselTank = await prisma.tank.create({
    data: {
      stationId: station.id,
      productId: products.get("Diesel")!.id,
      name: "Diesel tank 1",
      capacityCentilitres: 2_000_000n,
      bookCentilitres: 1_200_000n,
      avgCostPerLitreCentavos: 4800n,
    },
  });
  const unleadedTank = await prisma.tank.create({
    data: {
      stationId: station.id,
      productId: products.get("Unleaded")!.id,
      name: "Unleaded tank 1",
      capacityCentilitres: 1_500_000n,
      bookCentilitres: 900_000n,
      avgCostPerLitreCentavos: 5200n,
    },
  });

  // (a) individual cash with TIN
  await prisma.customer.create({
    data: {
      stationId: station.id,
      type: "INDIVIDUAL",
      name: "Ana Reyes",
      tin: "123-456-789-000",
      phone: "0917 111 2233",
      address: "Antipolo City",
      allowsCharge: false,
      taxTreatment: "VATABLE",
      notes: "Walk-in cash customer.",
    },
  });

  // (b) SC customer with ID
  const senior = await prisma.customer.create({
    data: {
      stationId: station.id,
      type: "INDIVIDUAL",
      name: "Lola Carmen Santos",
      phone: "0918 222 3344",
      isSeniorOrPwd: true,
      seniorPwdIdNumber: "SC-2019-44821",
      allowsCharge: false,
      taxTreatment: "VATABLE",
      notes: "Senior citizen — apply SC discount on personal purchases.",
    },
  });

  // (c) fleet org on charge 30-day terms + limit
  const fleet = await prisma.customer.create({
    data: {
      stationId: station.id,
      type: "ORGANIZATION",
      name: "Mang Juan Transport",
      contactPerson: "Juan Dela Cruz",
      tin: "300-111-222-000",
      phone: "0917 555 0142",
      address: "Cainta, Rizal",
      allowsCharge: true,
      creditLimitCentavos: 5_000_000n,
      paymentTermsDays: 30,
      taxTreatment: "VATABLE",
      withholdingRateBps: 100,
      notes: "Jeepney units, pays every Friday.",
    },
  });

  // (d) VAT-exempt org with certificate
  await prisma.customer.create({
    data: {
      stationId: station.id,
      type: "ORGANIZATION",
      name: "San Roque Parish Cooperative",
      contactPerson: "Sister Maria",
      tin: "004-555-666-000",
      phone: "02 8123 4400",
      allowsCharge: true,
      creditLimitCentavos: 1_000_000n,
      paymentTermsDays: 15,
      taxTreatment: "VAT_EXEMPT",
      taxExemptReason: "Agricultural cooperative VAT exemption",
      taxExemptReference: "BIR COE-2024-1188",
      notes: "Ambulance and service vehicle.",
    },
  });

  const ambulance = await prisma.customer.create({
    data: {
      stationId: station.id,
      type: "ORGANIZATION",
      name: "Barangay San Roque",
      phone: "02 8123 4400",
      allowsCharge: true,
      creditLimitCentavos: 500_000n,
      paymentTermsDays: 15,
      notes: "Barangay ambulance account.",
    },
  });

  const meters = [1_250_000n, 980_000n, 640_200n, 410_050n];
  const shiftPlan: { name: "Morning" | "Afternoon" | "Night"; sortOrder: number }[] = [
    { name: "Morning", sortOrder: 0 },
    { name: "Afternoon", sortOrder: 1 },
  ];

  let sampleMorningShiftId: string | null = null;

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
      const credit =
        shift.name === "Afternoon" && dayIndex % 3 === 0
          ? 250_000n
          : shift.name === "Morning" && dayIndex % 7 === 2
            ? 80_000n
            : 0n;
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

      await postShiftSalesJournal(station.id, {
        businessDate: addDays(today, -age),
        shiftId: created.id,
        shiftName: shift.name,
        cashCentavos: cash,
        cardCentavos: card,
        creditCentavos: credit,
        expectedSalesCentavos: expected,
        vatRegistered: true,
      });

      if (age === 0 && shift.name === "Morning") {
        sampleMorningShiftId = created.id;
      }

      if (credit === 250_000n) {
        await prisma.creditCharge.create({
          data: {
            customerId: fleet.id,
            shiftId: created.id,
            businessDate,
            dueDate: new Date(`${addDays(addDays(today, -age), 30)}T00:00:00.000Z`),
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
            dueDate: new Date(`${addDays(addDays(today, -age), 15)}T00:00:00.000Z`),
            amountCentavos: credit,
            note: "Ambulance diesel",
          },
        });
      }
    }
  }

  await prisma.customerPayment.create({
    data: {
      customerId: fleet.id,
      businessDate: new Date(`${addDays(today, -7)}T00:00:00.000Z`),
      amountCentavos: 500_000n,
      withholdingCentavos: 5_000n,
      bir2307Reference: "2307-2026-0142",
      note: "Friday collection",
    },
  });
  await postCollectionJournal(station.id, {
    businessDate: addDays(today, -7),
    customerName: fleet.name,
    amountCentavos: 500_000n,
    withholdingCentavos: 5_000n,
    reference: "2307-2026-0142",
  });

  await prisma.customerPayment.create({
    data: {
      customerId: ambulance.id,
      businessDate: new Date(`${addDays(today, -2)}T00:00:00.000Z`),
      amountCentavos: 80_000n,
      note: "Barangay check",
    },
  });
  await postCollectionJournal(station.id, {
    businessDate: addDays(today, -2),
    customerName: ambulance.name,
    amountCentavos: 80_000n,
    withholdingCentavos: 0n,
  });

  // Charge sale invoice for fleet
  const chargeGross = 112_000n;
  const chargeTax = taxBreakdown(chargeGross, "VATABLE");
  const chargeInvoice = await prisma.salesInvoice.create({
    data: {
      stationId: station.id,
      number: "INV-00001",
      businessDate: new Date(`${addDays(today, -1)}T00:00:00.000Z`),
      customerId: fleet.id,
      paymentMethod: "CHARGE",
      buyerName: fleet.name,
      buyerTin: "300-111-222-000",
      taxTreatment: "VATABLE",
      grossCentavos: chargeTax.grossCentavos,
      vatCentavos: chargeTax.vatCentavos,
      netCentavos: chargeTax.netCentavos,
      totalCentavos: chargeTax.totalCentavos,
      note: "Fleet top-up",
      lines: {
        create: [
          {
            fuelProductId: products.get("Diesel")!.id,
            description: "Diesel",
            unit: "L",
            qtyScaled: 20_000n,
            unitPriceCentavos: 5600n,
            amountCentavos: chargeGross,
            vatCentavos: chargeTax.vatCentavos,
          },
        ],
      },
    },
  });
  await prisma.creditCharge.create({
    data: {
      customerId: fleet.id,
      invoiceId: chargeInvoice.id,
      businessDate: new Date(`${addDays(today, -1)}T00:00:00.000Z`),
      dueDate: new Date(`${addDays(today, 29)}T00:00:00.000Z`),
      amountCentavos: chargeTax.totalCentavos,
      note: "Invoice INV-00001",
    },
  });
  await postSaleJournal(station.id, {
    businessDate: addDays(today, -1),
    invoiceNumber: "INV-00001",
    paymentMethod: "CHARGE",
    totalCentavos: chargeTax.totalCentavos,
    netCentavos: chargeTax.netCentavos,
    vatCentavos: chargeTax.vatCentavos,
  });

  // SC cash sale
  const scGross = 56_000n;
  const scTax = taxBreakdown(scGross, "VATABLE", { seniorOrPwd: true });
  await prisma.salesInvoice.create({
    data: {
      stationId: station.id,
      number: "INV-00002",
      businessDate: new Date(`${today}T00:00:00.000Z`),
      customerId: senior.id,
      paymentMethod: "CASH",
      buyerName: senior.name,
      taxTreatment: "VATABLE",
      isSeniorOrPwd: true,
      seniorPwdIdNumber: senior.seniorPwdIdNumber,
      scPwdDiscountCentavos: scTax.scPwdDiscountCentavos,
      grossCentavos: scTax.grossCentavos,
      vatCentavos: scTax.vatCentavos,
      netCentavos: scTax.netCentavos,
      totalCentavos: scTax.totalCentavos,
      lines: {
        create: [
          {
            fuelProductId: products.get("Unleaded")!.id,
            description: "Unleaded",
            unit: "L",
            qtyScaled: 10_000n,
            unitPriceCentavos: 5600n,
            amountCentavos: scGross,
            vatCentavos: 0n,
          },
        ],
      },
    },
  });
  await postSaleJournal(station.id, {
    businessDate: today,
    invoiceNumber: "INV-00002",
    paymentMethod: "CASH",
    totalCentavos: scTax.totalCentavos,
    netCentavos: scTax.netCentavos,
    vatCentavos: scTax.vatCentavos,
  });

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

  await prisma.fuelDelivery.create({
    data: {
      stationId: station.id,
      supplierId: pacific.id,
      productId: products.get("Diesel")!.id,
      tankId: dieselTank.id,
      businessDate: new Date(`${addDays(today, -10)}T00:00:00.000Z`),
      invoiceReference: "DR-10442",
      drLitresCentilitres: 1_000_000n,
      measuredLitresCentilitres: 998_500n,
      unitCostPerLitreCentavos: 4800n,
      freightCentavos: 15_000n,
      inputVatCentavos: 51_428n,
      receivedBy: "Ramon",
      checkedBy: "Marina",
    },
  });
  await prisma.fuelDelivery.create({
    data: {
      stationId: station.id,
      supplierId: pacific.id,
      productId: products.get("Unleaded")!.id,
      tankId: unleadedTank.id,
      businessDate: new Date(`${addDays(today, -3)}T00:00:00.000Z`),
      invoiceReference: "DR-10488",
      drLitresCentilitres: 500_000n,
      measuredLitresCentilitres: 499_200n,
      unitCostPerLitreCentavos: 5200n,
      freightCentavos: 8_000n,
      inputVatCentavos: 26_057n,
      receivedBy: "Ramon",
      checkedBy: "Marina",
    },
  });

  if (sampleMorningShiftId) {
    await prisma.cashReconciliation.create({
      data: {
        stationId: station.id,
        businessDate: new Date(`${today}T00:00:00.000Z`),
        shiftId: sampleMorningShiftId,
        shiftName: "Morning",
        cashier: "Ramon Cruz",
        openingFloatCentavos: 50_000n,
        cashSalesCentavos: 250_000n,
        otherReceiptsCentavos: 0n,
        paidOutCentavos: 5_000n,
        countedCentavos: 294_500n,
        depositCentavos: 240_000n,
        depositDate: new Date(`${today}T00:00:00.000Z`),
        bankReference: "BPI-8821",
        reviewedBy: "Marina",
        note: "Sample morning recon",
      },
    });
  }

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
    const date = addDays(today, -expense.daysAgo);
    await prisma.expense.create({
      data: {
        stationId: station.id,
        businessDate: new Date(`${date}T00:00:00.000Z`),
        category: expense.category,
        amountCentavos: expense.amount,
        netCentavos: expense.amount,
        payee: expense.payee,
        note: expense.note,
      },
    });
    await postExpenseJournal(station.id, {
      businessDate: date,
      payee: expense.payee,
      amountCentavos: expense.amount,
      netCentavos: expense.amount,
      inputVatCentavos: 0n,
      withholdingCentavos: 0n,
      accountCode: expense.category === "Wages" ? "6000" : expense.category === "Utilities" ? "6020" : "6040",
    });
  }

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

async function seedShopDemo() {
  const owner = await createOwner(SHOP_EMAIL, SHOP_PASSWORD, "Elena Cruz");
  const today = manilaToday();

  const station = await prisma.station.create({
    data: {
      ownerId: owner.id,
      name: "Cruz Neighborhood Store",
      tin: "512-334-778-000",
      address: "45 Mabini Street, Barangay San Isidro, Cainta, Rizal",
      vatRegistered: true,
      industry: "GENERAL",
      fuelModuleEnabled: false,
      taxRegime: "VAT",
      percentageTaxRateBps: 300,
    },
  });
  await ensureChartOfAccounts(station.id, false);
  await postOpeningCashJournal(station.id, {
    businessDate: addDays(today, -7),
    cashCentavos: 500_000n, // ₱5,000
    note: "Opening cash on hand",
  });

  const rice = await prisma.item.create({
    data: {
      stationId: station.id,
      name: "Rice 25kg",
      unit: "sack",
      priceCentavos: 145_000n,
      taxType: "VATABLE",
      stockQtyScaled: 4_000n,
      sortOrder: 0,
    },
  });
  const eggs = await prisma.item.create({
    data: {
      stationId: station.id,
      name: "Eggs (tray)",
      unit: "tray",
      priceCentavos: 28_000n,
      taxType: "VATABLE",
      stockQtyScaled: 2_500n,
      sortOrder: 1,
    },
  });
  const soap = await prisma.item.create({
    data: {
      stationId: station.id,
      name: "Laundry soap",
      unit: "pc",
      priceCentavos: 1_850n,
      taxType: "VATABLE",
      stockQtyScaled: 12_000n,
      sortOrder: 2,
    },
  });

  const chargeCustomer = await prisma.customer.create({
    data: {
      stationId: station.id,
      type: "ORGANIZATION",
      name: "Isidro Boarding House",
      contactPerson: "Tita Remy",
      phone: "0917 888 2211",
      allowsCharge: true,
      creditLimitCentavos: 300_000n,
      paymentTermsDays: 15,
      taxTreatment: "VATABLE",
      notes: "Weekly grocery charge.",
    },
  });

  await prisma.customer.create({
    data: {
      stationId: station.id,
      type: "INDIVIDUAL",
      name: "Walk-in cash",
      allowsCharge: false,
      taxTreatment: "VATABLE",
    },
  });

  const sale1Gross = 145_000n;
  const sale1Tax = taxBreakdown(sale1Gross, "VATABLE");
  await prisma.salesInvoice.create({
    data: {
      stationId: station.id,
      number: "INV-00001",
      businessDate: new Date(`${addDays(today, -2)}T00:00:00.000Z`),
      paymentMethod: "CASH",
      buyerName: "Walk-in",
      taxTreatment: "VATABLE",
      grossCentavos: sale1Tax.grossCentavos,
      vatCentavos: sale1Tax.vatCentavos,
      netCentavos: sale1Tax.netCentavos,
      totalCentavos: sale1Tax.totalCentavos,
      lines: {
        create: [
          {
            itemId: rice.id,
            description: rice.name,
            unit: rice.unit,
            qtyScaled: 100n,
            unitPriceCentavos: rice.priceCentavos,
            amountCentavos: sale1Gross,
            vatCentavos: sale1Tax.vatCentavos,
          },
        ],
      },
    },
  });
  await postSaleJournal(station.id, {
    businessDate: addDays(today, -2),
    invoiceNumber: "INV-00001",
    paymentMethod: "CASH",
    totalCentavos: sale1Tax.totalCentavos,
    netCentavos: sale1Tax.netCentavos,
    vatCentavos: sale1Tax.vatCentavos,
  });
  await prisma.item.update({
    where: { id: rice.id },
    data: { stockQtyScaled: rice.stockQtyScaled - 100n },
  });

  const sale2Gross = 56_000n;
  const sale2Tax = taxBreakdown(sale2Gross, "VATABLE");
  await prisma.salesInvoice.create({
    data: {
      stationId: station.id,
      number: "INV-00002",
      businessDate: new Date(`${addDays(today, -1)}T00:00:00.000Z`),
      paymentMethod: "CASH",
      taxTreatment: "VATABLE",
      grossCentavos: sale2Tax.grossCentavos,
      vatCentavos: sale2Tax.vatCentavos,
      netCentavos: sale2Tax.netCentavos,
      totalCentavos: sale2Tax.totalCentavos,
      lines: {
        create: [
          {
            itemId: eggs.id,
            description: eggs.name,
            unit: eggs.unit,
            qtyScaled: 200n,
            unitPriceCentavos: eggs.priceCentavos,
            amountCentavos: sale2Gross,
            vatCentavos: sale2Tax.vatCentavos,
          },
        ],
      },
    },
  });
  await postSaleJournal(station.id, {
    businessDate: addDays(today, -1),
    invoiceNumber: "INV-00002",
    paymentMethod: "CASH",
    totalCentavos: sale2Tax.totalCentavos,
    netCentavos: sale2Tax.netCentavos,
    vatCentavos: sale2Tax.vatCentavos,
  });

  const sale3Gross = 37_000n;
  const sale3Tax = taxBreakdown(sale3Gross, "VATABLE");
  const chargeInvoice = await prisma.salesInvoice.create({
    data: {
      stationId: station.id,
      number: "INV-00003",
      businessDate: new Date(`${today}T00:00:00.000Z`),
      customerId: chargeCustomer.id,
      paymentMethod: "CHARGE",
      buyerName: chargeCustomer.name,
      taxTreatment: "VATABLE",
      grossCentavos: sale3Tax.grossCentavos,
      vatCentavos: sale3Tax.vatCentavos,
      netCentavos: sale3Tax.netCentavos,
      totalCentavos: sale3Tax.totalCentavos,
      lines: {
        create: [
          {
            itemId: soap.id,
            description: soap.name,
            unit: soap.unit,
            qtyScaled: 2_000n,
            unitPriceCentavos: soap.priceCentavos,
            amountCentavos: sale3Gross,
            vatCentavos: sale3Tax.vatCentavos,
          },
        ],
      },
    },
  });
  await prisma.creditCharge.create({
    data: {
      customerId: chargeCustomer.id,
      invoiceId: chargeInvoice.id,
      businessDate: new Date(`${today}T00:00:00.000Z`),
      dueDate: new Date(`${addDays(today, 15)}T00:00:00.000Z`),
      amountCentavos: sale3Tax.totalCentavos,
      note: "Invoice INV-00003",
    },
  });
  await postSaleJournal(station.id, {
    businessDate: today,
    invoiceNumber: "INV-00003",
    paymentMethod: "CHARGE",
    totalCentavos: sale3Tax.totalCentavos,
    netCentavos: sale3Tax.netCentavos,
    vatCentavos: sale3Tax.vatCentavos,
  });

  const shopExpenses = [
    { daysAgo: 5, category: "Utilities", amount: 42_000n, payee: "Meralco", note: "Store electricity" },
    { daysAgo: 2, category: "Supplies", amount: 15_500n, payee: "Wholesale depot", note: "Plastic bags" },
    { daysAgo: 0, category: "Wages", amount: 120_000n, payee: "Store helper", note: "Weekly wage" },
  ];
  for (const expense of shopExpenses) {
    const date = addDays(today, -expense.daysAgo);
    await prisma.expense.create({
      data: {
        stationId: station.id,
        businessDate: new Date(`${date}T00:00:00.000Z`),
        category: expense.category,
        amountCentavos: expense.amount,
        netCentavos: expense.amount,
        payee: expense.payee,
        note: expense.note,
      },
    });
    await postExpenseJournal(station.id, {
      businessDate: date,
      payee: expense.payee,
      amountCentavos: expense.amount,
      netCentavos: expense.amount,
      inputVatCentavos: 0n,
      withholdingCentavos: 0n,
    });
  }

  console.log("Seeded Cruz Neighborhood Store.");
  console.log(`Shop login: ${SHOP_EMAIL} / ${SHOP_PASSWORD}`);
}

export async function seedDemo() {
  await seedFuelDemo();
  await seedShopDemo();
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
