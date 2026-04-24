import { NextResponse } from "next/server";
import { getContactSearchSuggestions } from "@/lib/contacts/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const suggestions = await getContactSearchSuggestions(query);

  return NextResponse.json({
    ok: true,
    suggestions,
  });
}
