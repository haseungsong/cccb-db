import Link from "next/link";
import { addContactToEventAction, createEventAction } from "@/app/actions";
import {
  getEventsOverview,
  getSearchableContacts,
} from "@/lib/contacts/queries";

export default async function EventsPage() {
  const [events, contacts] = await Promise.all([
    getEventsOverview(),
    getSearchableContacts(),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-950">행사 운영</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          행사 생성, 초청/참석 상태 기록, 참가자 확인을 한 화면에서 할 수 있게
          구성했습니다.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">새 행사 만들기</h2>
          <form action={createEventAction} className="mt-5 space-y-4">
            <input type="hidden" name="redirectTo" value="/events" />
            <input
              name="name"
              placeholder="행사명"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
              required
            />
            <input
              name="eventDate"
              type="date"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
            />
            <input
              name="location"
              placeholder="장소"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
            />
            <input
              name="sourceSheetName"
              placeholder="원본 시트명"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
            />
            <textarea
              name="tags"
              rows={3}
              placeholder="행사 태그"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm"
            />
            <button
              type="submit"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              행사 저장
            </button>
          </form>

          <div className="mt-8 rounded-2xl bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-900">연락처를 행사에 바로 연결</h3>
            <form action={addContactToEventAction} className="mt-4 space-y-3">
              <input type="hidden" name="redirectTo" value="/events" />
              <select
                name="contactId"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              >
                <option value="">연락처 선택</option>
                {contacts.slice(0, 300).map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} {contact.company ? `- ${contact.company}` : ""}
                  </option>
                ))}
              </select>
              <select
                name="eventId"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
              >
                <option value="">행사 선택</option>
                {events.map((event) => (
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
              <p className="text-xs leading-5 text-slate-500">
                연락처 선택은 각 상세 페이지에서도 가능하며, 여기서는 빠른 입력용입니다.
              </p>
              <button
                type="submit"
                className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
              >
                행사 연결 저장
              </button>
            </form>
          </div>
        </article>

        <section className="grid gap-4">
          {events.map((event) => (
            <article
              key={event.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">{event.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {event.eventDate || "날짜 미정"} · {event.location || "장소 미정"}
                  </p>
                  {event.sourceSheetName ? (
                    <p className="mt-1 text-xs text-slate-500">
                      원본 시트 {event.sourceSheetName}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                <span>참가자 {event.attendeeCount}명</span>
                <span>참석 완료 {event.attendedCount}명</span>
                <span>초청 상태 미기입 {event.invitePendingCount}명</span>
              </div>

              <div className="mt-5 grid gap-3">
                {event.attendees.slice(0, 8).map((attendee) => (
                  <Link
                    key={`${event.id}-${attendee.contactId}`}
                    href={`/cards/${attendee.contactId}`}
                    className="rounded-2xl bg-slate-50 px-4 py-3 text-sm transition hover:bg-slate-100"
                  >
                    <div className="font-medium text-slate-900">{attendee.name}</div>
                    <div className="mt-1 text-slate-600">
                      {attendee.company || "기관 미상"} · 초청 {attendee.inviteStatus || "-"} ·
                      참석 {attendee.attendanceStatus || "-"}
                    </div>
                  </Link>
                ))}
                {event.attendees.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    아직 연결된 참석자가 없습니다.
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
