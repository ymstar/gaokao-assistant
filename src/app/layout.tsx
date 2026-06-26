import type { Metadata } from "next";
import "./globals.css";
import { NavigationBar } from "@/components/NavigationBar";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "高考志愿助手",
  description: "河北省高考一分一档查询 · 等效分计算 · 大学招生信息",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800">
        <NavigationBar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
          数据来源：河北省教育考试院 (hebeea.edu.cn) · 仅供参考，以官方数据为准
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
