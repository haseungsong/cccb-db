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

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();
}

export function normalizeCooperationLevel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || "";
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
