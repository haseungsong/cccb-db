import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { demoContacts } from "@/lib/samples";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = demoContacts.find((item) => item.id === id);

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
          {contact.imageUrl ? (
            <Image
              src={contact.imageUrl}
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
                {contact.company}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {contact.category}
              </span>
              {contact.isInfluencer ? (
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                  인플루언서
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
                {contact.ownerStaff}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">행사 이력</h2>
          <ul className="mt-5 space-y-3">
            {contact.events.map((eventName) => (
              <li
                key={eventName}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              >
                {eventName}
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            다음 단계에서는 이 화면에 실제 Supabase 데이터와 OCR 원문, 수정 이력,
            병합 후보 비교 UI를 붙이게 됩니다.
          </div>
        </article>
      </section>
    </main>
  );
}
