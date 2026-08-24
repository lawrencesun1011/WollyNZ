-- 在 user_collections 表增加 applications 列，用于存储用户的学校申请。
-- RLS 策略为表级，已涵盖新列，无需新增策略。
alter table public.user_collections
  add column if not exists applications jsonb not null default '[]'::jsonb;
