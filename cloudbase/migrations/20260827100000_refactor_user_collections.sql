-- 重构 user_collections：
--   旧结构 owner + favorites(jsonb) + compare(jsonb) + applications(jsonb) + profile(jsonb)
--   新结构 owner + email + school_favorites + school_compare + ece_favorites + ece_compare
-- 设计：不再用 favorites/compare 里塞 kind 区分中小学/幼儿园，改为按列直接拆分。
--   applications 已迁至独立表 public.applications；profile（省份/城市）已迁至 user_info。
--   旧 compare 无 kind 信息，不迁移（登录后由 localStorage 重新同步到对应列）。

ALTER TABLE public.user_collections
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.user_collections
  ADD COLUMN IF NOT EXISTS school_favorites jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.user_collections
  ADD COLUMN IF NOT EXISTS school_compare jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.user_collections
  ADD COLUMN IF NOT EXISTS ece_favorites jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.user_collections
  ADD COLUMN IF NOT EXISTS ece_compare jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 迁移旧 favorites（含 kind）到对应列；name 一并保留。
UPDATE public.user_collections
SET school_favorites = COALESCE(
  (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', f->>'id', 'name', COALESCE(f->>'name', ''))), '[]'::jsonb)
   FROM jsonb_array_elements(favorites) AS f
   WHERE f->>'kind' = 'school'),
  '[]'::jsonb
)
WHERE favorites IS NOT NULL;

UPDATE public.user_collections
SET ece_favorites = COALESCE(
  (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', f->>'id', 'name', COALESCE(f->>'name', ''))), '[]'::jsonb)
   FROM jsonb_array_elements(favorites) AS f
   WHERE f->>'kind' = 'ece'),
  '[]'::jsonb
)
WHERE favorites IS NOT NULL;

-- 删除旧列（applications 已在独立表；profile 已移至 user_info）。
ALTER TABLE public.user_collections
  DROP COLUMN IF EXISTS favorites,
  DROP COLUMN IF EXISTS compare,
  DROP COLUMN IF EXISTS applications,
  DROP COLUMN IF EXISTS profile;
