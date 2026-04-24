import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeText } from "@/lib/contacts/mergeContact";

type ContactRow = {
  id: string;
  name: string;
  company: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  category_id: string | null;
  owner_staff_id: string | null;
  is_influencer: boolean;
  is_media: boolean;
  contact_status: string;
  primary_source_type: string;
  created_at: string;
  updated_at: string;
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
  notes: string | null;
};

type LegacyRow = {
  id: string;
  mapped_contact_id: string | null;
  sheet_name: string;
  row_number: number;
  raw_json: Record<string, unknown>;
};

type BusinessCardRow = {
  id: string;
  contact_id: string | null;
  image_original_path: string;
  image_preview_path: string;
  ocr_raw_text: string | null;
  extracted_json: Record<string, unknown>;
  review_status: string;
  created_at: string;
};

type ContactImageRow = {
  id: string;
  contact_id: string;
  storage_path: string;
  image_kind: string;
  is_primary: boolean;
};

export type ContactListItem = {
  id: string;
  name: string;
  company: string;
  category: string;
  ownerStaff: string;
  email: string;
  phone: string;
  city: string;
  website: string;
  isInfluencer: boolean;
  isMedia: boolean;
  sourceType: string;
  events: string[];
  sourceSheets: string[];
  businessCardCount: number;
  legacyRowCount: number;
  searchableText: string;
};

export type ContactDetail = ContactListItem & {
  jobTitle: string;
  address: string;
  country: string;
  contactStatus: string;
  rawLegacyRows: Array<{
    id: string;
    sheetName: string;
    rowNumber: number;
    rawEntries: Array<{ key: string; value: string }>;
  }>;
  businessCards: Array<{
    id: string;
    reviewStatus: string;
    createdAt: string;
    previewUrl: string | null;
    originalUrl: string | null;
    rawText: string;
    extractedEntries: Array<{ key: string; value: string }>;
  }>;
  profileImages: Array<{
    id: string;
    imageKind: string;
    signedUrl: string | null;
  }>;
};

async function createSignedUrl(
  bucket: string,
  path: string | null,
  expiresIn = 60 * 60,
) {
  if (!path) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

function flattenRawJson(record: Record<string, unknown>) {
  return Object.entries(record)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim())
    .map(([key, value]) => ({
      key,
      value: String(value),
    }));
}

function buildSearchableText(parts: Array<string | string[] | null | undefined>) {
  return parts
    .flatMap((part) => {
      if (!part) {
        return [];
      }

      return Array.isArray(part) ? part : [part];
    })
    .join(" \n ");
}

function includesSearch(haystack: string, query: string) {
  const normalizedHaystack = normalizeText(haystack);
  const normalizedQuery = normalizeText(query);

  return normalizedHaystack.includes(normalizedQuery);
}

async function loadContactDataset() {
  const supabase = createSupabaseAdminClient();
  const [
    contactsResult,
    categoriesResult,
    staffResult,
    eventsResult,
    contactEventsResult,
    legacyRowsResult,
    businessCardsResult,
    contactImagesResult,
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select(
        "id, name, company, job_title, email, phone, website, address, city, country, category_id, owner_staff_id, is_influencer, is_media, contact_status, primary_source_type, created_at, updated_at",
      )
      .order("updated_at", { ascending: false }),
    supabase.from("categories").select("id, name"),
    supabase.from("staff_members").select("id, name"),
    supabase.from("events").select("id, name, source_sheet_name"),
    supabase.from("contact_events").select("contact_id, event_id, notes"),
    supabase
      .from("legacy_rows")
      .select("id, mapped_contact_id, sheet_name, row_number, raw_json")
      .order("row_number", { ascending: true }),
    supabase
      .from("business_cards")
      .select(
        "id, contact_id, image_original_path, image_preview_path, ocr_raw_text, extracted_json, review_status, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("contact_images")
      .select("id, contact_id, storage_path, image_kind, is_primary"),
  ]);

  if (contactsResult.error) throw contactsResult.error;
  if (categoriesResult.error) throw categoriesResult.error;
  if (staffResult.error) throw staffResult.error;
  if (eventsResult.error) throw eventsResult.error;
  if (contactEventsResult.error) throw contactEventsResult.error;
  if (legacyRowsResult.error) throw legacyRowsResult.error;
  if (businessCardsResult.error) throw businessCardsResult.error;
  if (contactImagesResult.error) throw contactImagesResult.error;

  return {
    contacts: (contactsResult.data ?? []) as ContactRow[],
    categories: (categoriesResult.data ?? []) as CategoryRow[],
    staffMembers: (staffResult.data ?? []) as StaffRow[],
    events: (eventsResult.data ?? []) as EventRow[],
    contactEvents: (contactEventsResult.data ?? []) as ContactEventRow[],
    legacyRows: (legacyRowsResult.data ?? []) as LegacyRow[],
    businessCards: (businessCardsResult.data ?? []) as BusinessCardRow[],
    contactImages: (contactImagesResult.data ?? []) as ContactImageRow[],
  };
}

