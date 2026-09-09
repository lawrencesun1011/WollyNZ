import type { ArtworkName } from "@/components/editorial/artwork";

/** 首页「在出发之前，找到答案。」三个入口。
 *  接站点真实页面，不走「即将开放」弹窗。 */
export interface EditorialEntry {
  key: string;
  number: string;
  art: Extract<ArtworkName, "notebook" | "school" | "keys">;
  title: string;
  description: string;
  href: string;
}

export const editorialEntries: EditorialEntry[] = [
  {
    key: "guide",
    number: "01",
    art: "notebook",
    title: "游学攻略",
    description: "准备清单与实用经验",
    href: "/guide",
  },
  {
    key: "schools",
    number: "02",
    art: "school",
    title: "找学校",
    description: "中小学 / 幼儿园",
    href: "/schools",
  },
  {
    key: "accommodation",
    number: "03",
    art: "keys",
    title: "找住宿",
    description: "安顿好一家人的日常",
    href: "/accommodation",
  },
];
