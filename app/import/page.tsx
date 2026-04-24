"use client";

import { useState } from "react";

type ImportResult = {
  ok: boolean;
  message: string;
  batchId?: string;
  sheetCount?: number;
  mappedRowCount?: number;
  sheetSummaries?: Array<{
    sheetName: string;
    headerRowIndex: number;
    totalRows: number;
    hasPhotoColumn: boolean;
    sampleColumns: string[];
  }>;
  importSummary?: {
    createdContactsCount: number;
    updatedContactsCount: number;
    createdCategoryCount: number;
    createdStaffCount: number;
    createdEventCount: number;
    linkedEventCount: number;
    legacyRowCount: number;
    reviewCandidatesCount: number;
    mergedDuplicateCount: number;
  };
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
      const submitter = (event.nativeEvent as SubmitEvent).submitter as
        | HTMLButtonElement
        | undefined;
      const action = submitter?.value ?? "analyze";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("action", action);

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
            구조 분석만 먼저 확인할 수도 있고, 바로 Supabase에 기존 DB를
            가져올 수도 있습니다.
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

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              value="analyze"
              disabled={!file || isLoading}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isLoading ? "처리 중..." : "엑셀 구조 분석"}
            </button>
            <button
              type="submit"
              value="import"
              disabled={!file || isLoading}
              className="rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isLoading ? "처리 중..." : "Supabase에 저장"}
            </button>
            <button
              type="submit"
              value="replace"
              disabled={!file || isLoading}
              className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isLoading ? "처리 중..." : "기존 import 초기화 후 다시 저장"}
            </button>
          </div>
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
                    시트 요약 ({result.sheetCount}개 / 매핑 행 {result.mappedRowCount ?? 0}건)
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

              {result.importSummary ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-950">저장 결과</h3>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["배치 ID", result.batchId ?? "-"],
                      ["신규 연락처", String(result.importSummary.createdContactsCount)],
                      ["업데이트 연락처", String(result.importSummary.updatedContactsCount)],
                      ["신규 카테고리", String(result.importSummary.createdCategoryCount)],
                      ["신규 담당자", String(result.importSummary.createdStaffCount)],
                      ["신규 행사", String(result.importSummary.createdEventCount)],
                      ["행사 연결", String(result.importSummary.linkedEventCount)],
                      ["원본 행 저장", String(result.importSummary.legacyRowCount)],
                      ["검수 후보", String(result.importSummary.reviewCandidatesCount)],
                      ["자동 병합 중복", String(result.importSummary.mergedDuplicateCount)],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl bg-slate-50 px-4 py-3 text-sm"
                      >
                        <dt className="font-medium text-slate-500">{label}</dt>
                        <dd className="mt-1 break-words text-slate-900">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
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
