import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { getOptionalActorContext } from "@/lib/auth/actor";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const actor = await getOptionalActorContext();

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[radial-gradient(circle_at_top,_#e0f2fe,_#f8fafc_38%,_#f8fafc_100%)] text-slate-900">
        <div className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <Link href="/" className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-slate-950">
                CCCB Contact Hub
              </span>
              <span className="text-xs text-slate-500">연락처 · 행사 · 검수 · 공유</span>
            </Link>
            {actor ? (
              <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
                <nav className="flex w-full flex-wrap items-center gap-2 rounded-[1.5rem] border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 shadow-sm lg:w-auto lg:rounded-full">
                  <Link href="/cards" className="rounded-full px-3 py-2 font-medium hover:bg-slate-100">
                    연락처
                  </Link>
                  <Link href="/cards/new" className="rounded-full px-3 py-2 font-medium hover:bg-slate-100">
                    수동 등록
                  </Link>
                  <Link href="/events" className="rounded-full px-3 py-2 font-medium hover:bg-slate-100">
                    행사
                  </Link>
                  <Link href="/broadcasts" className="rounded-full px-3 py-2 font-medium hover:bg-slate-100">
                    발송
                  </Link>
                  <Link href="/review" className="rounded-full px-3 py-2 font-medium hover:bg-slate-100">
                    검수
                  </Link>
                  <Link href="/insights" className="rounded-full px-3 py-2 font-medium hover:bg-slate-100">
                    인사이트
                  </Link>
                  <Link href="/upload" className="rounded-full px-3 py-2 font-medium hover:bg-slate-100">
                    OCR 업로드
                  </Link>
                  <Link href="/import" className="rounded-full px-3 py-2 font-medium hover:bg-slate-100">
                    엑셀 가져오기
                  </Link>
                </nav>
                <div className="flex items-center gap-3 text-sm">
                  <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 shadow-sm">
                    <span className="font-semibold text-slate-950">{actor.displayName}</span>
                    <span className="text-slate-500">
                      {actor.teamName ? ` · ${actor.teamName}` : ""}
                    </span>
                  </div>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      로그아웃
                    </button>
                  </form>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex min-h-[calc(100vh-73px)] flex-col">{children}</div>
      </body>
    </html>
  );
}
