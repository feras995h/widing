ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_phone2 TEXT,
  ADD COLUMN IF NOT EXISTS customer_identity_number TEXT,
  ADD COLUMN IF NOT EXISTS event_start_time TEXT,
  ADD COLUMN IF NOT EXISTS event_end_time TEXT;
