import type { ContactSearchFilters } from "@/lib/contacts/queries";
import { normalizeCooperationLevel } from "@/lib/contacts/cooperation";

type RawSearchParams = {
  q?: string;
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
  cooperation?: string;
};

function normalizeFilterValue(value: string | null | undefined, fallback = "all") {
  return value?.trim() || fallback;
}

export function normalizeContactSearchFilters(params: RawSearchParams): ContactSearchFilters {
  return {
    query: params.q?.trim() ?? "",
    category: normalizeFilterValue(params.category),
    owner: normalizeFilterValue(params.owner),
    event: normalizeFilterValue(params.event),
    source: normalizeFilterValue(params.source),
    tag: normalizeFilterValue(params.tag),
    influencer: normalizeFilterValue(params.influencer),
    media: normalizeFilterValue(params.media),
    hasCard: normalizeFilterValue(params.hasCard),
    hasPhoto: normalizeFilterValue(params.hasPhoto),
    status: normalizeFilterValue(params.status),
    cooperation:
      normalizeFilterValue(params.cooperation) === "all"
        ? "all"
        : normalizeCooperationLevel(params.cooperation),
  };
}

export function buildContactSearchParams(filters: ContactSearchFilters) {
  const params = new URLSearchParams();

  if (filters.query?.trim()) {
    params.set("q", filters.query.trim());
  }

  const selectiveFilters: Array<keyof ContactSearchFilters> = [
    "category",
    "owner",
    "event",
    "source",
    "tag",
    "influencer",
    "media",
    "hasCard",
    "hasPhoto",
    "status",
    "cooperation",
  ];

  selectiveFilters.forEach((key) => {
    const value = filters[key];
    if (value && value !== "all") {
      params.set(key, value);
    }
  });

  return params;
}

export function getFilterSummary(filters: ContactSearchFilters) {
  const labels: Array<[string, string | undefined]> = [
    ["검색어", filters.query],
    ["카테고리", filters.category !== "all" ? filters.category : undefined],
    ["담당자", filters.owner !== "all" ? filters.owner : undefined],
    ["행사", filters.event !== "all" ? filters.event : undefined],
    ["원본 시트", filters.source !== "all" ? filters.source : undefined],
    ["태그", filters.tag !== "all" ? filters.tag : undefined],
    ["상태", filters.status !== "all" ? filters.status : undefined],
    ["인플루언서", filters.influencer !== "all" ? filters.influencer : undefined],
    ["언론", filters.media !== "all" ? filters.media : undefined],
    ["명함", filters.hasCard !== "all" ? filters.hasCard : undefined],
    ["사진", filters.hasPhoto !== "all" ? filters.hasPhoto : undefined],
    ["협력 수위", filters.cooperation !== "all" ? filters.cooperation : undefined],
  ];

  return labels
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join(" / ");
}
