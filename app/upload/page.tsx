"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

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
    uploadBatchKey: string;
    uploadBatchLabel: string;
    uploadedByLabel: string;
    sourceFileName: string;
  };
  saved?: {
    contactId: string | null;
    businessCardId: string | null;
    action: string;
  };
};

type ReviewItem = AnalyzedItem & {
  selected: boolean;
  previewUrl: string;
  issues: string[];
};

type SelectedFile = {
  file: File;
  previewUrl: string;
};

type UploadResult = {
  ok: boolean;
  message: string;
  detail?: string;
  items?: AnalyzedItem[];
};

function buildIssues(item: AnalyzedItem) {
  const issues: string[] = [];

  if (!item.normalized.name.trim()) {
    issues.push("이름이 비어 있습니다.");
  }

  if (!item.normalized.company.trim()) {
    issues.push("기관명이 비어 있습니다.");
  }

  if (!item.normalized.email.trim() && !item.normalized.phone.trim()) {
    issues.push("이메일 또는 전화번호 중 최소 하나는 확인이 필요합니다.");
  }

  if (item.rawText.trim().length < 20) {
    issues.push("OCR 원문이 너무 짧아서 인식 결과를 다시 확인하는 것이 좋습니다.");
  }

  if (item.mergeSuggestion.action === "needs-review") {
    issues.push("기존 연락처와 겹칠 가능성이 있어 병합 여부를 확인해 주세요.");
  }

  return issues;
}

function toReviewItems(items: AnalyzedItem[], selectedFiles: SelectedFile[], previous?: ReviewItem[]) {
  const previousMap = new Map((previous ?? []).map((item) => [item.clientId, item]));

  return items.map((item, index) => ({
    ...item,
    selected: previousMap.get(item.clientId)?.selected ?? true,
    previewUrl: previousMap.get(item.clientId)?.previewUrl ?? selectedFiles[index]?.previewUrl ?? "",
    issues: buildIssues(item),
  }));
}

