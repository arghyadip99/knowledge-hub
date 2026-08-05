export type AuthUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: "admin" | "reader";
};
export type AuthSession = { token: string; user: AuthUser };
const key = "knowledge-hub.session";

export const getSession = (): AuthSession | null => {
  try {
    return JSON.parse(
      localStorage.getItem(key) || "null",
    ) as AuthSession | null;
  } catch {
    return null;
  }
};
export const saveSession = (session: AuthSession) => {
  localStorage.setItem(key, JSON.stringify(session));
  window.dispatchEvent(new Event("knowledge-hub:auth"));
};
export const clearSession = () => {
  localStorage.removeItem(key);
  window.dispatchEvent(new Event("knowledge-hub:auth"));
};
