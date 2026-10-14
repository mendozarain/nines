// The company (gas station business) the user is working in, remembered per browser.
const KEY = "nines.companyId";

export type Company = {
  id: string;
  name: string;
  tradeName: string | null;
  tin: string | null;
  taxType: "VAT" | "NON_VAT";
  role: "OWNER" | "ACCOUNTANT" | "CASHIER";
};

export function getCompanyId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setCompanyId(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Private mode: the app still works, it just asks again next visit.
  }
}
