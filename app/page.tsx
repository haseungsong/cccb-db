import Link from "next/link";
import { dashboardStats, demoContacts, setupChecklist } from "@/lib/samples";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-6 py-10">
      <section className="rounded-3xl bg-slate-950 px-8 py-10 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
              CCCB Contact Hub
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">
              문화원 직원들이 함께 쓰는 통합 명함 DB
            </h1>
            <p className="text-base leading-7 text-slate-300">
              기존 엑셀 연락처, 행사 초청 이력, 인플루언서 사진, 새로 촬영한
              명함 OCR까지 한 곳에서 관리하도록 시작해 둔 초기 버전입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/upload"
              className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              모바일 업로드 테스트
            </Link>
            <Link
              href="/import"
              className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              엑셀 구조 분석
            </Link>
            <Link
              href="/cards"
              className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              통합 연락처 보기
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {stat.value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                샘플 연락처 미리보기
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                실제 Supabase 연결 전에도 어떤 식으로 관리될지 바로 볼 수 있게
                샘플 목록을 넣어두었습니다.
              </p>
            </div>
            <Link
              href="/cards"
              className="text-sm font-semibold text-cyan-700 hover:text-cyan-800"
            >
              전체 보기
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {demoContacts.map((contact) => (
              <Link
                key={contact.id}
                href={`/cards/${contact.id}`}
                className="block rounded-2xl border border-slate-200 p-4 transition hover:border-cyan-300 hover:bg-cyan-50/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">
                      {contact.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {contact.company} · {contact.category}
                    </p>
                    <p className="mt-3 text-sm text-slate-500">
                      담당자 {contact.ownerStaff} · {contact.city}
                    </p>
                  </div>
                  {contact.isInfluencer ? (
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                      인플루언서
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            지금 사용자가 할 일
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            아래 항목만 순서대로 해주시면, 나머지는 제가 코드 기준으로 계속
            이어서 붙일 수 있습니다.
          </p>

          <ol className="mt-6 space-y-3">
            {setupChecklist.map((item, index) => (
              <li
                key={item}
                className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            지금 단계에서는 기존 엑셀 파일을 바로 DB에 넣지 않고, 먼저
            `구조 분석`, `Supabase 스키마 생성`, `OCR 연결`, `저장` 순서로
            진행하는 게 가장 안전합니다.
          </div>
        </article>
      </section>
    </main>
  );
}
