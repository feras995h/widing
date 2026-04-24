DO $$
BEGIN
  ALTER TYPE public.event_type ADD VALUE 'fadhaniya';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.event_type ADD VALUE 'sahriya';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.event_type ADD VALUE 'najma';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
