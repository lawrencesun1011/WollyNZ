import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

/** 信息页脚：与首页同一套纸色 / 墨绿衬线语言。
 *
 *  与参考稿一致的两层结构：
 *  外层 = 居中的 1440 上限容器（对应参考的 .site-shell）；
 *  内层 = .page-width（相对 1440 容器再内缩 44px），承载上边框与纸色底。
 *  因此宽屏下边框距视口边缘 = (视口 - 1440)/2 + 22px，不会顶到头，
 *  且与首页社群条 / 目录区的左右端点完全对齐。 */
export function SiteFooter() {
  return (
    <footer className="editorial mx-auto w-full max-w-[1440px]">
      <div className="site-footer page-width">
        <div className="footer-main">
          <div className="footer-about">
            <Link href="/" aria-label="GoalNZ 首页">
              <BrandLogo small style={{ width: 130 }} />
            </Link>
            <p>
              面向中国游学家庭的新西兰亲子游学服务平台：免费查询中小学与幼儿园，阅读 DIY 攻略，提交住宿意向，并加入家长社群。
            </p>
          </div>

          <nav className="footer-nav" aria-labelledby="footer-schools-title">
            <h2 id="footer-schools-title">学校库</h2>
            <ul>
              <li>
                <Link href="/schools">中小学</Link>
              </li>
              <li>
                <Link href="/ece">幼儿园</Link>
              </li>
            </ul>
          </nav>

          <nav className="footer-nav" aria-labelledby="footer-services-title">
            <h2 id="footer-services-title">探索</h2>
            <ul>
              <li>
                <Link href="/guide">游学攻略</Link>
              </li>
              <li>
                <Link href="/accommodation">找住宿</Link>
              </li>
              <li>
                <Link href="/community">家长社群</Link>
              </li>
            </ul>
          </nav>

          <nav className="footer-nav" aria-labelledby="footer-data-title">
            <h2 id="footer-data-title">数据</h2>
            <ul>
              <li>
                <a
                  href="https://www.educationcounts.govt.nz/directories"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  新西兰教育机构目录<span className="sr-only">（在新窗口打开）</span>
                </a>
              </li>
              <li>
                <a
                  href="https://data.govt.nz/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  data.govt.nz<span className="sr-only">（在新窗口打开）</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-inner">
            <p>© 2026 GoalNZ · 仅供信息参考</p>
            <p className="footer-sources">
              公开数据来自新西兰教育部 Education Counts 及 data.govt.nz；学校招生信息以官方最新公布为准。
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
