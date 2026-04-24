import * as XLSX from "xlsx";

type LegacyPreviewRow = {
  sheetName: string;
  rowNumber: number;
  name: string;
  company: string;
  category: string;
  ownerStaff: string;
  email: string;
  phone: string;
  imageHint: string;
};

const fieldAliases = {
  category: ["카테고리", "categoria"],
  name: ["이름", "nome", "프로필 이름", "convidados"],
  company: ["단체명", "언론사", "instituto", "cargo/ instituto", "회사명"],
  jobTitle: ["직함", "부서", "cargo"],
  ownerStaff: ["담당행정원", "담당자", "담당자 이름"],
  email: ["전자 메일", "email", "e-mail"],
  phone: ["연락처", "telefone", "celular"],
  photo: ["사진", "foto"],
  socialUrl: ["셜미디어 주소", "소셜미디어 주소", "instagram", "social"],
} as const;

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getCell(record: Record<string, unknown>, aliases: readonly string[]) {
  const entries = Object.entries(record);

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const match = entries.find(([key]) => normalizeHeader(key) === normalizedAlias);

    if (match && match[1] != null) {
      return String(match[1]).trim();
    }
  }

  return "";
}

function detectHeaderRow(rows: unknown[][]) {
  const expectedHeaders = new Set(
    Object.values(fieldAliases).flat().map((value) => normalizeHeader(value)),
  );

  for (let index = 0; index < Math.min(rows.length, 6); index += 1) {
    const row = rows[index] ?? [];
    const hitCount = row.filter((cell) =>
      expectedHeaders.has(normalizeHeader(cell)),
    ).length;

    if (hitCount >= 2) {
      return index;
    }
  }

  return 0;
}

export function parseLegacyWorkbook(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const previews: LegacyPreviewRow[] = [];

  const sheetSummaries = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: "",
    });

    const headerRowIndex = detectHeaderRow(rows);
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      range: headerRowIndex,
      defval: "",
    });

    records.slice(0, 8).forEach((record, recordIndex) => {
      const photoValue =
        getCell(record, fieldAliases.photo) ||
        (sheetName.toLowerCase().includes("foto") ? "시트명에 FOTO 포함" : "");

      previews.push({
        sheetName,
        rowNumber: headerRowIndex + recordIndex + 2,
        name: getCell(record, fieldAliases.name),
        company: getCell(record, fieldAliases.company),
        category: getCell(record, fieldAliases.category),
        ownerStaff: getCell(record, fieldAliases.ownerStaff),
        email: getCell(record, fieldAliases.email),
        phone: getCell(record, fieldAliases.phone),
        imageHint: photoValue,
      });
    });

    return {
      sheetName,
      headerRowIndex: headerRowIndex + 1,
      totalRows: records.length,
      hasPhotoColumn: records.some(
        (record) => getCell(record, fieldAliases.photo).length > 0,
      ),
      sampleColumns: Object.keys(records[0] ?? {}),
    };
  });

  return {
    workbookName: workbook.Props?.Title || "문화원 DB",
    sheetCount: workbook.SheetNames.length,
    sheetSummaries,
    previewRows: previews.slice(0, 30),
  };
}