export default function UploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploadBatchLabel, setUploadBatchLabel] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);

  const selectedCount = useMemo(
    () => items.filter((item) => item.selected && !item.saved).length,
    [items],
  );
  const issueCount = useMemo(() => items.filter((item) => item.issues.length > 0).length, [items]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setSelectedFiles(nextFiles);
  }

  async function handleAnalyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setItems([]);

    try {
      const formData = new FormData();
      formData.append("step", "analyze");
      formData.append("uploadBatchLabel", uploadBatchLabel.trim());
      selectedFiles.forEach(({ file }) => formData.append("files", file));

      const response = await fetch("/api/cards/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as UploadResult;
      setResult(payload);
      setItems(toReviewItems(payload.items ?? [], selectedFiles));
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
    const selectedItems = items.filter((item) => item.selected && !item.saved);

    if (selectedItems.length === 0) {
      setResult({
        ok: false,
        message: "저장 대상으로 선택된 명함이 없습니다.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("step", "save");
      formData.append("items", JSON.stringify(selectedItems));

      const response = await fetch("/api/cards/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as UploadResult;
      setResult(payload);
      if (payload.items) {
        const savedMap = new Map(payload.items.map((item) => [item.clientId, item]));
        setItems((current) =>
          current.map((item) => {
            const saved = savedMap.get(item.clientId);
            if (!saved) {
              return item;
            }

            return {
              ...item,
              ...saved,
              selected: false,
              issues: buildIssues(saved),
            };
          }),
        );
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
      current.map((item) => {
        if (item.clientId !== clientId) {
          return item;
        }

        const nextItem = {
          ...item,
          normalized: {
            ...item.normalized,
            [key]: value,
          },
        };

        return {
          ...nextItem,
          issues: buildIssues(nextItem),
        };
      }),
    );
  }

  function toggleSelected(clientId: string, selected: boolean) {
    setItems((current) =>
      current.map((item) => (item.clientId === clientId ? { ...item, selected } : item)),
    );
  }

  function selectAll(selected: boolean) {
    setItems((current) =>
      current.map((item) => (item.saved ? item : { ...item, selected })),
    );
  }

  function selectOnlyReady() {
    setItems((current) =>
      current.map((item) =>
        item.saved ? item : { ...item, selected: item.issues.length === 0 },
      ),
    );
  }

  function excludeProblemCards() {
    setItems((current) =>
      current.map((item) =>
        item.saved ? item : { ...item, selected: item.issues.length === 0 && item.selected },
      ),
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">명함 OCR 업로드</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          여러 장을 한 번에 올린 뒤, 저장 전 체크박스로 저장 대상을 고르고 문제가 있는
          카드만 제외할 수 있습니다. 업로드 기록에는 로그인한 담당자, 업로드 묶음 이름,
          원본 파일명이 함께 남아 나중에 다시 찾기 쉽도록 정리됩니다.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={handleAnalyze}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-950">1. 명함 이미지 선택</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            추천: 작은 글자가 흐려지지 않도록 원본 그대로 올려주세요.
          </p>

          <label className="mt-5 block space-y-2 text-sm">
            <span className="font-medium text-slate-700">업로드 묶음 이름</span>
            <input
              value={uploadBatchLabel}
              onChange={(event) => setUploadBatchLabel(event.target.value)}
              placeholder="예: 4월 문화원 행사 후보 / 2026-04-24 스테파니 업로드"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
            />
            <span className="block text-xs text-slate-500">
              비워두면 날짜 기준 이름이 자동으로 붙습니다.
            </span>
          </label>

          <label className="mt-6 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
            <span className="text-sm font-medium text-slate-700">촬영한 사진 또는 이미지 파일 선택</span>
            <span className="mt-2 text-xs text-slate-500">
              JPG, PNG, HEIC를 브라우저가 변환 가능한 범위에서 업로드
            </span>
            <input
              className="mt-6 block w-full text-sm text-slate-600"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
            />
          </label>

          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            선택된 파일: {selectedFiles.length > 0 ? `${selectedFiles.length}장` : "없음"}
          </div>

          {selectedFiles.length > 0 ? (
            <div className="mt-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">선택 목록</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {selectedFiles.map(({ file, previewUrl }) => (
                  <div
                    key={`${file.name}-${file.lastModified}`}
                    className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"
                  >
                    <Image
                      src={previewUrl}
                      alt={file.name}
                      width={64}
                      height={64}
                      unoptimized
                      className="h-16 w-16 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">{file.name}</div>
                      <div className="text-xs text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)}MB
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={selectedFiles.length === 0 || isAnalyzing || isSaving}
            className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isAnalyzing ? "분석 중..." : "OCR 분석 시작"}
          </button>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">2. 분석 결과</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            업로드 후 OCR 결과를 검토하고, 문제 카드만 제외한 뒤 선택 저장할 수 있습니다.
          </p>

          {!result ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              아직 업로드 결과가 없습니다.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  result.ok ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"
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
                <>
                  <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
                    저장 전 각 항목을 확인한 뒤 체크박스로 저장할 카드만 남겨 주세요. 현재
                    선택 {selectedCount}장, 확인 필요 {issueCount}장입니다.
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => selectAll(true)}
                      className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800"
                    >
                      전체 선택
                    </button>
                    <button
                      type="button"
                      onClick={selectOnlyReady}
                      className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-900"
                    >
                      문제 없는 항목만 선택
                    </button>
                    <button
                      type="button"
                      onClick={excludeProblemCards}
                      className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900"
                    >
                      문제 카드만 제외
                    </button>
                    <button
                      type="button"
                      onClick={() => selectAll(false)}
                      className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800"
                    >
                      전체 해제
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveReviewed}
                    disabled={isSaving || isAnalyzing || selectedCount === 0}
                    className="rounded-full bg-cyan-700 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isSaving ? "저장 중..." : `선택한 ${selectedCount}장 저장`}
                  </button>
                </>
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
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    disabled={Boolean(item.saved)}
                    onChange={(event) => toggleSelected(item.clientId, event.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-slate-300"
                  />
                  <div>
                    <h3 className="text-xl font-semibold text-slate-950">
                      {index + 1}. {item.fileName}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                        업로더 {item.storage.uploadedByLabel}
                      </span>
                      <span className="rounded-full bg-cyan-50 px-3 py-1 font-medium text-cyan-900">
                        묶음 {item.storage.uploadBatchLabel}
                      </span>
                      {item.issues.length > 0 ? (
                        <span className="rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-700">
                          확인 필요 {item.issues.length}건
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                          바로 저장 가능
                        </span>
                      )}
                    </div>
                  </div>
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

              {item.issues.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {item.issues.join(" / ")}
                </div>
              ) : null}

              <div className="mt-5 grid gap-6 lg:grid-cols-[260px_1fr]">
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                    {item.previewUrl ? (
                      <Image
                        src={item.previewUrl}
                        alt={item.fileName}
                        width={800}
                        height={512}
                        unoptimized
                        className="h-64 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                        미리보기 없음
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
                    <div>저장 버킷: {item.storage.originalBucket} / {item.storage.previewBucket}</div>
                    <div>원본 파일명: {item.storage.sourceFileName}</div>
                    <div>업로드 키: {item.storage.uploadBatchKey}</div>
                    <div className="break-all">원본 경로: {item.storage.originalPath}</div>
                    <div className="break-all">미리보기 경로: {item.storage.previewPath}</div>
                  </div>
                </div>

                <div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                        onChange={(event) =>
                          updateItem(item.clientId, "address", event.target.value)
                        }
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
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
