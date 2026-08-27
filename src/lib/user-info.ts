"use client";

/**
 * 用户基础信息（user_info 表）读写层。
 *
 * 表结构（PostgreSQL，经 PostgREST 网关访问）：
 *   owner    text PK  —— 等于 auth.uid()
 *   name     称呼
 *   email    邮箱
 *   province 省份
 *   city     城市
 *
 * 鉴权：写入需携带登录用户的 JWT（access token），由 RLS 限制 owner = auth.uid()。
 * owner 由前端显式传入（必须等于当前 uid），RLS 再校验一次。
 *
 * 用法：
 * - 注册/登录成功后：ensureUserInfo(uid, { name, email, province, city }) 写入基础信息。
 * - 新建申请表单预填：getUserInfo(uid) 读取称呼/省份/城市。
 */

import { getAccessToken } from "./auth";

export interface UserInfo {
  owner: string;
  name: string;
  email: string;
  province: string;
  city: string;
}

function gatewayBase(): string {
  const envId = process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID!;
  return `https://${envId}.api.tcloudbasegateway.com/v1/rdb/rest`;
}

/** upsert 用户基础信息（按 owner 主键 merge）。owner 必须 == auth.uid()（RLS 校验）。 */
export async function ensureUserInfo(
  owner: string,
  fields: Partial<Pick<UserInfo, "name" | "email" | "province" | "city">>
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const res = await fetch(`${gatewayBase()}/user_info`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ owner, ...fields }),
    });
    if (!res.ok) {
      console.warn("[user-info] upsert 失败", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[user-info] upsert 异常", e);
    return false;
  }
}

/** 读取当前用户基础信息；未登录 / 无记录 / 失败返回 null。 */
export async function getUserInfo(owner: string): Promise<UserInfo | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(
      `${gatewayBase()}/user_info?select=owner,name,email,province,city&owner=eq.${encodeURIComponent(owner)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as UserInfo[];
    return data[0] ?? null;
  } catch {
    return null;
  }
}
