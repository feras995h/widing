import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { getRequest } from "@tanstack/react-start/server";
import { db, initializeDatabase } from "@/server/db.server";

export type CoolifyRole = "owner" | "staff";

export interface CoolifyAuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: CoolifyRole;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value) || 0;
  return 0;
}

function getSessionTokenFromRequest(): string | null {
  const request = getRequest();
  return request?.headers?.get("x-session-token") ?? null;
}

export async function resolveUserFromSession(): Promise<CoolifyAuthUser | null> {
  const token = getSessionTokenFromRequest();
  if (!token) return null;

  await initializeDatabase();

  const result = await db.query(
    `
    SELECT u.id, u.email, u.full_name, u.role
    FROM app_sessions s
    JOIN app_users u ON u.id = s.user_id
    WHERE s.token = $1
      AND s.expires_at > now()
      AND u.is_active = TRUE
    LIMIT 1
  `,
    [token],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id as string,
    email: row.email as string,
    fullName: (row.full_name as string | null) ?? null,
    role: row.role as CoolifyRole,
  };
}

export async function requireAuthUser(): Promise<CoolifyAuthUser> {
  const user = await resolveUserFromSession();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireOwnerUser(): Promise<CoolifyAuthUser> {
  const user = await requireAuthUser();
  if (user.role !== "owner") throw new Error("Unauthorized");
  return user;
}

/** عام — لصفحة تسجيل الدخول: لإخفاء زر «تهيئة أول مدير» بعد أول مالك. */
export async function getLoginBootstrapInfo() {
  await initializeDatabase();
  const r = await db.query(
    `SELECT EXISTS (
      SELECT 1 FROM app_users WHERE role = 'owner' AND is_active = TRUE
    ) AS has_owner`,
  );
  return {
    hasOwner: Boolean((r.rows[0] as { has_owner: boolean } | undefined)?.has_owner),
    requiresSetupKey: Boolean(process.env.OWNER_SETUP_KEY?.trim()),
  };
}

function mapBookingRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    customer_id: row.customer_id as string,
    event_date: row.event_date as string,
    event_type: row.event_type as string,
    guests_count: (row.guests_count as number | null) ?? null,
    total_price: toNumber(row.total_price),
    status: (row.status as string) || "confirmed",
    includes_hall: Boolean(row.includes_hall),
    includes_catering: Boolean(row.includes_catering),
    includes_decor: Boolean(row.includes_decor),
    includes_photography: Boolean(row.includes_photography),
    notes: (row.notes as string | null) ?? null,
    customer_phone2: (row.customer_phone2 as string | null) ?? null,
    customer_identity_number: (row.customer_identity_number as string | null) ?? null,
    event_start_time: (row.event_start_time as string | null) ?? null,
    event_end_time: (row.event_end_time as string | null) ?? null,
    customers: {
      full_name: (row.customer_name as string) || "—",
      phone: (row.customer_phone as string) || "—",
    },
    payments: Array.isArray(row.payments)
      ? (row.payments as Array<{ amount: number | string }>).map((p) => ({
          amount: toNumber(p.amount),
        }))
      : [],
  };
}

export async function ensureOwnerAccount(input: {
  email: string;
  password: string;
  fullName?: string;
  setupKey?: string;
}) {
  await initializeDatabase();
  const ownerRes = await db.query(
    `SELECT id FROM app_users WHERE role = 'owner' AND is_active = TRUE LIMIT 1`,
  );
  if (ownerRes.rows[0]) {
    throw new Error("تم تعطيل تهيئة المدير بعد إنشاء أول حساب");
  }

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("البريد الإلكتروني غير صالح");
  if (input.password.trim().length < 8) {
    throw new Error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
  }

  const requiredSetupKey = process.env.OWNER_SETUP_KEY?.trim();
  if (requiredSetupKey && input.setupKey?.trim() !== requiredSetupKey) {
    throw new Error("رمز التهيئة غير صحيح");
  }

  const existing = await db.query(`SELECT id, role FROM app_users WHERE email = $1 LIMIT 1`, [
    email,
  ]);

  if (existing.rows[0]) {
    return { created: false, message: "الحساب موجود مسبقًا" };
  }

  const hash = await bcrypt.hash(input.password, 12);
  await db.query(
    `
      INSERT INTO app_users (email, full_name, password_hash, role, is_active)
      VALUES ($1, $2, $3, 'owner', TRUE)
    `,
    [email, input.fullName?.trim() || "System Owner", hash],
  );

  return { created: true };
}

