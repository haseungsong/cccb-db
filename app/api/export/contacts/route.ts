import { NextResponse } from "next/server";
import { buildContactsCsv, buildContactsExportFileName } from "@/lib/contacts/export";
import { getSearchableContacts } from "@/lib/contacts/queries";
import { normalizeContactSearchFilters } from "@/lib/contacts/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = normalizeContactSearchFilters({
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    owner: searchParams.get("owner") ?? undefined,
    event: searchParams.get("event") ?? undefined,
    source: searchParams.get("source") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    influencer: searchParams.get("influencer") ?? undefined,
    media: searchParams.get("media") ?? undefined,
    hasCard: searchParams.get("hasCard") ?? undefined,
    hasPhoto: searchParams.get("hasPhoto") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  const contacts = await getSearchableContacts(filters);
  const csv = buildContactsCsv(contacts);
  const fileName = buildContactsExportFileName(filters);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
