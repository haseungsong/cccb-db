import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "문화원 통합 명함 DB",
  description: "기존 엑셀 DB와 신규 명함 OCR 데이터를 통합 관리하는 문화원 연락처 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[radial-gradient(circle_at_top,_#e0f2fe,_#f8fafc_38%,_#f8fafc_100%)] text-slate-900">
        <div className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4">
            <Link href="/" className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-slate-950">
                CCCB Contact Hub
              </span>
              <span className="text-xs text-slate-500">연락처 · 행사 · 검수 · 공유</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-2 text-sm text-slate-600 shadow-sm">
              <Link href="/cards" className="rounded-full px-3 py-2 hover:bg-slate-100">
                연락처
              </Link>
              <Link href="/cards/new" className="rounded-full px-3 py-2 hover:bg-slate-100">
                수동 등록
              </Link>
              <Link href="/events" className="rounded-full px-3 py-2 hover:bg-slate-100">
                행사
              </Link>
              <Link href="/review" className="rounded-full px-3 py-2 hover:bg-slate-100">
                검수
              </Link>
              <Link href="/insights" className="rounded-full px-3 py-2 hover:bg-slate-100">
                인사이트
              </Link>
              <Link href="/upload" className="rounded-full px-3 py-2 hover:bg-slate-100">
                OCR 업로드
              </Link>
              <Link href="/import" className="rounded-full px-3 py-2 hover:bg-slate-100">
                엑셀 가져오기
              </Link>
            </nav>
          </div>
        </div>
        <div className="flex min-h-[calc(100vh-73px)] flex-col">{children}</div>
      </body>
    </html>
  );
}
