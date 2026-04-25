import { Pool } from "pg";

const connectionString = process.env.COOLIFY_DATABASE_URL || process.env.DATABASE_URL;
const forceSsl = (process.env.DB_SSL || "").toLowerCase();
const shouldUseSsl =
  forceSsl === "1" ||
  forceSsl === "true" ||
  forceSsl === "require" ||
  (forceSsl !== "false" && process.env.NODE_ENV === "production");
const rejectUnauthorized = (process.env.DB_SSL_REJECT_UNAUTHORIZED || "true").toLowerCase() !== "false";

if (!connectionString) {
  throw new Error(
    "Missing COOLIFY_DATABASE_URL or DATABASE_URL. Add one to a .env file in the project root " +
      "(see .env.example), or set it in your host environment (e.g. Coolify / Cloudflare). " +
      "Restart the dev server after changing .env.",
  );
}

const BOOKING_OVERLAP_VERSION = "2026-04-25-v3";

const globalForDb = globalThis as unknown as {
  __velouraPool?: Pool;
  __velouraDbInitialized?: boolean;
  __velouraBookingOverlapVersion?: string;
};

export const db =
  globalForDb.__velouraPool ||
  new Pool({
    connectionString,
    ssl: shouldUseSsl ? { rejectUnauthorized } : undefined,
  });

if (!globalForDb.__velouraPool) {
  globalForDb.__velouraPool = db;
}

async function ensureBookingOverlapProtection(): Promise<void> {
  if (globalForDb.__velouraBookingOverlapVersion === BOOKING_OVERLAP_VERSION) return;

  await db.query(`
    CREATE OR REPLACE FUNCTION booking_time_range(d date, st text, et text)
    RETURNS tsrange AS $$
    DECLARE
      s_text TEXT;
      e_text TEXT;
      s_time TIME;
      e_time TIME;
      range_start TIMESTAMP;
      range_end TIMESTAMP;
    BEGIN
      s_text := NULLIF(BTRIM(st), '');
      e_text := NULLIF(BTRIM(et), '');

      IF s_text IS NULL
         OR e_text IS NULL
         OR s_text !~ '^([01][0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$'
         OR e_text !~ '^([01][0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$' THEN
        RETURN tsrange(d::timestamp, (d + 1)::timestamp, '[)');
      END IF;

      BEGIN
        s_time := s_text::time;
        e_time := e_text::time;
      EXCEPTION WHEN others THEN
        RETURN tsrange(d::timestamp, (d + 1)::timestamp, '[)');
      END;

      range_start := d::timestamp + s_time;
      IF e_time <= s_time THEN
        range_end := (d + 1)::timestamp + e_time;
      ELSE
        range_end := d::timestamp + e_time;
      END IF;

      RETURN tsrange(range_start, range_end, '[)');
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;
  `);

  await db.query(`
    CREATE OR REPLACE FUNCTION prevent_booking_overlap()
    RETURNS trigger AS $$
    DECLARE
      new_range tsrange;
      has_conflict BOOLEAN;
    BEGIN
      IF COALESCE(NEW.status, 'confirmed') = 'cancelled' THEN
        RETURN NEW;
      END IF;

      IF (NULLIF(BTRIM(NEW.event_start_time), '') IS NULL)
         <> (NULLIF(BTRIM(NEW.event_end_time), '') IS NULL) THEN
        RAISE EXCEPTION 'يجب إدخال وقت البداية والنهاية معًا';
      END IF;

      new_range := booking_time_range(
        NEW.event_date,
        NEW.event_start_time,
        NEW.event_end_time
      );

      SELECT EXISTS (
        SELECT 1
        FROM bookings b
        WHERE b.id <> NEW.id
          AND COALESCE(b.status, 'confirmed') <> 'cancelled'
          AND booking_time_range(b.event_date, b.event_start_time, b.event_end_time) && new_range
      ) INTO has_conflict;

      IF has_conflict THEN
        RAISE EXCEPTION 'يوجد حجز آخر في نفس التاريخ والوقت. الرجاء اختيار وقت مختلف.';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await db.query(`DROP TRIGGER IF EXISTS trg_prevent_booking_overlap ON bookings;`);
  await db.query(`
    CREATE TRIGGER trg_prevent_booking_overlap
    BEFORE INSERT OR UPDATE OF event_date, event_start_time, event_end_time, status
    ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION prevent_booking_overlap();
  `);

  globalForDb.__velouraBookingOverlapVersion = BOOKING_OVERLAP_VERSION;
}

export async function initializeDatabase(): Promise<void> {
  if (globalForDb.__velouraDbInitialized) {
    await ensureBookingOverlapProtection();
    return;
  }

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
      customer_phone2 TEXT,
      customer_identity_number TEXT,
      event_start_time TEXT,
      event_end_time TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone2 TEXT;`);
  await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_identity_number TEXT;`);
  await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS event_start_time TEXT;`);
  await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS event_end_time TEXT;`);

  await ensureBookingOverlapProtection();

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
