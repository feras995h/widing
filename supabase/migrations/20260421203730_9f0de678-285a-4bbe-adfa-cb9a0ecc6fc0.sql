
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('owner', 'staff');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile + first user becomes owner
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT COUNT(*) INTO user_count FROM auth.users;

  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Bookings
CREATE TYPE public.event_type AS ENUM ('wedding', 'engagement', 'birthday', 'graduation', 'corporate', 'other');
CREATE TYPE public.booking_status AS ENUM ('confirmed', 'tentative', 'cancelled', 'completed');

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  event_date DATE NOT NULL,
  event_type event_type NOT NULL DEFAULT 'wedding',
  guests_count INT,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  status booking_status NOT NULL DEFAULT 'confirmed',
  -- Services included
  includes_hall BOOLEAN NOT NULL DEFAULT true,
  includes_catering BOOLEAN NOT NULL DEFAULT false,
  includes_decor BOOLEAN NOT NULL DEFAULT false,
  includes_photography BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_bookings_event_date ON public.bookings(event_date);

-- Payments
CREATE TYPE public.payment_method AS ENUM ('cash', 'bank_transfer', 'card', 'other');

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  method payment_method NOT NULL DEFAULT 'cash',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Expenses (general)
CREATE TYPE public.expense_category AS ENUM ('utilities', 'maintenance', 'supplies', 'rent', 'marketing', 'taxes', 'other');

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category expense_category NOT NULL DEFAULT 'other',
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Workers
CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  phone TEXT,
  monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Worker payments (salaries)
CREATE TABLE public.worker_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_period TEXT, -- e.g. "2026-04"
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.worker_payments ENABLE ROW LEVEL SECURITY;

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ RLS POLICIES ============

-- Profiles: own
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- user_roles: read by self & owner; only owner manages
CREATE POLICY "View own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owner manages roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Customers: all authenticated read & insert; update/delete owner only
CREATE POLICY "Auth view customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Auth update customers" ON public.customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Owner delete customers" ON public.customers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- Bookings
CREATE POLICY "Auth view bookings" ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Auth update bookings" ON public.bookings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Owner delete bookings" ON public.bookings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- Payments
CREATE POLICY "Auth view payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner update payments" ON public.payments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owner delete payments" ON public.payments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- Expenses: owner only
CREATE POLICY "Owner view expenses" ON public.expenses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owner manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Workers: owner only
CREATE POLICY "Owner view workers" ON public.workers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owner manage workers" ON public.workers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Worker payments: owner only
CREATE POLICY "Owner view worker_payments" ON public.worker_payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owner manage worker_payments" ON public.worker_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
