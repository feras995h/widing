import { createServerFn } from "@tanstack/react-start";
import type { CoolifyRole } from "./auth-types";

export type { CoolifyAuthUser, CoolifyRole } from "./auth-types";

export const getLoginBootstrapInfoFn = createServerFn({ method: "GET" }).handler(async () => {
  const services = await import("@/server/coolify-services.server");
  return services.getLoginBootstrapInfo();
});

export const ensureOwnerAccountFn = createServerFn({ method: "POST" }).handler(
  async ({
    data,
  }: {
    data: { email: string; password: string; fullName?: string; setupKey?: string };
  }) => {
    const services = await import("@/server/coolify-services.server");
    return services.ensureOwnerAccount(data);
  },
);

export const loginWithPasswordFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { email: string; password: string } }) => {
    const services = await import("@/server/coolify-services.server");
    return services.loginWithPassword(data);
  },
);

export const getCurrentAuthUserFn = createServerFn({ method: "GET" }).handler(async () => {
  const services = await import("@/server/coolify-services.server");
  return services.getCurrentAuthUser();
});

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const services = await import("@/server/coolify-services.server");
  return services.logout();
});

export const listUsersWithRolesFn = createServerFn({ method: "GET" }).handler(async () => {
  const services = await import("@/server/coolify-services.server");
  return services.listUsersWithRoles();
});

export const updateUserRoleFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { userId: string; role: CoolifyRole } }) => {
    const services = await import("@/server/coolify-services.server");
    return services.updateUserRole(data);
  },
);

export const createUserByOwnerFn = createServerFn({ method: "POST" }).handler(
  async ({
    data,
  }: {
    data: { email: string; password: string; fullName?: string; role: CoolifyRole };
  }) => {
    const services = await import("@/server/coolify-services.server");
    return services.createUserByOwner(data);
  },
);

export const setUserActiveByOwnerFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { userId: string; isActive: boolean } }) => {
    const services = await import("@/server/coolify-services.server");
    return services.setUserActiveByOwner(data);
  },
);

export const resetUserPasswordByOwnerFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { userId: string; newPassword: string } }) => {
    const services = await import("@/server/coolify-services.server");
    return services.resetUserPasswordByOwner(data);
  },
);
