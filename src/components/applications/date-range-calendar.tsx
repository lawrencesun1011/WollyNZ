"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ExactDate } from "@/lib/applications";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function toDate(d: ExactDate) {
  return new Date(d.year, d.month - 1, d.day);
}

function fromDate(d: Date): ExactDate {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function monthStartWeekday(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

function isSame(d1: ExactDate, d2: ExactDate) {
  return d1.year === d2.year && d1.month === d2.month && d1.day === d2.day;
}

function isBefore(d1: ExactDate, d2: ExactDate) {
  return toDate(d1).getTime() < toDate(d2).getTime();
}

function isAfter(d1: ExactDate, d2: ExactDate) {
  return toDate(d1).getTime() > toDate(d2).getTime();
}

function addMonths(d: Date, n: number) {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + n);
  return copy;
}

function clampMinDate(): ExactDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

interface Props {
  start: ExactDate;
  end: ExactDate;
  onChange: (range: { start: ExactDate; end: ExactDate }) => void;
  maxYear?: number;
}

export function DateRangeCalendar({ start, end, onChange, maxYear }: Props) {
  const minDate = clampMinDate();
  const today = minDate;

  const [baseDate, setBaseDate] = useState(() => {
    const s = toDate(start);
    return new Date(s.getFullYear(), s.getMonth(), 1);
  });

  const leftMonth = useMemo(() => fromDate(baseDate), [baseDate]);
  const rightMonth = useMemo(() => fromDate(addMonths(baseDate, 1)), [baseDate]);

  function prev() {
    setBaseDate((d) => addMonths(d, -1));
  }

  function next() {
    const candidate = addMonths(baseDate, 1);
    if (maxYear && candidate.getFullYear() > maxYear) return;
    setBaseDate(candidate);
  }

  function isDisabled(d: ExactDate) {
    if (maxYear && d.year > maxYear) return true;
    return !isAfter(d, today) && !isSame(d, today);
  }

  function handleClick(d: ExactDate) {
    if (isDisabled(d)) return;
    if (!isSame(start, end) || start.year === 0) {
      // 已完整选过，新点击重新开始
      onChange({ start: d, end: d });
      return;
    }
    if (isBefore(d, start)) {
      onChange({ start: d, end: d });
      return;
    }
    onChange({ start, end: d });
  }

  function renderMonth(year: number, month: number) {
    const days = daysInMonth(year, month);
    const startWeekday = monthStartWeekday(year, month);
    const blanks = Array.from({ length: startWeekday }, (_, i) => i);
    const cells = Array.from({ length: days }, (_, i) => i + 1);
    return (
      <div className="flex-1 min-w-[240px]">
        <div className="mb-3 text-center font-semibold text-ink">
          {year}年{month}月
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-soft">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">{w}</div>
          ))}
          {blanks.map((i) => (
            <div key={`b-${i}`} />
          ))}
          {cells.map((day) => {
            const d: ExactDate = { year, month, day };
            const disabled = isDisabled(d);
            const selectedStart = isSame(d, start);
            const selectedEnd = isSame(d, end);
            const inRange = !isBefore(d, start) && !isAfter(d, end) && !isSame(start, end);
            const isToday = isSame(d, today);

            return (
              <button
                key={day}
                type="button"
                disabled={disabled}
                onClick={() => handleClick(d)}
                className={[
                  "relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors",
                  disabled ? "cursor-not-allowed text-ink-soft opacity-50" : "hover:bg-primary/10",
                  selectedStart || selectedEnd ? "bg-primary text-white hover:bg-primary" : "",
                  inRange && !selectedStart && !selectedEnd ? "bg-primary/10 text-primary" : "",
                  isToday && !selectedStart && !selectedEnd ? "border border-primary/40 text-primary" : "",
                ].join(" ")}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl">
      <div className="mb-3 flex justify-end">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prev}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-primary/10 hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-primary/10 hover:text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {renderMonth(leftMonth.year, leftMonth.month)}
        {renderMonth(rightMonth.year, rightMonth.month)}
      </div>
    </div>
  );
}
