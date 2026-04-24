import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extractLegacyWorkbookData,
  type LegacyMappedRow,
} from "@/lib/import/mapLegacyExcel";
import {
  normalizePhone,
  normalizeText,
  scoreContactMatch,
  type ExistingContactCandidate,
} from "@/lib/contacts/mergeContact";
import { extractCooperationLevelFromRecord } from "@/lib/contacts/cooperation";
import { normalizeStaffKey, normalizeStaffName } from "@/lib/staff/normalize";
import type { NormalizedCard } from "@/lib/validators/card";

type AdminClient = SupabaseClient;

type ContactRow = ExistingContactCandidate & {
  job_title: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  cooperation_level: string | null;
  is_influencer: boolean;
  is_media: boolean;
};

type CategoryRow = {
  id: string;
  name: string;
};

type StaffRow = {
  id: string;
  name: string;
};

type EventRow = {
  id: string;
  name: string;
  source_sheet_name: string | null;
};

type ContactEventRow = {
  contact_id: string;
  event_id: string;
  invite_status: string | null;
  attendance_status: string | null;
  notes: string | null;
};

type PendingContact = {
  key: string;
  payload: {
    name: string;
    company: string | null;
    job_title: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    category_id: string | null;
    owner_staff_id: string | null;
    cooperation_level: string | null;
    is_influencer: boolean;
    is_media: boolean;
    primary_source_type: string;
  };
};

type ContactMergeBase = {
  name: string | null;
  company: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address?: string | null;
  city?: string | null;
  category_id?: string | null;
  owner_staff_id?: string | null;
  cooperation_level?: string | null;
  is_influencer: boolean;
  is_media: boolean;
  primary_source_type?: string;
};

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function buildNormalizedCardFromLegacyRow(row: LegacyMappedRow): NormalizedCard {
  return {
    name: row.name,
    company: row.company,
    jobTitle: row.jobTitle,
    email: row.email,
    phone: row.phone,
    website: row.socialUrl,
    address: row.address,
    city: row.city,
    country: "Brazil",
    notes: row.eventName ? `source_event: ${row.eventName}` : "",
    languageHint: "pt-BR",
  };
}

function buildContactPayload(
  row: LegacyMappedRow,
  categoryId: string | null,
  ownerStaffId: string | null,
) {
  return {
    name: row.name || row.company || "이름 미상",
    company: row.company || null,
    job_title: row.jobTitle || null,
    email: row.email || null,
    phone: row.phone || null,
    website: row.socialUrl || null,
    address: row.address || null,
    city: row.city || null,
    category_id: categoryId,
    owner_staff_id: ownerStaffId,
    cooperation_level:
      row.cooperationLevel || extractCooperationLevelFromRecord(row.rawRecord) || null,
    is_influencer: row.isInfluencer,
    is_media: row.isMedia,
    primary_source_type: "legacy_import",
  };
}

function mergeContactPayload(
  base: ContactMergeBase,
  incoming: PendingContact["payload"],
): PendingContact["payload"] {
  return {
    name: incoming.name || base.name || "이름 미상",
    company: incoming.company || base.company,
    job_title: incoming.job_title || base.job_title,
    email: incoming.email || base.email,
    phone: incoming.phone || base.phone,
    website: incoming.website || base.website,
    address: incoming.address || base.address || null,
    city: incoming.city || base.city || null,
    category_id: incoming.category_id || base.category_id || null,
    owner_staff_id: incoming.owner_staff_id || base.owner_staff_id || null,
    cooperation_level: incoming.cooperation_level || base.cooperation_level || null,
    is_influencer: base.is_influencer || incoming.is_influencer,
    is_media: base.is_media || incoming.is_media,
    primary_source_type:
      incoming.primary_source_type || base.primary_source_type || "legacy_import",
  };
}

