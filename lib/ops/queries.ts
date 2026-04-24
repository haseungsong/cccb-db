import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getEventsOverview,
  getSearchableContacts,
  type ContactSearchFilters,
} from "@/lib/contacts/queries";
import { getFilterSummary } from "@/lib/contacts/search";
import { parseAudienceFilterJson } from "@/lib/ops/audience";

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  return candidate.code === "PGRST205" || candidate.message?.includes("schema cache") === true;
}

type AudienceListRow = {
  id: string;
  name: string;
  description: string | null;
  filter_json: Record<string, unknown>;
  result_count: number;
  created_at: string;
};

type OutreachCampaignRow = {
  id: string;
  title: string;
  channel: string;
  audience_list_id: string | null;
  recipient_email: string | null;
  recipient_count: number;
  status: string;
  notes: string | null;
  created_at: string;
};

type ContactFollowupRow = {
  id: string;
  contact_id: string;
  channel: string;
  status: string;
  summary: string;
  notes: string | null;
  owner_label: string | null;
  next_follow_up_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type ContactActivityRow = {
  id: string;
  contact_id: string;
  actor_id: string | null;
  action: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type AudienceList = {
  id: string;
  name: string;
  description: string;
  filters: ContactSearchFilters;
  resultCount: number;
  createdAt: string;
  filterSummary: string;
};

export type OutreachCampaign = {
  id: string;
  title: string;
  channel: string;
  recipientEmail: string;
  recipientCount: number;
  status: string;
  notes: string;
  createdAt: string;
  audienceListId: string;
};

export type ContactFollowup = {
  id: string;
  contactId: string;
  channel: string;
  status: string;
  summary: string;
  notes: string;
  ownerLabel: string;
  nextFollowUpAt: string;
  completedAt: string;
  createdAt: string;
};

export type ContactActivity = {
  id: string;
  contactId: string;
  action: string;
  actorName: string;
  actorEmail: string;
  summary: string;
  createdAt: string;
};

export type EventInviteRecommendation = {
  eventId: string;
  eventName: string;
  recommendations: Array<{
    contactId: string;
    name: string;
    company: string;
    ownerStaff: string;
    cooperationLevel: string;
    score: number;
    reasons: string[];
  }>;
};

function cooperationScore(value: string) {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("매우") ||
    normalized.includes("최상") ||
    normalized.includes("핵심") ||
    normalized.includes("우선")
  ) {
    return 45;
  }

  if (
    normalized.includes("우호") ||
    normalized.includes("높") ||
    normalized.includes("친") ||
    normalized.includes("상")
  ) {
    return 32;
  }

  if (normalized.includes("보통") || normalized.includes("중")) {
    return 16;
  }

  return value ? 10 : 0;
}

function summarizeActivity(action: string, payload: Record<string, unknown>) {
  switch (action) {
    case "manual-create":
      return "수동으로 새 연락처를 생성했습니다.";
    case "manual-update":
      return "연락처 기본 정보를 수정했습니다.";
    case "event-link-update":
      return "행사 연결 또는 초청/참석 상태를 업데이트했습니다.";
    case "event-link-remove":
      return "행사 연결을 해제했습니다.";
    case "followup-create":
      return `팔로업을 추가했습니다${payload.summary ? `: ${String(payload.summary)}` : "."}`;
    case "followup-complete":
      return "팔로업을 완료 처리했습니다.";
    case "contact-merge":
      return `중복 연락처를 병합했습니다${payload.mergedFrom ? ` (${String(payload.mergedFrom)})` : "."}`;
    case "business-card-review-update":
      return `명함 검수 상태를 변경했습니다${payload.reviewStatus ? `: ${String(payload.reviewStatus)}` : "."}`;
    case "business-card-auto-merge":
      return "OCR 명함을 기존 연락처와 자동 병합했습니다.";
    case "business-card-create":
      return "OCR 명함으로 새 연락처를 만들었습니다.";
    default:
      return action;
  }
}

export async function getAudienceLists() {
  const supabase = createSupabaseAdminClient();
  const result = await supabase
    .from("audience_lists")
    .select("id, name, description, filter_json, result_count, created_at")
    .order("created_at", { ascending: false });

  if (result.error) {
    if (isMissingTableError(result.error)) {
      return [] as AudienceList[];
    }

    throw result.error;
  }

  return ((result.data ?? []) as AudienceListRow[]).map((row) => {
    const filters = parseAudienceFilterJson(row.filter_json);
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      filters,
      resultCount: row.result_count,
      createdAt: row.created_at,
      filterSummary: getFilterSummary(filters) || "전체 대상",
    } satisfies AudienceList;
  });
}

