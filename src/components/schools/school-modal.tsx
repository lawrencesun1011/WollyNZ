"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { toPng } from "html-to-image";
import type { SchoolFrontend } from "@/lib/types";
import { cnGender, cnLanguage } from "@/lib/labels";
import { X, MapPin, Check, ExternalLink } from "lucide-react";

interface Props {
  school: SchoolFrontend;
  onClose: () => void;
  inCompare: boolean;
  onToggleCompare: (id: string) => void;
}

/* ── 学段 → 学校类型描述（带年级范围） ── */
function levelTypeDesc(level: string): string {
  switch (level) {
    case "小学":
      return "小学（1-6 年级）";
    case "初中":
      return "初中（7-8 年级）";
    case "高中":
      return "高中（9-13 年级）";
    case "贯通制":
      return "一贯制学校（1-13 年级）";
    default:
      return level || "—";
  }
}

/* ── 数值字段：0 或空 → "不适用"，否则按字符串展示 ── */
function fmtNoneZero(v: number | undefined | null): string {
  if (v == null || v === 0) return "不适用";
  return String(v);
}

/* ── ERO 报告链接：https://www.ero.govt.nz/institution/{id}/{name-slug} ── */
function eroUrl(school: SchoolFrontend): string {
  const slug = school.name
    .toLowerCase()
    .replace(/[()]/g, "") // 去掉括号
    .replace(/[^a-z0-9]+/g, "-") // 空格、标点等 → 连字符
    .replace(/^-+|-+$/g, ""); // 去掉首尾连字符
  return `https://www.ero.govt.nz/institution/${school.id}/${slug}`;
}

/* ── 单个字段小卡片（左上小标签 + 加粗值） ── */
function Field({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-primary/5 p-2.5">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{value || "—"}</p>
    </div>
  );
}

/* ── 族裔展示配置（排除国际生，共 6 类） ── */
const ETHNIC_DISPLAY = [
  { key: "european", label: "欧洲裔", color: "#5BA3C4" },
  { key: "maori", label: "毛利裔", color: "#3E9C8C" },
  { key: "pacific", label: "太平洋岛裔", color: "#9CCBBD" },
  { key: "asian", label: "亚裔", color: "#F59E0B" },
  { key: "melaa", label: "中东/拉美/非洲裔", color: "#14B8A6" },
  { key: "other", label: "其他", color: "#94A3B8" },
] as const;

interface DetailProps {
  school: SchoolFrontend;
  inCompare: boolean;
  onToggleCompare: (id: string) => void;
  /** 渲染在顶部渐变栏右上角的额外按钮（如关闭/移除） */
  closeButton?: ReactNode;
  /** 学校名不换行（用于横向对比视图） */
  noWrapTitle?: boolean;
}

