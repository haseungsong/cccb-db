"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActorContext, type ActorContext } from "@/lib/auth/actor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildContactsCsv, buildContactsExportEmailSubject, buildContactsExportEmailText, buildContactsExportFileName } from "@/lib/contacts/export";
import { getSearchableContacts } from "@/lib/contacts/queries";
import { buildContactSearchParams, normalizeContactSearchFilters } from "@/lib/contacts/search";
import { hasSmtpConfig, sendEmailWithAttachments } from "@/lib/email/smtp";
import { parseAudienceFilterJson } from "@/lib/ops/audience";

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
    cooperation: getText(formData, "cooperation"),
  });
}

async function resolveAudienceFilters(formData: FormData) {
  const audienceListId = getText(formData, "audienceListId");

  if (!audienceListId) {
    return {
      audienceListId: "",
      filters: getContactSearchFiltersFromFormData(formData),
    };
  }

  const supabase = createSupabaseAdminClient();
  const audienceListResult = await supabase
    .from("audience_lists")
    .select("id, filter_json")
    .eq("id", audienceListId)
    .single();

  if (audienceListResult.error) {
    if (isMissingTableError(audienceListResult.error)) {
      return {
        audienceListId: "",
        filters: getContactSearchFiltersFromFormData(formData),
      };
    }

    throw audienceListResult.error;
  }

  return {
    audienceListId,
    filters: parseAudienceFilterJson(audienceListResult.data.filter_json),
  };
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

function appendActorSummary(notes: string, actor: ActorContext) {
  const prefix = `[${actor.displayName}${actor.teamName ? ` / ${actor.teamName}` : ""}] `;
  return `${prefix}${notes}`.trim();
}

async function createAuditLog(
  contactId: string,
  action: string,
  payload: Record<string, unknown>,
  actor: ActorContext,
) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("contact_audit_logs").insert({
    contact_id: contactId,
    actor_id: actor.userId,
    action,
    payload: {
      ...payload,
      actorDisplayName: actor.displayName,
      actorTeamName: actor.teamName || null,
      actorEmail: actor.email || null,
    },
  });
}

export async function upsertContactAction(formData: FormData) {
  const actor = await requireActorContext();
  const supabase = createSupabaseAdminClient();
  const contactId = getText(formData, "contactId");
  const redirectTo = getText(formData, "redirectTo");
  const explicitOwnerStaffId = getNullableText(formData, "ownerStaffId");

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
    cooperation_level: getNullableText(formData, "cooperationLevel"),
    category_id: getNullableText(formData, "categoryId"),
    owner_staff_id: explicitOwnerStaffId ?? actor.staffMemberId,
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
          created_by: actor.userId,
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
  }, actor);

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
  await requireActorContext();
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
  const actor = await requireActorContext();
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

  await createAuditLog(contactId, "event-link-update", { eventId }, actor);

  revalidatePath("/events");
  revalidatePath("/cards");
  revalidatePath(`/cards/${contactId}`);
  revalidatePath("/insights");

  if (redirectTo) {
    redirect(redirectTo);
  }
}

export async function removeContactEventAction(formData: FormData) {
  const actor = await requireActorContext();
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

  await createAuditLog(contactId, "event-link-remove", { eventId }, actor);

  revalidatePath("/events");
  revalidatePath("/cards");
  revalidatePath(`/cards/${contactId}`);
  revalidatePath("/insights");

  if (redirectTo) {
    redirect(redirectTo);
  }
}

export async function updateBusinessCardReviewAction(formData: FormData) {
  const actor = await requireActorContext();
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

  const cardResult = await supabase
    .from("business_cards")
    .select("contact_id")
    .eq("id", cardId)
    .maybeSingle();

  if (cardResult.error) {
    throw cardResult.error;
  }

  if (cardResult.data?.contact_id) {
    await createAuditLog(
      cardResult.data.contact_id,
      "business-card-review-update",
      { cardId, reviewStatus },
      actor,
    );
  }

  revalidatePath("/review");
  revalidatePath("/cards");
  revalidatePath("/insights");

  if (redirectTo) {
    redirect(redirectTo);
  }
}

export async function mergeContactsAction(formData: FormData) {
  const actor = await requireActorContext();
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
    cooperation_level: primary.cooperation_level || secondary.cooperation_level,
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
  }, actor);

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
  await requireActorContext();
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

export async function saveAudienceListAction(formData: FormData) {
  await requireActorContext();
  const supabase = createSupabaseAdminClient();
  const filters = getContactSearchFiltersFromFormData(formData);
  const contacts = await getSearchableContacts(filters);
  const name = getText(formData, "listName") || "새 대상 리스트";
  const description = getText(formData, "description");

  const insertResult = await supabase
    .from("audience_lists")
    .insert({
      name,
      description: description || null,
      filter_json: filters,
      result_count: contacts.length,
    })
    .select("id")
    .single();

  if (insertResult.error) {
    throw insertResult.error;
  }

  revalidatePath("/broadcasts");
  redirect(`/broadcasts?listId=${insertResult.data.id}&broadcastStatus=list-saved`);
}

