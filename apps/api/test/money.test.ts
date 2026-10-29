import { describe, expect, it } from "vitest";
import {
  describeOverShort,
  divRound,
  formatCentavos,
  litresSold,
  litresToAmountCentavos,
  overShort,
  payableBalance,
  parseCentavos,
  parseCentilitres,
  receivableBalance,
  splitInclusiveVat,
} from "@nines/shared";

describe("money math", () => {
  it("rounds half up", () => {
    expect(divRound(5n, 2n)).toBe(3n);
    expect(divRound(1n, 2n)).toBe(1n);
    expect(divRound(1n, 3n)).toBe(0n);
    expect(divRound(-5n, 2n)).toBe(-3n);
  });

  it("turns meter readings into litres and a peso amount", () => {
    expect(litresSold(100000n, 110000n)).toBe(10000n);
    // 100.00 L × ₱55.85 = ₱5,585.00 exactly.
    expect(litresToAmountCentavos(10000n, 5585n)).toBe(558500n);
    // 10.01 L × ₱56.25 = ₱563.0625 → ₱563.06
    expect(litresToAmountCentavos(1001n, 5625n)).toBe(56306n);
    expect(litresToAmountCentavos(0n, 5585n)).toBe(0n);
  });

  it("rejects a closing reading below the opening reading", () => {
    expect(() => litresSold(200n, 100n)).toThrow(/lower than the opening/);
  });

  it("splits 12% VAT out of a VAT-inclusive price", () => {
    // ₱112.00 inclusive is ₱100.00 plus ₱12.00 VAT.
    expect(splitInclusiveVat(11200n)).toEqual({ netCentavos: 10000n, vatCentavos: 1200n });
    // ₱0.56 inclusive is ₱0.50 plus ₱0.06 VAT.
    expect(splitInclusiveVat(56n)).toEqual({ netCentavos: 50n, vatCentavos: 6n });
    // ₱5,585.00 → VAT ₱598.39, net ₱4,986.61
    expect(splitInclusiveVat(558500n)).toEqual({ netCentavos: 498661n, vatCentavos: 59839n });
    const split = splitInclusiveVat(1n);
    expect(split.netCentavos + split.vatCentavos).toBe(1n);
  });

  it("computes cash over and short", () => {
    expect(overShort(558500n, 558500n, 0n, 0n)).toBe(0n);
    expect(overShort(558500n, 560000n, 0n, 0n)).toBe(1500n);
    expect(overShort(558500n, 500000n, 50000n, 0n)).toBe(-8500n);
    expect(describeOverShort(0n).label).toBe("Balanced");
    expect(describeOverShort(1500n).label).toBe("Over ₱15.00");
    expect(describeOverShort(-8500n).label).toBe("Short ₱85.00");
  });

  it("computes receivable and payable balances", () => {
    expect(receivableBalance(100000n, 40000n)).toBe(60000n);
    expect(receivableBalance(40000n, 40000n)).toBe(0n);
    expect(receivableBalance(10000n, 25000n)).toBe(-15000n);
    expect(payableBalance(250000n, 100000n)).toBe(150000n);
    expect(payableBalance(100000n, 100000n)).toBe(0n);
  });

  it("parses and formats Philippine peso amounts", () => {
    expect(parseCentavos("1,234.56")).toBe(123456n);
    expect(parseCentavos("₱55.8")).toBe(5580n);
    expect(parseCentilitres("12,450.20")).toBe(1245020n);
    expect(formatCentavos(123456n)).toBe("₱1,234.56");
    expect(formatCentavos(-2000n)).toBe("-₱20.00");
    expect(() => parseCentavos("12.345")).toThrow(/1,234.56/);
  });
});