function isSharedMailbox(email: string) {
  const normalized = email.toLowerCase();

  return [
    "info@",
    "contato@",
    "contact@",
    "admin@",
    "imprensa@",
    "agenda@",
    "agendasmc@",
    "secretaria@",
    "comunicacao@",
    "atendimento@",
  ].some((prefix) => normalized.startsWith(prefix));
}

function getIdentityKey(row: LegacyMappedRow) {
  const normalizedPhone = normalizePhone(row.phone);

  if (row.email && !isSharedMailbox(row.email)) {
    return `email:${row.email.toLowerCase()}`;
  }

  if (normalizedPhone.length >= 8 && row.name) {
    return `phone-name:${normalizedPhone}::${normalizeText(row.name)}`;
  }

  if (row.name && row.company) {
    return `name-company:${normalizeText(row.name)}::${normalizeText(row.company)}`;
  }

  if (row.email && row.name) {
    return `shared-email-name:${row.email.toLowerCase()}::${normalizeText(row.name)}`;
  }

  return `row:${row.sheetName}:${row.rowNumber}`;
}

function buildExistingContactMaps(existingContacts: ContactRow[]) {
  const emailMap = new Map<string, string>();
  const phoneMap = new Map<string, string>();
  const nameCompanyMap = new Map<string, string>();
  const byId = new Map<string, ContactRow>();

  existingContacts.forEach((contact) => {
    byId.set(contact.id, contact);

    if (contact.email) {
      emailMap.set(contact.email.toLowerCase(), contact.id);
    }

    if (contact.phone) {
      const normalized = normalizePhone(contact.phone);

      if (normalized.length >= 8) {
        phoneMap.set(normalized, contact.id);
      }
    }

    if (contact.name && contact.company) {
      nameCompanyMap.set(
        `${normalizeText(contact.name)}::${normalizeText(contact.company)}`,
        contact.id,
      );
    }
  });

  return { byId, emailMap, phoneMap, nameCompanyMap };
}

function findExistingContactId(
  row: LegacyMappedRow,
  maps: ReturnType<typeof buildExistingContactMaps>,
) {
  if (row.email && !isSharedMailbox(row.email)) {
    const byEmail = maps.emailMap.get(row.email.toLowerCase());

    if (byEmail) {
      return byEmail;
    }
  }

  const normalizedPhone = normalizePhone(row.phone);

  if (normalizedPhone.length >= 8) {
    const byPhone = maps.phoneMap.get(normalizedPhone);

    if (byPhone) {
      const existingByPhone = maps.byId.get(byPhone);

      if (
        existingByPhone &&
        ((row.name &&
          existingByPhone.name &&
          normalizeText(row.name) === normalizeText(existingByPhone.name)) ||
          (row.company &&
            existingByPhone.company &&
            normalizeText(row.company) ===
              normalizeText(existingByPhone.company)))
      ) {
        return byPhone;
      }
    }
  }

  if (row.email && row.name) {
    const sameEmailAndName = Array.from(maps.byId.values()).find(
      (contact) =>
        contact.email?.toLowerCase() === row.email.toLowerCase() &&
        contact.name &&
        normalizeText(contact.name) === normalizeText(row.name),
    );

    if (sameEmailAndName) {
      return sameEmailAndName.id;
    }
  }

  if (row.name && row.company) {
    return (
      maps.nameCompanyMap.get(
        `${normalizeText(row.name)}::${normalizeText(row.company)}`,
      ) ?? null
    );
  }

  return null;
}

