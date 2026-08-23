CREATE TABLE IF NOT EXISTS public.user_collections (
  owner text PRIMARY KEY,
  favorites jsonb NOT NULL DEFAULT '[]'::jsonb,
  compare jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_collections_select" ON public.user_collections
  FOR SELECT USING (owner = auth.uid());

CREATE POLICY "user_collections_insert" ON public.user_collections
  FOR INSERT WITH CHECK (owner = auth.uid());

CREATE POLICY "user_collections_update" ON public.user_collections
  FOR UPDATE USING (owner = auth.uid()) WITH CHECK (owner = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.user_collections TO authenticated, anon;
