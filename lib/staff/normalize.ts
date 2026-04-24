import { normalizeText } from "@/lib/contacts/mergeContact";

const aliasGroups = [
  {
    canonical: "스테파니",
    exact: ["스테파니", "스테", "ste", "stephanie", "stefanie", "stefani"],
  },
  {
    canonical: "김철홍",
    exact: [
      "김철홍",
      "원장님",
      "원장",
      "kimcheolhong",
      "cheolhongkim",
      "kimcheulhong",
      "cheulhongkim",
      "kim, cheulhong",
      "cheulhong, kim",
      "kimchulhong",
      "chulhongkim",
      "hongkimcheol",
      "directorkimcheolhong",
      "directorkim",
    ],
  },
] as const;

function compact(value: string) {
  return normalizeText(value).replace(/[\s'"`".,()/\\_-]+/g, "");
}

export function normalizeStaffName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "";
  }

  const key = compact(trimmed);
  const matched = aliasGroups.find((group) => group.exact.some((alias) => compact(alias) === key));
  return matched?.canonical ?? trimmed;
}

export function normalizeStaffKey(name: string) {
  return normalizeText(normalizeStaffName(name));
}
