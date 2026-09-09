"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@/components/editorial/icons";
import { Artwork } from "@/components/editorial/artwork";
import { editorialEntries } from "@/lib/editorial-entries";

/** 首页：立体书主视觉 + 三入口目录 + 社群横条（编辑刊物风）。 */
export default function HomePage() {
  /** 「出发吧」滚动到学校入口并把键盘焦点移进去。 */
  function startExploring() {
    const school = document.getElementById("school-entry");
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    school?.scrollIntoView({
      behavior: reduceMotion ? "instant" : "smooth",
      block: "center",
    });
    school?.focus({ preventScroll: true });
  }

  return (
    <div className="editorial site-shell" id="top">
      <a className="skip-link" href="#explore">
        跳转到首页内容
      </a>

      <section className="hero relative text-center" aria-labelledby="hero-title">
        <div className="hero-copy relative z-10 mx-auto flex flex-col items-center px-5">
          <p className="hero-eyebrow">新西兰亲子游学</p>
          <h1 id="hero-title">
            让好奇心
            <br />
            在新西兰长大
          </h1>
          <p className="hero-description">免费找学校，开启新的成长体验。</p>
          <button
            type="button"
            className="primary-button group inline-flex items-center justify-center gap-3"
            onClick={startExploring}
          >
            出发吧
            <ArrowUpRight className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
        </div>
        <div className="hero-art relative mx-auto">
          <Image
            src="/images/storybook.webp"
            alt="背着书包的小女孩与小羊并肩坐在立体书中的草坡上，望向新西兰雪山、湖泊和学校。"
            width={2087}
            height={754}
            priority
            className="h-auto w-full"
          />
        </div>
      </section>

      <section
        id="explore"
        className="directory content-width border-t border-[#789491]"
        aria-labelledby="explore-title"
      >
        <div className="section-heading flex items-center justify-between border-b border-[#789491]">
          <h2 id="explore-title">在出发之前，找到答案。</h2>
          <span
            className="section-index inline-flex items-center gap-4"
            aria-hidden="true"
          >
            01 <span /> 03
          </span>
        </div>
        <div className="entry-grid grid grid-cols-1 md:grid-cols-3">
          {editorialEntries.map(({ key, number, art, title, description, href }) => (
            <article id={key} className="entry relative" key={key}>
              <Link
                id={key === "schools" ? "school-entry" : undefined}
                href={href}
                className="entry-button group flex h-full w-full flex-col items-center text-center"
              >
                <div className="entry-art flex w-full items-center justify-center">
                  <Artwork
                    name={art}
                    className="transition-transform duration-500 group-hover:-translate-y-1"
                  />
                </div>
                <span className="entry-number text-[#b44427]">{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
                <ArrowRight className="entry-arrow transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section
        id="community"
        className="community content-width relative border-t border-[#789491]"
        aria-labelledby="community-title"
      >
        <div className="community-art">
          <Artwork name="lamb" />
        </div>
        <div className="community-copy">
          <h2 id="community-title">成长这一页，我们一起翻开。</h2>
          <p>GoalNZ 家长社群</p>
        </div>
        <Link
          href="/community"
          className="primary-button community-button group inline-flex items-center justify-center gap-3"
        >
          加入社群
          <ArrowUpRight className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </section>
    </div>
  );
}
