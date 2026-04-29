import { createServerFn } from "@tanstack/react-start";

export const getDashboardBookingsFn = createServerFn({ method: "GET" }).handler(async () => {
  const services = await import("@/server/coolify-services.server");
  return services.getDashboardBookings();
});

export const getCustomersFn = createServerFn({ method: "GET" }).handler(async () => {
  const services = await import("@/server/coolify-services.server");
  return services.getCustomers();
});

export const getCustomersReportFn = createServerFn({ method: "GET" }).handler(async () => {
  const services = await import("@/server/coolify-services.server");
  return services.getCustomersReport();
});

export const getCustomerDetailFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.getCustomerDetail(data);
  },
);

export const getWorkerDetailFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.getWorkerDetail(data);
  },
);

export const createBookingFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.createBooking(data);
  },
);

export const createPaymentFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.createPayment(data);
  },
);

export const cancelBookingFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.cancelBooking(data);
  },
);

export const updateBookingFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.updateBooking(data);
  },
);

export const deleteCustomerFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.deleteCustomer(data);
  },
);

export const deleteWorkerFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.deleteWorker(data);
  },
);

export const getReportsDataFn = createServerFn({ method: "GET" }).handler(async () => {
  const services = await import("@/server/coolify-services.server");
  return services.getReportsData();
});

export const getExpensesDataFn = createServerFn({ method: "GET" }).handler(async () => {
  const services = await import("@/server/coolify-services.server");
  return services.getExpensesData();
});

export const addExpenseFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.addExpense(data);
  },
);

export const deleteExpenseFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.deleteExpense(data);
  },
);

export const addWorkerFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.addWorker(data);
  },
);

export const addWorkerPaymentFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.addWorkerPayment(data);
  },
);

export const toggleWorkerActiveFn: any = createServerFn({ method: "POST" }).handler(
  async ({ data }: any) => {
    const services = await import("@/server/coolify-services.server");
    return services.toggleWorkerActive(data);
  },
);
