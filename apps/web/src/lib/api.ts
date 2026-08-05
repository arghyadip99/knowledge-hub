import { clearSession, getSession } from "../features/auth/session";

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const session = getSession();
  const response = await fetch(path, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (response.status === 401 && !path.startsWith("/api/auth/")) clearSession();

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Something went wrong");
  }

  return response.status === 204 ? (undefined as T) : response.json();
}
