import type { SupabaseClient } from "@supabase/supabase-js";

function getImageExtension(file: File) {
  switch (file.type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

export async function saveContactProfilePhoto(
  supabase: SupabaseClient,
  contactId: string,
  file: File,
) {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  const extension = getImageExtension(file);
  const path = `${contactId}/${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const existingImages = await supabase
    .from("contact_images")
    .select("id")
    .eq("contact_id", contactId)
    .eq("image_kind", "profile");

  if (existingImages.error) {
    throw existingImages.error;
  }

  const uploadResult = await supabase.storage.from("contact-photos").upload(path, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  const resetPrimary = await supabase
    .from("contact_images")
    .update({ is_primary: false })
    .eq("contact_id", contactId)
    .eq("image_kind", "profile");

  if (resetPrimary.error) {
    throw resetPrimary.error;
  }

  const insertResult = await supabase
    .from("contact_images")
    .insert({
      contact_id: contactId,
      storage_path: path,
      image_kind: "profile",
      is_primary: true,
    })
    .select("id, storage_path")
    .single();

  if (insertResult.error) {
    throw insertResult.error;
  }

  return {
    id: insertResult.data.id,
    storagePath: insertResult.data.storage_path,
    previousCount: (existingImages.data ?? []).length,
  };
}
