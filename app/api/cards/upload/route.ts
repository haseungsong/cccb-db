import { NextResponse } from "next/server";
import { getOptionalActorContext } from "@/lib/auth/actor";
import { scoreContactMatch, type ExistingContactCandidate } from "@/lib/contacts/mergeContact";
import { createPreviewImage } from "@/lib/image/prepareImage";
import { normalizeBusinessCard } from "@/lib/ocr/normalizeCard";
import { runGoogleVisionOCR } from "@/lib/ocr/googleVision";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasConfiguredServerEnv } from "@/lib/env";
import { normalizedCardSchema, type NormalizedCard } from "@/lib/validators/card";

type ContactRecord = ExistingContactCandidate & {
  job_title: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  owner_staff_id: string | null;
  is_influencer: boolean;
  is_media: boolean;
};

type MergeSuggestion = {
  id?: string;
  score: number;
  reasons: string[];
  action: "auto-merge" | "needs-review" | "create-new";
};

type AnalysisItem = {
  clientId: string;
  fileName: string;
  rawText: string;
  normalized: NormalizedCard;
  mergeSuggestion: MergeSuggestion;
  storage: {
    originalBucket: "cards-original";
    originalPath: string;
    previewBucket: "cards-preview";
    previewPath: string;
  };
};

function mergeField(incoming: string, existing: string | null) {
  return incoming || existing || null;
}

function isMissingColumnError(error: unknown, columnName: string) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "42703" &&
    candidate.message?.toLowerCase().includes(columnName.toLowerCase()) === true
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function buildMergeSuggestion(normalized: NormalizedCard, candidates: ContactRecord[]): MergeSuggestion {
  const scored = candidates
    .map((candidate) => ({
      id: candidate.id,
      ...scoreContactMatch(normalized, candidate),
    }))
    .sort((left, right) => right.score - left.score)[0];

  if (scored && scored.score >= 60) {
    return scored;
  }

  return {
    action: "create-new",
    score: 0,
    reasons: ["기존 연락처와 강한 중복 없음"],
  };
}

async function loadCandidates() {
  const supabase = createSupabaseAdminClient();
  const contactsQuery = await supabase
    .from("contacts")
    .select(
      "id, name, company, email, phone, job_title, website, address, city, country, owner_staff_id, is_influencer, is_media",
    )
    .limit(1000);

  if (contactsQuery.error) {
    throw contactsQuery.error;
  }

  return (contactsQuery.data ?? []) as ContactRecord[];
}

