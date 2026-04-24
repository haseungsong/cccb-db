import { ContactForm } from "@/app/cards/_components/contact-form";
import { getContactFormOptions } from "@/lib/contacts/queries";

export default async function NewContactPage() {
  const options = await getContactFormOptions();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-950">연락처 수동 등록</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          OCR 없이도 바로 연락처를 추가할 수 있습니다. 카테고리, 담당자, 태그,
          상태를 함께 기록하면 이후 행사 운영과 검색이 훨씬 쉬워집니다.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <ContactForm mode="create" options={options} />
      </section>
    </main>
  );
}
