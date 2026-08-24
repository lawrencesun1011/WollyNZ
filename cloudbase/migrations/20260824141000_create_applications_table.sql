-- 独立申请明细表 + user_collections.profile 列（省份/城市默认填充）。
-- 注意：uid 函数位于 auth schema，需以 auth.uid() 全限定引用。
CREATE TABLE IF NOT EXISTS public.applications (
  id text PRIMARY KEY,
  owner text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS applications_select ON public.applications;
CREATE POLICY applications_select ON public.applications
  FOR SELECT USING (owner = auth.uid());

DROP POLICY IF EXISTS applications_insert ON public.applications;
CREATE POLICY applications_insert ON public.applications
  FOR INSERT WITH CHECK (owner = auth.uid());

DROP POLICY IF EXISTS applications_update ON public.applications;
CREATE POLICY applications_update ON public.applications
  FOR UPDATE USING (owner = auth.uid()) WITH CHECK (owner = auth.uid());

DROP POLICY IF EXISTS applications_delete ON public.applications;
CREATE POLICY applications_delete ON public.applications
  FOR DELETE USING (owner = auth.uid());

ALTER TABLE public.user_collections
  ADD COLUMN IF NOT EXISTS profile jsonb NOT NULL DEFAULT '{}'::jsonb;