export async function loginWithPassword(input: { email: string; password: string }) {
  await initializeDatabase();
  const email = input.email.trim().toLowerCase();

  const userRes = await db.query(
    `
      SELECT id, email, full_name, password_hash, role, is_active
      FROM app_users
      WHERE email = $1
      LIMIT 1
    `,
    [email],
  );

  const row = userRes.rows[0];
  if (!row || !row.is_active) {
    throw new Error("Invalid login credentials");
  }

  const ok = await bcrypt.compare(input.password, row.password_hash as string);
  if (!ok) {
    throw new Error("Invalid login credentials");
  }

  const token = randomBytes(32).toString("hex");
  await db.query(
    `
      INSERT INTO app_sessions (token, user_id, expires_at)
      VALUES ($1, $2, now() + interval '7 days')
    `,
    [token, row.id],
  );

  return {
    token,
    user: {
      id: row.id as string,
      email: row.email as string,
      fullName: (row.full_name as string | null) ?? null,
      role: row.role as CoolifyRole,
    },
  };
}

export async function getCurrentAuthUser() {
  const user = await resolveUserFromSession();
  return { user };
}

export async function logout() {
  await initializeDatabase();
  const token = getSessionTokenFromRequest();
  if (token) {
    await db.query(`DELETE FROM app_sessions WHERE token = $1`, [token]);
  }
  return { ok: true };
}

export async function listUsersWithRoles() {
  await initializeDatabase();
  await requireOwnerUser();

  const res = await db.query(
    `
      SELECT id, email, full_name, role, is_active, created_at
      FROM app_users
      ORDER BY created_at DESC
    `,
  );

  return {
    users: res.rows.map((row) => ({
      id: row.id as string,
      email: row.email as string,
      fullName: (row.full_name as string | null) ?? null,
      role: row.role as CoolifyRole,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as string,
    })),
  };
}

export async function updateUserRole(input: { userId: string; role: CoolifyRole }) {
  const current = await requireOwnerUser();
  if (current.id === input.userId && input.role !== "owner") {
    throw new Error("لا يمكن خفض صلاحية حسابك الحالي");
  }

  await db.query(`UPDATE app_users SET role = $1 WHERE id = $2`, [input.role, input.userId]);
  return { ok: true };
}

export async function createUserByOwner(input: {
  email: string;
  password: string;
  fullName?: string;
  role: CoolifyRole;
}) {
  await initializeDatabase();
  await requireOwnerUser();

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) {
    throw new Error("البريد الإلكتروني غير صالح");
  }
  if (input.password.trim().length < 6) {
    throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
  }

  const existing = await db.query(`SELECT id FROM app_users WHERE email = $1 LIMIT 1`, [email]);
  if (existing.rows[0]) {
    throw new Error("يوجد مستخدم بهذا البريد بالفعل");
  }

  const hash = await bcrypt.hash(input.password, 12);
  const insert = await db.query(
    `
      INSERT INTO app_users (email, full_name, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING id, email, full_name, role, created_at
    `,
    [email, input.fullName?.trim() || null, hash, input.role],
  );

  const row = insert.rows[0];
  return {
    user: {
      id: row.id as string,
      email: row.email as string,
      fullName: (row.full_name as string | null) ?? null,
      role: row.role as CoolifyRole,
      createdAt: row.created_at as string,
    },
  };
}

export async function getDashboardBookings() {
  await initializeDatabase();
  await requireAuthUser();

  const result = await db.query(`
      SELECT
        b.*,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        COALESCE(
          json_agg(json_build_object('amount', p.amount))
            FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) AS payments
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      LEFT JOIN payments p ON p.booking_id = b.id
      GROUP BY b.id, c.full_name, c.phone
      ORDER BY b.event_date ASC
    `);

  return {
    bookings: result.rows.map((row) => mapBookingRow(row as unknown as Record<string, unknown>)),
  };
}

export async function getCustomers() {
  await initializeDatabase();
  await requireAuthUser();
  const res = await db.query(`SELECT id, full_name, phone FROM customers ORDER BY full_name ASC`);
  return { customers: res.rows };
}