async function uploadAssets(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("명함 이미지 파일만 업로드할 수 있습니다.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("이미지 파일은 10MB 이하로 업로드해 주세요.");
  }

  const originalBuffer = Buffer.from(await file.arrayBuffer());
  const previewBuffer = await createPreviewImage(originalBuffer);
  const supabase = createSupabaseAdminClient();
  const basePath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}`;
  const originalPath = `${basePath}-original.jpg`;
  const previewPath = `${basePath}-preview.jpg`;

  const [{ error: originalUploadError }, { error: previewUploadError }] = await Promise.all([
    supabase.storage.from("cards-original").upload(originalPath, originalBuffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    }),
    supabase.storage.from("cards-preview").upload(previewPath, previewBuffer, {
      contentType: "image/jpeg",
      upsert: false,
    }),
  ]);

  if (originalUploadError || previewUploadError) {
    throw new Error(
      `스토리지 업로드에 실패했습니다. ${originalUploadError?.message ?? ""} ${previewUploadError?.message ?? ""}`.trim(),
    );
  }

  return {
    originalBuffer,
    originalPath,
    previewPath,
  };
}

async function analyzeSingleFile(file: File, candidates: ContactRecord[], clientId: string) {
  const { originalBuffer, originalPath, previewPath } = await uploadAssets(file);
  const rawText = await runGoogleVisionOCR(originalBuffer);

  if (!rawText.trim()) {
    throw new Error("이미지에서 읽을 수 있는 텍스트를 찾지 못했습니다. 더 선명한 명함 사진으로 다시 시도해 주세요.");
  }

  const normalized = await normalizeBusinessCard(rawText);

  return {
    clientId,
    fileName: file.name,
    rawText,
    normalized,
    mergeSuggestion: buildMergeSuggestion(normalized, candidates),
    storage: {
      originalBucket: "cards-original",
      originalPath,
      previewBucket: "cards-preview",
      previewPath,
    },
  } satisfies AnalysisItem;
}

async function saveAnalyzedItem(item: AnalysisItem, actor: NonNullable<Awaited<ReturnType<typeof getOptionalActorContext>>>) {
  const supabase = createSupabaseAdminClient();
  const candidates = await loadCandidates();
  const mergeSuggestion = buildMergeSuggestion(item.normalized, candidates);
  let savedContactId: string | null = null;
  let savedBusinessCardId: string | null = null;
  let saveAction = "pending-review";

  if (mergeSuggestion.action === "auto-merge" && mergeSuggestion.id) {
    const matched = candidates.find((candidate) => candidate.id === mergeSuggestion.id);

    if (matched) {
      const updateResult = await supabase
        .from("contacts")
        .update({
          name: mergeField(item.normalized.name, matched.name),
          company: mergeField(item.normalized.company, matched.company),
          job_title: mergeField(item.normalized.jobTitle, matched.job_title),
          email: mergeField(item.normalized.email, matched.email),
          phone: mergeField(item.normalized.phone, matched.phone),
          website: mergeField(item.normalized.website, matched.website),
          address: mergeField(item.normalized.address, matched.address),
          city: mergeField(item.normalized.city, matched.city),
          country: mergeField(item.normalized.country, matched.country),
          owner_staff_id: matched.owner_staff_id || actor.staffMemberId,
          is_influencer: matched.is_influencer,
          is_media: matched.is_media,
          primary_source_type: "business_card",
          updated_at: new Date().toISOString(),
        })
        .eq("id", matched.id);

      if (updateResult.error) {
        throw updateResult.error;
      }

      savedContactId = matched.id;
      saveAction = "updated-contact";
    }
  } else {
    const insertContact = await supabase
      .from("contacts")
      .insert({
        name: item.normalized.name || "이름 미상",
        company: item.normalized.company || null,
        job_title: item.normalized.jobTitle || null,
        email: item.normalized.email || null,
        phone: item.normalized.phone || null,
        website: item.normalized.website || null,
        address: item.normalized.address || null,
        city: item.normalized.city || null,
        country: item.normalized.country || "Brazil",
        owner_staff_id: actor.staffMemberId,
        primary_source_type: "business_card",
        created_by: actor.userId,
      })
      .select("id")
      .single();

    if (insertContact.error) {
      throw insertContact.error;
    }

    savedContactId = insertContact.data.id;
    saveAction = "created-contact";
  }

  const businessCardPayload = {
    contact_id: savedContactId,
    image_original_path: item.storage.originalPath,
    image_preview_path: item.storage.previewPath,
    ocr_raw_text: item.rawText,
    extracted_json: item.normalized,
    language_hint: item.normalized.languageHint || "pt-BR",
    review_status: mergeSuggestion.action === "needs-review" ? "needs_review" : "captured",
    created_by: actor.userId,
  };
  const businessCardInsertWithActor = await supabase
    .from("business_cards")
    .insert(businessCardPayload)
    .select("id")
    .single();
  const businessCardInsert = isMissingColumnError(
    businessCardInsertWithActor.error,
    "created_by",
  )
    ? await supabase
        .from("business_cards")
        .insert({
          contact_id: savedContactId,
          image_original_path: item.storage.originalPath,
          image_preview_path: item.storage.previewPath,
          ocr_raw_text: item.rawText,
          extracted_json: item.normalized,
          language_hint: item.normalized.languageHint || "pt-BR",
          review_status: mergeSuggestion.action === "needs-review" ? "needs_review" : "captured",
        })
        .select("id")
        .single()
    : businessCardInsertWithActor;

  if (businessCardInsert.error) {
    throw businessCardInsert.error;
  }

  savedBusinessCardId = businessCardInsert.data.id;

  if (savedContactId) {
    await supabase.from("contact_audit_logs").insert({
      contact_id: savedContactId,
      actor_id: actor.userId,
      action:
        mergeSuggestion.action === "auto-merge" ? "business-card-auto-merge" : "business-card-create",
      payload: {
        businessCardId: savedBusinessCardId,
        actorDisplayName: actor.displayName,
        actorTeamName: actor.teamName || null,
        mergeAction: mergeSuggestion.action,
        reviewedBeforeSave: true,
      },
    });
  }

  return {
    ...item,
    mergeSuggestion,
    saved: {
      contactId: savedContactId,
      businessCardId: savedBusinessCardId,
      action: saveAction,
    },
  };
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await getOptionalActorContext();

  if (!actor) {
    return NextResponse.json(
      { ok: false, message: "로그인 후 OCR 업로드를 사용할 수 있습니다." },
      { status: 401 },
    );
  }

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
  const step = readText(formData, "step") || "analyze";

  if (step === "save") {
    const itemsText = readText(formData, "items");
    if (!itemsText) {
      return NextResponse.json(
        { ok: false, message: "저장할 분석 결과가 없습니다." },
        { status: 400 },
      );
    }

    const parsedItems = JSON.parse(itemsText) as Array<{
      clientId: string;
      fileName: string;
      rawText: string;
      normalized: Record<string, unknown>;
      storage: {
        originalPath: string;
        previewPath: string;
      };
    }>;

    const savedItems: Array<
      Awaited<ReturnType<typeof saveAnalyzedItem>>
    > = [];

    for (const item of parsedItems) {
      const normalized = normalizedCardSchema.parse(item.normalized);
      savedItems.push(
        await saveAnalyzedItem(
          {
            clientId: item.clientId,
            fileName: item.fileName,
            rawText: item.rawText,
            normalized,
            mergeSuggestion: {
              action: "create-new",
              score: 0,
              reasons: [],
            },
            storage: {
              originalBucket: "cards-original",
              originalPath: item.storage.originalPath,
              previewBucket: "cards-preview",
              previewPath: item.storage.previewPath,
            },
          },
          actor,
        ),
      );
    }

    return NextResponse.json({
      ok: true,
      message: `${savedItems.length}장의 명함을 확인 후 저장했습니다.`,
      items: savedItems,
    });
  }

  const rawFiles = formData.getAll("files");
  const files = rawFiles.filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    const single = formData.get("file");
    if (single instanceof File && single.size > 0) {
      files.push(single);
    }
  }

  if (files.length === 0) {
    return NextResponse.json(
      { ok: false, message: "업로드할 이미지 파일이 없습니다." },
      { status: 400 },
    );
  }

  let candidates: ContactRecord[] = [];
  try {
    candidates = await loadCandidates();
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: getErrorMessage(error) },
      { status: 500 },
    );
  }

  const items: AnalysisItem[] = [];

  for (const [index, file] of files.entries()) {
    try {
      items.push(await analyzeSingleFile(file, candidates, `${Date.now()}-${index}`));
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          message: `${file.name} 분석에 실패했습니다.`,
          detail: getErrorMessage(error),
        },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    message: `${items.length}장의 명함 분석을 완료했습니다. 저장 전에 내용을 한 번 더 확인해 주세요.`,
    items,
  });
}
