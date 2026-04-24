import Link from "next/link";
import { getDashboardInsights, getDuplicateCandidates, getEventsOverview, getPendingBusinessCardReviews } from "@/lib/contacts/queries";
import { getAudienceLists, getOutreachCampaigns, getUpcomingFollowups } from "@/lib/ops/queries";

export default async function InsightsPage() {
  const [insights, duplicates, events, pendingCards, audienceLists, campaigns, upcomingFollowups] = await Promise.all([
    getDashboardInsights(),
    getDuplicateCandidates(),
    getEventsOverview(),
    getPendingBusinessCardReviews(),
    getAudienceLists(),
    getOutreachCampaigns(),
    getUpcomingFollowups(8),
  ]);

  const cards = [
    ["전체 연락처", insights.totals.contacts],
    ["행사", insights.totals.events],
    ["태그", insights.totals.tags],
    ["인플루언서", insights.totals.influencers],
    ["언론", insights.totals.media],
    ["검수 대기 명함", pendingCards.length],
    ["중복 후보", duplicates.length],
    ["담당자 미지정", insights.totals.noOwner],
    ["저장된 대상 리스트", audienceLists.length],
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-950">인사이트 대시보드</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          현재 연락처 데이터가 어떤 구성을 가지고 있는지 빠르게 볼 수 있는 운영
          요약 화면입니다.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
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
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">상위 담당자</h2>
          <div className="mt-5 space-y-3">
            {insights.topOwners.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"
              >
                <span className="text-slate-700">{item.label}</span>
                <strong className="text-slate-950">{item.count}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">상위 태그</h2>
          <div className="mt-5 space-y-3">
            {insights.topTags.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"
              >
                <span className="text-slate-700">#{item.label}</span>
                <strong className="text-slate-950">{item.count}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">원본 시트 분포</h2>
          <div className="mt-5 space-y-3">
            {insights.topSources.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"
              >
                <span className="text-slate-700">{item.label}</span>
                <strong className="text-slate-950">{item.count}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">최근 행사</h2>
          <div className="mt-5 space-y-3">
            {events.slice(0, 8).map((event) => (
              <Link
                key={event.id}
                href="/events"
                className="block rounded-2xl bg-slate-50 px-4 py-3 text-sm transition hover:bg-slate-100"
              >
                <div className="font-medium text-slate-900">{event.name}</div>
                <div className="mt-1 text-slate-600">
                  참가자 {event.attendeeCount}명 · 참석 완료 {event.attendedCount}명
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">우선 확인 필요</h2>
          <div className="mt-5 space-y-3">
            <Link
              href="/review"
              className="block rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              검수 대기 명함 {pendingCards.length}건
            </Link>
            <Link
              href="/review"
              className="block rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              중복 후보 {duplicates.length}쌍
            </Link>
            <Link
              href="/cards?status=active&owner=all"
              className="block rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              담당자 미지정 연락처 {insights.totals.noOwner}건
            </Link>
            <Link
              href="/cards"
              className="block rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              카테고리 미지정 연락처 {insights.totals.noCategory}건
            </Link>
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">최근 발송 이력</h2>
          <div className="mt-5 space-y-3">
            {campaigns.slice(0, 6).map((campaign) => (
              <Link
                key={campaign.id}
                href="/broadcasts"
                className="block rounded-2xl bg-slate-50 px-4 py-3 text-sm transition hover:bg-slate-100"
              >
                <div className="font-medium text-slate-900">{campaign.title}</div>
                <div className="mt-1 text-slate-600">
                  {campaign.channel} · {campaign.status} · 대상 {campaign.recipientCount}명
                </div>
              </Link>
            ))}
            {campaigns.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                최근 발송 이력이 없습니다.
              </div>
            ) : null}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">다가오는 팔로업</h2>
          <div className="mt-5 space-y-3">
            {upcomingFollowups.map((followup) => (
              <Link
                key={followup.id}
                href={followup.contactId ? `/cards/${followup.contactId}` : "/broadcasts"}
                className="block rounded-2xl bg-slate-50 px-4 py-3 text-sm transition hover:bg-slate-100"
              >
                <div className="font-medium text-slate-900">{followup.summary}</div>
                <div className="mt-1 text-slate-600">
                  {followup.channel} ·{" "}
                  {followup.nextFollowUpAt
                    ? new Date(followup.nextFollowUpAt).toLocaleString("ko-KR")
                    : "일정 미정"}
                </div>
              </Link>
            ))}
            {upcomingFollowups.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                예정된 팔로업이 없습니다.
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
