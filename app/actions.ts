"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildContactsCsv, buildContactsExportEmailSubject, buildContactsExportEmailText, buildContactsExportFileName } from "@/lib/contacts/export";
import { getSearchableContacts } from "@/lib/contacts/queries";
import { buildContactSearchParams, normalizeContactSearchFilters } from "@/lib/contacts/search";
import { hasSmtpConfig, sendEmailWithAttachments } from "@/lib/email/smtp";

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  return candidate.code === "PGRST205" || candidate.message?.includes("schema cache") === true;
}

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNullableText(formData: FormData, key: string) {
  const value = getText(formData, key);
  return value || null;
}

function getBoolean(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function getContactSearchFiltersFromFormData(formData: FormData) {
  return normalizeContactSearchFilters({
    q: getText(formData, "q"),
    category: getText(formData, "category"),
    owner: getText(formData, "owner"),
    event: getText(formData, "event"),
    source: getText(formData, "source"),
    tag: getText(formData, "tag"),
    influencer: getText(formData, "influencer"),
    media: getText(formData, "media"),
    hasCard: getText(formData, "hasCard"),
    hasPhoto: getText(formData, "hasPhoto"),
    status: getText(formData, "status"),
  });
}

function getTagNames(rawValue: string) {
  return Array.from(
    new Set(
      rawValue
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

async function ensureTags(rawValue: string) {
  const names = getTagNames(rawValue);

  if (names.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tags")
    .upsert(
      names.map((name) => ({ name })),
      { onConflict: "name" },
    )
    .select("id, name");

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }

  return data ?? [];
}

async function replaceContactTags(contactId: string, rawValue: string) {
  const supabase = createSupabaseAdminClient();
  const tags = await ensureTags(rawValue);

  const { error: deleteError } = await supabase
    .from("contact_tags")
    .delete()
    .eq("contact_id", contactId);

  if (deleteError) {
    if (isMissingTableError(deleteError)) {
      return;
    }
    throw deleteError;
  }

  if (tags.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from("contact_tags").insert(
    tags.map((tag) => ({
      contact_id: contactId,
      tag_id: tag.id,
    })),
  );

  if (insertError) {
    if (isMissingTableError(insertError)) {
      return;
    }
    throw insertError;
  }
}

async function replaceEventTags(eventId: string, rawValue: string) {
  const supabase = createSupabaseAdminClient();
  const tags = await ensureTags(rawValue);

  const { error: deleteError } = await supabase
    .from("event_tags")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) {
    if (isMissingTableError(deleteError)) {
      return;
    }
    throw deleteError;
  }

  if (tags.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from("event_tags").insert(
    tags.map((tag) => ({
      event_id: eventId,
      tag_id: tag.id,
    })),
  );

  if (insertError) {
    if (isMissingTableError(insertError)) {
      return;
    }
    throw insertError;
  }
}

async function createAuditLog(contactId: string, action: string, payload: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("contact_audit_logs").insert({
    contact_id: contactId,
    action,
    payload,
  });
}

export async function upsertContactAction(formData: FormData) {
  const supabase = createSupabaseAdminClient();
  const contactId = getText(formData, "contactId");
  const redirectTo = getText(formData, "redirectTo");

  const payload = {
    name: getText(formData, "name") || "이름 미상",
    company: getNullableText(formData, "company"),
    job_title: getNullableText(formData, "jobTitle"),
    email: getNullableText(formData, "email"),
    phone: getNullableText(formData, "phone"),
    website: getNullableText(formData, "website"),
    address: getNullableText(formData, "address"),
    city: getNullableText(formData, "city"),
    country: getNullableText(formData, "country") ?? "Brazil",
    category_id: getNullableText(formData, "categoryId"),
    owner_staff_id: getNullableText(formData, "ownerStaffId"),
    is_influencer: getBoolean(formData, "isInfluencer"),
    is_media: getBoolean(formData, "isMedia"),
    contact_status: getText(formData, "contactStatus") || "active",
    primary_source_type: getText(formData, "sourceType") || "manual",
    updated_at: new Date().toISOString(),
  };

  const result = contactId
    ? await supabase
        .from("contacts")
        .update(payload)
        .eq("id", contactId)
        .select("id")
        .single()
    : await supabase
        .from("contacts")
        .insert({
          ...payload,
          primary_source_type: payload.primary_source_type || "manual",
        })
        .select("id")
        .single();

  if (result.error) {
    throw result.error;
  }

  const savedContactId = result.data.id;
  await replaceContactTags(savedContactId, getText(formData, "tags"));
  await createAuditLog(savedContactId, contactId ? "manual-update" : "manual-create", {
    source: "contact-form",
  });

  revalidatePath("/");
  revalidatePath("/cards");
  revalidatePath("/insights");
  revalidatePath(`/cards/${savedContactId}`);
  revalidatePath("/review");

  if (redirectTo) {
    redirect(redirectTo.replace(":id", savedContactId));
  }
}

export async function createEventAction(formData: FormData) {
  const supabase = createSupabaseAdminClient();
  const redirectTo = getText(formData, "redirectTo");

  const { data, error } = await supabase
    .from("events")
    .insert({
      name: getText(formData, "name") || "행사 미상",
      event_date: getNullableText(formData, "eventDate"),
      location: getNullableText(formData, "location"),
      source_sheet_name: getNullableText(formData, "sourceSheetName"),
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  await replaceEventTags(data.id, getText(formData, "tags"));

  revalidatePath("/events");
  revalidatePath("/cards");
  revalidatePath("/insights");

  if (redirectTo) {
    redirect(redirectTo);
  }
}

export async function addContactToEventAction(formData: FormData) {
  const supabase = createSupabaseAdminClient();
  const contactId = getText(formData, "contactId");
  const eventId = getText(formData, "eventId");
  const redirectTo = getText(formData, "redirectTo");

  if (!contactId || !eventId) {
    return;
  }

  const { error } = await supabase.from("contact_events").upsert(
    {
      contact_id: contactId,
      event_id: eventId,
      invite_status: getNullableText(formData, "inviteStatus"),
      attendance_status: getNullableText(formData, "attendanceStatus"),
      notes: getNullableText(formData, "notes"),
    },
    { onConflict: "contact_id,event_id" },
  );

  if (error) {
    throw error;
  }

  await createAuditLog(contactId, "event-link-update", { eventId });

  revalidatePath("/events");
  revalidatePath("/cards");
  revalidatePath(`/cards/${contactId}`);
  revalidatePath("/insights");

  if (redirectTo) {
    redirect(redirectTo);
  }
}

export async function removeContactEventAction(formData: FormData) {
  const supabase = createSupabaseAdminClient();
  const contactId = getText(formData, "contactId");
  const eventId = getText(formData, "eventId");
  const redirectTo = getText(formData, "redirectTo");

  if (!contactId || !eventId) {
    return;
  }

  const { error } = await supabase
    .from("contact_events")
    .delete()
    .eq("contact_id", contactId)
    .eq("event_id", eventId);

  if (error) {
    throw error;
  }

  await createAuditLog(contactId, "event-link-remove", { eventId });

  revalidatePath("/events");
  revalidatePath("/cards");
  revalidatePath(`/cards/${contactId}`);
  revalidatePath("/insights");

  if (redirectTo) {
    redirect(redirectTo);
  }
}

export async function updateBusinessCardReviewAction(formData: FormData) {
  const supabase = createSupabaseAdminClient();
  const cardId = getText(formData, "cardId");
  const reviewStatus = getText(formData, "reviewStatus") || "pending";
  const redirectTo = getText(formData, "redirectTo");

  if (!cardId) {
    return;
  }

  const { error } = await supabase
    .from("business_cards")
    .update({ review_status: reviewStatus })
    .eq("id", cardId);

  if (error) {
    throw error;
  }

  revalidatePath("/review");
  revalidatePath("/cards");
  revalidatePath("/insights");

  if (redirectTo) {
    redirect(redirectTo);
  }
}

export async function mergeContactsAction(formData: FormData) {
  const supabase = createSupabaseAdminClient();
  const primaryId = getText(formData, "primaryId");
  const secondaryId = getText(formData, "secondaryId");
  const redirectTo = getText(formData, "redirectTo");

  if (!primaryId || !secondaryId || primaryId === secondaryId) {
    return;
  }

  const [primaryResult, secondaryResult] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", primaryId).single(),
    supabase.from("contacts").select("*").eq("id", secondaryId).single(),
  ]);

  if (primaryResult.error) {
    throw primaryResult.error;
  }

  if (secondaryResult.error) {
    throw secondaryResult.error;
  }

  const primary = primaryResult.data;
  const secondary = secondaryResult.data;

  const mergedPayload = {
    name: primary.name || secondary.name,
    company: primary.company || secondary.company,
    job_title: primary.job_title || secondary.job_title,
    email: primary.email || secondary.email,
    phone: primary.phone || secondary.phone,
    website: primary.website || secondary.website,
    address: primary.address || secondary.address,
    city: primary.city || secondary.city,
    country: primary.country || secondary.country,
    category_id: primary.category_id || secondary.category_id,
    owner_staff_id: primary.owner_staff_id || secondary.owner_staff_id,
    is_influencer: primary.is_influencer || secondary.is_influencer,
    is_media: primary.is_media || secondary.is_media,
    contact_status: primary.contact_status || secondary.contact_status,
    primary_source_type: primary.primary_source_type || secondary.primary_source_type,
    updated_at: new Date().toISOString(),
  };

  const { error: updatePrimaryError } = await supabase
    .from("contacts")
    .update(mergedPayload)
    .eq("id", primaryId);

  if (updatePrimaryError) {
    throw updatePrimaryError;
  }

  const [secondaryEvents, secondaryTags] = await Promise.all([
    supabase
      .from("contact_events")
      .select("event_id, invite_status, attendance_status, notes")
      .eq("contact_id", secondaryId),
    supabase.from("contact_tags").select("tag_id").eq("contact_id", secondaryId),
  ]);

  if (secondaryEvents.error) {
    throw secondaryEvents.error;
  }

  if (secondaryTags.error) {
    throw secondaryTags.error;
  }

  if ((secondaryEvents.data ?? []).length > 0) {
    const { error } = await supabase.from("contact_events").upsert(
      (secondaryEvents.data ?? []).map((row) => ({
        contact_id: primaryId,
        event_id: row.event_id,
        invite_status: row.invite_status,
        attendance_status: row.attendance_status,
        notes: row.notes,
      })),
      { onConflict: "contact_id,event_id" },
    );

    if (error) {
      throw error;
    }
  }

  if ((secondaryTags.data ?? []).length > 0) {
    const { error } = await supabase.from("contact_tags").upsert(
      (secondaryTags.data ?? []).map((row) => ({
        contact_id: primaryId,
        tag_id: row.tag_id,
      })),
      { onConflict: "contact_id,tag_id" },
    );

    if (error) {
      throw error;
    }
  }

  const relinkTasks = [
    supabase.from("business_cards").update({ contact_id: primaryId }).eq("contact_id", secondaryId),
    supabase.from("contact_images").update({ contact_id: primaryId }).eq("contact_id", secondaryId),
    supabase.from("legacy_rows").update({ mapped_contact_id: primaryId }).eq("mapped_contact_id", secondaryId),
  ];

  const relinkResults = await Promise.all(relinkTasks);
  relinkResults.forEach((result) => {
    if (result.error) {
      throw result.error;
    }
  });

  await createAuditLog(primaryId, "contact-merge", {
    mergedFrom: secondaryId,
  });

  await supabase.from("contact_events").delete().eq("contact_id", secondaryId);
  await supabase.from("contact_tags").delete().eq("contact_id", secondaryId);

  const { error: deleteError } = await supabase
    .from("contacts")
    .delete()
    .eq("id", secondaryId);

  if (deleteError) {
    throw deleteError;
  }

  revalidatePath("/cards");
  revalidatePath(`/cards/${primaryId}`);
  revalidatePath("/review");
  revalidatePath("/events");
  revalidatePath("/insights");

  if (redirectTo) {
    redirect(redirectTo.replace(":id", primaryId));
  }
}

export async function sendContactExportEmailAction(formData: FormData) {
  const recipient = getText(formData, "recipient");
  const filters = getContactSearchFiltersFromFormData(formData);
  const params = buildContactSearchParams(filters);

  if (!recipient) {
    params.set("exportStatus", "missing-recipient");
    redirect(`/cards?${params.toString()}`);
  }

  if (!hasSmtpConfig()) {
    params.set("exportStatus", "smtp-missing");
    redirect(`/cards?${params.toString()}`);
  }

  const contacts = await getSearchableContacts(filters);
  const csv = buildContactsCsv(contacts);

  await sendEmailWithAttachments({
    to: recipient,
    subject: buildContactsExportEmailSubject(filters),
    text: buildContactsExportEmailText(contacts, filters),
    attachments: [
      {
        filename: buildContactsExportFileName(filters),
        content: csv,
        contentType: "text/csv; charset=utf-8",
      },
    ],
  });

  params.set("exportStatus", "sent");
  params.set("emailedTo", recipient);
  redirect(`/cards?${params.toString()}`);
}
