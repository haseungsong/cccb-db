import Image from "next/image";
import Link from "next/link";
import { mergeContactsAction, updateBusinessCardReviewAction } from "@/app/actions";
import { getDuplicateCandidates, getPendingBusinessCardReviews } from "@/lib/contacts/queries";

function normalizeReviewText(value: string) {
  return value.trim().toLowerCase();
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.q?.trim() ?? "";
  const [duplicates, pendingCards] = await Promise.all([
    getDuplicateCandidates(),
    getPendingBusinessCardReviews(),
  ]);
  const normalizedQuery = normalizeReviewText(query);
  const filteredPendingCards = !normalizedQuery
    ? pendingCards
    : pendingCards.filter((card) =>
        [
          card.contactName,
          card.uploadedByLabel,
          card.uploadBatchLabel,
          card.uploadBatchKey,
          card.sourceFileName,
          card.rawText,
          ...card.extractedEntries.flatMap((entry) => [entry.key, entry.value]),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-950">검수 큐</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          OCR 검수 대기와 중복 후보를 함께 보는 화면입니다. 명함 상태를 바꾸고,
          명확한 중복은 바로 병합할 수 있습니다.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">
              업로드 이력 찾기
            </span>
            <input
              name="q"
              defaultValue={query}
              placeholder="업로더, 묶음 이름, 원본 파일명, OCR 내용으로 검색"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            검수 카드 찾기
          </button>
        </form>
        <p className="mt-3 text-sm text-slate-600">
          현재 {filteredPendingCards.length}장의 카드가 표시됩니다. 업로더, 업로드 묶음,
          원본 파일명으로도 다시 찾을 수 있습니다.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">명함 검수 대기</h2>
          <div className="mt-5 space-y-4">
            {filteredPendingCards.map((card) => (
              <div key={card.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {card.contactName || "미연결 명함"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      상태 {card.reviewStatus} ·{" "}
                      {new Date(card.createdAt).toLocaleString("ko-KR")}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {card.uploadedByLabel ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                          업로더 {card.uploadedByLabel}
                        </span>
                      ) : null}
                      {card.uploadBatchLabel ? (
                        <span className="rounded-full bg-cyan-50 px-3 py-1 font-medium text-cyan-900">
                          묶음 {card.uploadBatchLabel}
                        </span>
                      ) : null}
                    </div>
                    {card.sourceFileName ? (
                      <div className="mt-2 text-xs text-slate-500">
                        원본 파일명 {card.sourceFileName}
                      </div>
                    ) : null}
                  </div>
                  {card.contactId ? (
                    <Link
                      href={`/cards/${card.contactId}`}
                      className="text-sm font-semibold text-cyan-700"
                    >
                      연락처 보기
                    </Link>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[120px_1fr]">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    {card.previewUrl ? (
                      <Image
                        src={card.previewUrl}
                        alt={card.sourceFileName || card.contactName || "명함 미리보기"}
                        width={240}
                        height={112}
                        unoptimized
                        className="h-28 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-28 items-center justify-center text-xs text-slate-500">
                        미리보기 없음
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">
                      업로드 키 {card.uploadBatchKey || "-"}
                    </div>
                    {card.originalUrl ? (
                      <a
                        href={card.originalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm font-semibold text-cyan-700"
                      >
                        원본 이미지 열기
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 grid gap-2">
                  {card.extractedEntries.slice(0, 6).map((entry) => (
                    <div
                      key={`${card.id}-${entry.key}`}
                      className="rounded-2xl bg-slate-50 px-4 py-3 text-sm"
                    >
                      <div className="font-medium text-slate-500">{entry.key}</div>
                      <div className="mt-1 text-slate-900">{entry.value}</div>
                    </div>
                  ))}
                </div>
                <form action={updateBusinessCardReviewAction} className="mt-4 flex flex-wrap gap-3">
                  <input type="hidden" name="cardId" value={card.id} />
                  <input type="hidden" name="redirectTo" value="/review" />
                  <button
                    type="submit"
                    name="reviewStatus"
                    value="approved"
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    승인
                  </button>
                  <button
                    type="submit"
                    name="reviewStatus"
                    value="needs-review"
                    className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    추가 검토
                  </button>
                  <button
                    type="submit"
                    name="reviewStatus"
                    value="rejected"
                    className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    반려
                  </button>
                </form>
              </div>
            ))}
            {filteredPendingCards.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                검수 대기 중인 명함이 없습니다.
              </div>
            ) : null}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">중복 후보</h2>
          <div className="mt-5 space-y-4">
            {duplicates.map((duplicate) => (
              <div key={duplicate.pairKey} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {duplicate.reason}
                  </span>
                  <span className="text-xs text-slate-500">점수 {duplicate.score}</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {[duplicate.primary, duplicate.secondary].map((contact, index) => (
                    <div key={contact.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                      <div className="font-semibold text-slate-900">
                        {index === 0 ? "유지 후보" : "병합 후보"}: {contact.name}
                      </div>
                      <div className="mt-2 text-slate-600">
                        {contact.company || "기관 미상"} · {contact.email || "-"} ·{" "}
                        {contact.phone || "-"}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        원본 행 {contact.legacyRowCount}건 · 명함 {contact.businessCardCount}건
                      </div>
                      <Link
                        href={`/cards/${contact.id}`}
                        className="mt-3 inline-block text-xs font-semibold text-cyan-700"
                      >
                        상세 보기
                      </Link>
                    </div>
                  ))}
                </div>
                <form action={mergeContactsAction} className="mt-4">
                  <input type="hidden" name="primaryId" value={duplicate.primary.id} />
                  <input type="hidden" name="secondaryId" value={duplicate.secondary.id} />
                  <input type="hidden" name="redirectTo" value="/cards/:id" />
                  <button
                    type="submit"
                    className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
                  >
                    두 연락처 병합
                  </button>
                </form>
              </div>
            ))}
            {duplicates.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                현재 감지된 중복 후보가 없습니다.
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
