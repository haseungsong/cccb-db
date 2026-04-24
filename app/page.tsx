import Link from "next/link";
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
    { label: "전체 연락처", value: insights.totals.contacts },
    { label: "행사", value: insights.totals.events },
    { label: "검수 대기 명함", value: insights.totals.pendingCards },
    { label: "중복 후보", value: duplicates.length },
  ];
  const quickActions = [
    {
      title: "새 연락처 등록",
      description: "직접 추가하거나 OCR 이전에 먼저 기본 프로필을 만들어 둘 때",
      href: "/cards/new",
      accent: "bg-cyan-500 text-white",
    },
    {
      title: "OCR 명함 업로드",
      description: "휴대폰으로 찍은 명함을 구조화하고 기존 연락처와 연결할 때",
      href: "/upload",
      accent: "bg-white text-slate-900 border border-slate-200",
    },
    {
      title: "행사 운영",
      description: "행사 생성, 초청/참석 기록, 참가자 관리까지 이어서 처리할 때",
      href: "/events",
      accent: "bg-white text-slate-900 border border-slate-200",
    },
    {
      title: "검수 큐",
      description: "중복 후보와 OCR 검수 대기를 먼저 정리해야 할 때",
      href: "/review",
      accent: "bg-white text-slate-900 border border-slate-200",
    },
  ];
  const tutorialSteps = [
    "홈에서 오늘 처리할 항목을 보고 먼저 `검수 대기`, `담당자 미지정`, `중복 후보`를 확인합니다.",
    "`수동 등록` 또는 `OCR 업로드`로 새 연락처를 추가합니다. OCR은 자동 저장 후 상세 화면에서 바로 보정할 수 있습니다.",
    "`연락처` 화면에서 이름, 기관, 행사, 원본 시트, 태그, 상태, 명함/사진 유무까지 조건을 걸어 필요한 사람만 추립니다.",
    "필요한 연락처를 열어 `태그`, `행사 연결`, `담당자`, `카테고리`, `상태`를 업데이트합니다.",
    "`행사` 화면에서 초청 상태와 참석 상태를 관리하고 행사별 참가자 현황을 확인합니다.",
    "현재 필터된 결과를 `CSV 다운로드`하거나 메일로 첨부 전송해서 외부 공유나 보고에 사용합니다.",
  ];
  const screenGuide = [
    {
      title: "연락처",
      description: "가장 자주 쓰는 화면입니다. 상세 검색, 필터, CSV/메일 내보내기를 담당합니다.",
      href: "/cards",
    },
    {
      title: "행사",
      description: "행사 단위로 사람을 묶고 초청/참석 흐름을 관리하는 곳입니다.",
      href: "/events",
    },
    {
      title: "검수",
      description: "OCR 품질 확인과 중복 병합을 처리하는 정리 구간입니다.",
      href: "/review",
    },
    {
      title: "인사이트",
      description: "현재 DB 구성과 운영상 빈틈을 요약해서 보는 대시보드입니다.",
      href: "/insights",
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
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl">
        <div className="grid gap-8 px-8 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-12">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
                CCCB Contact Hub
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight lg:text-5xl">
                처음 쓰는 사람도 바로 이해하는 문화원 연락처 운영 홈
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300">
                연락처 수집, OCR, 행사 운영, 중복 검수, 내보내기까지 끊기지 않게
                연결된 시작 화면입니다. 아래 순서대로만 쓰면 처음 보는 사람도
                주요 기능을 모두 활용할 수 있습니다.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className={`rounded-3xl px-5 py-5 transition hover:-translate-y-0.5 ${action.accent}`}
                >
                  <div className="text-base font-semibold">{action.title}</div>
                  <div className="mt-2 text-sm leading-6 opacity-90">
                    {action.description}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {stats.map((stat) => (
              <article
                key={stat.label}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur"
              >
                <p className="text-sm text-slate-300">{stat.label}</p>
                <p className="mt-3 text-4xl font-semibold text-white">{stat.value}</p>
              </article>
            ))}
            <article className="sm:col-span-2 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
              <p className="text-sm font-semibold text-cyan-200">오늘 먼저 볼 것</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {helpfulLinks.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-2xl bg-white/10 px-4 py-3 text-sm transition hover:bg-white/15"
                  >
                    <div className="font-medium text-white">{item.label}</div>
                    <div className="mt-1 text-cyan-100">{item.count}건</div>
                  </Link>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                처음 사용자용 100% 활용 가이드
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                아래 순서대로 따라가면 핵심 기능을 놓치지 않고 모두 사용할 수 있습니다.
              </p>
            </div>
            <Link
              href="/cards"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              바로 시작
            </Link>
          </div>

          <ol className="mt-6 grid gap-3">
            {tutorialSteps.map((step, index) => (
              <li
                key={step}
                className="flex gap-4 rounded-3xl bg-slate-50 px-4 py-4 text-sm text-slate-700"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span className="leading-6">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-3xl bg-cyan-50 p-5 text-sm leading-6 text-cyan-950">
            검색 후 `연락처` 화면 상단에서 현재 조건 그대로 `CSV 다운로드` 또는
            `이메일 첨부 전송`이 가능합니다. 보고용 목록을 만드는 가장 빠른 방법입니다.
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">화면별 사용법</h2>
          <div className="mt-5 grid gap-3">
            {screenGuide.map((screen) => (
              <Link
                key={screen.title}
                href={screen.href}
                className="rounded-3xl border border-slate-200 p-4 transition hover:border-cyan-300 hover:bg-cyan-50/40"
              >
                <div className="text-base font-semibold text-slate-950">{screen.title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">
                  {screen.description}
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 rounded-3xl bg-slate-50 p-5">
            <h3 className="text-sm font-semibold text-slate-900">현재 많이 쓰이는 데이터 축</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>카테고리: {facets.categories.slice(0, 8).join(", ") || "-"}</p>
              <p>담당자: {facets.owners.slice(0, 8).join(", ") || "-"}</p>
              <p>태그: {facets.tags.slice(0, 8).join(", ") || "-"}</p>
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
                최근 업데이트된 연락처를 바로 확인하고 상세 화면에서 행사,
                원본 엑셀 행, OCR 데이터, 태그를 함께 볼 수 있습니다.
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
            지금 바로 손봐야 할 항목을 홈에서 확인할 수 있게 정리했습니다.
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

          <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            이제는 단순 수집 단계가 아니라 운영 단계입니다. 새 연락처는 수동
            등록 또는 OCR로 받고, 행사 연결과 태그, 검수 큐를 함께 관리하는
            흐름으로 쓰시면 됩니다.
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">최근 행사와 공유 흐름</h2>
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

          <div className="mt-6 rounded-3xl bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            행사 운영 후에는 `연락처` 화면에서 행사명으로 필터를 걸고, 해당 결과를
            CSV 또는 메일 첨부로 바로 공유하면 됩니다.
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">상위 카테고리</h2>
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