function buildContactListItems(dataset: Awaited<ReturnType<typeof loadContactDataset>>) {
  const categoryMap = new Map(dataset.categories.map((row) => [row.id, row.name]));
  const staffMap = new Map(dataset.staffMembers.map((row) => [row.id, row.name]));
  const eventMap = new Map(dataset.events.map((row) => [row.id, row]));
  const contactEventsMap = new Map<string, ContactEventRow[]>();
  const legacyRowsMap = new Map<string, LegacyRow[]>();
  const businessCardsMap = new Map<string, BusinessCardRow[]>();

  dataset.contactEvents.forEach((row) => {
    contactEventsMap.set(row.contact_id, [...(contactEventsMap.get(row.contact_id) ?? []), row]);
  });

  dataset.legacyRows.forEach((row) => {
    if (!row.mapped_contact_id) {
      return;
    }

    legacyRowsMap.set(row.mapped_contact_id, [
      ...(legacyRowsMap.get(row.mapped_contact_id) ?? []),
      row,
    ]);
  });

  dataset.businessCards.forEach((row) => {
    if (!row.contact_id) {
      return;
    }

    businessCardsMap.set(row.contact_id, [
      ...(businessCardsMap.get(row.contact_id) ?? []),
      row,
    ]);
  });

  return dataset.contacts.map((contact) => {
    const category = contact.category_id ? categoryMap.get(contact.category_id) ?? "" : "";
    const ownerStaff = contact.owner_staff_id
      ? staffMap.get(contact.owner_staff_id) ?? ""
      : "";
    const events = (contactEventsMap.get(contact.id) ?? [])
      .map((row) => eventMap.get(row.event_id)?.name ?? "")
      .filter(Boolean);
    const legacyRows = legacyRowsMap.get(contact.id) ?? [];
    const sourceSheets = Array.from(new Set(legacyRows.map((row) => row.sheet_name)));
    const businessCards = businessCardsMap.get(contact.id) ?? [];
    const legacyText = legacyRows.flatMap((row) =>
      flattenRawJson(row.raw_json).map(({ key, value }) => `${key}: ${value}`),
    );

    return {
      id: contact.id,
      name: contact.name || "이름 미상",
      company: contact.company ?? "",
      category,
      ownerStaff,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      city: contact.city ?? "",
      website: contact.website ?? "",
      isInfluencer: contact.is_influencer,
      isMedia: contact.is_media,
      sourceType: contact.primary_source_type,
      events: Array.from(new Set(events)),
      sourceSheets,
      businessCardCount: businessCards.length,
      legacyRowCount: legacyRows.length,
      searchableText: buildSearchableText([
        contact.name,
        contact.company,
        contact.job_title,
        contact.email,
        contact.phone,
        contact.website,
        contact.address,
        contact.city,
        category,
        ownerStaff,
        events,
        sourceSheets,
        legacyText,
      ]),
    } satisfies ContactListItem;
  });
}

export async function getSearchableContacts(query?: string) {
  const dataset = await loadContactDataset();
  const contacts = buildContactListItems(dataset);

  if (!query?.trim()) {
    return contacts;
  }

  return contacts.filter((contact) => includesSearch(contact.searchableText, query));
}

export async function getContactDetail(contactId: string) {
  const dataset = await loadContactDataset();
  const contacts = buildContactListItems(dataset);
  const base = contacts.find((contact) => contact.id === contactId);

  if (!base) {
    return null;
  }

  const contact = dataset.contacts.find((row) => row.id === contactId);

  if (!contact) {
    return null;
  }

  const rawLegacyRows = dataset.legacyRows
    .filter((row) => row.mapped_contact_id === contactId)
    .map((row) => ({
      id: row.id,
      sheetName: row.sheet_name,
      rowNumber: row.row_number,
      rawEntries: flattenRawJson(row.raw_json),
    }));

  const businessCards = await Promise.all(
    dataset.businessCards
      .filter((row) => row.contact_id === contactId)
      .map(async (row) => ({
        id: row.id,
        reviewStatus: row.review_status,
        createdAt: row.created_at,
        previewUrl: await createSignedUrl("cards-preview", row.image_preview_path),
        originalUrl: await createSignedUrl("cards-original", row.image_original_path),
        rawText: row.ocr_raw_text ?? "",
        extractedEntries: flattenRawJson(row.extracted_json),
      })),
  );

  const profileImages = await Promise.all(
    dataset.contactImages
      .filter((row) => row.contact_id === contactId)
      .map(async (row) => ({
        id: row.id,
        imageKind: row.image_kind,
        signedUrl: await createSignedUrl("contact-photos", row.storage_path),
      })),
  );

  return {
    ...base,
    jobTitle: contact.job_title ?? "",
    address: contact.address ?? "",
    country: contact.country ?? "",
    contactStatus: contact.contact_status,
    rawLegacyRows,
    businessCards,
    profileImages,
  } satisfies ContactDetail;
}

export async function getSearchFacets() {
  const contacts = await getSearchableContacts();

  return {
    categories: Array.from(new Set(contacts.map((contact) => contact.category).filter(Boolean))).sort(),
    owners: Array.from(new Set(contacts.map((contact) => contact.ownerStaff).filter(Boolean))).sort(),
    sources: Array.from(
      new Set(contacts.flatMap((contact) => contact.sourceSheets).filter(Boolean)),
    ).sort(),
  };
}
