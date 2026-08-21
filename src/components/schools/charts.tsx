"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import type { SchoolFrontend } from "@/lib/types";
import { LEVELS } from "@/lib/filters";

const LEVEL_COLORS: Record<string, string> = {
  小学: "#5BA3C4",
  初中: "#D97E72",
  高中: "#6366F1",
  贯通制: "#D8B45E",
};

export function Charts({ schools }: { schools: SchoolFrontend[] }) {
  const pieRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLCanvasElement>(null);
  const pieChart = useRef<Chart<"doughnut", number[], string> | null>(null);
  const barChart = useRef<Chart<"bar", number[], string> | null>(null);

  useEffect(() => {
    // 类型（学段）分布
    const levelCounts: Record<string, number> = {};
    for (const s of schools) {
      levelCounts[s.level] = (levelCounts[s.level] || 0) + 1;
    }
    const pieLabels = LEVELS.filter((l) => levelCounts[l]);
    const pieData = pieLabels.map((l) => levelCounts[l]);
    const pieColors = pieLabels.map((l) => LEVEL_COLORS[l] || "#3E9C8C");

    if (pieRef.current) {
      if (pieChart.current) pieChart.current.destroy();
      pieChart.current = new Chart(pieRef.current, {
        type: "doughnut",
        data: {
          labels: pieLabels,
          datasets: [
            {
              data: pieData,
              backgroundColor: pieColors,
              borderWidth: 2,
              borderColor: "#fff",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { font: { size: 12 } } },
          },
        },
      });
    }

    // 地区（城市）分布 Top 10
    const cityCounts: Record<string, number> = {};
    for (const s of schools) {
      const c = s.city || "其他";
      cityCounts[c] = (cityCounts[c] || 0) + 1;
    }
    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const barLabels = topCities.map(([c]) => c);
    const barData = topCities.map(([, n]) => n);

    if (barRef.current) {
      if (barChart.current) barChart.current.destroy();
      barChart.current = new Chart(barRef.current, {
        type: "bar",
        data: {
          labels: barLabels,
          datasets: [
            {
              label: "学校数",
              data: barData,
              backgroundColor: "#5BA3C4",
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { font: { size: 11 }, maxRotation: 45 } },
            y: { beginAtZero: true },
          },
        },
      });
    }

    return () => {
      pieChart.current?.destroy();
      barChart.current?.destroy();
    };
  }, [schools]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="glass rounded-2xl p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-ink">学段分布</h3>
        <div className="h-64">
          <canvas ref={pieRef} />
        </div>
      </div>
      <div className="glass rounded-2xl p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-ink">
          地区分布（Top 10 城市）
        </h3>
        <div className="h-64">
          <canvas ref={barRef} />
        </div>
      </div>
    </div>
  );
}