export async function getAudienceList(listId: string) {
  const lists = await getAudienceLists();
  return lists.find((list) => list.id === listId) ?? null;
}

export async function getOutreachCampaigns() {
  const supabase = createSupabaseAdminClient();
  const result = await supabase
    .from("outreach_campaigns")
    .select(
      "id, title, channel, audience_list_id, recipient_email, recipient_count, status, notes, created_at",
    )
    .order("created_at", { ascending: false });

  if (result.error) {
    if (isMissingTableError(result.error)) {
      return [] as OutreachCampaign[];
    }

    throw result.error;
  }

  return ((result.data ?? []) as OutreachCampaignRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    channel: row.channel,
    recipientEmail: row.recipient_email ?? "",
    recipientCount: row.recipient_count,
    status: row.status,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    audienceListId: row.audience_list_id ?? "",
  }));
}

export async function getContactFollowups(contactId: string) {
  const supabase = createSupabaseAdminClient();
  const result = await supabase
    .from("contact_followups")
    .select(
      "id, contact_id, channel, status, summary, notes, owner_label, next_follow_up_at, completed_at, created_at",
    )
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (result.error) {
    if (isMissingTableError(result.error)) {
      return [] as ContactFollowup[];
    }

    throw result.error;
  }

  return ((result.data ?? []) as ContactFollowupRow[]).map((row) => ({
    id: row.id,
    contactId: row.contact_id,
    channel: row.channel,
    status: row.status,
    summary: row.summary,
    notes: row.notes ?? "",
    ownerLabel: row.owner_label ?? "",
    nextFollowUpAt: row.next_follow_up_at ?? "",
    completedAt: row.completed_at ?? "",
    createdAt: row.created_at,
  }));
}

export async function getContactActivity(contactId: string, limit = 12) {
  const supabase = createSupabaseAdminClient();
  const result = await supabase
    .from("contact_audit_logs")
    .select("id, contact_id, actor_id, action, payload, created_at")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (result.error) {
    return [] as ContactActivity[];
  }

  const rows = (result.data ?? []) as ContactActivityRow[];
  const actorIds = Array.from(new Set(rows.map((row) => row.actor_id).filter(Boolean))) as string[];
  const profileMap = new Map<string, { display_name: string | null; email: string | null }>();

  if (actorIds.length > 0) {
    const profilesResult = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", actorIds);

    if (!profilesResult.error) {
      (profilesResult.data ?? []).forEach((row) => {
        profileMap.set(row.id as string, {
          display_name: (row.display_name as string | null) ?? null,
          email: (row.email as string | null) ?? null,
        });
      });
    }
  }

  return rows.map((row) => {
    const profile = row.actor_id ? profileMap.get(row.actor_id) : null;
    const actorName =
      profile?.display_name ||
      (typeof row.payload.actorDisplayName === "string" ? row.payload.actorDisplayName : "") ||
      "알 수 없는 담당자";
    const actorEmail =
      profile?.email || (typeof row.payload.actorEmail === "string" ? row.payload.actorEmail : "") || "";

    return {
      id: row.id,
      contactId: row.contact_id,
      action: row.action,
      actorName,
      actorEmail,
      summary: summarizeActivity(row.action, row.payload ?? {}),
      createdAt: row.created_at,
    } satisfies ContactActivity;
  });
}

