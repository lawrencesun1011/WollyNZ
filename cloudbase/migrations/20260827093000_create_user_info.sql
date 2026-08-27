-- 用户基础信息表：注册即写入，申请表单预填来源。
-- 字段：owner(用户ID) / 称呼 / 邮箱 / 省份 / 城市。
CREATE TABLE IF NOT EXISTS public.user_info (
  owner      text PRIMARY KEY,
  name       text NOT NULL DEFAULT '',
  email      text NOT NULL DEFAULT '',
  province   text NOT NULL DEFAULT '',
  city       text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_info_owner_all ON public.user_info;
CREATE POLICY user_info_owner_all ON public.user_info
  FOR ALL
  USING (owner = auth.uid())
  WITH CHECK (owner = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_info TO authenticated, anon;
