-- Cash-flow additions: manageable expense categories + general (manual) receipts.

-- Expense categories (managed via the app)
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  sort INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner view expense_categories" ON public.expense_categories
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owner manage expense_categories" ON public.expense_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Convert expenses.category from enum to TEXT (Arabic name) and seed defaults.
ALTER TABLE public.expenses ALTER COLUMN category TYPE TEXT USING category::TEXT;
ALTER TABLE public.expenses ALTER COLUMN category SET DEFAULT 'أخرى';

UPDATE public.expenses SET category = CASE category
  WHEN 'utilities' THEN 'كهرباء وماء'
  WHEN 'maintenance' THEN 'صيانة'
  WHEN 'supplies' THEN 'مستلزمات'
  WHEN 'rent' THEN 'إيجار'
  WHEN 'marketing' THEN 'تسويق'
  WHEN 'taxes' THEN 'ضرائب'
  WHEN 'other' THEN 'أخرى'
  ELSE category
END;

INSERT INTO public.expense_categories (name, sort)
VALUES
  ('كهرباء وماء', 0),
  ('صيانة', 1),
  ('مستلزمات', 2),
  ('إيجار', 3),
  ('تسويق', 4),
  ('ضرائب', 5),
  ('أخرى', 6)
ON CONFLICT (name) DO NOTHING;

-- General receipts (manual cash-in entries not tied to a booking)
CREATE TABLE IF NOT EXISTS public.general_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL DEFAULT '',
  method payment_method NOT NULL DEFAULT 'cash',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.general_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner view general_receipts" ON public.general_receipts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owner manage general_receipts" ON public.general_receipts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));
