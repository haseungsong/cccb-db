import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, normalizeText } from "@/lib/contacts/mergeContact";

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  return candidate.code === "PGRST205" || candidate.message?.includes("schema cache") === true;
}

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
  event_date: string | null;
  location: string | null;
  source_sheet_name: string | null;
  created_at: string;
};

type ContactEventRow = {
  contact_id: string;
  event_id: string;
  invite_status: string | null;
  attendance_status: string | null;
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

type TagRow = {
  id: string;
  name: string;
  color: string | null;
};

type ContactTagRow = {
  contact_id: string;
  tag_id: string;
};

type EventTagRow = {
  event_id: string;
  tag_id: string;
};

type Dataset = Awaited<ReturnType<typeof loadContactDataset>>;

export type ContactSearchFilters = {
  query?: string;
  category?: string;
  owner?: string;
  event?: string;
  source?: string;
  tag?: string;
  influencer?: string;
  media?: string;
  hasCard?: string;
  hasPhoto?: string;
  status?: string;
};

export type ContactListItem = {
  id: string;
  name: string;
  company: string;
  category: string;
  categoryId: string;
  ownerStaff: string;
  ownerStaffId: string;
  email: string;
  phone: string;
  city: string;
  website: string;
  isInfluencer: boolean;
  isMedia: boolean;
  sourceType: string;
  contactStatus: string;
  events: string[];
  eventIds: string[];
  sourceSheets: string[];
  tags: string[];
  businessCardCount: number;
  profileImageCount: number;
  legacyRowCount: number;
  hasBusinessCard: boolean;
  hasProfileImage: boolean;
  searchableText: string;
};

export type ContactDetail = ContactListItem & {
  jobTitle: string;
  address: string;
  country: string;
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
  eventLinks: Array<{
    id: string;
    name: string;
    eventDate: string;
    location: string;
    sourceSheetName: string;
    inviteStatus: string;
    attendanceStatus: string;
    notes: string;
  }>;
};

export type EventOverview = {
  id: string;
  name: string;
  eventDate: string;
  location: string;
  sourceSheetName: string;
  attendeeCount: number;
  attendedCount: number;
  invitePendingCount: number;
  tags: string[];
  attendees: Array<{
    contactId: string;
    name: string;
    company: string;
    attendanceStatus: string;
    inviteStatus: string;
  }>;
};

export type DuplicateCandidate = {
  pairKey: string;
  reason: string;
  score: number;
  primary: ContactListItem;
  secondary: ContactListItem;
};

export type DashboardInsights = {
  totals: {
    contacts: number;
    events: number;
    tags: number;
    influencers: number;
    media: number;
    pendingCards: number;
    noOwner: number;
    noCategory: number;
  };
  topCategories: Array<{ label: string; count: number }>;
  topOwners: Array<{ label: string; count: number }>;
  topSources: Array<{ label: string; count: number }>;
  topTags: Array<{ label: string; count: number }>;
  recentContacts: ContactListItem[];
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
  return normalizeText(haystack).includes(normalizeText(query));
}

function countByLabel(values: string[]) {
  const counts = new Map<string, number>();

  values.filter(Boolean).forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 8);
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
    tagsResult,
    contactTagsResult,
    eventTagsResult,
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select(
        "id, name, company, job_title, email, phone, website, address, city, country, category_id, owner_staff_id, is_influencer, is_media, contact_status, primary_source_type, created_at, updated_at",
      )
      .order("updated_at", { ascending: false }),
    supabase.from("categories").select("id, name").order("sort_order", { ascending: true }),
    supabase.from("staff_members").select("id, name").order("name", { ascending: true }),
    supabase
      .from("events")
      .select("id, name, event_date, location, source_sheet_name, created_at")
      .order("event_date", { ascending: false, nullsFirst: false }),
    supabase
      .from("contact_events")
      .select("contact_id, event_id, invite_status, attendance_status, notes"),
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
    supabase.from("tags").select("id, name, color").order("name", { ascending: true }),
    supabase.from("contact_tags").select("contact_id, tag_id"),
    supabase.from("event_tags").select("event_id, tag_id"),
  ]);

  if (contactsResult.error) throw contactsResult.error;
  if (categoriesResult.error) throw categoriesResult.error;
  if (staffResult.error) throw staffResult.error;
  if (eventsResult.error) throw eventsResult.error;
  if (contactEventsResult.error) throw contactEventsResult.error;
  if (legacyRowsResult.error) throw legacyRowsResult.error;
  if (businessCardsResult.error) throw businessCardsResult.error;
  if (contactImagesResult.error) throw contactImagesResult.error;
  if (tagsResult.error && !isMissingTableError(tagsResult.error)) throw tagsResult.error;
  if (contactTagsResult.error && !isMissingTableError(contactTagsResult.error)) {
    throw contactTagsResult.error;
  }
  if (eventTagsResult.error && !isMissingTableError(eventTagsResult.error)) {
    throw eventTagsResult.error;
  }

  return {
    contacts: (contactsResult.data ?? []) as ContactRow[],
    categories: (categoriesResult.data ?? []) as CategoryRow[],
    staffMembers: (staffResult.data ?? []) as StaffRow[],
    events: (eventsResult.data ?? []) as EventRow[],
    contactEvents: (contactEventsResult.data ?? []) as ContactEventRow[],
    legacyRows: (legacyRowsResult.data ?? []) as LegacyRow[],
    businessCards: (businessCardsResult.data ?? []) as BusinessCardRow[],
    contactImages: (contactImagesResult.data ?? []) as ContactImageRow[],
    tags: (isMissingTableError(tagsResult.error) ? [] : (tagsResult.data ?? [])) as TagRow[],
    contactTags: (
      isMissingTableError(contactTagsResult.error) ? [] : (contactTagsResult.data ?? [])
    ) as ContactTagRow[],
    eventTags: (
      isMissingTableError(eventTagsResult.error) ? [] : (eventTagsResult.data ?? [])
    ) as EventTagRow[],
  };
}