async function ensureCategories(
  supabase: AdminClient,
  rows: LegacyMappedRow[],
) {
  const names = Array.from(
    new Set(rows.map((row) => row.category.trim()).filter(Boolean)),
  );

  if (names.length === 0) {
    return { map: new Map<string, string>(), createdCount: 0 };
  }

  const existing = await supabase.from("categories").select("id, name");
  const existingRows = (existing.data ?? []) as CategoryRow[];
  const existingMap = new Map(
    existingRows.map((row) => [normalizeText(row.name), row.id]),
  );

  const missing = names.filter((name) => !existingMap.has(normalizeText(name)));
  let createdCount = 0;

  if (missing.length > 0) {
    const insertResult = await supabase.from("categories").insert(
      missing.map((name, index) => ({
        name,
        sort_order: index,
      })),
    );

    if (insertResult.error) {
      throw insertResult.error;
    }

    createdCount = missing.length;
  }

  const refreshed = await supabase.from("categories").select("id, name");
  const refreshedRows = (refreshed.data ?? []) as CategoryRow[];

  return {
    map: new Map(refreshedRows.map((row) => [normalizeText(row.name), row.id])),
    createdCount,
  };
}

async function ensureStaffMembers(
  supabase: AdminClient,
  rows: LegacyMappedRow[],
) {
  const names = Array.from(
    new Set(rows.map((row) => normalizeStaffName(row.ownerStaff)).filter(Boolean)),
  );

  if (names.length === 0) {
    return { map: new Map<string, string>(), createdCount: 0 };
  }

  const existing = await supabase.from("staff_members").select("id, name");
  const existingRows = (existing.data ?? []) as StaffRow[];
  const existingMap = new Map(
    existingRows.map((row) => [normalizeStaffKey(row.name), row.id]),
  );

  const missing = names.filter((name) => !existingMap.has(normalizeStaffKey(name)));

  let createdCount = 0;

  for (const name of missing) {
    const insertResult = await supabase
      .from("staff_members")
      .insert({ name, role: "editor" })
      .select("id, name")
      .single();

    if (insertResult.error) {
      throw insertResult.error;
    }

    existingMap.set(normalizeStaffKey(name), insertResult.data.id);
    createdCount += 1;
  }

  return { map: existingMap, createdCount };
}

async function ensureEvents(
  supabase: AdminClient,
  rows: LegacyMappedRow[],
) {
  const definitions = Array.from(
    new Set(
      rows
        .filter((row) => row.eventName)
        .map((row) => `${row.eventName}::${row.sheetName}`),
    ),
  ).map((value) => {
    const [name, sourceSheetName] = value.split("::");
    return { name, sourceSheetName };
  });

  const existing = await supabase.from("events").select("id, name, source_sheet_name");
  const existingRows = (existing.data ?? []) as EventRow[];
  const eventMap = new Map(
    existingRows.map((row) => [
      `${normalizeText(row.name)}::${normalizeText(row.source_sheet_name ?? "")}`,
      row.id,
    ]),
  );

  let createdCount = 0;

  for (const definition of definitions) {
    const key = `${normalizeText(definition.name)}::${normalizeText(
      definition.sourceSheetName,
    )}`;

    if (eventMap.has(key)) {
      continue;
    }

    const insertResult = await supabase
      .from("events")
      .insert({
        name: definition.name,
        source_sheet_name: definition.sourceSheetName,
      })
      .select("id")
      .single();

    if (insertResult.error) {
      throw insertResult.error;
    }

    eventMap.set(key, insertResult.data.id);
    createdCount += 1;
  }

  return { map: eventMap, createdCount };
}

async function deleteRowsByIds(
  supabase: AdminClient,
  table: string,
  ids: string[],
) {
  for (const idChunk of chunk(ids, 200)) {
    const deleteResult = await supabase.from(table).delete().in("id", idChunk);

    if (deleteResult.error) {
      throw deleteResult.error;
    }
  }
}

function buildSafeDeduplicationKey(contact: ContactRow) {
  const normalizedName = contact.name ? normalizeText(contact.name) : "";
  const normalizedEmail = contact.email?.toLowerCase().trim() ?? "";
  const normalizedPhone = normalizePhone(contact.phone ?? "");
  const normalizedCompany = contact.company ? normalizeText(contact.company) : "";

  if (normalizedName && normalizedPhone.length >= 8) {
    return `phone-name:${normalizedPhone}::${normalizedName}`;
  }

  if (normalizedName && normalizedEmail && !isSharedMailbox(normalizedEmail)) {
    return `email-name:${normalizedEmail}::${normalizedName}`;
  }

  if (normalizedName && normalizedCompany) {
    return `name-company:${normalizedName}::${normalizedCompany}`;
  }

  return "";
}

