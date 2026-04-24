import type { ContactSearchFilters } from "@/lib/contacts/queries";
import { normalizeContactSearchFilters } from "@/lib/contacts/search";

export function parseAudienceFilterJson(value: unknown): ContactSearchFilters {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return normalizeContactSearchFilters({
    q: typeof raw.query === "string" ? raw.query : undefined,
    category: typeof raw.category === "string" ? raw.category : undefined,
    owner: typeof raw.owner === "string" ? raw.owner : undefined,
    event: typeof raw.event === "string" ? raw.event : undefined,
    source: typeof raw.source === "string" ? raw.source : undefined,
    tag: typeof raw.tag === "string" ? raw.tag : undefined,
    influencer: typeof raw.influencer === "string" ? raw.influencer : undefined,
    media: typeof raw.media === "string" ? raw.media : undefined,
    hasCard: typeof raw.hasCard === "string" ? raw.hasCard : undefined,
    hasPhoto: typeof raw.hasPhoto === "string" ? raw.hasPhoto : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    cooperation: typeof raw.cooperation === "string" ? raw.cooperation : undefined,
  });
}