export async function getUpcomingFollowups(limit = 10) {
  const supabase = createSupabaseAdminClient();
  const result = await supabase
    .from("contact_followups")
    .select(
      "id, contact_id, channel, status, summary, notes, owner_label, next_follow_up_at, completed_at, created_at",
    )
    .not("next_follow_up_at", "is", null)
    .order("next_follow_up_at", { ascending: true })
    .limit(limit);

  if (result.error) {
    if (isMissingTableError(result.error)) {
      return [] as ContactFollowup[];
    }

    throw result.error;
  }

  return ((result.data ?? []) as ContactFollowupRow[]).map((row) => ({
    id: row.id,
    contactId: row.contact_id,
    channel: row.channel,
    status: row.status,
    summary: row.summary,
    notes: row.notes ?? "",
    ownerLabel: row.owner_label ?? "",
    nextFollowUpAt: row.next_follow_up_at ?? "",
    completedAt: row.completed_at ?? "",
    createdAt: row.created_at,
  }));
}

export async function getEventInviteRecommendations(limitPerEvent = 5) {
  const [events, contacts, allFollowups] = await Promise.all([
    getEventsOverview(),
    getSearchableContacts(),
    getUpcomingFollowups(200),
  ]);

  const followupMap = new Map<string, ContactFollowup[]>();
  allFollowups.forEach((followup) => {
    followupMap.set(followup.contactId, [
      ...(followupMap.get(followup.contactId) ?? []),
      followup,
    ]);
  });

  const attendanceStats = new Map<
    string,
    { attended: number; total: number }
  >();

  events.forEach((event) => {
    event.attendees.forEach((attendee) => {
      const current = attendanceStats.get(attendee.contactId) ?? { attended: 0, total: 0 };
      current.total += 1;
      if (attendee.attendanceStatus === "attended") {
        current.attended += 1;
      }
      attendanceStats.set(attendee.contactId, current);
    });
  });

  return events.map((event) => {
    const attendeeSet = new Set(event.attendees.map((attendee) => attendee.contactId));

    const recommendations = contacts
      .filter((contact) => !attendeeSet.has(contact.id) && contact.contactStatus !== "inactive")
      .map((contact) => {
        let score = 0;
        const reasons: string[] = [];
        const cooperation = cooperationScore(contact.cooperationLevel);

        if (cooperation > 0) {
          score += cooperation;
          reasons.push(`협력 수위 ${contact.cooperationLevel || "기본"}`);
        }

        const attendance = attendanceStats.get(contact.id);
        if (attendance) {
          const rate = attendance.attended / Math.max(attendance.total, 1);
          const attendanceBonus = Math.round(rate * 25) + attendance.attended * 4;
          score += attendanceBonus;
          reasons.push(`과거 참석 ${attendance.attended}/${attendance.total}`);
        }

        if (contact.ownerStaff) {
          score += 6;
          reasons.push(`담당자 ${contact.ownerStaff}`);
        }

        const latestFollowup = (followupMap.get(contact.id) ?? [])[0];
        if (latestFollowup?.summary) {
          score += 10;
          reasons.push(`메모 ${latestFollowup.summary}`);
        }

        if (contact.isMedia) {
          score += 8;
          reasons.push("언론");
        }

        if (contact.isInfluencer) {
          score += 6;
          reasons.push("인플루언서");
        }

        return {
          contactId: contact.id,
          name: contact.name,
          company: contact.company,
          ownerStaff: contact.ownerStaff,
          cooperationLevel: contact.cooperationLevel,
          score,
          reasons,
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, limitPerEvent);

    return {
      eventId: event.id,
      eventName: event.name,
      recommendations,
    } satisfies EventInviteRecommendation;
  });
}

export async function resolveAudienceContacts(filters: ContactSearchFilters) {
  return getSearchableContacts(filters);
}
