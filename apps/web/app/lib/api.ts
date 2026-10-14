import { getCompanyId } from "./company";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues: { path: string; message: string }[] = [],
  ) {
    super(message);
  }

  /** First message per field, for showing next to inputs. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const i of this.issues) out[i.path] ??= i.message;
    return out;
  }
}

/** Calls the Nines API. Sends the session cookie and the current company. */
export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const companyId = getCompanyId();
  if (companyId) headers.set("x-company-id", companyId);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`/api${path}`, { ...init, headers, body, credentials: "include" });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const message = Array.isArray(payload.message) ? payload.message.join(", ") : payload.message;
    throw new ApiError(res.status, message ?? res.statusText, payload.issues);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
