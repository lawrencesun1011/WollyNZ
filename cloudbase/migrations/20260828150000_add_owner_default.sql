ALTER TABLE public.user_info ALTER COLUMN owner SET DEFAULT auth.uid();
