export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function isMissingEndpoint(error: unknown) {
  return error instanceof ApiError && (error.status === 404 || error.status === 501);
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new ApiError(data?.message ?? "Something went wrong. Please try again.", response.status);
  }
  return data as T;
}

/** Soft fetch for endpoints still landing in parallel API work. */
export async function apiOptional<T>(path: string, fallback: T, init?: RequestInit): Promise<T> {
  try {
    return await api<T>(path, init);
  } catch (error) {
    if (isMissingEndpoint(error)) return fallback;
    throw error;
  }
}
