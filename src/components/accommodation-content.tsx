"use client";

import Link from "next/link";
import { type SVGProps } from "react";
import { ArrowRight, ArrowUpRight } from "@/components/icons";
import { ReferenceArtwork } from "@/components/reference-artwork";
import styles from "./accommodation.module.css";

type IconProps = SVGProps<SVGSVGElement>;
function NoteIcon(props: IconProps) {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M25 56H11a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4h33a4 4 0 0 1 4 4v8M16 18h23M16 28h16M16 38h10" /><path d="m30 44 20-23a5 5 0 0 1 8 7L38 51l-12 5 4-12Zm17-19 8 7" /></svg>;
}
function HouseIcon(props: IconProps) {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="m5 29 27-23 27 23M12 24v33h40V24M26 57V41a6 6 0 0 1 12 0v16" /></svg>;
}
function MailIcon(props: IconProps) {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><rect x="5" y="12" width="54" height="40" rx="3" /><path d="m7 15 25 20 25-20" /></svg>;
}
function ShieldIcon(props: IconProps) {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M32 5c8 6 15 8 23 10v17c0 13-12 22-23 28C21 54 9 45 9 32V15c8-2 15-4 23-10Z" /><path d="m22 32 7 7 14-16" /></svg>;
}

const steps = [
  { number: "01", title: "填写意向", Icon: NoteIcon, desktop: "告诉我们意向地区、每周预算、卧室需求与入住安排等。", mobile: "地区、每周预算、卧室需求与入住安排等。" },
  { number: "02", title: "匹配房源", Icon: HouseIcon, desktop: "我们从合作物业中寻找符合您需求的房源。", mobile: "从合作物业中寻找符合需求的房源。" },
  { number: "03", title: "邮件联系", Icon: MailIcon, desktop: "有合适房源时，我们会通过您留下的邮箱主动联系。", mobile: "有合适房源时，我们会主动联系您。" },
];

export function AccommodationContent() {
  return <>
    <div id="main-content" className={styles.page}>
      <section className={styles.hero} aria-labelledby="accommodation-title">
        <div className={styles.heroCopy}>
          <div className={styles.titleRow}><h1 id="accommodation-title">找住宿</h1><span className={styles.beta}>内测中</span></div>
          <h2 className={styles.intro}>提交住宿意向，寻找适合一家人的落脚点。</h2>
          <p className={styles.description}>我们从合作物业中匹配房源，若有合适房源时会通过邮件联系您。</p>
          <div className={styles.actions}>
            <Link className="primary-button" href="/apply/accommodation">填写住宿意向 <ArrowUpRight /></Link>
            <Link className={styles.textButton} href="/my-accommodations">管理我的意向 <ArrowRight /></Link>
          </div>
        </div>
        <ReferenceArtwork name="villa" className={styles.villa} />
      </section>

      <section className={styles.process} aria-labelledby="matching-title">
        <div className={styles.sectionHeading}><h2 id="matching-title">如何匹配</h2></div>
        <ol className={styles.steps}>
          {steps.map(({ number, title, Icon, desktop, mobile }) => <li key={number} className={styles.step}>
            <Icon className={styles.stepIcon} />
            <div><span className={styles.number}>{number}</span><h3>{title}</h3><p className={styles.desktopText}>{desktop}</p><p className={styles.mobileText}>{mobile}</p></div>
          </li>)}
        </ol>
      </section>

      <section className={styles.assurance} aria-label="住宿匹配说明">
        <ShieldIcon className={styles.shield} />
        <div className={styles.assuranceCopy}>
          <h2>免费匹配 · 隐私保护</h2>
          <p>您填写的信息仅用于房源匹配，我们不会向无关第三方分享您的信息。没有合适房源时，您无需任何操作。提交意向不代表已预订住宿。</p>
        </div>
      </section>
    </div>
  </>;
}
