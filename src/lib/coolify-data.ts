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

export const getCustomerDetailFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { customerId: string } }) => {
    const services = await import("@/server/coolify-services.server");
    return services.getCustomerDetail(data);
  },
);

export const getWorkerDetailFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { workerId: string } }) => {
    const services = await import("@/server/coolify-services.server");
    return services.getWorkerDetail(data);
  },
);

export const createBookingFn = createServerFn({ method: "POST" }).handler(
  async ({
    data,
  }: {
    data: {
      mode: "new" | "existing";
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      eventDate: string;
      eventType: string;
      guestsCount: number | null;
      totalPrice: number;
      paidAmount: number;
      notes: string | null;
      services: {
        hall: boolean;
        catering: boolean;
        decor: boolean;
        photography: boolean;
      };
    };
  }) => {
    const services = await import("@/server/coolify-services.server");
    return services.createBooking(data);
  },
);

export const createPaymentFn = createServerFn({ method: "POST" }).handler(
  async ({
    data,
  }: {
    data: {
      bookingId: string;
      amount: number;
      paymentDate: string;
      method: "cash" | "bank_transfer" | "card" | "other";
      notes: string | null;
    };
  }) => {
    const services = await import("@/server/coolify-services.server");
    return services.createPayment(data);
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

export const addExpenseFn = createServerFn({ method: "POST" }).handler(
  async ({
    data,
  }: {
    data: {
      category: string;
      amount: number;
      expenseDate: string;
      description: string;
    };
  }) => {
    const services = await import("@/server/coolify-services.server");
    return services.addExpense(data);
  },
);

export const deleteExpenseFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { id: string } }) => {
    const services = await import("@/server/coolify-services.server");
    return services.deleteExpense(data);
  },
);

export const addWorkerFn = createServerFn({ method: "POST" }).handler(
  async ({
    data,
  }: {
    data: {
      fullName: string;
      jobTitle: string;
      phone: string | null;
      monthlySalary: number;
    };
  }) => {
    const services = await import("@/server/coolify-services.server");
    return services.addWorker(data);
  },
);

export const addWorkerPaymentFn = createServerFn({ method: "POST" }).handler(
  async ({
    data,
  }: {
    data: {
      workerId: string;
      amount: number;
      paymentDate: string;
      paymentPeriod: string | null;
      notes: string | null;
    };
  }) => {
    const services = await import("@/server/coolify-services.server");
    return services.addWorkerPayment(data);
  },
);

export const toggleWorkerActiveFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { workerId: string; isActive: boolean } }) => {
    const services = await import("@/server/coolify-services.server");
    return services.toggleWorkerActive(data);
  },
);
