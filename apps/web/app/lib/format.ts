const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

/** Formats whole centavos as pesos: 1234500 → ₱12,345.00 */
export function formatPeso(centavos: number) {
  return peso.format(centavos / 100);
}
