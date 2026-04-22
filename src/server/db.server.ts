import { Pool } from "pg";

const connectionString = process.env.COOLIFY_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing COOLIFY_DATABASE_URL/DATABASE_URL in environment variables.");
}

const globalForDb = globalThis as unknown as {
  __velouraPool?: Pool;
  __velouraDbInitialized?: boolean;
};

export const db =
  globalForDb.__velouraPool ||
  new Pool({
    connectionString,
    ssl: false,
  });

if (!globalForDb.__velouraPool) {
  globalForDb.__velouraPool = db;
}

export async function initializeDatabase(): Promise<void> {
  if (globalForDb.__velouraDbInitialized) return;

  await db.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS app_sessions (
      token TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      event_date DATE NOT NULL,
      event_type TEXT NOT NULL,
      guests_count INTEGER,
      total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'confirmed',
      includes_hall BOOLEAN NOT NULL DEFAULT TRUE,
      includes_catering BOOLEAN NOT NULL DEFAULT FALSE,
      includes_decor BOOLEAN NOT NULL DEFAULT FALSE,
      includes_photography BOOLEAN NOT NULL DEFAULT FALSE,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      amount NUMERIC(12,2) NOT NULL,
      payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
      method TEXT NOT NULL DEFAULT 'cash',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category TEXT NOT NULL DEFAULT 'other',
      amount NUMERIC(12,2) NOT NULL,
      expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
      description TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS workers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      job_title TEXT NOT NULL,
      phone TEXT,
      monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS worker_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
      amount NUMERIC(12,2) NOT NULL,
      payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
      payment_period TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  globalForDb.__velouraDbInitialized = true;
}
