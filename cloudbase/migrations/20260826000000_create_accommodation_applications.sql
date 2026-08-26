-- 住宿意向申请表：与 applications 分离，独立表独立 RLS。
CREATE TABLE public.accommodation_applications (
  id text PRIMARY KEY,
  owner text NOT NULL DEFAULT auth.uid(),
  status text NOT NULL DEFAULT 'submitted',
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accommodation_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accommodation_owner_all" ON public.accommodation_applications
  FOR ALL
  USING (owner = auth.uid())
  WITH CHECK (owner = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accommodation_applications TO authenticated, anon;
