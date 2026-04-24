"use client";

import { useState } from "react";

type ImportResult = {
  ok: boolean;
  message: string;
  sheetCount?: number;
  sheetSummaries?: Array<{
    sheetName: string;
    headerRowIndex: number;
    totalRows: number;
    hasPhotoColumn: boolean;
    sampleColumns: string[];
  }>;
  previewRows?: Array<{
    sheetName: string;
    rowNumber: number;
    name: string;
    company: string;
    category: string;
    ownerStaff: string;
    email: string;
    phone: string;
    imageHint: string;
  }>;
};

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import/excel", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ImportResult;
      setResult(payload);
    } catch (error) {
      setResult({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "엑셀 분석 중 오류가 발생했습니다.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-950">
          기존 문화원 엑셀 구조 분석
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          이 화면은 기존 `문화원 DB.xlsx`를 바로 DB에 넣기 전에, 어떤 시트와
          어떤 컬럼이 있는지 먼저 분석합니다. 이 결과를 기준으로 Supabase용
          매핑과 중복 전략을 정리할 수 있습니다.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-950">
            1. 엑셀 업로드
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            지금은 `.xlsx` 구조 분석만 진행합니다. 실제 DB 반영은 다음 단계에서
            붙입니다.
          </p>

          <input
            className="mt-6 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-700"
            type="file"
            accept=".xlsx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />

          {file ? (
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              선택된 파일: {file.name}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!file || isLoading}
            className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isLoading ? "분석 중..." : "엑셀 구조 분석"}
          </button>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            2. 시트 및 샘플 행
          </h2>

          {!result ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              아직 분석 결과가 없습니다.
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  result.ok
                    ? "bg-emerald-50 text-emerald-900"
                    : "bg-rose-50 text-rose-900"
                }`}
              >
                {result.message}
              </div>

              {result.sheetSummaries ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-950">
                    시트 요약 ({result.sheetCount}개)
                  </h3>
                  <div className="grid gap-3">
                    {result.sheetSummaries.map((sheet) => (
                      <article
                        key={sheet.sheetName}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h4 className="font-semibold text-slate-950">
                            {sheet.sheetName}
                          </h4>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            헤더 행 {sheet.headerRowIndex}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          총 행 수 {sheet.totalRows} · 사진 컬럼{" "}
                          {sheet.hasPhotoColumn ? "있음" : "없음"}
                        </p>
                        <p className="mt-2 text-xs leading-6 text-slate-500">
                          컬럼 예시: {sheet.sampleColumns.join(", ") || "-"}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              {result.previewRows ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-950">샘플 매핑 행</h3>
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-4 py-3">시트</th>
                            <th className="px-4 py-3">이름</th>
                            <th className="px-4 py-3">기관</th>
                            <th className="px-4 py-3">카테고리</th>
                            <th className="px-4 py-3">담당자</th>
                            <th className="px-4 py-3">사진</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.previewRows.map((row) => (
                            <tr
                              key={`${row.sheetName}-${row.rowNumber}-${row.name}`}
                              className="border-t border-slate-200"
                            >
                              <td className="px-4 py-3 text-slate-700">
                                {row.sheetName}
                              </td>
                              <td className="px-4 py-3 text-slate-900">
                                {row.name || "-"}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {row.company || "-"}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {row.category || "-"}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {row.ownerStaff || "-"}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                {row.imageHint || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
