"use client";

import { useState } from "react";

type UploadResult = {
  ok: boolean;
  message: string;
  rawText?: string;
  normalized?: Record<string, string>;
  mergeSuggestion?: {
    action: string;
    score: number;
    reasons: string[];
  };
  storage?: {
    originalPath: string;
    previewPath: string;
  };
  saved?: {
    contactId: string | null;
    businessCardId: string | null;
    action: string;
  };
};

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/cards/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as UploadResult;
      setResult(payload);
    } catch (error) {
      setResult({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">
          Mobile OCR Upload
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          명함 사진 업로드 테스트
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          휴대폰 브라우저에서 이 화면을 열고 바로 촬영하거나 파일을 선택하면,
          이미지가 OCR로 분석되고 브라질 포르투갈어 기준으로 결과를 정리합니다.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-950">
            1. 명함 이미지 선택
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            추천: 작은 글자가 흐려지지 않도록 원본 그대로 올려주세요.
          </p>

          <label className="mt-6 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
            <span className="text-sm font-medium text-slate-700">
              촬영한 사진 또는 이미지 파일 선택
            </span>
            <span className="mt-2 text-xs text-slate-500">
              JPG, PNG, HEIC를 브라우저가 변환 가능한 범위에서 업로드
            </span>
            <input
              className="mt-6 block w-full text-sm text-slate-600"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          {file ? (
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              선택된 파일: {file.name}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!file || isUploading}
            className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isUploading ? "분석 중..." : "OCR 분석 시작"}
          </button>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            2. 분석 결과
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            환경변수가 모두 설정되어 있으면 OCR 결과와 중복 후보뿐 아니라
            Supabase 저장 결과까지 바로 확인할 수 있습니다.
          </p>

          {!result ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              아직 업로드 결과가 없습니다.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  result.ok
                    ? "bg-emerald-50 text-emerald-900"
                    : "bg-rose-50 text-rose-900"
                }`}
              >
                {result.message}
              </div>

              {result.normalized ? (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-950">구조화 결과</h3>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    {Object.entries(result.normalized).map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-2xl bg-slate-50 px-4 py-3 text-sm"
                      >
                        <dt className="font-medium capitalize text-slate-500">
                          {key}
                        </dt>
                        <dd className="mt-1 break-words text-slate-900">
                          {value || "-"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {result.mergeSuggestion ? (
                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                  <h3 className="font-semibold text-slate-950">병합 제안</h3>
                  <p className="mt-3">
                    액션: <strong>{result.mergeSuggestion.action}</strong>
                  </p>
                  <p className="mt-2">
                    점수: <strong>{result.mergeSuggestion.score}</strong>
                  </p>
                  <p className="mt-2">
                    이유: {result.mergeSuggestion.reasons.join(", ")}
                  </p>
                </div>
              ) : null}

              {result.saved ? (
                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                  <h3 className="font-semibold text-slate-950">저장 결과</h3>
                  <p className="mt-3">
                    저장 액션: <strong>{result.saved.action}</strong>
                  </p>
                  <p className="mt-2">
                    연락처 ID: <strong>{result.saved.contactId ?? "검수 후 연결"}</strong>
                  </p>
                  <p className="mt-2">
                    명함 ID: <strong>{result.saved.businessCardId ?? "-"}</strong>
                  </p>
                </div>
              ) : null}

              {result.rawText ? (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-950">OCR 원문</h3>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {result.rawText}
                  </pre>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
