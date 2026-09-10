"use client";

import { ReferenceArtwork } from "@/components/reference-artwork";
import { communityConfig } from "@/lib/community-config";
import styles from "./community.module.css";

function InvitationMark() {
  return (
    <svg className={styles.invitationMark} viewBox="0 0 120 92" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="7" y="8" width="106" height="74" rx="5" />
      <path d="m9 10 35 28m67-28L76 38" />
      <path d="M46 45c-8-7-15 0-8 6 2 2 5 2 8 0m29-6c8-7 15 0 8 6-2 2-5 2-8 0" />
      <path d="M46 45c-5-5-2-11 4-11 0-6 8-8 11-3 5-5 11-2 11 3 6 0 10 8 3 12l-2 15c-2 8-21 8-24 0Z" />
      <circle cx="55" cy="49" r="1.8" fill="currentColor" stroke="none" /><circle cx="67" cy="49" r="1.8" fill="currentColor" stroke="none" />
      <path d="m57 56 4 2 4-2m-4 2v5" />
    </svg>
  );
}

function DownloadIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v13m-5-5 5 5 5-5M5 21h14" /></svg>;
}

export function CommunityContent() {
  const qrCodeSrc = communityConfig.qrCodeSrc;

  return (
    <div id="main-content" className={styles.page}>
      <section className={styles.intro} aria-labelledby="community-title">
        <div className={styles.introCopy}>
          <h1 id="community-title">加入家长社群</h1>
          <p className={styles.tagline}>成长这一页，我们一起翻开。</p>
          <p className={styles.description}><span className={styles.desktopOnly}>和同行的家长，</span>交流游学准备与生活经验。</p>
        </div>
        <ReferenceArtwork name="conversation" className={styles.conversationArt} />
      </section>

      <section className={styles.joinPanel} aria-labelledby="join-title">
        <div className={styles.panelHeading}>
          <h2 id="join-title" className={styles.accentHeading}>找到同行的人。</h2>
          <p className={styles.desktopOnly}>使用微信扫描社群二维码，查看加入方式。</p>
          <p className={styles.mobileOnly}>{qrCodeSrc ? "保存二维码，在微信中识别加入。" : "社群入口更新后即可使用。"}</p>
        </div>

        <div className={styles.qrArea}>
          <div className={styles.qrCard}>
            {qrCodeSrc ? <img className={styles.qrImage} src={qrCodeSrc} alt="GoalNZ 家长社群二维码，请使用微信扫描" /> : <><InvitationMark /><p id="qr-unavailable">社群二维码待更新</p></>}
          </div>
          <div className={styles.qrActions}>
            {qrCodeSrc ? <a className={`${styles.qrButton} ${styles.saveQr}`} href={qrCodeSrc} download={communityConfig.qrCodeDownloadName}>保存二维码 <DownloadIcon /></a> : <button type="button" className={`${styles.qrButton} ${styles.saveQr}`} disabled aria-describedby="qr-unavailable">保存二维码 <DownloadIcon /></button>}
          </div>
        </div>

        <div className={styles.instructions}>
          <ol className={styles.stepList}>
            <li><span className={styles.stepNumber}>01</span><span className={styles.stepText}><span className={styles.desktopOnly}>打开微信扫一扫</span><span className={styles.mobileOnly}>保存社群二维码</span></span></li>
            <li><span className={styles.stepNumber}>02</span><span className={styles.stepText}><span className={styles.desktopOnly}>扫描右侧社群二维码</span><span className={styles.mobileOnly}>在微信中识别二维码</span></span></li>
            <li><span className={styles.stepNumber}>03</span><span className={styles.stepText}>按提示申请加入</span></li>
          </ol>
          {!qrCodeSrc ? <p className={`${styles.entryNotice} ${styles.desktopOnly}`}>社群入口更新后即可使用。</p> : null}
        </div>
      </section>

      <aside className={styles.privacy} aria-label="社群交流约定">
        <svg className={styles.privacyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H8l-3 3z" />
          <path d="M13 8a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2l-3 3v-3h-2" />
        </svg>
        <div className={styles.privacyCopy}>
          <p className={styles.privacyTitle}>免费交流<span aria-hidden="true"> · </span>尊重隐私<span aria-hidden="true"> · </span>友善分享</p>
          <p className={styles.privacyDescription}>请勿在群内公开个人敏感信息。</p>
        </div>
      </aside>
    </div>
  );
}
