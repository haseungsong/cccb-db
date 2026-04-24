import { NextResponse } from "next/server";
import { parseLegacyWorkbook } from "@/lib/import/mapLegacyExcel";

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
  const parsed = parseLegacyWorkbook(buffer);

  return NextResponse.json({
    ok: true,
    message: "엑셀 구조 분석이 완료되었습니다.",
    ...parsed,
  });
}
