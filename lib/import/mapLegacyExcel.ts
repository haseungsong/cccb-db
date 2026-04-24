import { extractCooperationLevelFromRecord } from "@/lib/contacts/cooperation";
import { normalizeStaffName } from "@/lib/staff/normalize";
import * as XLSX from "xlsx";

export type LegacyPreviewRow = {
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

export type LegacyMappedRow = LegacyPreviewRow & {
  jobTitle: string;
  socialUrl: string;
  address: string;
  city: string;
  eventName: string;
  cooperationLevel: string;
  isInfluencer: boolean;
  isMedia: boolean;
  rawRecord: Record<string, unknown>;
};

type SheetLayout =
  | "master"
  | "regional-master"
  | "media"
  | "influencer"
  | "event"
  | "exhibition"
  | "pt-event"
  | "copy-list"
  | "unknown";

type RowDraft = {
  name: string;
  company: string;
  category: string;
  ownerStaff: string;
  email: string;
  phone: string;
  imageHint: string;
  jobTitle: string;
  socialUrl: string;
  address: string;
  city: string;
};

const masterSheets = new Set([
  "전체리스트",
  "상파울로 이외 지역 주요기관인사",
  "한국 주요기관인사",
  "언론인",
  "인플루언서",
  "상파울로 기반 주요기관인사",
]);

const categoryKeywords = [
  "정부",
  "기관",
  "언론",
  "문화원",
  "인플루언서",
  "유관",
  "기업",
  "단체",
  "현지",
  "국내",
  "교민",
  "setor",
  "jornal",
  "media",
  "educa",
  "출판",
  "문화예술",
];

const companyKeywords = [
  "ltda",
  "s.a",
  "instituto",
  "secretaria",
  "prefeitura",
  "consulado",
  "ministerio",
  "universidade",
  "museum",
  "museu",
  "cultura",
  "theatro",
  "sesc",
  "sesi",
  "spcine",
  "record",
  "netflix",
  "hyundai",
  "samsung",
  "ccbb",
  "cnn",
  "g1",
  "folha",
  "veja",
  "sbt",
  "canal",
  "editora",
];

const jobTitleKeywords = [
  "director",
  "diretor",
  "diretora",
  "manager",
  "analista",
  "producer",
  "editor",
  "jornalista",
  "colunista",
  "curador",
  "curadora",
  "publisher",
  "secretario",
  "secretária",
  "professor",
  "professora",
  "advisor",
  "assessora",
  "보좌관",
  "부국장",
  "국장",
  "편집장",
  "변호사",
  "회장",
];

const genericCategoryKeywords = ["미분류", "주요인사", "국내 인사", "기타"];

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function getCellValue(row: unknown[], index: number) {
  if (index < 0 || index >= row.length) {
    return "";
  }

  return String(row[index] ?? "").trim();
}

function compactText(...values: Array<string | undefined>) {
  return values
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .join(" / ");
}

function sanitizePhone(value: string) {
  return /[가-힣]/.test(value) ? "" : value.trim();
}

function findColumnIndex(headers: string[], aliases: readonly string[]) {
  const normalizedHeaders = headers.map(normalizeHeader);
  const normalizedAliases = aliases.map(normalizeHeader);

  for (const alias of normalizedAliases) {
    const exactMatch = normalizedHeaders.findIndex((header) => header === alias);

    if (exactMatch >= 0) {
      return exactMatch;
    }
  }

  for (const alias of normalizedAliases) {
    const partialMatch = normalizedHeaders.findIndex(
      (header) =>
        header.length > 0 &&
        alias.length > 0 &&
        (header.includes(alias) || alias.includes(header)),
    );

    if (partialMatch >= 0) {
      return partialMatch;
    }
  }

  return -1;
}

function getFirstValue(
  headers: string[],
  row: unknown[],
  aliases: readonly string[],
) {
  for (const alias of aliases) {
    const value = getCellValue(row, findColumnIndex(headers, [alias]));

    if (value) {
      return value;
    }
  }

  return "";
}

function detectHeaderRow(rows: unknown[][]) {
  const expectedHeaders = [
    "카테고리",
    "categoria",
    "이름",
    "nome",
    "단체명",
    "언론사",
    "프로필 이름",
    "단체명/프로필 이름",
    "전자 메일 주소",
    "e-mail",
    "연락처",
    "contato",
    "담당행정원",
    "담당자",
    "cargo/ instituto",
    "convidados",
  ].map(normalizeHeader);

  for (let index = 0; index < Math.min(rows.length, 10); index += 1) {
    const row = rows[index] ?? [];
    const hitCount = row.filter((cell) =>
      expectedHeaders.includes(normalizeHeader(cell)),
    ).length;

    if (hitCount >= 2) {
      return index;
    }
  }

  return 0;
}

function looksLikeCategory(value: string) {
  const normalized = normalizeText(value);

  return categoryKeywords.some((keyword) => normalized.includes(keyword));
}

function isGenericCategory(value: string) {
  return genericCategoryKeywords.includes(value.trim());
}

function looksLikeCompany(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  const normalized = normalizeText(trimmed);
  const upperRatio =
    trimmed.replace(/[^A-Z]/g, "").length / Math.max(trimmed.replace(/\s/g, "").length, 1);

  return (
    companyKeywords.some((keyword) => normalized.includes(keyword)) ||
    upperRatio > 0.65
  );
}

function looksLikeJobTitle(value: string) {
  const normalized = normalizeText(value);

  return jobTitleKeywords.some((keyword) => normalized.includes(keyword));
}

function looksLikePerson(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  const normalized = normalizeText(trimmed);

  if (/[가-힣]/.test(trimmed)) {
    return true;
  }

  if (looksLikeCompany(trimmed) || looksLikeCategory(trimmed)) {
    return false;
  }

  const words = normalized.split(" ").filter(Boolean);

  return words.length >= 1 && words.length <= 5;
}

function inferEventName(sheetName: string) {
  return masterSheets.has(sheetName) ? "" : sheetName;
}

function inferCategoryFlags(sheetName: string, category: string) {
  const normalizedSheet = normalizeHeader(sheetName);
  const normalizedCategory = normalizeHeader(category);

  return {
    isInfluencer:
      normalizedSheet.includes("influencer") ||
      normalizedSheet.includes("인플루언서") ||
      normalizedCategory.includes("influencer") ||
      normalizedCategory.includes("인플루언서"),
    isMedia:
      normalizedSheet.includes("언론") ||
      normalizedCategory.includes("언론") ||
      normalizedCategory.includes("media") ||
      normalizedCategory.includes("journal"),
  };
}

function detectLayout(sheetName: string, headers: string[]): SheetLayout {
  const normalizedSheetName = normalizeText(sheetName);
  const headerSet = new Set(headers.map(normalizeHeader));

  if (
    headerSet.has("categoria") &&
    headerSet.has("nome") &&
    headerSet.has("cargo/ instituto")
  ) {
    return "pt-event";
  }

  if (headerSet.has("프로필 이름") && headerSet.has("담당자 이름")) {
    return "influencer";
  }

  if (headerSet.has("언론사") && headerSet.has("이름")) {
    return "media";
  }

  if (headerSet.has("단체명/프로필 이름") && headerSet.has("이름")) {
    if (
      headerSet.has("팔로워 (2024.09. 기준)") ||
      normalizeText(sheetName).includes("정은혜")
    ) {
      return "exhibition";
    }

    return "event";
  }

  if (
    normalizedSheetName.includes("copia de") ||
    (headerSet.has("convidados") && !headerSet.has("nome"))
  ) {
    return "copy-list";
  }

  if (headerSet.has("지역") && headerSet.has("단체명") && headerSet.has("그룹")) {
    return "regional-master";
  }

  if (headerSet.has("단체명") && headerSet.has("그룹")) {
    return "master";
  }

  return "unknown";
}

function buildRawRecord(headers: string[], row: unknown[]) {
  return Object.fromEntries(
    headers.map((header, index) => [
      header || `__EMPTY_${index}`,
      row[index] ?? "",
    ]),
  );
}

function createEmptyDraft(): RowDraft {
  return {
    name: "",
    company: "",
    category: "",
    ownerStaff: "",
    email: "",
    phone: "",
    imageHint: "",
    jobTitle: "",
    socialUrl: "",
    address: "",
    city: "",
  };
}

function applyMasterHeuristics(
  draft: RowDraft,
  group: string,
  officePhone: string,
) {
  if (!draft.category && group) {
    draft.category = group;
  }

  if (draft.category && group && isGenericCategory(draft.category)) {
    draft.category = group;
  }

  if (!looksLikeCategory(draft.category) && group) {
    if (!draft.name && !draft.company) {
      if (looksLikeCompany(draft.category)) {
        draft.company = draft.category;
      } else if (looksLikePerson(draft.category)) {
        draft.name = draft.category;
      }
      draft.category = group;
    } else if (!draft.company && draft.name) {
      if (looksLikePerson(draft.category) && looksLikeCompany(draft.name)) {
        draft.company = draft.name;
        draft.name = draft.category;
        draft.category = group;
      }
    } else if (!draft.name && draft.company && looksLikePerson(draft.category)) {
      draft.name = draft.category;
      draft.category = group;
    }
  }

  if (!draft.phone) {
    draft.phone = officePhone;
  }
}

function mapRowByLayout(
  sheetName: string,
  headers: string[],
  row: unknown[],
  layout: SheetLayout,
) {
  const draft = createEmptyDraft();
  const get = (...aliases: string[]) => getFirstValue(headers, row, aliases);
  const eventName = inferEventName(sheetName);

  if (layout === "copy-list") {
    draft.name = get("CONVIDADOS");
    draft.socialUrl = get("-");
    draft.jobTitle = get("ACOMPANHANTE");
    draft.category = "기타 초청자";
  } else if (layout === "pt-event") {
    draft.category = get("Categoria");
    draft.name = get("Nome");
    draft.company = get("Cargo/ Instituto");
    draft.email = get("E-mail");
    draft.phone = sanitizePhone(get("Contato"));
    draft.jobTitle = get("Obs.");
  } else if (layout === "influencer") {
    const profileName = get("프로필 이름");
    const managerName = get("담당자 이름");

    draft.category = get("카테고리");
    draft.name =
      managerName &&
      managerName !== profileName &&
      !looksLikePerson(profileName)
        ? managerName
        : profileName;
    draft.company =
      managerName &&
      managerName !== profileName &&
      !looksLikePerson(profileName)
        ? profileName
        : "";
    draft.ownerStaff = get("담당행정원");
    draft.email = get("전자 메일 주소");
    draft.phone = sanitizePhone(get("연락처"));
    draft.socialUrl = get("셜미디어 주소", "소셜미디어 주소");
    draft.city = get("지역");
    draft.jobTitle = get("분야");
    draft.imageHint = get("사진");
  } else if (layout === "media") {
    draft.category = get("카테고리");
    draft.name = get("이름");
    draft.company = get("언론사");
    draft.ownerStaff = get("담당행정원");
    draft.email = get("전자 메일 주소");
    draft.phone = sanitizePhone(get("연락처", "근무처 전화"));
    draft.socialUrl = get("소셜미디어 주소");
    draft.city = get("지역");
    draft.address = get("근무지 주소");
    draft.jobTitle = compactText(get("부서"), get("직함"));
  } else if (layout === "event") {
    draft.category = get("카테고리");
    draft.name = get("이름");
    draft.company = get("단체명/프로필 이름");
    draft.ownerStaff = get("담당자", "담당행정원");
    draft.email = get("전자 메일 주소");
    draft.phone = sanitizePhone(get("연락처"));
    draft.jobTitle = get("직책");
    draft.imageHint = get("사진");

    if (!draft.jobTitle && looksLikeJobTitle(draft.company)) {
      draft.jobTitle = draft.company;
      draft.company = "";
    }
  } else if (layout === "exhibition") {
    draft.category = get("카테고리");
    draft.name = get("이름");
    draft.company = get("단체명/프로필 이름");
    draft.email = get("전자 메일 주소");
    draft.phone = sanitizePhone(get("연락처"));
    draft.socialUrl = get("셜미디어 주소");
    draft.jobTitle = get("비고");
  } else if (layout === "regional-master" || layout === "master" || layout === "unknown") {
    const group = get("그룹");
    const officePhone = get("근무처 전화");

    draft.category = get("카테고리");
    draft.name = get("이름");
    draft.company = get("단체명", "기관명", "회사명");
    draft.ownerStaff = get("담당행정원", "명함 등록자");
    draft.email = get("전자 메일 주소");
    draft.phone = sanitizePhone(get("연락처"));
    draft.socialUrl = get("근무처 팩스, 소셜미디어 주소");
    draft.address = get("근무지 주소");
    draft.city = get("지역");
    draft.jobTitle = compactText(get("부서"), get("직함"));
    draft.imageHint = get("사진");

    applyMasterHeuristics(draft, group, officePhone);
  }

  if (!draft.category && layout === "media") {
    draft.category = "현지언론";
  }

  return {
    draft,
    eventName,
    flags: inferCategoryFlags(sheetName, draft.category),
  };
}

function isMeaningfulMappedRow(draft: RowDraft) {
  return Boolean(
    draft.name ||
      draft.company ||
      draft.email ||
      draft.phone ||
      draft.socialUrl ||
      draft.address,
  );
}

export function extractLegacyWorkbookData(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const previews: LegacyPreviewRow[] = [];
  const mappedRows: LegacyMappedRow[] = [];

  const sheetSummaries = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: "",
    });

    const headerRowIndex = detectHeaderRow(rows);
    const headers = (rows[headerRowIndex] ?? []).map((cell) => String(cell ?? "").trim());
    const dataRows = rows.slice(headerRowIndex + 1);
    const layout = detectLayout(sheetName, headers);

    if (layout === "copy-list") {
      return {
        sheetName,
        headerRowIndex: headerRowIndex + 1,
        totalRows: dataRows.length,
        hasPhotoColumn: headers.some((header) => normalizeHeader(header).includes("사진")),
        sampleColumns: headers.filter(Boolean),
        layout,
      };
    }

    dataRows.forEach((row, recordIndex) => {
      const rawRecord = buildRawRecord(headers, row);
      const rowNumber = headerRowIndex + recordIndex + 2;
      const { draft, eventName, flags } = mapRowByLayout(
        sheetName,
        headers,
        row,
        layout,
      );

      if (!isMeaningfulMappedRow(draft)) {
        return;
      }

      const mappedRow = {
        sheetName,
        rowNumber,
        name: draft.name,
        company: draft.company,
        category: draft.category,
        ownerStaff: normalizeStaffName(draft.ownerStaff),
        email: draft.email,
        phone: draft.phone,
        imageHint:
          draft.imageHint ||
          (sheetName.toLowerCase().includes("foto") ? "시트명에 FOTO 포함" : ""),
        jobTitle: draft.jobTitle,
        socialUrl: draft.socialUrl,
        address: draft.address,
        city: draft.city,
        eventName,
        cooperationLevel: extractCooperationLevelFromRecord(rawRecord),
        isInfluencer: flags.isInfluencer,
        isMedia: flags.isMedia,
        rawRecord,
      } satisfies LegacyMappedRow;

      mappedRows.push(mappedRow);

      if (previews.length < 30) {
        previews.push({
          sheetName,
          rowNumber,
          name: mappedRow.name,
          company: mappedRow.company,
          category: mappedRow.category,
          ownerStaff: mappedRow.ownerStaff,
          email: mappedRow.email,
          phone: mappedRow.phone,
          imageHint: mappedRow.imageHint,
        });
      }
    });

    return {
      sheetName,
      headerRowIndex: headerRowIndex + 1,
      totalRows: dataRows.length,
      hasPhotoColumn: headers.some((header) => normalizeHeader(header).includes("사진")),
      sampleColumns: headers.filter(Boolean),
      layout,
    };
  });

  return {
    workbookName: workbook.Props?.Title || "문화원 DB",
    sheetCount: workbook.SheetNames.length,
    sheetSummaries,
    previewRows: previews,
    mappedRows,
  };
}

export function parseLegacyWorkbook(buffer: Buffer) {
  const { mappedRows, ...rest } = extractLegacyWorkbookData(buffer);
  return {
    ...rest,
    mappedRowCount: mappedRows.length,
  };
}
