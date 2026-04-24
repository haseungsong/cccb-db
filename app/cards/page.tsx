import Link from "next/link";
import { getSearchableContacts, getSearchFacets } from "@/lib/contacts/queries";

export default async function CardsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.q?.trim() ?? "";
  const [contacts, facets] = await Promise.all([
    getSearchableContacts(query),
    getSearchFacets(),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-950">
          통합 연락처 목록
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          정제된 연락처 정보와 원본 엑셀에서 온 시트 정보까지 함께 검색합니다.
          부정확할 수 있는 값도 버리지 않고 최대한 살려서 확인할 수 있게
          구성했습니다.
        </p>

        <form className="mt-6">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="이름, 기관, 이메일, 전화, 행사명, 원본 시트 텍스트까지 검색"
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-800 outline-none ring-0"
          />
        </form>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
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
            <p className="font-semibold text-slate-900">원본 시트 예시</p>
            <p className="mt-2 leading-6 text-slate-600">
              {facets.sources.slice(0, 6).join(", ") || "-"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {contacts.map((contact) => (
          <Link
            key={contact.id}
            href={`/cards/${contact.id}`}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
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
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
              {contact.email ? <span>이메일 {contact.email}</span> : null}
              {contact.phone ? <span>전화 {contact.phone}</span> : null}
              <span>원본 행 {contact.legacyRowCount}건</span>
              <span>명함 {contact.businessCardCount}건</span>
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
