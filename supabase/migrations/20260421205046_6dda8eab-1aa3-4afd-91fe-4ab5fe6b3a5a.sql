-- Open RLS policies to allow public access (login system removed)
-- Drop existing policies and create permissive ones

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname='public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Public access policies for all app tables
CREATE POLICY "Public access" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.workers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON public.worker_payments FOR ALL USING (true) WITH CHECK (true);

-- Keep profiles and user_roles locked (unused now)
CREATE POLICY "No access" ON public.profiles FOR ALL USING (false);
CREATE POLICY "No access" ON public.user_roles FOR ALL USING (false);