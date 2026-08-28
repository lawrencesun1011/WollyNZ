-- 修复 user_info 云同步失败（DATABASE_42501: new row violates row-level security policy）。
--
-- 根因：user_info 的 owner 为主键，但未设置 DEFAULT auth.uid()，且前端显式传入
-- 本地 uid；而数据网关解析出的 auth.uid()（JWT sub）与前端 uid 不一定一致，
-- 导致 RLS WITH CHECK (owner = auth.uid()) 恒为假，upsert 被拒，数据无法写入云端。
--
-- 对齐 applications / user_collections / accommodation_applications 的修复方式：
-- owner 由服务端 DEFAULT auth.uid() 注入，前端不再显式传 owner，RLS with-check 自然成立。
ALTER TABLE public.user_info ALTER COLUMN owner SET DEFAULT auth.uid();
