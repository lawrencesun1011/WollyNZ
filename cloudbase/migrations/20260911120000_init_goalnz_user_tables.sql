-- user_info：用户基础信息（称呼/邮箱/省份/城市）
CREATE TABLE IF NOT EXISTS public.user_info (
  owner    text PRIMARY KEY DEFAULT auth.uid(),
  name     text,
  email    text,
  province text,
  city     text
);
ALTER TABLE public.user_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_info_owner_rw ON public.user_info;
CREATE POLICY user_info_owner_rw ON public.user_info
  FOR ALL TO authenticated
  USING (owner = auth.uid()) WITH CHECK (owner = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_info TO authenticated;

-- user_collections：心愿单 / 对比
CREATE TABLE IF NOT EXISTS public.user_collections (
  owner            text PRIMARY KEY DEFAULT auth.uid(),
  email            text,
  school_favorites jsonb NOT NULL DEFAULT '[]'::jsonb,
  school_compare   jsonb NOT NULL DEFAULT '[]'::jsonb,
  ece_favorites    jsonb NOT NULL DEFAULT '[]'::jsonb,
  ece_compare      jsonb NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_collections_owner_rw ON public.user_collections;
CREATE POLICY user_collections_owner_rw ON public.user_collections
  FOR ALL TO authenticated
  USING (owner = auth.uid()) WITH CHECK (owner = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_collections TO authenticated;

-- applications：学校申请明细
CREATE TABLE IF NOT EXISTS public.applications (
  id         text PRIMARY KEY,
  owner      text NOT NULL DEFAULT auth.uid(),
  category   text,
  status     text,
  data       jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS applications_owner_rw ON public.applications;
CREATE POLICY applications_owner_rw ON public.applications
  FOR ALL TO authenticated
  USING (owner = auth.uid()) WITH CHECK (owner = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;

-- accommodation_applications：住宿意向明细
CREATE TABLE IF NOT EXISTS public.accommodation_applications (
  id         text PRIMARY KEY,
  owner      text NOT NULL DEFAULT auth.uid(),
  status     text,
  data       jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.accommodation_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS accommodation_applications_owner_rw ON public.accommodation_applications;
CREATE POLICY accommodation_applications_owner_rw ON public.accommodation_applications
  FOR ALL TO authenticated
  USING (owner = auth.uid()) WITH CHECK (owner = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accommodation_applications TO authenticated;
