// 中英文对照标签（用于前端展示）。
// 与 src/scripts/fetch-data.mjs 中的映射保持一致，作为展示层兜底。

export const GENDER_CN: Record<string, string> = {
  "Boys School": "男校",
  "Boys/Senior Co-Ed": "男校/高年级混校",
  "Co-Educational": "男女混校",
  "Girls School": "女校",
  "Primary Co-Ed/Secondary Boys": "小学混校 / 中学男校",
  "Primary Co-Ed/Secondary Girls": "小学混校 / 中学女校",
};

export const LANGUAGE_CN: Record<string, string> = {
  "All students taught in English/other setting": "全英语教学",
  "Some students taught in te reo Māori": "部分毛利语教学",
  "All students taught in te reo Māori": "全毛利语教学",
  "Some students taught in a Pacific language": "部分太平洋岛国语言教学",
  "Some students taught in te reo Māori or a Pacific language":
    "部分毛利语或太平洋岛国语言教学",
};

/** 学校性别中文名（兜底旧数据中的 genderCN） */
export function cnGender(raw: string | undefined, fallback?: string | null): string {
  if (raw && GENDER_CN[raw]) return GENDER_CN[raw];
  return fallback || raw || "—";
}

/** 教学语言中文名 */
export function cnLanguage(raw: string | undefined): string {
  if (raw && LANGUAGE_CN[raw]) return LANGUAGE_CN[raw];
  return raw || "—";
}