export async function getCustomersReport() {
  await initializeDatabase();
  await requireOwnerUser();

  const res = await db.query(`
      SELECT
        c.id,
        c.full_name,
        c.phone,
        c.notes,
        COALESCE(
          json_agg(
            json_build_object(
              'id', b.id,
              'total_price', b.total_price,
              'event_date', b.event_date,
              'payments', COALESCE(
                (
                  SELECT json_agg(json_build_object('amount', p.amount))
                  FROM payments p
                  WHERE p.booking_id = b.id
                ),
                '[]'::json
              )
            )
          ) FILTER (WHERE b.id IS NOT NULL),
          '[]'::json
        ) AS bookings
      FROM customers c
      LEFT JOIN bookings b ON b.customer_id = c.id
      GROUP BY c.id
      ORDER BY c.full_name ASC
    `);

  return {
    customers: res.rows.map((row) => ({
      id: row.id as string,
      full_name: row.full_name as string,
      phone: (row.phone as string) || "",
      notes: (row.notes as string | null) ?? null,
      bookings: Array.isArray(row.bookings)
        ? (row.bookings as Array<Record<string, unknown>>).map((b) => ({
            id: b.id as string,
            total_price: toNumber(b.total_price),
            event_date: b.event_date as string,
            payments: Array.isArray(b.payments)
              ? (b.payments as Array<{ amount: number | string }>).map((p) => ({
                  amount: toNumber(p.amount),
                }))
              : [],
          }))
        : [],
    })),
  };
}

export async function getCustomerDetail(input: { customerId: string }) {
  await initializeDatabase();
  await requireOwnerUser();

  const cRes = await db.query(
    `SELECT id, full_name, phone, notes, created_at FROM customers WHERE id = $1 LIMIT 1`,
    [input.customerId],
  );
  if (!cRes.rows[0]) throw new Error("العميل غير موجود");

  const bRes = await db.query(
    `
    SELECT
      b.*,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', p.id,
              'amount', p.amount,
              'payment_date', p.payment_date,
              'method', p.method,
              'notes', p.notes
            ) ORDER BY p.payment_date, p.id
          ) FROM payments p
          WHERE p.booking_id = b.id
        ),
        '[]'::json
      ) AS payments
    FROM bookings b
    WHERE b.customer_id = $1
    ORDER BY b.event_date DESC
    `,
    [input.customerId],
  );

  const customer = {
    id: cRes.rows[0].id as string,
    full_name: cRes.rows[0].full_name as string,
    phone: (cRes.rows[0].phone as string) || "",
    notes: (cRes.rows[0].notes as string | null) ?? null,
    created_at: cRes.rows[0].created_at as string,
  };

  const bookings = bRes.rows.map((row) => {
    const pRaw = row.payments;
    const payments = Array.isArray(pRaw)
      ? (pRaw as Array<Record<string, unknown>>).map((p) => ({
          id: p.id as string,
          amount: toNumber(p.amount),
          payment_date: String(p.payment_date).slice(0, 10),
          method: (p.method as string) || "cash",
          notes: (p.notes as string | null) ?? null,
        }))
      : [];
    return {
      id: row.id as string,
      customer_id: row.customer_id as string,
      event_date: row.event_date as string,
      event_type: row.event_type as string,
      guests_count: (row.guests_count as number | null) ?? null,
      total_price: toNumber(row.total_price),
      status: (row.status as string) || "confirmed",
      includes_hall: Boolean(row.includes_hall),
      includes_catering: Boolean(row.includes_catering),
      includes_decor: Boolean(row.includes_decor),
      includes_photography: Boolean(row.includes_photography),
      notes: (row.notes as string | null) ?? null,
      customer_phone2: (row.customer_phone2 as string | null) ?? null,
      customer_identity_number: (row.customer_identity_number as string | null) ?? null,
      event_start_time: (row.event_start_time as string | null) ?? null,
      event_end_time: (row.event_end_time as string | null) ?? null,
      payments,
    };
  });

  return { customer, bookings };
}

