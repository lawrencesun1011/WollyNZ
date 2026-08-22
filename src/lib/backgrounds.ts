/**
 * 页面各区域背景图统一管理
 * ─────────────────────────────────────
 * 📌 上传说明：
 *   1. 把背景图放到 /public/images/ 对应子目录，例如：
 *        /public/images/home/hero-bg.png
 *        /public/images/home/library-bg.png
 *   2. 在下方配置中修改对应路径即可。
 *   3. 留空字符串 "" 表示该区域不显示背景图（保留原渐变）。
 *
 * 📐 推荐尺寸：
 *   - Hero 区域：1920 × 800 （约 12:5 宽屏比例）
 *   - 学校库入口：1920 × 900 （约 2:1 至 2.4:1）
 *   - 其他区域：1920 × 600 起，按内容需要调整
 *
 * 🎨 视觉建议：
 *   - 背景图偏暗 / 留白多 → 不需要蒙层
 *   - 背景图偏亮 / 信息多 → 建议开启 overlay（蒙层）
 */

export type SectionBackground = {
  /** 背景图路径，相对于 /public */
  src: string;
  /** 是否需要暗色蒙层，提升文字可读性 */
  overlay?: boolean;
  /** 蒙层渐变方向：top / bottom / center / all */
  overlayDirection?: "top" | "bottom" | "center" | "all";
  /** 蒙层强度：light / medium / strong */
  overlayStrength?: "light" | "medium" | "strong";
  /** 图片定位：center / top / bottom / left / right */
  position?: string;
  /** 图片缩放：cover（铺满）/ contain（完整显示） */
  fit?: "cover" | "contain";
  /** 是否为暗色主题（用于切换文字颜色） */
  dark?: boolean;
  /** contain 模式下，图片留白区域的底色（默认主题浅色 #F4FBFA） */
  bgColor?: string;
};

export type HomePageBackgrounds = {
  hero: SectionBackground;
  library: SectionBackground;
};

export const homePageBackgrounds: HomePageBackgrounds = {
  // 🎯 Hero 区域 - 探索新西兰优质教育机构
  hero: {
    src: "/images/home/hero-bg.webp",
    overlay: false, // 蒙层已移除，保留原图锐度
    // overlay: true, // 开启蒙层，避免背景抢戏文字
    // overlayDirection: "all", // 全局蒙层
    // overlayStrength: "light", // 轻微蒙层，保持画面通透
    position: "center",
    fit: "cover", // Hero 区域已锁定 2.4:1，铺满不拉伸
    dark: false, // 文字保持深色
  },

  // 🎯 学校库入口区域 - 中小学/幼儿园卡片
  library: {
    src: "", // 暂时未设置，留空使用原渐变
    // src: "/images/home/library-bg.png", // 未来上传后取消注释
  },

};
