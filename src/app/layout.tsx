import type { Metadata } from "next";
import "@fontsource/noto-serif-sc/400.css";
import "@fontsource/noto-serif-sc/600.css";
import "@fontsource/noto-serif-sc/700.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SchoolsPreloader } from "@/components/schools-preloader";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "GoalNZ · 让好奇心，在新西兰长大",
  description:
    "新西兰亲子游学信息服务。免费找学校，开启新的成长体验。游学攻略、中小学与幼儿园、家庭住宿和家长社群。",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body className="min-h-screen">
        <SchoolsPreloader />
        <AuthProvider />
        <SiteHeader />
        <main className="site-main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
