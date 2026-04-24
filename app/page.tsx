import Link from "next/link";
import { SearchAutocomplete } from "@/app/_components/search-autocomplete";
import {
  getDashboardInsights,
  getDuplicateCandidates,
  getEventsOverview,
  getPendingBusinessCardReviews,
  getSearchFacets,
} from "@/lib/contacts/queries";

export default async function Home() {
  const [insights, duplicates, pendingCards, events, facets] = await Promise.all([
    getDashboardInsights(),
    getDuplicateCandidates(),
    getPendingBusinessCardReviews(),
    getEventsOverview(),
    getSearchFacets(),
  ]);

  const stats = [
    { label: "전체 연락처", value: insights.totals.contacts, tone: "slate" },
    { label: "행사", value: insights.totals.events, tone: "slate" },
    { label: "검수 대기", value: insights.totals.pendingCards, tone: "amber" },
    { label: "중복 후보", value: duplicates.length, tone: "rose" },
  ];
  const quickActions = [
    {
      title: "새 연락처 등록",
      description: "신규 인물 직접 등록",
      href: "/cards/new",
    },
    {
      title: "OCR 명함 업로드",
      description: "명함 촬영본 바로 등록",
      href: "/upload",
    },
    {
      title: "행사 운영",
      description: "초청/참석 현황 정리",
      href: "/events",
    },
    {
      title: "검수 큐",
      description: "중복 및 OCR 검수 처리",
      href: "/review",
    },
    {
      title: "발송 센터",
      description: "대상 리스트/메일 공유",
      href: "/broadcasts",
    },
  ];
  const helpfulLinks = [
    {
      label: "담당자 미지정 연락처",
      href: "/cards?owner=all",
      count: insights.totals.noOwner,
    },
    {
      label: "카테고리 미지정 연락처",
      href: "/cards",
      count: insights.totals.noCategory,
    },
    {
      label: "검수 대기 명함",
      href: "/review",
      count: pendingCards.length,
    },
    {
      label: "중복 후보",
      href: "/review",
      count: duplicates.length,
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
            연락처 운영 홈
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            바로 찾고, 바로 정리하고, 바로 공유
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            이름, 기관, 행사, 태그, 문화원 협력도 기준으로 필요한 연락처를 찾고
            등록, 검수, 발송 작업까지 이어서 처리할 수 있습니다.
          </p>

          <form action="/cards" className="mt-6 rounded-[1.75rem] bg-slate-50 p-5">
            <div className="grid gap-3">
              <SearchAutocomplete
                placeholder="이름, 기관, 행사, 이메일, 전화로 검색"
                inputClassName="w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-sm text-slate-950 outline-none ring-0 placeholder:text-slate-500"
                resultHintClassName="mt-2 text-xs text-slate-500"
              />
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <select
                  name="category"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-4 text-sm font-medium text-slate-900"
                >
                  <option value="all">전체 카테고리</option>
                  {facets.categories.slice(0, 20).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select
                  name="cooperation"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-4 text-sm font-medium text-slate-900"
                >
                  <option value="all">전체 협력도</option>
                  {(facets.cooperationLevels ?? []).slice(0, 20).map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-2xl bg-cyan-600 px-5 py-4 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700"
                >
                  검색
                </button>
              </div>
            </div>
          </form>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50/40"
              >
                <div className="text-base font-semibold text-slate-950">{action.title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{action.description}</div>
              </Link>
            ))}
          </div>
        </article>

        <article className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`rounded-3xl border p-5 shadow-sm ${
                  stat.tone === "amber"
                    ? "border-amber-200 bg-amber-50"
                    : stat.tone === "rose"
                      ? "border-rose-200 bg-rose-50"
                      : "border-slate-200 bg-white"
                }`}
              >
                <p className="text-sm text-slate-600">{stat.label}</p>
                <p className="mt-3 text-4xl font-semibold text-slate-950">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <h2 className="text-lg font-semibold">오늘 먼저 볼 항목</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {helpfulLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-2xl bg-white/10 px-4 py-4 transition hover:bg-white/15"
                >
                  <div className="text-sm font-medium text-white">{item.label}</div>
                  <div className="mt-1 text-2xl font-semibold text-cyan-200">{item.count}건</div>
                </Link>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                최근 연락처
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                최근 수정된 연락처를 바로 열어 담당자, 태그, 행사, 협력도까지 이어서 정리할 수 있습니다.
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
            {insights.recentContacts.map((contact) => (
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
                      담당자 {contact.ownerStaff || "미지정"} ·{" "}
                      {contact.city || "도시 미상"}
                    </p>
                    {contact.cooperationLevel ? (
                      <p className="mt-2 text-sm font-medium text-rose-700">
                        문화원 협력 {contact.cooperationLevel}
                      </p>
                    ) : null}
                  </div>
                  {contact.isInfluencer ? (
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                      인플루언서
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {contact.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">운영 체크포인트</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            누락되기 쉬운 작업을 바로 처리할 수 있도록 정리했습니다.
          </p>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              검수 대기 명함 {pendingCards.length}건
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              담당자 미지정 연락처 {insights.totals.noOwner}건
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              카테고리 미지정 연락처 {insights.totals.noCategory}건
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              중복 후보 {duplicates.length}쌍
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-cyan-50 p-4 text-sm leading-6 text-cyan-950">
            검색 결과는 연락처 화면에서 그대로 CSV 다운로드 또는 이메일 첨부 전송으로 넘길 수 있습니다.
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">최근 행사</h2>
          <div className="mt-5 space-y-3">
            {events.slice(0, 6).map((event) => (
              <Link
                key={event.id}
                href="/events"
                className="block rounded-2xl bg-slate-50 px-4 py-3 text-sm transition hover:bg-slate-100"
              >
                <div className="font-medium text-slate-900">{event.name}</div>
                <div className="mt-1 text-slate-600">
                  {event.eventDate || "날짜 미정"} · 참가자 {event.attendeeCount}명 · 참석 완료{" "}
                  {event.attendedCount}명
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            행사별 초청/참석 현황은 행사 화면에서 바로 수정할 수 있습니다.
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">주요 분류와 검수 대기</h2>
          <div className="mt-5 space-y-3">
            {insights.topCategories.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"
              >
                <span className="text-slate-700">{item.label}</span>
                <strong className="text-slate-950">{item.count}</strong>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-3xl bg-slate-50 p-5">
            <h3 className="text-sm font-semibold text-slate-900">자주 쓰는 축</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>카테고리: {facets.categories.slice(0, 8).join(", ") || "-"}</p>
              <p>담당자: {facets.owners.slice(0, 8).join(", ") || "-"}</p>
              <p>태그: {facets.tags.slice(0, 10).join(", ") || "우선초청, 핵심협력, 언론, 행사초청"}</p>
            </div>
          </div>

          <h3 className="mt-8 text-lg font-semibold text-slate-950">최근 검수 대기 명함</h3>
          <div className="mt-4 space-y-3">
            {pendingCards.slice(0, 4).map((card) => (
              <Link
                key={card.id}
                href="/review"
                className="block rounded-2xl bg-slate-50 px-4 py-3 text-sm transition hover:bg-slate-100"
              >
                <div className="font-medium text-slate-900">
                  {card.contactName || "미연결 명함"}
                </div>
                <div className="mt-1 text-slate-600">
                  상태 {card.reviewStatus} ·{" "}
                  {new Date(card.createdAt).toLocaleDateString("ko-KR")}
                </div>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
