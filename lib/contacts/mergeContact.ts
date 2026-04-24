import type { NormalizedCard } from "@/lib/validators/card";

export type ExistingContactCandidate = {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
};

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function scoreContactMatch(
  incoming: NormalizedCard,
  existing: ExistingContactCandidate,
) {
  let score = 0;
  const reasons: string[] = [];

  if (
    incoming.email &&
    existing.email &&
    incoming.email.toLowerCase() === existing.email.toLowerCase()
  ) {
    score += 100;
    reasons.push("이메일 일치");
  }

  if (
    incoming.phone &&
    existing.phone &&
    normalizePhone(incoming.phone) === normalizePhone(existing.phone)
  ) {
    score += 90;
    reasons.push("전화번호 일치");
  }

  if (
    incoming.name &&
    existing.name &&
    normalizeText(incoming.name) === normalizeText(existing.name)
  ) {
    score += 35;
    reasons.push("이름 일치");
  }

  if (
    incoming.company &&
    existing.company &&
    normalizeText(incoming.company) === normalizeText(existing.company)
  ) {
    score += 35;
    reasons.push("기관명 일치");
  }

  return {
    score,
    reasons,
    action:
      score >= 90 ? "auto-merge" : score >= 60 ? "needs-review" : "create-new",
  } as const;
}