function buildContactListItems(dataset: Dataset) {
  const categoryMap = new Map(dataset.categories.map((row) => [row.id, row.name]));
  const staffMap = new Map(dataset.staffMembers.map((row) => [row.id, row.name]));
  const eventMap = new Map(dataset.events.map((row) => [row.id, row]));
  const tagMap = new Map(dataset.tags.map((row) => [row.id, row.name]));
  const contactEventsMap = new Map<string, ContactEventRow[]>();
  const legacyRowsMap = new Map<string, LegacyRow[]>();
  const businessCardsMap = new Map<string, BusinessCardRow[]>();
  const contactImagesMap = new Map<string, ContactImageRow[]>();
  const contactTagsMap = new Map<string, string[]>();

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

  dataset.contactImages.forEach((row) => {
    contactImagesMap.set(row.contact_id, [
      ...(contactImagesMap.get(row.contact_id) ?? []),
      row,
    ]);
  });

  dataset.contactTags.forEach((row) => {
    const tagName = tagMap.get(row.tag_id);
    if (!tagName) {
      return;
    }

    contactTagsMap.set(row.contact_id, [
      ...(contactTagsMap.get(row.contact_id) ?? []),
      tagName,
    ]);
  });

  return dataset.contacts.map((contact) => {
    const category = contact.category_id ? categoryMap.get(contact.category_id) ?? "" : "";
    const ownerStaff = contact.owner_staff_id
      ? staffMap.get(contact.owner_staff_id) ?? ""
      : "";
    const eventLinks = contactEventsMap.get(contact.id) ?? [];
    const events = eventLinks
      .map((row) => eventMap.get(row.event_id)?.name ?? "")
      .filter(Boolean);
    const eventIds = eventLinks.map((row) => row.event_id);
    const legacyRows = legacyRowsMap.get(contact.id) ?? [];
    const sourceSheets = Array.from(new Set(legacyRows.map((row) => row.sheet_name)));
    const businessCards = businessCardsMap.get(contact.id) ?? [];
    const profileImages = contactImagesMap.get(contact.id) ?? [];
    const tags = Array.from(new Set(contactTagsMap.get(contact.id) ?? [])).sort();
    const legacyText = legacyRows.flatMap((row) =>
      flattenRawJson(row.raw_json).map(({ key, value }) => `${key}: ${value}`),
    );

    return {
      id: contact.id,
      name: contact.name || "이름 미상",
      company: contact.company ?? "",
      category,
      categoryId: contact.category_id ?? "",
      ownerStaff,
      ownerStaffId: contact.owner_staff_id ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      city: contact.city ?? "",
      website: contact.website ?? "",
      isInfluencer: contact.is_influencer,
      isMedia: contact.is_media,
      sourceType: contact.primary_source_type,
      contactStatus: contact.contact_status,
      events: Array.from(new Set(events)),
      eventIds: Array.from(new Set(eventIds)),
      sourceSheets,
      tags,
      businessCardCount: businessCards.length,
      profileImageCount: profileImages.length,
      legacyRowCount: legacyRows.length,
      hasBusinessCard: businessCards.length > 0,
      hasProfileImage: profileImages.length > 0,
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
        tags,
        legacyText,
      ]),
    } satisfies ContactListItem;
  });
}

