/**
 * AI 邮件模板生成：由申请信息组装 prompt、容错解析模型返回的 JSON。
 * 纯函数模块（无 "use client"），可同时被服务端 API route 与前端复用。
 */
import type { ApplicationItem, ExactDate, Student } from "@/lib/applications";

/** 精确日期 → YYYY-MM-DD（不确定补 01）。 */
function exactToText(d?: ExactDate | null): string {
  if (!d || !d.year || !d.month) return "";
  const day = d.day || 1;
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 学生信息 → 可读文本（出生日期 + 英语水平）。 */
function studentsToText(students?: Student[]): string {
  if (!students || students.length === 0) return "";
  return students
    .map((s) => {
      const parts: string[] = [exactToText(s.birthDate)];
      if (s.gender) parts.push(s.gender);
      if (s.englishLevel) parts.push(s.englishLevel);
      return parts.filter(Boolean).join(" / ");
    })
    .join("；");
}

/** 模糊时段 → 可读文本，如「2026年10月中旬」。 */
function fuzzyToText(
  f?: { year: number; month: number; tense: "early" | "mid" | "late" } | null
): string {
  if (!f || !f.year || !f.month) return "";
  const tense = f.tense === "early" ? "上旬" : f.tense === "late" ? "下旬" : "中旬";
  return `${f.year}年${f.month}月${tense}`;
}

/** 游学区间 → 可读文本，如「2026-10-01 — 2026-11-15」或「2026年10月中旬 — 11月中旬」。 */
function studyPeriodToText(p?: ApplicationItem["studyPeriod"]): string {
  if (!p) return "";
  if (p.mode === "exact") {
    const s = exactToText(p.start);
    const e = exactToText(p.end);
    if (!s && !e) return "";
    return [s, e].filter(Boolean).join(" — ");
  }
  const s = fuzzyToText(p.fuzzyStart);
  const e = fuzzyToText(p.fuzzyEnd);
  if (!s && !e) return "";
  return [s, e].filter(Boolean).join(" — ");
}

/** 孩子出生日期 → 可读文本（多个孩子用分号分隔）。 */


/**
 * 组装发送给大模型的 prompt（system + user）。
 * 用户信息缺失时省略该项，避免把空值发给模型。
 */
export function buildAiEmailPrompt(item: ApplicationItem): {
  system: string;
  user: string;
} {
  const lines: string[] = [
    "我要申请新西兰游学插班，以下是我的信息：",
  ];
  if (item.parentTitle?.trim()) {
    lines.push(`- 家长称呼：${item.parentTitle.trim()}`);
  }
  if (item.province?.trim() || item.city?.trim()) {
    lines.push(`- 我们来自：${[item.province, item.city].filter(Boolean).join(" / ")}`);
  }
  const students = studentsToText(item.students);
  if (students) lines.push(`- 孩子信息（出生日期 / 性别 / 英语水平）：${students}`);
  const period = studyPeriodToText(item.studyPeriod);
  if (period) lines.push(`- 计划游学时间：${period}`);
  if (item.extraRequests?.trim()) {
    lines.push(`- 其它特别诉求：${item.extraRequests.trim()}`);
  }
  lines.push(
    "\n【注意】：此邮件将发往学校的通用总邮箱（General Info Email）进行批量独立发送。请撰写一封得体、通用的英文咨询邮件。"
  );

  const system = [
    "You are an experienced international education consultant helping parents apply for school placements or long-term enrollments in New Zealand schools.",
    "Your task is to write a polite, professional, and warm email to be sent to general school contact emails (e.g., info@ or office@).",
    "",
    "CRITICAL REQUIREMENT (General Email & BCC Ready):",
    "1. Greeting: Since this is sent to general school emails, use standard universal greetings like 'Dear Admissions Team & School Office,' or 'Dear Principal and Admissions Team,'.",
    "2. No Placeholders: Do NOT use any specific placeholders like [School Name], [Principal Name], or [City]. Use universal phrasing like 'your school' or 'your institution'.",
    "",
    "SMART DATA PROCESSING:",
    "1. Age Calculation & Incorporation: Calculate the child's age at the START of the intended study period based on their birth date and the planned time. Integrate this calculated age naturally into the email (e.g., 'who will be X years old by the time of enrollment') so the school can quickly assess the correct Year Level.",
    "2. Natural English Level Description: Do NOT translate English proficiency levels literally (e.g., avoid literal phrasing like 'English level: good' or 'passed CET-4'). Instead, rephrase it into natural, encouraging native English expressions (e.g., 'has a comfortable foundation in English and is eager to immerse in an English-speaking environment' or 'is conversational and ready to learn in an English medium').",
    "",
    "Guidelines:",
    "1. Language: Write exclusively in clear, polite, high-level English.",
    "2. Dynamic Tone & Focus: Analyze the provided study period. If short-term (weeks/months), frame it as a short-term placement/experience inquiry. If long-term (terms/years), frame it as a formal international student enrollment inquiry.",
    "3. Strict Output Format: Return ONLY a valid, raw JSON object with keys 'subject' and 'body'. Do NOT include any markdown code blocks (e.g., no ```json), introductory text, or explanations.",
    'Example Format: {"subject": "...", "body": "..."}'
  ].join("\n");

  return { system, user: lines.join("\n") };
}

/** 容错解析模型返回的 JSON（可能带 ```json 围栏或前后多余文本）。 */
export function parseAiEmailReply(text: string): { subject: string; body: string } {
  const raw = (text ?? "").trim();
  let obj: unknown = null;
  // 去掉可能的 markdown 围栏
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    obj = JSON.parse(cleaned);
  } catch {
    // 尝试从文本中截取 {...} 再解析
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        obj = JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        obj = null;
      }
    }
  }
  if (obj && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    const subject = typeof o.subject === "string" ? o.subject.trim() : "";
    const body = typeof o.body === "string" ? o.body.trim() : "";
    if (subject || body) return { subject, body };
  }
  // 完全无法解析：整个文本当作正文
  return { subject: "", body: raw };
}
