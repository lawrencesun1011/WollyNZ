"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { SmartImage } from "@/components/smart-image";
import { ArrowRight } from "./icons";
import { GuideDocument } from "./guide-document";
import { chapterIds, parseGuideContent, type GuideContent } from "@/lib/guide-content";
import { registerGuideReading } from "@/lib/guide-webmcp";
import styles from "./guide.module.css";

const stops = [{ x: 17, y: 77 }, { x: 30, y: 60 }, { x: 47, y: 79 }, { x: 61, y: 52 }, { x: 78, y: 63 }, { x: 88, y: 44 }];
const number = (index: number) => String(index + 1).padStart(2, "0");

export function GuidePage({ initialContent }: { initialContent: GuideContent }) {
  const [data, setData] = useState(initialContent);
  const currentContent = useRef(data);
  useEffect(() => { currentContent.current = data; }, [data]);
  useEffect(() => registerGuideReading(() => currentContent.current), []);
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const sync = () => { const index = chapterIds.indexOf(window.location.hash.slice(1) as typeof chapterIds[number]); setActive(index < 0 ? 0 : index); };
    sync(); window.addEventListener("hashchange", sync);
    const controller = new AbortController();
    fetch("/content/guide.json", { cache: "no-store", signal: controller.signal }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(value => setData(parseGuideContent(value))).catch(() => {});
    return () => { window.removeEventListener("hashchange", sync); controller.abort(); };
  }, []);
  function select(index: number, scroll = false, focus = false) {
    setActive(index);
    window.history.replaceState(null, "", `#${chapterIds[index]}`);
    if (focus) tabs.current[index]?.focus();
    if (scroll) panel.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    let next = active;
    if (event.key === "ArrowRight") next = (active + 1) % 6;
    else if (event.key === "ArrowLeft") next = (active + 5) % 6;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 5;
    else return;
    event.preventDefault(); select(next, false, true);
  }
  const chapter = data.chapters[active];
  return (
    <main id="main-content" className={`${styles.main} guide-page`}>
      <section className={styles.hero} aria-labelledby="guide-heading">
        <SmartImage className={styles.mapImage} src="/images/guide/guide-map" alt="山川、学校与小屋串联的新西兰游学准备地图" sizes="100vw" priority />
        <div className={styles.heroCopy}>
          <h1 id="guide-heading">游学攻略</h1>
          <p className={styles.heroSubtitle}>一张地图，走好游学的每一步。</p>
          <p className={styles.heroDescription}>从初步了解，到安心出发，跟着六个章节逐步准备。</p>
        </div>
        <div className={styles.stops} aria-label="游学准备路线">
          {data.chapters.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={styles.stop}
              style={{ "--x": `${stops[index].x}%`, "--y": `${stops[index].y}%` } as CSSProperties}
              aria-label={`第${index + 1}章：${item.label}`}
              aria-current={index === active ? "step" : undefined}
              onClick={() => select(index, true)}
            >
              <span>{number(index)}</span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </div>
      </section>
      <div className={styles.mapMeta}><p>你的游学准备地图</p><p>当前章节 <b>{number(active)}</b> / 06</p></div>
      <div className={styles.tabs} role="tablist" aria-label="游学攻略章节">
        {data.chapters.map((item, index) => (
          <button
            ref={node => { tabs.current[index] = node; }}
            key={item.id}
            type="button"
            id={`tab-${item.id}`}
            role="tab"
            aria-selected={index === active}
            aria-controls="guide-panel"
            tabIndex={index === active ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={keyboard}
          >
            <span>{number(index)}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </div>
      <section id="guide-panel" ref={panel} role="tabpanel" aria-labelledby={`tab-${chapter.id}`} tabIndex={0} className={styles.panel}>
        <article className={styles.notebook}>
          <header className={styles.chapterHeader}>
            <p className={styles.eyebrow}>CHAPTER {number(active)} <span>· {chapter.label}</span></p>
            <h2>{chapter.title}</h2>
            <p className={styles.noteIntro}>GoalNZ 游学手记 <span>慢慢了解，认真准备。</span></p>
          </header>
          <GuideDocument doc={chapter.doc} />
          <div className={styles.pageNumber}>— {number(active)} —</div>
        </article>
      </section>
      <nav className={styles.chapterNavigation} aria-label="章节翻页">
        <span>第 {active + 1} 章，共 6 章</span>
        <div>
          {active > 0 && <button type="button" className={styles.previous} onClick={() => select(active - 1, true)}>← 上一章</button>}
          {active < 5 ? (
            <button type="button" className="primary-button inline-flex items-center justify-center gap-3" onClick={() => select(active + 1, true)}>
              下一章：{data.chapters[active + 1].label} <ArrowRight />
            </button>
          ) : (
            <button type="button" className="primary-button inline-flex items-center justify-center gap-3" onClick={() => select(0, true)}>
              回到第一章 <ArrowRight />
            </button>
          )}
        </div>
      </nav>
    </main>
  );
}