function matchesToggle(value: boolean, filter?: string) {
  if (!filter || filter === "all") {
    return true;
  }

  if (filter === "yes") {
    return value;
  }

  if (filter === "no") {
    return !value;
  }

  return true;
}

function applyContactFilters(
  contacts: ContactListItem[],
  filters: ContactSearchFilters = {},
) {
  return contacts.filter((contact) => {
    if (filters.query?.trim() && !includesSearch(contact.searchableText, filters.query)) {
      return false;
    }

    if (filters.category && filters.category !== "all" && contact.category !== filters.category) {
      return false;
    }

    if (filters.owner && filters.owner !== "all" && contact.ownerStaff !== filters.owner) {
      return false;
    }

    if (filters.event && filters.event !== "all" && !contact.events.includes(filters.event)) {
      return false;
    }

    if (
      filters.source &&
      filters.source !== "all" &&
      !contact.sourceSheets.includes(filters.source)
    ) {
      return false;
    }

    if (filters.tag && filters.tag !== "all" && !contact.tags.includes(filters.tag)) {
      return false;
    }

    if (
      filters.status &&
      filters.status !== "all" &&
      contact.contactStatus !== filters.status
    ) {
      return false;
    }

    if (!matchesToggle(contact.isInfluencer, filters.influencer)) {
      return false;
    }

    if (!matchesToggle(contact.isMedia, filters.media)) {
      return false;
    }

    if (!matchesToggle(contact.hasBusinessCard, filters.hasCard)) {
      return false;
    }

    if (!matchesToggle(contact.hasProfileImage, filters.hasPhoto)) {
      return false;
    }

    return true;
  });
}

export async function getSearchableContacts(filters: ContactSearchFilters = {}) {
  const dataset = await loadContactDataset();
  const contacts = buildContactListItems(dataset);
  return applyContactFilters(contacts, filters);
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

  const eventMap = new Map(dataset.events.map((event) => [event.id, event]));

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

  const eventLinks = dataset.contactEvents
    .filter((row) => row.contact_id === contactId)
    .map((row) => {
      const event = eventMap.get(row.event_id);
      return {
        id: row.event_id,
        name: event?.name ?? "행사 미상",
        eventDate: event?.event_date ?? "",
        location: event?.location ?? "",
        sourceSheetName: event?.source_sheet_name ?? "",
        inviteStatus: row.invite_status ?? "",
        attendanceStatus: row.attendance_status ?? "",
        notes: row.notes ?? "",
      };
    });

  return {
    ...base,
    jobTitle: contact.job_title ?? "",
    address: contact.address ?? "",
    country: contact.country ?? "",
    rawLegacyRows,
    businessCards,
    profileImages,
    eventLinks,
  } satisfies ContactDetail;
}

export async function getSearchFacets() {
  const contacts = await getSearchableContacts();

  return {
    categories: Array.from(new Set(contacts.map((contact) => contact.category).filter(Boolean))).sort(),
    owners: Array.from(new Set(contacts.map((contact) => contact.ownerStaff).filter(Boolean))).sort(),
    events: Array.from(new Set(contacts.flatMap((contact) => contact.events).filter(Boolean))).sort(),
    sources: Array.from(new Set(contacts.flatMap((contact) => contact.sourceSheets).filter(Boolean))).sort(),
    tags: Array.from(new Set(contacts.flatMap((contact) => contact.tags).filter(Boolean))).sort(),
    statuses: Array.from(
      new Set(contacts.map((contact) => contact.contactStatus).filter(Boolean)),
    ).sort(),
  };
}

export async function getContactFormOptions() {
  const dataset = await loadContactDataset();

  return {
    categories: dataset.categories.map((row) => ({ id: row.id, name: row.name })),
    owners: dataset.staffMembers.map((row) => ({ id: row.id, name: row.name })),
    events: dataset.events.map((row) => ({ id: row.id, name: row.name })),
    tags: dataset.tags.map((row) => ({ id: row.id, name: row.name, color: row.color ?? "" })),
  };
}

export async function getEventsOverview() {
  const dataset = await loadContactDataset();
  const contacts = buildContactListItems(dataset);
  const contactMap = new Map(contacts.map((contact) => [contact.id, contact]));
  const tagMap = new Map(dataset.tags.map((row) => [row.id, row.name]));

  return dataset.events.map((event) => {
    const links = dataset.contactEvents.filter((row) => row.event_id === event.id);
    const attendees = links
      .map((row) => {
        const contact = contactMap.get(row.contact_id);
        if (!contact) {
          return null;
        }

        return {
          contactId: contact.id,
          name: contact.name,
          company: contact.company,
          attendanceStatus: row.attendance_status ?? "",
          inviteStatus: row.invite_status ?? "",
        };
      })
      .filter(Boolean) as EventOverview["attendees"];
    const tags = dataset.eventTags
      .filter((row) => row.event_id === event.id)
      .map((row) => tagMap.get(row.tag_id) ?? "")
      .filter(Boolean);

    return {
      id: event.id,
      name: event.name,
      eventDate: event.event_date ?? "",
      location: event.location ?? "",
      sourceSheetName: event.source_sheet_name ?? "",
      attendeeCount: attendees.length,
      attendedCount: attendees.filter((row) => row.attendanceStatus === "attended").length,
      invitePendingCount: attendees.filter((row) => !row.inviteStatus).length,
      tags: Array.from(new Set(tags)),
      attendees,
    } satisfies EventOverview;
  });
}

