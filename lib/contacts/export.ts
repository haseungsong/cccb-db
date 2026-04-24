import type { ContactListItem, ContactSearchFilters } from "@/lib/contacts/queries";
import { getFilterSummary } from "@/lib/contacts/search";

function escapeCsvValue(value: string | number | boolean) {
  const normalized = String(value ?? "");
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function buildContactsCsv(contacts: ContactListItem[]) {
  const header = [
    "name",
    "company",
    "category",
    "owner_staff",
    "email",
    "phone",
    "city",
    "website",
    "status",
    "source_type",
    "is_influencer",
    "is_media",
    "tags",
    "events",
    "source_sheets",
    "business_card_count",
    "profile_image_count",
    "legacy_row_count",
  ];

  const rows = contacts.map((contact) => [
    contact.name,
    contact.company,
    contact.category,
    contact.ownerStaff,
    contact.email,
    contact.phone,
    contact.city,
    contact.website,
    contact.contactStatus,
    contact.sourceType,
    contact.isInfluencer ? "yes" : "no",
    contact.isMedia ? "yes" : "no",
    contact.tags.join(" | "),
    contact.events.join(" | "),
    contact.sourceSheets.join(" | "),
    contact.businessCardCount,
    contact.profileImageCount,
    contact.legacyRowCount,
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
    .join("\n");
}

export function buildContactsExportFileName(filters: ContactSearchFilters) {
  const date = new Date().toISOString().slice(0, 10);
  const suffix = filters.query?.trim()
    ? filters.query.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/gi, "-").replace(/^-|-$/g, "")
    : "all";

  return `cccb-contacts-${suffix || "all"}-${date}.csv`;
}

export function buildContactsExportEmailSubject(filters: ContactSearchFilters) {
  const summary = getFilterSummary(filters);
  return summary
    ? `CCCB 연락처 내보내기 - ${summary}`
    : "CCCB 연락처 전체 내보내기";
}

export function buildContactsExportEmailText(
  contacts: ContactListItem[],
  filters: ContactSearchFilters,
) {
  const summary = getFilterSummary(filters);

  return [
    "안녕하세요.",
    "",
    "CCCB Contact Hub에서 생성한 연락처 CSV 파일을 첨부드립니다.",
    "",
    `총 연락처 수: ${contacts.length}건`,
    `적용된 조건: ${summary || "전체 데이터"}`,
    "",
    "첨부 파일을 확인해 주세요.",
  ].join("\n");
}
