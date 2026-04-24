import Link from "next/link";
import { SearchAutocomplete } from "@/app/_components/search-autocomplete";
import { sendContactExportEmailAction } from "@/app/actions";
import { getSearchableContacts, getSearchFacets } from "@/lib/contacts/queries";
import { buildContactSearchParams, normalizeContactSearchFilters } from "@/lib/contacts/search";

type SelectFilterConfig = {
  name: "category" | "owner" | "event" | "source" | "tag" | "status" | "cooperation";
  label: string;
  options: string[];
};

export default async function CardsPage({
  searchParams,
}: {
  searchParams?: Promise<{
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
    exportStatus?: string;
    emailedTo?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const filters = normalizeContactSearchFilters(params);
  const [contacts, facets] = await Promise.all([
    getSearchableContacts(filters),
    getSearchFacets(),
  ]);
  const exportParams = buildContactSearchParams(filters);
  const exportHref = `/api/export/contacts?${exportParams.toString()}`;
  const selectFilters: SelectFilterConfig[] = [
    { name: "category", label: "카테고리", options: ["all", ...facets.categories] },
    { name: "owner", label: "담당자", options: ["all", ...facets.owners] },
    { name: "event", label: "행사", options: ["all", ...facets.events] },
    { name: "source", label: "원본 시트", options: ["all", ...facets.sources] },
    { name: "tag", label: "태그", options: ["all", ...facets.tags] },
    { name: "status", label: "상태", options: ["all", ...facets.statuses] },
    {
      name: "cooperation",
      label: "협력 수위",
      options: ["all", ...(facets.cooperationLevels ?? [])],
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-950">
          통합 연락처 목록
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          정제된 연락처 정보와 원본 엑셀에서 온 시트 정보까지 함께 검색합니다.
          부정확할 수 있는 값도 버리지 않고 최대한 살려서 확인할 수 있게
          구성했습니다.
        </p>

        <form className="mt-6 grid gap-3 lg:grid-cols-3">
          <SearchAutocomplete
            defaultValue={filters.query}
            placeholder="이름, 기관, 이메일, 전화, 행사명, 원본 시트 텍스트까지 검색"
            panelClassName="lg:col-span-3"
            inputClassName="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-500"
            resultHintClassName="mt-2 text-xs text-slate-500"
          />
          {selectFilters.map(({ name, label, options }) => (
            <label key={name} className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">{label}</span>
              <select
                name={name}
                defaultValue={String(filters[name as keyof typeof filters] ?? "all")}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900"
              >
                {(options as string[]).map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "전체" : option}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {[
            ["influencer", "인플루언서"],
            ["media", "언론"],
            ["hasCard", "명함 있음"],
            ["hasPhoto", "사진 있음"],
          ].map(([name, label]) => (
            <label key={name} className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">{label}</span>
              <select
                name={name}
                defaultValue={String(filters[name as keyof typeof filters] ?? "all")}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900"
              >
                <option value="all">전체</option>
                <option value="yes">예</option>
                <option value="no">아니오</option>
              </select>
            </label>
          ))}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <button
              type="submit"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm"
            >
              필터 적용
            </button>
            <Link
              href="/cards"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800"
            >
              초기화
            </Link>
            <Link
              href="/cards/new"
              className="rounded-full border border-cyan-300 bg-cyan-100 px-5 py-3 text-sm font-semibold text-cyan-900"
            >
              연락처 추가
            </Link>
          </div>
        </form>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">검색 결과 내보내기</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  현재 필터 상태 그대로 CSV로 저장하거나 메일로 첨부 전송할 수 있습니다.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800">
                결과 {contacts.length}건
              </span>
            </div>

            {params.exportStatus === "sent" ? (
              <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                CSV 첨부 메일을 {params.emailedTo || "지정한 주소"}로 전송했습니다.
              </div>
            ) : null}
            {params.exportStatus === "smtp-missing" ? (
              <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                이메일 발송용 SMTP 환경변수가 아직 없습니다. CSV 다운로드는 바로 사용할 수 있습니다.
              </div>
            ) : null}
            {params.exportStatus === "missing-recipient" ? (
              <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">
                메일 수신 주소를 입력해 주세요.
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={exportHref}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm"
              >
                CSV 다운로드
              </a>
              <Link
                href={`/broadcasts?${exportParams.toString()}`}
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800"
              >
                발송 센터로 이동
              </Link>
            </div>

            <form action={sendContactExportEmailAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <input type="hidden" name="q" value={filters.query ?? ""} />
              <input type="hidden" name="category" value={filters.category ?? "all"} />
              <input type="hidden" name="owner" value={filters.owner ?? "all"} />
              <input type="hidden" name="event" value={filters.event ?? "all"} />
              <input type="hidden" name="source" value={filters.source ?? "all"} />
              <input type="hidden" name="tag" value={filters.tag ?? "all"} />
              <input type="hidden" name="influencer" value={filters.influencer ?? "all"} />
              <input type="hidden" name="media" value={filters.media ?? "all"} />
              <input type="hidden" name="hasCard" value={filters.hasCard ?? "all"} />
              <input type="hidden" name="hasPhoto" value={filters.hasPhoto ?? "all"} />
              <input type="hidden" name="status" value={filters.status ?? "all"} />
              <input type="hidden" name="cooperation" value={filters.cooperation ?? "all"} />
              <input
                type="email"
                name="recipient"
                placeholder="example@domain.com"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800"
              />
              <button
                type="submit"
                className="rounded-full border border-cyan-300 bg-cyan-100 px-5 py-3 text-sm font-semibold text-cyan-900"
              >
                이메일로 첨부 전송
              </button>
            </form>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">카테고리 예시</p>
              <p className="mt-2 leading-6 text-slate-600">
                {facets.categories.slice(0, 10).join(", ") || "-"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">담당자 예시</p>
              <p className="mt-2 leading-6 text-slate-600">
                {facets.owners.slice(0, 10).join(", ") || "-"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">태그 예시</p>
              <p className="mt-2 leading-6 text-slate-600">
                {facets.tags.slice(0, 10).join(", ") || "-"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {contacts.map((contact) => (
          <Link
            key={contact.id}
            href={`/cards/${contact.id}`}
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md sm:p-5"
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-slate-200 text-sm font-semibold text-slate-600">
                  사진 없음
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    {contact.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {contact.company || "기관 미상"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {contact.city || "도시 미상"} · 담당자{" "}
                    {contact.ownerStaff || "미지정"}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 flex-wrap gap-2 md:justify-end">
                {contact.category ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {contact.category}
                  </span>
                ) : null}
                {contact.isInfluencer ? (
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                    인플루언서
                  </span>
                ) : null}
                {contact.isMedia ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    언론
                  </span>
                ) : null}
                {contact.events.map((event) => (
                  <span
                    key={event}
                    className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700"
                  >
                    {event}
                  </span>
                ))}
                {contact.sourceSheets.map((sheet) => (
                  <span
                    key={sheet}
                    className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                  >
                    {sheet}
                  </span>
                ))}
                {contact.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700"
                  >
                    #{tag}
                  </span>
                ))}
                {contact.cooperationLevel ? (
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                    협력 {contact.cooperationLevel}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
              {contact.email ? <span>이메일 {contact.email}</span> : null}
              {contact.phone ? <span>전화 {contact.phone}</span> : null}
              <span>상태 {contact.contactStatus}</span>
              <span>원본 행 {contact.legacyRowCount}건</span>
              <span>명함 {contact.businessCardCount}건</span>
              <span>사진 {contact.profileImageCount}건</span>
            </div>
          </Link>
        ))}

        {contacts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            검색 결과가 없습니다.
          </div>
        ) : null}
      </section>
    </main>
  );
}