export async function getDuplicateCandidates() {
  const contacts = await getSearchableContacts();
  const pairs = new Map<string, DuplicateCandidate>();

  function register(
    primary: ContactListItem,
    secondary: ContactListItem,
    reason: string,
    score: number,
  ) {
    const sorted = [primary, secondary].sort((a, b) => a.id.localeCompare(b.id));
    const pairKey = `${sorted[0].id}:${sorted[1].id}`;
    if (pairs.has(pairKey)) {
      return;
    }

    const ordered =
      sorted[0].legacyRowCount + sorted[0].businessCardCount >=
      sorted[1].legacyRowCount + sorted[1].businessCardCount
        ? { primary: sorted[0], secondary: sorted[1] }
        : { primary: sorted[1], secondary: sorted[0] };

    pairs.set(pairKey, {
      pairKey,
      reason,
      score,
      primary: ordered.primary,
      secondary: ordered.secondary,
    });
  }

  for (let index = 0; index < contacts.length; index += 1) {
    const current = contacts[index];

    for (let inner = index + 1; inner < contacts.length; inner += 1) {
      const candidate = contacts[inner];

      if (
        current.email &&
        candidate.email &&
        normalizeText(current.email) === normalizeText(candidate.email)
      ) {
        register(current, candidate, "이메일 완전 일치", 100);
        continue;
      }

      if (
        current.phone &&
        candidate.phone &&
        current.name &&
        candidate.name &&
        normalizePhone(current.phone) === normalizePhone(candidate.phone) &&
        normalizeText(current.name) === normalizeText(candidate.name)
      ) {
        register(current, candidate, "전화번호 + 이름 일치", 92);
        continue;
      }

      if (
        current.name &&
        candidate.name &&
        current.company &&
        candidate.company &&
        normalizeText(current.name) === normalizeText(candidate.name) &&
        normalizeText(current.company) === normalizeText(candidate.company)
      ) {
        register(current, candidate, "이름 + 기관명 일치", 72);
      }
    }
  }

  return Array.from(pairs.values()).sort((a, b) => b.score - a.score).slice(0, 50);
}

export async function getPendingBusinessCardReviews() {
  const dataset = await loadContactDataset();
  const contacts = buildContactListItems(dataset);
  const contactMap = new Map(contacts.map((contact) => [contact.id, contact]));

  return dataset.businessCards
    .filter((row) => row.review_status !== "approved")
    .map((row) => ({
      id: row.id,
      reviewStatus: row.review_status,
      createdAt: row.created_at,
      contactId: row.contact_id ?? "",
      contactName: row.contact_id ? contactMap.get(row.contact_id)?.name ?? "" : "",
      extractedEntries: flattenRawJson(row.extracted_json),
    }));
}

export async function getDashboardInsights() {
  const [contacts, events, duplicates, pendingCards] = await Promise.all([
    getSearchableContacts(),
    getEventsOverview(),
    getDuplicateCandidates(),
    getPendingBusinessCardReviews(),
  ]);

  return {
    totals: {
      contacts: contacts.length,
      events: events.length,
      tags: Array.from(new Set(contacts.flatMap((contact) => contact.tags))).length,
      influencers: contacts.filter((contact) => contact.isInfluencer).length,
      media: contacts.filter((contact) => contact.isMedia).length,
      pendingCards: pendingCards.length,
      noOwner: contacts.filter((contact) => !contact.ownerStaff).length,
      noCategory: contacts.filter((contact) => !contact.category).length,
    },
    topCategories: countByLabel(contacts.map((contact) => contact.category)),
    topOwners: countByLabel(contacts.map((contact) => contact.ownerStaff)),
    topSources: countByLabel(contacts.flatMap((contact) => contact.sourceSheets)),
    topTags: countByLabel(contacts.flatMap((contact) => contact.tags)),
    recentContacts: contacts.slice(0, 8),
    duplicateCount: duplicates.length,
  } as DashboardInsights & { duplicateCount: number };
}
