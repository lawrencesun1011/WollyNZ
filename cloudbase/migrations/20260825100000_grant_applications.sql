-- 修复 applications 表写入 401/DATABASE_42501：数据网关连接角色缺少表的访问权限。
-- user_collections 表已通过 GRANT ... TO authenticated, anon 正常工作，
-- applications 表创建时漏加了该授权，导致客户端 upsert 被 Postgres 拒绝。
-- 补充授权后，RLS 策略（owner = auth.uid()）才会生效放行。
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated, anon;
