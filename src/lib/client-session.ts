const TOKEN_KEY = "veloura_session_token";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function sessionHeaders(): HeadersInit {
  const token = getSessionToken();
  if (!token) return {};
  return {
    "x-session-token": token,
  };
}
