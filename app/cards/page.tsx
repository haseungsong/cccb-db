import Image from "next/image";
import Link from "next/link";
import { demoContacts } from "@/lib/samples";

export default function CardsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-950">
          통합 연락처 목록
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          나중에는 Supabase 실데이터를 이 화면에 바로 붙입니다. 지금은 문화원
          운영 방식에 맞춘 카드 구조와 필터 형태를 먼저 잡아두었습니다.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {["이름/기관 검색", "카테고리", "담당자", "행사명"].map((filter) => (
            <div
              key={filter}
              className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500"
            >
              {filter}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        {demoContacts.map((contact) => (
          <Link
            key={contact.id}
            href={`/cards/${contact.id}`}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                {contact.imageUrl ? (
                  <Image
                    src={contact.imageUrl}
                    alt={contact.name}
                    width={72}
                    height={72}
                    className="h-[72px] w-[72px] rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-slate-200 text-sm font-semibold text-slate-600">
                    사진 없음
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    {contact.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {contact.company}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {contact.city} · 담당자 {contact.ownerStaff}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 flex-wrap gap-2 md:justify-end">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {contact.category}
                </span>
                {contact.events.map((event) => (
                  <span
                    key={event}
                    className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700"
                  >
                    {event}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