export async function getWorkerDetail(input: { workerId: string }) {
  await initializeDatabase();
  await requireOwnerUser();

  const wRes = await db.query(
    `SELECT * FROM workers WHERE id = $1 LIMIT 1`,
    [input.workerId],
  );
  if (!wRes.rows[0]) throw new Error("العامل غير موجود");
  const w = wRes.rows[0];

  const pRes = await db.query(
    `
    SELECT * FROM worker_payments
    WHERE worker_id = $1
    ORDER BY payment_date DESC, created_at DESC
    `,
    [input.workerId],
  );

  const worker = {
    id: w.id as string,
    full_name: w.full_name as string,
    job_title: w.job_title as string,
    phone: (w.phone as string | null) ?? null,
    monthly_salary: toNumber(w.monthly_salary),
    is_active: Boolean(w.is_active),
    created_at: w.created_at as string,
  };

  const payments = pRes.rows.map((row) => ({
    id: row.id as string,
    amount: toNumber(row.amount),
    payment_date: String(row.payment_date).slice(0, 10),
    payment_period: (row.payment_period as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
  }));

  return { worker, payments };
}

export async function createBooking(input: {
  mode: "new" | "existing";
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  eventDate: string;
  eventType: string;
  guestsCount: number | null;
  totalPrice: number;
  paidAmount: number;
  customerPhone2: string | null;
  customerIdentityNumber: string | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
  notes: string | null;
  services: {
    hall: boolean;
    catering: boolean;
    decor: boolean;
    photography: boolean;
  };
}) {
  await initializeDatabase();
  await requireAuthUser();

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const cleanStart = input.eventStartTime?.trim() || null;
    const cleanEnd = input.eventEndTime?.trim() || null;
    if ((cleanStart && !cleanEnd) || (!cleanStart && cleanEnd)) {
      throw new Error("يجب إدخال وقت البداية والنهاية معًا");
    }
    if (cleanStart && cleanEnd && cleanStart >= cleanEnd) {
      throw new Error("وقت نهاية المناسبة يجب أن يكون بعد وقت البداية");
    }

    // Prevent concurrent conflicting bookings on the same event date.
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [input.eventDate]);

    const existingRes = await client.query(
      `
        SELECT event_start_time, event_end_time
        FROM bookings
        WHERE event_date = $1
          AND COALESCE(status, 'confirmed') <> 'cancelled'
      `,
      [input.eventDate],
    );

    const hasConflict = existingRes.rows.some((row) => {
      const existingStart = (row.event_start_time as string | null)?.trim() || null;
      const existingEnd = (row.event_end_time as string | null)?.trim() || null;

      // If one booking has no times, treat same-day booking as conflicting for safety.
      if (!cleanStart || !cleanEnd || !existingStart || !existingEnd) {
        return true;
      }

      return cleanStart < existingEnd && cleanEnd > existingStart;
    });

    if (hasConflict) {
      throw new Error("يوجد حجز آخر في نفس التاريخ والوقت. الرجاء اختيار وقت مختلف.");
    }

    let customerId = input.customerId ?? "";
    if (input.mode === "new") {
      const newCustomer = await client.query(
        `
          INSERT INTO customers (full_name, phone)
          VALUES ($1, $2)
          RETURNING id
        `,
        [input.customerName?.trim(), input.customerPhone?.trim()],
      );
      customerId = newCustomer.rows[0].id as string;
    }

    if (!customerId) throw new Error("العميل مطلوب");

    const bookingRes = await client.query(
      `
        INSERT INTO bookings (
          customer_id,
          event_date,
          event_type,
          guests_count,
          total_price,
          includes_hall,
          includes_catering,
          includes_decor,
          includes_photography,
          customer_phone2,
          customer_identity_number,
          event_start_time,
          event_end_time,
          notes
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING id
      `,
      [
        customerId,
        input.eventDate,
        input.eventType,
        input.guestsCount,
        input.totalPrice,
        input.services.hall,
        input.services.catering,
        input.services.decor,
        input.services.photography,
        input.customerPhone2,
        input.customerIdentityNumber,
        cleanStart,
        cleanEnd,
        input.notes,
      ],
    );

    const bookingId = bookingRes.rows[0].id as string;

    if (input.paidAmount > 0) {
      await client.query(
        `
          INSERT INTO payments (booking_id, amount, payment_date, method, notes)
          VALUES ($1, $2, CURRENT_DATE, 'cash', $3)
        `,
        [bookingId, input.paidAmount, "دفعة أولى عند إنشاء الحجز"],
      );
    }

    await client.query("COMMIT");
    return { id: bookingId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createPayment(input: {
  bookingId: string;
  amount: number;
  paymentDate: string;
  method: "cash" | "bank_transfer" | "card" | "other";
  notes: string | null;
}) {
  await initializeDatabase();
  await requireAuthUser();
  await db.query(
    `
      INSERT INTO payments (booking_id, amount, payment_date, method, notes)
      VALUES ($1,$2,$3,$4,$5)
    `,
    [input.bookingId, input.amount, input.paymentDate, input.method, input.notes],
  );
  return { ok: true };
}

export async function cancelBooking(input: { bookingId: string }) {
  await initializeDatabase();
  await requireAuthUser();

  const result = await db.query(
    `
      UPDATE bookings
      SET status = 'cancelled'
      WHERE id = $1
      RETURNING id
    `,
    [input.bookingId],
  );

  if (!result.rows[0]) {
    throw new Error("الحجز غير موجود");
  }

  return { ok: true };
}

export async function getReportsData() {
  await initializeDatabase();
  await requireOwnerUser();

  const [bookingsRes, paymentsRes, expensesRes, workerPaymentsRes] = await Promise.all([
    db.query(`
          SELECT
            b.*,
            c.full_name AS customer_name,
            COALESCE(
              json_agg(json_build_object('amount', p.amount))
                FILTER (WHERE p.id IS NOT NULL),
              '[]'::json
            ) AS payments
          FROM bookings b
          JOIN customers c ON c.id = b.customer_id
          LEFT JOIN payments p ON p.booking_id = b.id
          GROUP BY b.id, c.full_name
        `),
    db.query(`SELECT * FROM payments`),
    db.query(`SELECT * FROM expenses`),
    db.query(`
          SELECT wp.*, w.full_name AS worker_name, w.job_title AS worker_job_title
          FROM worker_payments wp
          JOIN workers w ON w.id = wp.worker_id
        `),
  ]);

  return {
    bookings: bookingsRes.rows.map((row) => ({
      ...mapBookingRow(row as unknown as Record<string, unknown>),
      customers: {
        full_name: (row.customer_name as string) || "—",
      },
    })),
    payments: paymentsRes.rows.map((row) => ({
      ...row,
      amount: toNumber(row.amount),
    })),
    expenses: expensesRes.rows.map((row) => ({
      ...row,
      amount: toNumber(row.amount),
    })),
    workerPayments: workerPaymentsRes.rows.map((row) => ({
      ...row,
      amount: toNumber(row.amount),
      workers: {
        full_name: (row.worker_name as string) || "—",
        job_title: (row.worker_job_title as string) || "—",
      },
    })),
  };
}

export async function getExpensesData() {
  await initializeDatabase();
  await requireOwnerUser();
  const [expenses, workers, workerPayments] = await Promise.all([
    db.query(`SELECT * FROM expenses ORDER BY expense_date DESC`),
    db.query(`SELECT * FROM workers ORDER BY full_name ASC`),
    db.query(`
        SELECT wp.*, w.full_name AS worker_name, w.job_title AS worker_job_title
        FROM worker_payments wp
        JOIN workers w ON w.id = wp.worker_id
        ORDER BY wp.payment_date DESC
        LIMIT 50
      `),
  ]);

  return {
    expenses: expenses.rows.map((row) => ({
      ...row,
      amount: toNumber(row.amount),
    })),
    workers: workers.rows.map((row) => ({
      ...row,
      monthly_salary: toNumber(row.monthly_salary),
    })),
    workerPayments: workerPayments.rows.map((row) => ({
      ...row,
      amount: toNumber(row.amount),
      workers: {
        full_name: (row.worker_name as string) || "—",
        job_title: (row.worker_job_title as string) || "—",
      },
    })),
  };
}

export async function addExpense(input: {
  category: string;
  amount: number;
  expenseDate: string;
  description: string;
}) {
  await initializeDatabase();
  await requireOwnerUser();
  await db.query(
    `
      INSERT INTO expenses (category, amount, expense_date, description)
      VALUES ($1,$2,$3,$4)
    `,
    [input.category, input.amount, input.expenseDate, input.description],
  );
  return { ok: true };
}

export async function deleteExpense(input: { id: string }) {
  await initializeDatabase();
  await requireOwnerUser();
  await db.query(`DELETE FROM expenses WHERE id = $1`, [input.id]);
  return { ok: true };
}

export async function addWorker(input: {
  fullName: string;
  jobTitle: string;
  phone: string | null;
  monthlySalary: number;
}) {
  await initializeDatabase();
  await requireOwnerUser();
  await db.query(
    `
      INSERT INTO workers (full_name, job_title, phone, monthly_salary, is_active)
      VALUES ($1,$2,$3,$4,TRUE)
    `,
    [input.fullName, input.jobTitle, input.phone, input.monthlySalary],
  );
  return { ok: true };
}

export async function addWorkerPayment(input: {
  workerId: string;
  amount: number;
  paymentDate: string;
  paymentPeriod: string | null;
  notes: string | null;
}) {
  await initializeDatabase();
  await requireOwnerUser();
  await db.query(
    `
      INSERT INTO worker_payments (worker_id, amount, payment_date, payment_period, notes)
      VALUES ($1,$2,$3,$4,$5)
    `,
    [input.workerId, input.amount, input.paymentDate, input.paymentPeriod, input.notes],
  );
  return { ok: true };
}

export async function toggleWorkerActive(input: { workerId: string; isActive: boolean }) {
  await initializeDatabase();
  await requireOwnerUser();
  await db.query(`UPDATE workers SET is_active = $1 WHERE id = $2`, [
    input.isActive,
    input.workerId,
  ]);
  return { ok: true };
}
