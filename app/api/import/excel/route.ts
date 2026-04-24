import { NextResponse } from "next/server";
import { parseLegacyWorkbook } from "@/lib/import/mapLegacyExcel";
import { importLegacyWorkbookToSupabase } from "@/lib/import/saveLegacyWorkbook";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "엑셀 파일이 없습니다." },
      { status: 400 },
    );
  }

  if (!file.name.endsWith(".xlsx")) {
    return NextResponse.json(
      { ok: false, message: ".xlsx 파일만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const action = String(formData.get("action") ?? "analyze");

  if (action === "import") {
    const supabase = createSupabaseAdminClient();

    try {
      const imported = await importLegacyWorkbookToSupabase(
        supabase,
        file.name,
        buffer,
      );

      return NextResponse.json({
        ok: true,
        message: "엑셀 분석과 Supabase 저장이 완료되었습니다.",
        ...imported,
      });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : "엑셀 import 중 오류가 발생했습니다.",
        },
        { status: 500 },
      );
    }
  }

  const parsed = parseLegacyWorkbook(buffer);

  return NextResponse.json({
    ok: true,
    message: "엑셀 구조 분석이 완료되었습니다.",
    ...parsed,
  });
}