export async function createContactFollowupAction(formData: FormData) {
  const actor = await requireActorContext();
  const supabase = createSupabaseAdminClient();
  const contactId = getText(formData, "contactId");
  const redirectTo = getText(formData, "redirectTo");

  if (!contactId) {
    return;
  }

  const insertResult = await supabase.from("contact_followups").insert({
    contact_id: contactId,
    channel: getText(formData, "channel") || "email",
    status: getText(formData, "status") || "planned",
    summary: getText(formData, "summary") || "팔로업",
    notes: getNullableText(formData, "notes"),
    owner_label: getNullableText(formData, "ownerLabel") || actor.displayName,
    next_follow_up_at: getNullableText(formData, "nextFollowUpAt"),
  });

  if (insertResult.error) {
    throw insertResult.error;
  }

  await createAuditLog(contactId, "followup-create", { summary: getText(formData, "summary") }, actor);

  revalidatePath(`/cards/${contactId}`);
  revalidatePath("/events");
  revalidatePath("/insights");
  revalidatePath("/broadcasts");

  if (redirectTo) {
    redirect(redirectTo);
  }
}

export async function completeContactFollowupAction(formData: FormData) {
  const actor = await requireActorContext();
  const supabase = createSupabaseAdminClient();
  const followupId = getText(formData, "followupId");
  const contactId = getText(formData, "contactId");
  const redirectTo = getText(formData, "redirectTo");

  if (!followupId) {
    return;
  }

  const updateResult = await supabase
    .from("contact_followups")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
    })
    .eq("id", followupId);

  if (updateResult.error) {
    throw updateResult.error;
  }

  if (contactId) {
    await createAuditLog(contactId, "followup-complete", { followupId }, actor);
  }

  if (contactId) {
    revalidatePath(`/cards/${contactId}`);
  }
  revalidatePath("/events");
  revalidatePath("/insights");
  revalidatePath("/broadcasts");

  if (redirectTo) {
    redirect(redirectTo);
  }
}

export async function sendBroadcastEmailAction(formData: FormData) {
  const actor = await requireActorContext();
  const supabase = createSupabaseAdminClient();
  const recipient = getText(formData, "recipient");
  const title = getText(formData, "title") || "CCCB 대표 메일 발송";
  const notes = getText(formData, "notes");
  const { audienceListId, filters } = await resolveAudienceFilters(formData);
  const params = buildContactSearchParams(filters);

  if (!recipient) {
    params.set("broadcastStatus", "missing-recipient");
    redirect(`/broadcasts?${params.toString()}`);
  }

  if (!hasSmtpConfig()) {
    params.set("broadcastStatus", "smtp-missing");
    redirect(`/broadcasts?${params.toString()}`);
  }

  const contacts = await getSearchableContacts(filters);
  const csv = buildContactsCsv(contacts);

  await sendEmailWithAttachments({
    to: recipient,
    subject: title || buildContactsExportEmailSubject(filters),
    text: buildContactsExportEmailText(contacts, filters),
    attachments: [
      {
        filename: buildContactsExportFileName(filters),
        content: csv,
        contentType: "text/csv; charset=utf-8",
      },
    ],
  });

  const insertResult = await supabase.from("outreach_campaigns").insert({
    title,
    channel: "email",
    audience_list_id: audienceListId || null,
    filter_json: filters,
    recipient_email: recipient,
    recipient_count: contacts.length,
    status: "sent",
    notes: appendActorSummary(notes || "대표 메일 발송", actor),
  });

  if (insertResult.error && !isMissingTableError(insertResult.error)) {
    throw insertResult.error;
  }

  revalidatePath("/broadcasts");
  params.set("broadcastStatus", "sent");
  params.set("emailedTo", recipient);
  redirect(`/broadcasts?${params.toString()}`);
}

export async function createWhatsAppTestAction(formData: FormData) {
  const actor = await requireActorContext();
  const supabase = createSupabaseAdminClient();
  const title = getText(formData, "title") || "WhatsApp 테스트 준비";
  const notes = getText(formData, "notes");
  const { audienceListId, filters } = await resolveAudienceFilters(formData);
  const contacts = await getSearchableContacts(filters);

  const insertResult = await supabase.from("outreach_campaigns").insert({
    title,
    channel: "whatsapp_test",
    audience_list_id: audienceListId || null,
    filter_json: filters,
    recipient_count: contacts.length,
    status: "prepared",
    notes: appendActorSummary(notes || "대표 메일 발송 전 WhatsApp 테스트 준비", actor),
  });

  if (insertResult.error && !isMissingTableError(insertResult.error)) {
    throw insertResult.error;
  }

  revalidatePath("/broadcasts");
  const params = buildContactSearchParams(filters);
  params.set("broadcastStatus", "whatsapp-prepared");
  redirect(`/broadcasts?${params.toString()}`);
}