function scoreContactCompleteness(contact: ContactRow) {
  return [
    contact.name,
    contact.company,
    contact.email,
    contact.phone,
    contact.job_title,
    contact.website,
    contact.address,
    contact.city,
  ].filter(Boolean).length;
}

async function mergeDuplicateLegacyContacts(supabase: AdminClient) {
  const contactsResult = await supabase
    .from("contacts")
    .select(
      "id, name, company, email, phone, job_title, website, address, city, country, cooperation_level, is_influencer, is_media",
    )
    .eq("primary_source_type", "legacy_import");

  if (contactsResult.error) {
    throw contactsResult.error;
  }

  const contacts = (contactsResult.data ?? []) as ContactRow[];
  const grouped = new Map<string, ContactRow[]>();

  contacts.forEach((contact) => {
    const key = buildSafeDeduplicationKey(contact);

    if (!key) {
      return;
    }

    grouped.set(key, [...(grouped.get(key) ?? []), contact]);
  });

  let mergedCount = 0;

  for (const group of grouped.values()) {
    if (group.length < 2) {
      continue;
    }

    const sorted = [...group].sort(
      (left, right) => scoreContactCompleteness(right) - scoreContactCompleteness(left),
    );
    const canonical = sorted[0];
    const duplicates = sorted.slice(1);
    const mergedPayload = sorted.reduce<ContactMergeBase>(
      (accumulator, contact) => mergeContactPayload(accumulator, {
        name: contact.name || "이름 미상",
        company: contact.company,
        job_title: contact.job_title,
        email: contact.email,
        phone: contact.phone,
        website: contact.website,
        address: contact.address ?? null,
        city: contact.city ?? null,
        category_id: null,
        owner_staff_id: null,
        cooperation_level: contact.cooperation_level ?? null,
        is_influencer: contact.is_influencer,
        is_media: contact.is_media,
        primary_source_type: "legacy_import",
      }),
      canonical,
    );

    const canonicalUpdate = await supabase
      .from("contacts")
      .update({
        ...mergedPayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", canonical.id);

    if (canonicalUpdate.error) {
      throw canonicalUpdate.error;
    }

    for (const duplicate of duplicates) {
      const eventRowsResult = await supabase
        .from("contact_events")
        .select("contact_id, event_id, invite_status, attendance_status, notes")
        .eq("contact_id", duplicate.id);

      if (eventRowsResult.error) {
        throw eventRowsResult.error;
      }

      const eventRows = (eventRowsResult.data ?? []) as ContactEventRow[];

      if (eventRows.length > 0) {
        const eventUpsert = await supabase.from("contact_events").upsert(
          eventRows.map((row) => ({
            ...row,
            contact_id: canonical.id,
          })),
          { onConflict: "contact_id,event_id", ignoreDuplicates: true },
        );

        if (eventUpsert.error) {
          throw eventUpsert.error;
        }

        const eventDelete = await supabase
          .from("contact_events")
          .delete()
          .eq("contact_id", duplicate.id);

        if (eventDelete.error) {
          throw eventDelete.error;
        }
      }

      const legacyRowUpdate = await supabase
        .from("legacy_rows")
        .update({ mapped_contact_id: canonical.id })
        .eq("mapped_contact_id", duplicate.id);

      if (legacyRowUpdate.error) {
        throw legacyRowUpdate.error;
      }

      const contactDelete = await supabase
        .from("contacts")
        .delete()
        .eq("id", duplicate.id);

      if (contactDelete.error) {
        throw contactDelete.error;
      }

      mergedCount += 1;
    }
  }

  return mergedCount;
}

export async function resetLegacyImportData(supabase: AdminClient) {
  const [legacyContacts, batches, events, legacyRows] = await Promise.all([
    supabase
      .from("contacts")
      .select("id")
      .eq("primary_source_type", "legacy_import"),
    supabase.from("import_batches").select("id"),
    supabase.from("events").select("id"),
    supabase.from("legacy_rows").select("id"),
  ]);

  if (legacyContacts.error) throw legacyContacts.error;
  if (batches.error) throw batches.error;
  if (events.error) throw events.error;
  if (legacyRows.error) throw legacyRows.error;

  const contactEventsDelete = await supabase
    .from("contact_events")
    .delete()
    .neq("contact_id", "00000000-0000-0000-0000-000000000000");

  if (contactEventsDelete.error) {
    throw contactEventsDelete.error;
  }

  await deleteRowsByIds(
    supabase,
    "legacy_rows",
    (legacyRows.data ?? []).map((row) => row.id as string),
  );
  await deleteRowsByIds(
    supabase,
    "import_batches",
    (batches.data ?? []).map((row) => row.id as string),
  );
  await deleteRowsByIds(
    supabase,
    "events",
    (events.data ?? []).map((row) => row.id as string),
  );
  await deleteRowsByIds(
    supabase,
    "contacts",
    (legacyContacts.data ?? []).map((row) => row.id as string),
  );

  const staffDelete = await supabase
    .from("staff_members")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (staffDelete.error) {
    throw staffDelete.error;
  }

  const categoryDelete = await supabase
    .from("categories")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (categoryDelete.error) {
    throw categoryDelete.error;
  }
}

export async function importLegacyWorkbookToSupabase(
  supabase: AdminClient,
  fileName: string,
  buffer: Buffer,
) {
  const parsed = extractLegacyWorkbookData(buffer);
  const { mappedRows, ...responseData } = parsed;
  const batchInsert = await supabase
    .from("import_batches")
    .insert({
      source_file_name: fileName,
      status: "processing",
    })
    .select("id")
    .single();

  if (batchInsert.error) {
    throw batchInsert.error;
  }

  const batchId = batchInsert.data.id;
  const { map: categoryMap, createdCount: createdCategoryCount } =
    await ensureCategories(supabase, mappedRows);
  const { map: staffMap, createdCount: createdStaffCount } =
    await ensureStaffMembers(supabase, mappedRows);
  const { map: eventMap, createdCount: createdEventCount } =
    await ensureEvents(supabase, mappedRows);

  const existingContactsResult = await supabase
    .from("contacts")
    .select(
      "id, name, company, email, phone, job_title, website, address, city, country, cooperation_level, is_influencer, is_media",
    );

  if (existingContactsResult.error) {
    throw existingContactsResult.error;
  }

  const existingContacts = (existingContactsResult.data ?? []) as ContactRow[];
  const contactMaps = buildExistingContactMaps(existingContacts);
  const pendingContacts = new Map<string, PendingContact>();
  const rowAssignments = new Map<number, { key: string; existingContactId: string | null }>();
  const contactUpdates = new Map<string, PendingContact["payload"]>();
  let reviewCandidates = 0;

  mappedRows.forEach((row, index) => {
    const categoryId = row.category
      ? categoryMap.get(normalizeText(row.category)) ?? null
      : null;
    const ownerStaffId = row.ownerStaff ? staffMap.get(normalizeStaffKey(row.ownerStaff)) ?? null : null;
    const payload = buildContactPayload(row, categoryId, ownerStaffId);
    const existingContactId = findExistingContactId(row, contactMaps);

    if (existingContactId) {
      const existingContact = contactMaps.byId.get(existingContactId);

      if (existingContact) {
        const match = scoreContactMatch(
          buildNormalizedCardFromLegacyRow(row),
          existingContact,
        );

        if (match.action === "needs-review") {
          reviewCandidates += 1;
        }

        contactUpdates.set(
          existingContactId,
          mergeContactPayload(
            contactUpdates.get(existingContactId) ?? existingContact,
            payload,
          ),
        );
      }

      rowAssignments.set(index, { key: existingContactId, existingContactId });
      return;
    }

    const key = getIdentityKey(row);
    const pending = pendingContacts.get(key);

    if (pending) {
      pending.payload = mergeContactPayload(pending.payload, payload);
    } else {
      pendingContacts.set(key, { key, payload });
    }

    rowAssignments.set(index, { key, existingContactId: null });
  });

  let updatedContactsCount = 0;

  for (const [contactId, payload] of contactUpdates.entries()) {
    const updateResult = await supabase
      .from("contacts")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contactId);

    if (updateResult.error) {
      throw updateResult.error;
    }

    updatedContactsCount += 1;
  }

  const pendingInsertRows = Array.from(pendingContacts.values());
  const insertedContactIds = new Map<string, string>();

  if (pendingInsertRows.length > 0) {
    const insertResult = await supabase
      .from("contacts")
      .insert(pendingInsertRows.map((row) => row.payload))
      .select("id");

    if (insertResult.error) {
      throw insertResult.error;
    }

    insertResult.data?.forEach((row, index) => {
      insertedContactIds.set(pendingInsertRows[index].key, row.id as string);
    });
  }

  const contactEventsRows: Array<{
    contact_id: string;
    event_id: string;
    notes: string;
  }> = [];
  const legacyRowsPayload: Array<{
    batch_id: string;
    sheet_name: string;
    row_number: number;
    raw_json: Record<string, unknown>;
    mapped_contact_id: string | null;
  }> = [];

  mappedRows.forEach((row, index) => {
    const assignment = rowAssignments.get(index);
    const contactId =
      assignment?.existingContactId ?? insertedContactIds.get(assignment?.key ?? "") ?? null;

    if (row.eventName && contactId) {
      const eventId =
        eventMap.get(
          `${normalizeText(row.eventName)}::${normalizeText(row.sheetName)}`,
        ) ?? null;

      if (eventId) {
        contactEventsRows.push({
          contact_id: contactId,
          event_id: eventId,
          notes: `Imported from ${row.sheetName}`,
        });
      }
    }

    legacyRowsPayload.push({
      batch_id: batchId,
      sheet_name: row.sheetName,
      row_number: row.rowNumber,
      raw_json: row.rawRecord,
      mapped_contact_id: contactId,
    });
  });

  for (const eventChunk of chunk(contactEventsRows, 500)) {
    const eventInsert = await supabase
      .from("contact_events")
      .upsert(eventChunk, { onConflict: "contact_id,event_id", ignoreDuplicates: true });

    if (eventInsert.error) {
      throw eventInsert.error;
    }
  }

  for (const rowChunk of chunk(legacyRowsPayload, 500)) {
    const legacyInsert = await supabase.from("legacy_rows").insert(rowChunk);

    if (legacyInsert.error) {
      throw legacyInsert.error;
    }
  }

  const batchUpdate = await supabase
    .from("import_batches")
    .update({ status: "completed" })
    .eq("id", batchId);

  if (batchUpdate.error) {
    throw batchUpdate.error;
  }

  const mergedDuplicateCount = await mergeDuplicateLegacyContacts(supabase);

  return {
    ...responseData,
    mappedRowCount: mappedRows.length,
    batchId,
    importSummary: {
      createdContactsCount: pendingInsertRows.length,
      updatedContactsCount,
      createdCategoryCount,
      createdStaffCount,
      createdEventCount,
      linkedEventCount: contactEventsRows.length,
      legacyRowCount: legacyRowsPayload.length,
      reviewCandidatesCount: reviewCandidates,
      mergedDuplicateCount,
    },
  };
}
