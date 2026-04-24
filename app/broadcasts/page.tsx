import Link from "next/link";
import {
  createWhatsAppTestAction,
  saveAudienceListAction,
  sendBroadcastEmailAction,
} from "@/app/actions";
import { buildContactSearchParams, normalizeContactSearchFilters } from "@/lib/contacts/search";
import { resolveAudienceContacts } from "@/lib/ops/queries";
import {
  getAudienceList,
  getAudienceLists,
  getOutreachCampaigns,
  getUpcomingFollowups,
} from "@/lib/ops/queries";

export default async function BroadcastsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    listId?: string;
    q?: string;
    category?: string;
    owner?: string;
    event?: string;
    source?: string;
    tag?: string;
    influencer?: string;
    media?: string;
    hasCard?: string;
    hasPhoto?: string;
    status?: string;
    cooperation?: string;
    broadcastStatus?: string;
    emailedTo?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const selectedList = params.listId ? await getAudienceList(params.listId) : null;
  const filters = selectedList?.filters ?? normalizeContactSearchFilters(params);
  const [contacts, audienceLists, campaigns, upcomingFollowups] = await Promise.all([
    resolveAudienceContacts(filters),
    getAudienceLists(),
    getOutreachCampaigns(),
    getUpcomingFollowups(8),
  ]);
  const exportHref = `/api/export/contacts?${buildContactSearchParams(filters).toString()}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-950">대량 발송 센터</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          저장된 대상 리스트, 대표 메일 발송, CSV 공유, 향후 WhatsApp 테스트 준비를 한 곳에서 관리합니다.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">현재 대상</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {selectedList
                  ? `선택한 리스트: ${selectedList.name}`
                  : "현재 필터 기준의 대상자입니다."}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800">
              {contacts.length}명
            </span>
          </div>

          {params.broadcastStatus === "sent" ? (
            <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              대표 메일로 CSV 첨부 발송을 완료했습니다. 수신: {params.emailedTo || "-"}
            </div>
          ) : null}
          {params.broadcastStatus === "missing-recipient" ? (
            <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">
              대표 메일 주소를 입력해 주세요.
            </div>
          ) : null}
          {params.broadcastStatus === "smtp-missing" ? (
            <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              SMTP 환경변수가 아직 없어 메일 발송은 할 수 없습니다. CSV 다운로드는 가능합니다.
            </div>
          ) : null}
          {params.broadcastStatus === "whatsapp-prepared" ? (
            <div className="mt-5 rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
              WhatsApp 테스트 준비 항목을 저장했습니다. 실제 연동은 다음 단계에서 붙이면 됩니다.
            </div>
          ) : null}
          {params.broadcastStatus === "list-saved" ? (
            <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              대상 리스트를 저장했습니다.
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              ["검색어", filters.query],
              ["카테고리", filters.category !== "all" ? filters.category : ""],
              ["행사", filters.event !== "all" ? filters.event : ""],
              ["태그", filters.tag !== "all" ? filters.tag : ""],
              ["협력 수위", filters.cooperation !== "all" ? filters.cooperation : ""],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <span
                  key={`${label}-${value}`}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  {label} {value}
                </span>
              ))}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <form action={saveAudienceListAction} className="rounded-3xl bg-slate-50 p-5">
              <h3 className="text-base font-semibold text-slate-950">현재 대상을 저장된 리스트로 만들기</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                예: 우호적 + 언론 + 최근 미초청 같은 조건을 반복해서 쓸 수 있게 저장합니다.
              </p>
              {Object.entries(filters).map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value ?? ""} />
              ))}
              <div className="mt-4 space-y-3">
                <input
                  name="listName"
                  placeholder="리스트 이름"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                />
                <textarea
                  name="description"
                  rows={3}
                  placeholder="설명"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                >
                  대상 리스트 저장
                </button>
              </div>
            </form>

            <div className="rounded-3xl bg-slate-50 p-5">
              <h3 className="text-base font-semibold text-slate-950">CSV / 대표 메일 / WhatsApp 테스트</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                우선은 대표 메일 중심으로 보내고, WhatsApp은 테스트 준비 기록부터 남깁니다.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={exportHref}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                >
                  CSV 다운로드
                </a>
                <Link
                  href={`/cards?${buildContactSearchParams(filters).toString()}`}
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800"
                >
                  연락처 목록 보기
                </Link>
              </div>
            </div>
          </div>

          <form action={sendBroadcastEmailAction} className="mt-6 rounded-3xl border border-slate-200 p-5">
            <h3 className="text-base font-semibold text-slate-950">대표 메일 발송</h3>
            {selectedList ? <input type="hidden" name="audienceListId" value={selectedList.id} /> : null}
            {Object.entries(filters).map(([key, value]) => (
              <input key={`email-${key}`} type="hidden" name={key} value={value ?? ""} />
            ))}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                name="title"
                defaultValue={
                  selectedList ? `${selectedList.name} 대표 메일 발송` : "CCCB 대표 메일 발송"
                }
                placeholder="발송 제목"
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
              />
              <input
                name="recipient"
                type="email"
                placeholder="대표 메일 주소"
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
              />
            </div>
            <textarea
              name="notes"
              rows={3}
              placeholder="발송 메모"
              className="mt-3 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
            />
            <button
              type="submit"
              className="mt-4 rounded-full bg-cyan-700 px-5 py-3 text-sm font-semibold text-white"
            >
              대표 메일로 CSV 첨부 발송
            </button>
          </form>

          <form action={createWhatsAppTestAction} className="mt-4 rounded-3xl border border-slate-200 p-5">
            <h3 className="text-base font-semibold text-slate-950">WhatsApp 테스트 준비</h3>
            {selectedList ? <input type="hidden" name="audienceListId" value={selectedList.id} /> : null}
            {Object.entries(filters).map(([key, value]) => (
              <input key={`wa-${key}`} type="hidden" name={key} value={value ?? ""} />
            ))}
            <p className="mt-2 text-sm leading-6 text-slate-600">
              실제 WhatsApp 연동은 다음 단계에서 붙이고, 지금은 어떤 대상에 어떤 메시지를 보낼지 테스트 준비 이력을 남깁니다.
            </p>
            <input
              name="title"
              defaultValue={selectedList ? `${selectedList.name} WhatsApp 테스트` : "WhatsApp 테스트 준비"}
              className="mt-4 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
            />
            <textarea
              name="notes"
              rows={3}
              placeholder="테스트 메모"
              className="mt-3 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
            />
            <button
              type="submit"
              className="mt-4 rounded-full border border-cyan-300 bg-cyan-50 px-5 py-3 text-sm font-semibold text-cyan-900"
            >
              WhatsApp 테스트 준비 저장
            </button>
          </form>
        </article>

        <article className="grid gap-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">저장된 대상 리스트</h2>
            <div className="mt-5 space-y-3">
              {audienceLists.map((list) => (
                <div key={list.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-950">{list.name}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        {list.description || list.filterSummary}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {list.resultCount}명 · {new Date(list.createdAt).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/broadcasts?listId=${list.id}`}
                        className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800"
                      >
                        발송 대상 열기
                      </Link>
                      <Link
                        href={`/cards?${buildContactSearchParams(list.filters).toString()}`}
                        className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-900"
                      >
                        연락처 보기
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              {audienceLists.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  아직 저장된 대상 리스트가 없습니다.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">최근 발송/테스트 이력</h2>
            <div className="mt-5 space-y-3">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                  <div className="font-semibold text-slate-950">{campaign.title}</div>
                  <div className="mt-1 text-slate-600">
                    채널 {campaign.channel} · 상태 {campaign.status} · 대상 {campaign.recipientCount}명
                  </div>
                  {campaign.recipientEmail ? (
                    <div className="mt-1 text-slate-500">수신 {campaign.recipientEmail}</div>
                  ) : null}
                  {campaign.notes ? (
                    <div className="mt-1 text-slate-500">{campaign.notes}</div>
                  ) : null}
                </div>
              ))}
              {campaigns.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  아직 발송/테스트 이력이 없습니다.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">다가오는 팔로업</h2>
            <div className="mt-5 space-y-3">
              {upcomingFollowups.map((followup) => (
                <div key={followup.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                  <div className="font-semibold text-slate-950">{followup.summary}</div>
                  <div className="mt-1 text-slate-600">
                    {followup.channel} · {followup.status}
                    {followup.ownerLabel ? ` · ${followup.ownerLabel}` : ""}
                  </div>
                  <div className="mt-1 text-slate-500">
                    다음 일정{" "}
                    {followup.nextFollowUpAt
                      ? new Date(followup.nextFollowUpAt).toLocaleString("ko-KR")
                      : "-"}
                  </div>
                </div>
              ))}
              {upcomingFollowups.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  잡혀 있는 다음 팔로업 일정이 없습니다.
                </div>
              ) : null}
            </div>
          </section>
        </article>
      </section>
    </main>
  );
}
