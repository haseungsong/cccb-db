const cooperationAliases = [
  "문화원과의 협력 수위",
  "문화원과의협력수위",
  "협력 수위",
  "협력수위",
  "주요도",
  "중요도",
  "우선순위",
  "친밀도",
] as const;

export const cooperationLevelOptions = ["★", "★★", "★★★"] as const;
export type CooperationLevelOption = (typeof cooperationLevelOptions)[number];

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();
}

function compactValue(value: string) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function normalizeCooperationLevel(value: string | null | undefined) {
  const normalized = compactValue(String(value ?? ""));

  if (!normalized) {
    return "";
  }

  if (
    normalized.includes("★★★") ||
    normalized.includes("3성") ||
    normalized.includes("3점") ||
    normalized.includes("3단계") ||
    normalized.includes("세개") ||
    normalized.includes("셋") ||
    normalized.includes("매우") ||
    normalized.includes("최상") ||
    normalized.includes("핵심") ||
    normalized.includes("우선") ||
    normalized.includes("최우선") ||
    normalized.includes("최고")
  ) {
    return "★★★";
  }

  if (
    normalized.includes("★★") ||
    normalized.includes("2성") ||
    normalized.includes("2점") ||
    normalized.includes("2단계") ||
    normalized.includes("두개") ||
    normalized.includes("둘") ||
    normalized.includes("우호") ||
    normalized.includes("친밀") ||
    normalized.includes("높음") ||
    normalized.includes("중요")
  ) {
    return "★★";
  }

  if (
    normalized.includes("★") ||
    normalized.includes("1성") ||
    normalized.includes("1점") ||
    normalized.includes("1단계") ||
    normalized.includes("한개") ||
    normalized.includes("하나") ||
    normalized.includes("보통") ||
    normalized.includes("기본") ||
    normalized.includes("낮음") ||
    normalized.includes("중간")
  ) {
    return "★";
  }

  if (/^[123]$/.test(normalized)) {
    return normalized === "3" ? "★★★" : normalized === "2" ? "★★" : "★";
  }

  return "★";
}

export function extractCooperationLevelFromRecord(record: Record<string, unknown>) {
  const aliasSet = new Set(cooperationAliases.map(normalizeKey));

  for (const [key, rawValue] of Object.entries(record)) {
    if (!aliasSet.has(normalizeKey(key))) {
      continue;
    }

    const value = normalizeCooperationLevel(String(rawValue ?? ""));
    if (value) {
      return value;
    }
  }

  return "";
}
