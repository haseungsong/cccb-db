import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createPreviewImage } from "@/lib/image/prepareImage";
import { runGoogleVisionOCR } from "@/lib/ocr/googleVision";
import { normalizeBusinessCard } from "@/lib/ocr/normalizeCard";
import { scoreContactMatch, type ExistingContactCandidate } from "@/lib/contacts/mergeContact";
import { hasConfiguredServerEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasConfiguredServerEnv()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "환경변수가 아직 설정되지 않았습니다. .env.local에 Supabase, Google Vision, OpenAI 키를 먼저 넣어주세요.",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "업로드할 이미지 파일이 없습니다." },
      { status: 400 },
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { ok: false, message: "명함 이미지 파일만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  const originalBuffer = Buffer.from(await file.arrayBuffer());
  const previewBuffer = await createPreviewImage(originalBuffer);
  const supabase = createSupabaseAdminClient();
  const basePath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}`;
  const originalPath = `${basePath}-original.jpg`;
  const previewPath = `${basePath}-preview.jpg`;

  const [{ error: originalUploadError }, { error: previewUploadError }] =
    await Promise.all([
      supabase.storage
        .from("cards-original")
        .upload(originalPath, originalBuffer, {
          contentType: "image/jpeg",
          upsert: false,
        }),
      supabase.storage
        .from("cards-preview")
        .upload(previewPath, previewBuffer, {
          contentType: "image/jpeg",
          upsert: false,
        }),
    ]);

  if (originalUploadError || previewUploadError) {
    return NextResponse.json(
      {
        ok: false,
        message: "스토리지 업로드에 실패했습니다.",
        originalUploadError: originalUploadError?.message,
        previewUploadError: previewUploadError?.message,
      },
      { status: 500 },
    );
  }

  const rawText = await runGoogleVisionOCR(originalBuffer);
  const normalized = await normalizeBusinessCard(rawText);

  let bestMatch: {
    id: string;
    score: number;
    reasons: string[];
    action: "auto-merge" | "needs-review" | "create-new";
  } | null = null;

  const contactsQuery = await supabase
    .from("contacts")
    .select("id, name, company, email, phone")
    .limit(500);

  if (!contactsQuery.error && contactsQuery.data) {
    const scored = (contactsQuery.data as ExistingContactCandidate[])
      .map((candidate) => ({
        id: candidate.id,
        ...scoreContactMatch(normalized, candidate),
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (scored) {
      bestMatch = scored;
    }
  }

  return NextResponse.json({
    ok: true,
    message: "명함 OCR 분석이 완료되었습니다.",
    storage: {
      originalPath,
      previewPath,
    },
    rawText,
    normalized,
    mergeSuggestion:
      bestMatch && bestMatch.score >= 60
        ? bestMatch
        : {
            action: "create-new",
            score: 0,
            reasons: ["기존 연락처와 강한 중복 없음"],
          },
  });
}
