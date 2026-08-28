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
 * owner 由服务端 DEFAULT auth.uid() 注入（前端不传），避免本地 uid 与服务端不一致。
 *
 * 用法：
 * - 注册/登录成功后：ensureUserInfo(uid, { name, email, province, city }) 写入基础信息（uid 仅用于兼容，owner 实际由服务端注入）。
 * - 新建申请表单预填：getUserInfo(uid) 读取称呼/省份/城市（RLS 自动限定到本人行）。
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

/**
 * upsert 用户基础信息。owner 不从前端口传，由服务端 DEFAULT auth.uid() 注入，
 * 与网关解析出的 auth.uid() 保持一致，RLS with-check 才会放行（对齐 applications 等表）。
 *
 * 因 owner 为主键且由服务端默认值注入（前端不可知其值），无法在单次请求内带上主键完成 upsert 匹配，故分两步：
 *  - 先 POST 插入（owner 走默认值）；
 *  - 若行已存在（409 主键冲突），改用 PATCH 更新，RLS 自动限定到本人行。
 */
export async function ensureUserInfo(
  _owner: string,
  fields: Partial<Pick<UserInfo, "name" | "email" | "province" | "city">>
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    let res = await fetch(`${gatewayBase()}/user_info`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...fields }),
    });
    if (res.status === 409 || res.status === 400) {
      // owner 为主键且来自默认值，POST 无法按主键匹配重复行；已存在则 PATCH（RLS 仅作用于本人行）。
      res = await fetch(`${gatewayBase()}/user_info`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ ...fields }),
      });
    }
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
      `${gatewayBase()}/user_info?select=owner,name,email,province,city`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as UserInfo[];
    return data[0] ?? null;
  } catch {
    return null;
  }
}
