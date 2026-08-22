import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SchoolsPreloader } from "@/components/schools-preloader";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "WollyNZ · 新西兰教育机构查询",
  description:
    "面向中国游学家庭的新西兰幼儿园与中小学信息查询平台，基于 data.govt.nz 官方开放数据。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <SchoolsPreloader />
        <AuthProvider />
        <SiteHeader />
        <main className="pt-16">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
