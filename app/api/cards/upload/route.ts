import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createPreviewImage } from "@/lib/image/prepareImage";
import { runGoogleVisionOCR } from "@/lib/ocr/googleVision";
import { normalizeBusinessCard } from "@/lib/ocr/normalizeCard";
import { scoreContactMatch, type ExistingContactCandidate } from "@/lib/contacts/mergeContact";
import { hasConfiguredServerEnv } from "@/lib/env";

type ContactRecord = ExistingContactCandidate & {
  job_title: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  is_influencer: boolean;
  is_media: boolean;
};

function mergeField(incoming: string, existing: string | null) {
  return incoming || existing || null;
}

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
    .select(
      "id, name, company, email, phone, job_title, website, address, city, country, is_influencer, is_media",
    )
    .limit(500);
  const candidates = (contactsQuery.data ?? []) as ContactRecord[];

  if (!contactsQuery.error && candidates.length > 0) {
    const scored = candidates
      .map((candidate) => ({
        id: candidate.id,
        ...scoreContactMatch(normalized, candidate),
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (scored) {
      bestMatch = scored;
    }
  }

  const mergeSuggestion =
    bestMatch && bestMatch.score >= 60
      ? bestMatch
      : {
          action: "create-new" as const,
          score: 0,
          reasons: ["기존 연락처와 강한 중복 없음"],
        };

  let savedContactId: string | null = null;
  let savedBusinessCardId: string | null = null;
  let saveAction = "pending-review";

  if (mergeSuggestion.action === "auto-merge") {
    const matched = candidates.find((candidate) => candidate.id === mergeSuggestion.id);

    if (matched) {
      const updateResult = await supabase
        .from("contacts")
        .update({
          name: mergeField(normalized.name, matched.name),
          company: mergeField(normalized.company, matched.company),
          job_title: mergeField(normalized.jobTitle, matched.job_title),
          email: mergeField(normalized.email, matched.email),
          phone: mergeField(normalized.phone, matched.phone),
          website: mergeField(normalized.website, matched.website),
          address: mergeField(normalized.address, matched.address),
          city: mergeField(normalized.city, matched.city),
          country: mergeField(normalized.country, matched.country),
          is_influencer: matched.is_influencer,
          is_media: matched.is_media,
          primary_source_type: "business_card",
          updated_at: new Date().toISOString(),
        })
        .eq("id", matched.id);

      if (updateResult.error) {
        return NextResponse.json(
          { ok: false, message: updateResult.error.message },
          { status: 500 },
        );
      }

      savedContactId = matched.id;
      saveAction = "updated-contact";
    }
  } else if (mergeSuggestion.action === "create-new") {
    const insertContact = await supabase
      .from("contacts")
      .insert({
        name: normalized.name || "이름 미상",
        company: normalized.company || null,
        job_title: normalized.jobTitle || null,
        email: normalized.email || null,
        phone: normalized.phone || null,
        website: normalized.website || null,
        address: normalized.address || null,
        city: normalized.city || null,
        country: normalized.country || "Brazil",
        primary_source_type: "business_card",
      })
      .select("id")
      .single();

    if (insertContact.error) {
      return NextResponse.json(
        { ok: false, message: insertContact.error.message },
        { status: 500 },
      );
    }

    savedContactId = insertContact.data.id;
    saveAction = "created-contact";
  }

  const businessCardInsert = await supabase
    .from("business_cards")
    .insert({
      contact_id: savedContactId,
      image_original_path: originalPath,
      image_preview_path: previewPath,
      ocr_raw_text: rawText,
      extracted_json: normalized,
      language_hint: normalized.languageHint || "pt-BR",
      review_status:
        mergeSuggestion.action === "needs-review" ? "needs_review" : "captured",
    })
    .select("id")
    .single();

  if (businessCardInsert.error) {
    return NextResponse.json(
      { ok: false, message: businessCardInsert.error.message },
      { status: 500 },
    );
  }

  savedBusinessCardId = businessCardInsert.data.id;

  return NextResponse.json({
    ok: true,
    message:
      mergeSuggestion.action === "needs-review"
        ? "명함 OCR 분석은 완료되었고, 중복 가능성이 있어 검수 대기 상태로 저장했습니다."
        : "명함 OCR 분석과 Supabase 저장이 완료되었습니다.",
    storage: {
      originalPath,
      previewPath,
    },
    rawText,
    normalized,
    mergeSuggestion,
    saved: {
      contactId: savedContactId,
      businessCardId: savedBusinessCardId,
      action: saveAction,
    },
  });
}
