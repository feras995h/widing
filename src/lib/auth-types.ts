/** Types only — no server imports, safe for all entry points (avoids Vite SSR circular init). */
export type CoolifyRole = "owner" | "staff" | "accountant";

export interface CoolifyAuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: CoolifyRole;
}