/** 单所学校详情卡片（可被单个详情页与横向对比视图共用） */
export function SchoolDetailCard({
  school,
  inCompare,
  onToggleCompare,
  closeButton,
  noWrapTitle,
}: DetailProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const address = [school.street, school.suburb, school.city]
    .filter(Boolean)
    .join(", ");

  const ethnicRows = ETHNIC_DISPLAY.map((e) => {
    const value = school[e.key as keyof SchoolFrontend] as number;
    return { label: e.label, color: e.color, value };
  });
  const ethnicSum = ethnicRows.reduce((acc, r) => acc + r.value, 0) || 1;
  const ethnicDisplay = ethnicRows.map((r) => ({
    ...r,
    pct: Math.round((r.value / ethnicSum) * 1000) / 10,
  }));
  const ethnicTotal = ethnicRows.reduce((a, r) => a + r.value, 0);

  // 弹提示（2.5s 后自动消失）
  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  }

  // 分享卡片：把详情卡片转为 PNG 复制到剪贴板
  async function handleShare() {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const blob = await (await fetch(dataUrl)).blob();
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        showToast("已成功复制，分享到微信 / 朋友圈 / 邮件");
      } else {
        // 浏览器不支持写图片：降级为复制文字摘要
        const text = `${school.name}\n${address || "新西兰"}\n办学性质：${school.authorityCN || "—"}\n学生性别：${cnGender(school.gender, school.genderCN)}\n在校人数：${school.roll || 0}\n来源：wollynz.com`;
        await navigator.clipboard.writeText(text);
        showToast("已成功复制文字，分享到微信 / 朋友圈");
      }
    } catch {
      showToast("复制失败，请重试");
    }
  }

  return (
    <div ref={cardRef} className="relative flex h-full flex-col">
      {toast && (
        <div className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink/95 px-4 py-2 text-sm text-white shadow-lg">
          <Check className="h-4 w-4 text-tertiary" />
          {toast}
        </div>
      )}
      {/* ── 顶部学校信息条（青色渐变） ── */}
      <div className="relative shrink-0 bg-gradient-to-r from-primary to-secondary p-5 text-white">
        {closeButton}
        <h2
          className={`pr-12 text-2xl font-bold leading-tight ${
            noWrapTitle ? "whitespace-nowrap overflow-hidden text-ellipsis" : ""
          }`}
        >
          {school.name}
        </h2>
        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-white/90">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{address || "新西兰"}</span>
        </div>
      </div>

      {/* ── 字段网格（2 列灰底卡片） ── */}
      <div className="shrink-0 grid grid-cols-2 gap-3 px-6 pt-4">
        <Field label="学校类型" value={levelTypeDesc(school.level)} />
        <Field label="办学性质" value={school.authorityCN || "—"} />
        <Field
          label="学生性别"
          value={cnGender(school.gender, school.genderCN)}
        />
        <Field label="授课语言" value={cnLanguage(school.language)} />
        <Field
          label="在校人数"
          value={
            school.intl
              ? `${school.roll}（国际生 ${school.intl}）`
              : String(school.roll || 0)
          }
        />
        <Field
          label="寄宿设施"
          value={school.boarding === "Yes" ? "有" : "无"}
        />
        <Field label="公平指数（EQI）" value={fmtNoneZero(school.eqi)} />
        <Field label="偏远度指数" value={fmtNoneZero(school.isolation)} />
      </div>

      {/* ── 族裔分布卡片 ── */}
      <div className="mx-6 mt-3 shrink-0 rounded-2xl border border-primary/10 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary">族裔分布</h3>
          <div className="flex items-center gap-1.5 text-xs text-ink-soft">
            <span>统计样本：{ethnicTotal} 人次</span>
            <span className="group relative">
              <span className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-ink-soft/40 text-[10px] font-semibold text-ink-soft transition-colors group-hover:border-primary group-hover:text-primary">
                ?
              </span>
              <span className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 hidden w-80 max-w-[80vw] whitespace-pre-line break-words rounded-lg bg-primary px-3.5 py-2.5 text-left text-[11px] leading-relaxed text-white shadow-lg group-hover:block">
                新西兰教育部允许申报多重族裔，故统计人次高于在校总人数。
              </span>
            </span>
          </div>
        </div>
        <div className="space-y-2.5">
          {ethnicDisplay.map((r) => (
            <div key={r.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-ink">{r.label}</span>
                <span className="font-medium text-ink-soft">
                  {r.pct}%（{r.value}）
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${r.pct}%`,
                    backgroundImage:
                      "linear-gradient(to right, #3e9c8c, #5ba3c4)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 操作区 ── */}
      <div className="shrink-0 px-6 pb-2 pt-4">
        <div className="grid grid-cols-3 gap-3">
          {school.website ? (
            <a
              href={school.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
            >
              访问官网
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-primary/10 bg-bg-soft py-3 text-sm font-medium text-ink-soft">
              访问官网
              <ExternalLink className="h-3.5 w-3.5" />
            </span>
          )}
          <a
            href={eroUrl(school)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            ERO 报告
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center rounded-xl border border-primary/20 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            分享卡片
          </button>
        </div>
      </div>

      {/* ── 底部装饰 ── */}
      <div className="mt-auto shrink-0 pb-4 pt-3 text-center">
        <div className="mx-auto mb-1.5 h-1 w-12 rounded-full bg-gradient-to-r from-primary to-secondary" />
        <p className="text-xs text-ink-soft">wollynz.com · 一键查校 · 免费申请</p>
      </div>
    </div>
  );
}

export function SchoolModal({
  school,
  onClose,
  inCompare,
  onToggleCompare,
}: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="animate-overlay fixed inset-0 z-[1000] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-fade-up relative max-h-[90vh] w-[420px] max-w-full overflow-y-auto rounded-3xl bg-white shadow-2xl scroll-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <SchoolDetailCard
          school={school}
          inCompare={inCompare}
          onToggleCompare={onToggleCompare}
          closeButton={
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
            >
              <X className="h-5 w-5" />
            </button>
          }
        />
      </div>
    </div>
  );
}