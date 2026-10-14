import { describe, expect, it } from "vitest";
import { splitVatInclusive } from "./money.js";

describe("splitVatInclusive", () => {
  it("splits ₱112.00 into ₱100.00 net and ₱12.00 VAT", () => {
    expect(splitVatInclusive(11200n)).toEqual({ net: 10000n, vat: 1200n });
  });

  it("rounds VAT to the nearest centavo and keeps net + vat = gross", () => {
    // ₱1,000.00 of diesel: VAT = 107.142857… → ₱107.14
    const { net, vat } = splitVatInclusive(100000n);
    expect(vat).toBe(10714n);
    expect(net + vat).toBe(100000n);
  });

  it("returns zero for zero", () => {
    expect(splitVatInclusive(0n)).toEqual({ net: 0n, vat: 0n });
  });
});
