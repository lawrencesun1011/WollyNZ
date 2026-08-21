// CloudBase PostgreSQL 服务端客户端封装。
// 仅在服务端（CloudRun / 云函数 / Node 脚本）使用，密钥不暴露给浏览器。
import pkg from "@cloudbase/node-sdk";
const { init } = pkg;

let cached: ReturnType<typeof init> | null = null;

function getApp() {
  if (cached) return cached;
  const envId = process.env.CLOUDBASE_ENV_ID;
  if (!envId) {
    throw new Error("CLOUDBASE_ENV_ID 未设置，无法连接 PostgreSQL");
  }
  cached = init({
    env: envId,
    // 云端运行环境会自动注入访问凭证，本地可用环境变量补充。
  });
  return cached;
}

export function getDb() {
  return getApp().rdb();
}

// snake_case 物理列 -> SchoolFrontend camelCase 的字段映射。
export const SCHOOL_COLUMN_MAP: Record<string, string> = {
  id: "id",
  name: "name",
  type: "type",
  level: "level",
  authority: "authority",
  authority_cn: "authorityCN",
  gender: "gender",
  gender_cn: "genderCN",
  boarding: "boarding",
  language: "language",
  language_cn: "languageCN",
  enrolment: "enrolment",
  street: "street",
  suburb: "suburb",
  city: "city",
  territorial: "territorial",
  region: "region",
  urban_rural: "urbanRural",
  phone: "phone",
  email: "email",
  roll: "roll",
  eqi: "eqi",
  isolation: "isolation",
  european: "european",
  maori: "maori",
  pacific: "pacific",
  asian: "asian",
  melaa: "melaa",
  other: "other",
  intl: "intl",
  lat: "lat",
  lng: "lng",
  website: "website",
  url: "url",
};

export const SCHOOL_COLUMNS = Object.keys(SCHOOL_COLUMN_MAP);
