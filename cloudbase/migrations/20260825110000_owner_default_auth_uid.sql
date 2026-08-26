-- 修复 applications / user_collections 写入被 RLS 的 WITH CHECK (owner = auth.uid()) 拒绝。
-- 根因：前端把 user.uid 作为 owner 写入，但数据网关解析出的 auth.uid()（JWT sub）
-- 与前端传入的 user.uid 不一定一致，导致 owner = auth.uid() 恒为假。
-- 改为以服务端身份为准：owner 由 DEFAULT auth.uid() 注入，读取由 RLS(owner = auth.uid()) 过滤，
-- 前端不再显式传 owner、也不再按 owner 过滤，彻底消除前后端 uid 不一致。
ALTER TABLE public.applications ALTER COLUMN owner SET DEFAULT auth.uid();
ALTER TABLE public.user_collections ALTER COLUMN owner SET DEFAULT auth.uid();
