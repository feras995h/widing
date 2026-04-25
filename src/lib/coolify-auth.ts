import { createServerFn } from "@tanstack/react-start";
import type { CoolifyRole } from "./auth-types";

export type { CoolifyAuthUser, CoolifyRole } from "./auth-types";

export const getLoginBootstrapInfoFn = createServerFn({ method: "GET" }).handler(async () => {
  const services = await import("@/server/coolify-services.server");
  return services.getLoginBootstrapInfo();
});

export const ensureOwnerAccountFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.ensureOwnerAccount(data);
  },
);

export const loginWithPasswordFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
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

export const updateUserRoleFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.updateUserRole(data);
  },
);

export const createUserByOwnerFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.createUserByOwner(data);
  },
);

export const setUserActiveByOwnerFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.setUserActiveByOwner(data);
  },
);

export const resetUserPasswordByOwnerFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.resetUserPasswordByOwner(data);
  },
);
