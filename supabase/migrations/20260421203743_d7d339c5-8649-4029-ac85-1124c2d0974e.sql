
-- Fix function search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Tighten UPDATE policies
DROP POLICY "Auth update customers" ON public.customers;
CREATE POLICY "Update customers (owner or creator)" ON public.customers
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR created_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'owner') OR created_by = auth.uid());

DROP POLICY "Auth update bookings" ON public.bookings;
CREATE POLICY "Update bookings (owner or creator)" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR created_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'owner') OR created_by = auth.uid());
