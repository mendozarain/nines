// Money is stored as BigInt centavos. Amounts in a gas station's books stay far
// below Number.MAX_SAFE_INTEGER (₱90 trillion), so JSON sends them as numbers.
declare global {
  interface BigInt {
    toJSON(): number;
  }
}
BigInt.prototype.toJSON = function () {
  return Number(this);
};

export const VAT_RATE_BPS = 1200n; // 12.00%

/** Split a VAT-inclusive amount (centavos) into net and VAT, rounding VAT to the centavo. */
export function splitVatInclusive(grossCentavos: bigint): { net: bigint; vat: bigint } {
  // vat = gross * 12 / 112, rounded half up
  const vat = (grossCentavos * VAT_RATE_BPS * 2n + (10000n + VAT_RATE_BPS)) / ((10000n + VAT_RATE_BPS) * 2n);
  return { net: grossCentavos - vat, vat };
}
