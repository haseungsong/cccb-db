"use client";

import { useState } from "react";

type AnalyzedItem = {
  clientId: string;
  fileName: string;
  rawText: string;
  normalized: {
    name: string;
    company: string;
    jobTitle: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    city: string;
    country: string;
    notes: string;
    languageHint: string;
  };
  mergeSuggestion: {
    action: string;
    score: number;
    reasons: string[];
  };
  storage: {
    originalBucket: string;
    originalPath: string;
    previewBucket: string;
    previewPath: string;
  };
  saved?: {
    contactId: string | null;
    businessCardId: string | null;
    action: string;
  };
};

type UploadResult = {
  ok: boolean;
  message: string;
  detail?: string;
  items?: AnalyzedItem[];
};

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [items, setItems] = useState<AnalyzedItem[]>([]);

  async function handleAnalyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (files.length === 0) {
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setItems([]);

    try {
      const formData = new FormData();
      formData.append("step", "analyze");
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/cards/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as UploadResult;
      setResult(payload);
      setItems(payload.items ?? []);
    } catch (error) {
      setResult({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSaveReviewed() {
    if (items.length === 0) {
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("step", "save");
      formData.append("items", JSON.stringify(items));

      const response = await fetch("/api/cards/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as UploadResult;
      setResult(payload);
      if (payload.items) {
        setItems(payload.items);
      }
    } catch (error) {
      setResult({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function updateItem(clientId: string, key: keyof AnalyzedItem["normalized"], value: string) {
    setItems((current) =>
      current.map((item) =>
        item.clientId === clientId
          ? {
              ...item,
              normalized: {
                ...item.normalized,
                [key]: value,
              },
            }
          : item,
      ),
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          명함 OCR 업로드
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          휴대폰 브라우저에서 이 화면을 열고 바로 촬영하거나 파일을 선택하면,
          이미지가 OCR로 분석되고 브라질 포르투갈어 기준으로 결과를 정리합니다.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          업로드한 명함은 현재 로그인한 담당자 계정으로 생성 이력이 남습니다.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          이제 여러 장을 한 번에 분석할 수 있고, 저장 전에 이름/기관/이메일/전화번호를
          이 화면에서 바로 수정한 뒤 저장할 수 있습니다.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={handleAnalyze}
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
              multiple
              accept="image/*"
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            />
          </label>

          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            선택된 파일: {files.length > 0 ? `${files.length}장` : "없음"}
          </div>
          {files.length > 0 ? (
            <div className="mt-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">선택 목록</div>
              <ul className="mt-2 space-y-1">
                {files.map((file) => (
                  <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={files.length === 0 || isAnalyzing || isSaving}
            className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isAnalyzing ? "분석 중..." : "OCR 분석 시작"}
          </button>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            2. 분석 결과
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            업로드 후 OCR 결과를 검토하고, 수정한 뒤 저장할 수 있습니다.
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
              {result.detail ? (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  상세: {result.detail}
                </div>
              ) : null}

              {items.length > 0 ? (
                <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
                  저장 전에 각 명함의 이름, 기관, 직책, 이메일, 전화번호를 한 번 더 확인해 주세요.
                </div>
              ) : null}

              {items.length > 0 ? (
                <button
                  type="button"
                  onClick={handleSaveReviewed}
                  disabled={isSaving || isAnalyzing}
                  className="rounded-full bg-cyan-700 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSaving ? "저장 중..." : `${items.length}장 검토 후 저장`}
                </button>
              ) : null}
            </div>
          )}
        </section>
      </section>

      {items.length > 0 ? (
        <section className="grid gap-6">
          {items.map((item, index) => (
            <article
              key={item.clientId}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">
                    {index + 1}. {item.fileName}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    저장 버킷: `{item.storage.originalBucket}` / `{item.storage.previewBucket}`
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    원본 경로 {item.storage.originalPath}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    미리보기 경로 {item.storage.previewPath}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                  <div>
                    병합 제안 <strong>{item.mergeSuggestion.action}</strong>
                  </div>
                  <div className="mt-1 text-slate-600">
                    점수 {item.mergeSuggestion.score} / {item.mergeSuggestion.reasons.join(", ")}
                  </div>
                  {item.saved ? (
                    <div className="mt-2 text-emerald-700">
                      저장 완료: {item.saved.action} / 연락처 {item.saved.contactId ?? "-"}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(
                  [
                    ["name", "이름"],
                    ["company", "기관"],
                    ["jobTitle", "직책"],
                    ["email", "이메일"],
                    ["phone", "전화번호"],
                    ["website", "웹사이트"],
                    ["city", "도시"],
                    ["country", "국가"],
                    ["languageHint", "언어 힌트"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">{label}</span>
                    <input
                      value={item.normalized[key]}
                      onChange={(event) => updateItem(item.clientId, key, event.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                    />
                  </label>
                ))}
                <label className="space-y-2 text-sm md:col-span-2 xl:col-span-3">
                  <span className="font-medium text-slate-700">주소</span>
                  <input
                    value={item.normalized.address}
                    onChange={(event) => updateItem(item.clientId, "address", event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-sm md:col-span-2 xl:col-span-3">
                  <span className="font-medium text-slate-700">메모</span>
                  <textarea
                    rows={3}
                    value={item.normalized.notes}
                    onChange={(event) => updateItem(item.clientId, "notes", event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
                  />
                </label>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                <h4 className="font-semibold text-slate-950">OCR 원문</h4>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {item.rawText}
                </pre>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
