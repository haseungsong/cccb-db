import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addContactToEventAction,
  completeContactFollowupAction,
  createContactFollowupAction,
  removeContactEventAction,
} from "@/app/actions";
import { ContactForm } from "@/app/cards/_components/contact-form";
import { getContactDetail, getContactFormOptions } from "@/lib/contacts/queries";
import { getContactActivity, getContactFollowups } from "@/lib/ops/queries";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contact, options, followups, activity] = await Promise.all([
    getContactDetail(id),
    getContactFormOptions(),
    getContactFollowups(id),
    getContactActivity(id),
  ]);

  if (!contact) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <Link
        href="/cards"
        className="text-sm font-semibold text-cyan-700 hover:text-cyan-800"
      >
        ← 목록으로 돌아가기
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          {contact.profileImages[0]?.signedUrl ? (
            <Image
              src={contact.profileImages[0].signedUrl}
              alt={contact.name}
              width={128}
              height={128}
              className="h-32 w-32 rounded-3xl object-cover"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-slate-200 text-sm font-semibold text-slate-600">
              사진 없음
            </div>
          )}

          <div className="space-y-3">
            <div>
              <h1 className="text-3xl font-semibold text-slate-950">
                {contact.name}
              </h1>
              <p className="mt-2 text-base text-slate-600">
                {contact.company || "기관 미상"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
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
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">연락처 정보</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                이메일
              </dt>
              <dd className="mt-2 break-words text-sm text-slate-900">
                {contact.email}
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                전화번호
              </dt>
              <dd className="mt-2 text-sm text-slate-900">{contact.phone}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                도시
              </dt>
              <dd className="mt-2 text-sm text-slate-900">{contact.city}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                담당자
              </dt>
              <dd className="mt-2 text-sm text-slate-900">
                {contact.ownerStaff || "미지정"}
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                직책
              </dt>
              <dd className="mt-2 text-sm text-slate-900">
                {contact.jobTitle || "-"}
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                웹/소셜
              </dt>
              <dd className="mt-2 break-words text-sm text-slate-900">
                {contact.website || "-"}
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                주소
              </dt>
              <dd className="mt-2 break-words text-sm text-slate-900">
                {contact.address || "-"}
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                원본 시트
              </dt>
              <dd className="mt-2 text-sm text-slate-900">
                {contact.sourceSheets.join(", ") || "-"}
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                데이터 출처
              </dt>
              <dd className="mt-2 text-sm text-slate-900">
                {contact.sourceType}
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                협력 수위
              </dt>
              <dd className="mt-2">
                {contact.cooperationLevel ? (
                  <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-800">
                    문화원 협력 {contact.cooperationLevel}
                  </span>
                ) : (
                  <span className="text-sm text-slate-900">-</span>
                )}
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                태그
              </dt>
              <dd className="mt-2 flex flex-wrap gap-2 text-sm text-slate-900">
                {contact.tags.length > 0
                  ? contact.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700"
                      >
                        #{tag}
                      </span>
                    ))
                  : "-"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">행사 이력</h2>
          {contact.eventLinks.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              연결된 행사가 없습니다.
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {contact.eventLinks.map((eventLink) => (
                <li
                  key={eventLink.id}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-900">{eventLink.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {eventLink.eventDate || "날짜 미정"} · {eventLink.location || "장소 미정"}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        초청 {eventLink.inviteStatus || "-"} · 참석 {eventLink.attendanceStatus || "-"}
                      </div>
                      {eventLink.notes ? (
                        <div className="mt-2 text-xs text-slate-500">{eventLink.notes}</div>
                      ) : null}
                    </div>
                    <form action={removeContactEventAction}>
                      <input type="hidden" name="contactId" value={contact.id} />
                      <input type="hidden" name="eventId" value={eventLink.id} />
                      <input type="hidden" name="redirectTo" value={`/cards/${contact.id}`} />
                      <button
                        type="submit"
                        className="rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
                      >
                        연결 해제
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form action={addContactToEventAction} className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4">
            <input type="hidden" name="contactId" value={contact.id} />
            <input type="hidden" name="redirectTo" value={`/cards/${contact.id}`} />
            <h3 className="font-semibold text-slate-900">행사 연결 추가</h3>
            <select
              name="eventId"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
            >
              <option value="">행사 선택</option>
              {options.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                name="inviteStatus"
                placeholder="초청 상태"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              />
              <input
                name="attendanceStatus"
                placeholder="참석 상태"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              />
            </div>
            <textarea
              name="notes"
              rows={3}
              placeholder="메모"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
            />
            <button
              type="submit"
              className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              행사 연결 저장
            </button>
          </form>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">최근 변경 이력</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          어떤 담당자가 언제 수정하거나 OCR/검수/팔로업을 처리했는지 확인할 수 있습니다.
        </p>
        <div className="mt-5 space-y-3">
          {activity.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-semibold text-slate-950">{item.summary}</div>
                <div className="text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleString("ko-KR")}
                </div>
              </div>
              <div className="mt-2 text-slate-600">
                담당자 {item.actorName}
                {item.actorEmail ? ` · ${item.actorEmail}` : ""}
              </div>
            </div>
          ))}
          {activity.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              아직 저장된 변경 이력이 없습니다.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">연락처 정보 수정</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          OCR 결과나 엑셀 매핑이 완벽하지 않은 경우 여기서 직접 보정하면 됩니다.
        </p>
        <div className="mt-5">
          <ContactForm
            mode="edit"
            options={options}
            initialValues={{
              id: contact.id,
              name: contact.name,
              company: contact.company,
              jobTitle: contact.jobTitle,
              email: contact.email,
              phone: contact.phone,
              website: contact.website,
              address: contact.address,
              city: contact.city,
              country: contact.country,
              cooperationLevel: contact.cooperationLevel,
              categoryId: contact.categoryId,
              ownerStaffId: contact.ownerStaffId,
              isInfluencer: contact.isInfluencer,
              isMedia: contact.isMedia,
              contactStatus: contact.contactStatus,
              sourceType: contact.sourceType,
              tags: contact.tags,
            }}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">접촉 이력 / 팔로업</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            마지막 연락 내용과 다음 후속 일정을 기록해 두면 다음 행사 준비 때 우선순위 추천에도 반영됩니다.
          </p>

          <div className="mt-5 space-y-3">
            {followups.map((followup) => (
              <div key={followup.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-slate-900">{followup.summary}</div>
                    <div className="mt-1 text-slate-600">
                      {followup.channel} · {followup.status}
                      {followup.ownerLabel ? ` · ${followup.ownerLabel}` : ""}
                    </div>
                    {followup.notes ? (
                      <div className="mt-2 text-slate-500">{followup.notes}</div>
                    ) : null}
                    <div className="mt-2 text-xs text-slate-500">
                      다음 일정{" "}
                      {followup.nextFollowUpAt
                        ? new Date(followup.nextFollowUpAt).toLocaleString("ko-KR")
                        : "-"}
                    </div>
                  </div>
                  {followup.status !== "done" ? (
                    <form action={completeContactFollowupAction}>
                      <input type="hidden" name="followupId" value={followup.id} />
                      <input type="hidden" name="contactId" value={contact.id} />
                      <input type="hidden" name="redirectTo" value={`/cards/${contact.id}`} />
                      <button
                        type="submit"
                        className="rounded-full border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700"
                      >
                        완료 처리
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
            {followups.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                아직 접촉 이력이 없습니다.
              </div>
            ) : null}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">새 팔로업 추가</h2>
          <form action={createContactFollowupAction} className="mt-5 space-y-3">
            <input type="hidden" name="contactId" value={contact.id} />
            <input type="hidden" name="redirectTo" value={`/cards/${contact.id}`} />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                name="summary"
                placeholder="요약"
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
              />
              <input
                name="ownerLabel"
                placeholder="담당자 메모 작성자"
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                name="channel"
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
              >
                <option value="email">email</option>
                <option value="phone">phone</option>
                <option value="meeting">meeting</option>
                <option value="event">event</option>
              </select>
              <select
                name="status"
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
              >
                <option value="planned">planned</option>
                <option value="in_progress">in_progress</option>
                <option value="done">done</option>
              </select>
            </div>
            <input
              name="nextFollowUpAt"
              type="datetime-local"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
            />
            <textarea
              name="notes"
              rows={4}
              placeholder="상세 메모"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
            />
            <button
              type="submit"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              팔로업 저장
            </button>
          </form>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">명함 OCR 데이터</h2>

          {contact.businessCards.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              연결된 명함 OCR 데이터가 없습니다.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {contact.businessCards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                      {card.reviewStatus}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(card.createdAt).toLocaleString("ko-KR")}
                    </span>
                    {card.uploadedByLabel ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        업로더 {card.uploadedByLabel}
                      </span>
                    ) : null}
                    {card.uploadBatchLabel ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        묶음 {card.uploadBatchLabel}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    {card.sourceFileName ? <div>원본 파일명 {card.sourceFileName}</div> : null}
                    {card.uploadBatchKey ? <div>업로드 키 {card.uploadBatchKey}</div> : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {card.previewUrl ? (
                      <a
                        href={card.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-cyan-700"
                      >
                        미리보기 이미지 열기
                      </a>
                    ) : null}
                    {card.originalUrl ? (
                      <a
                        href={card.originalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-slate-700"
                      >
                        원본 이미지 열기
                      </a>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3">
                    {card.extractedEntries.map((entry) => (
                      <div
                        key={`${card.id}-${entry.key}`}
                        className="rounded-2xl bg-slate-50 px-4 py-3 text-sm"
                      >
                        <div className="font-medium text-slate-500">
                          {entry.key}
                        </div>
                        <div className="mt-1 break-words text-slate-900">
                          {entry.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {card.rawText ? (
                    <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                      {card.rawText}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">원본 엑셀 행</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            정제 결과가 완벽하지 않아도, 원본 행을 그대로 확인할 수 있게
            남겨두었습니다. 검색과 검수에 활용하면 좋습니다.
          </p>

          {contact.rawLegacyRows.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              연결된 원본 행이 없습니다.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {contact.rawLegacyRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {row.sheetName}
                    </span>
                    <span className="text-xs text-slate-500">
                      행 {row.rowNumber}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {row.rawEntries.map((entry) => (
                      <div
                        key={`${row.id}-${entry.key}`}
                        className="rounded-2xl bg-slate-50 px-4 py-3 text-sm"
                      >
                        <div className="font-medium text-slate-500">
                          {entry.key}
                        </div>
                        <div className="mt-1 break-words text-slate-900">
                          {entry.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
