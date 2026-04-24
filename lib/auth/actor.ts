import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  email: string | null;
  role: string;
  display_name: string | null;
  team_name?: string | null;
};

type StaffRow = {
  id: string;
  name: string;
  email: string | null;
};

export type ActorContext = {
  userId: string;
  email: string;
  role: string;
  displayName: string;
  teamName: string;
  staffMemberId: string | null;
  staffMemberName: string;
};

function isMissingColumnError(error: unknown, columnName: string) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "42703" &&
    candidate.message?.toLowerCase().includes(columnName.toLowerCase()) === true
  );
}

function buildFallbackName(email: string) {
  return email.split("@")[0]?.trim() || "담당자";
}

async function readProfile(userId: string) {
  const supabase = createSupabaseAdminClient();
  const profileWithTeam = await supabase
    .from("profiles")
    .select("id, email, role, display_name, team_name")
    .eq("id", userId)
    .maybeSingle();

  if (isMissingColumnError(profileWithTeam.error, "team_name")) {
    const fallback = await supabase
      .from("profiles")
      .select("id, email, role, display_name")
      .eq("id", userId)
      .maybeSingle();

    if (fallback.error) {
      throw fallback.error;
    }

    return (fallback.data ?? null) as ProfileRow | null;
  }

  if (profileWithTeam.error) {
    throw profileWithTeam.error;
  }

  return (profileWithTeam.data ?? null) as ProfileRow | null;
}

async function resolveStaffMember(displayName: string, email: string) {
  const supabase = createSupabaseAdminClient();
  const byEmail = email
    ? await supabase
        .from("staff_members")
        .select("id, name, email")
        .eq("email", email)
        .limit(1)
        .maybeSingle()
    : null;

  if (byEmail?.error) {
    throw byEmail.error;
  }

  if (byEmail?.data) {
    return byEmail.data as StaffRow;
  }

  const allStaff = await supabase.from("staff_members").select("id, name, email").order("name");
  if (allStaff.error) {
    throw allStaff.error;
  }

  const normalizedDisplayName = displayName.trim().toLowerCase();
  return (
    ((allStaff.data ?? []) as StaffRow[]).find(
      (row) => row.name.trim().toLowerCase() === normalizedDisplayName,
    ) ?? null
  );
}

export async function getOptionalActorContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const profile = await readProfile(user.id);
  const email = user.email ?? profile?.email ?? "";
  const displayName =
    profile?.display_name?.trim() ||
    (typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "") ||
    buildFallbackName(email);
  const teamName =
    (typeof profile?.team_name === "string" ? profile.team_name : "") ||
    (typeof user.user_metadata?.team_name === "string" ? user.user_metadata.team_name.trim() : "");
  const staffMember = await resolveStaffMember(displayName, email);

  return {
    userId: user.id,
    email,
    role: profile?.role ?? "viewer",
    displayName,
    teamName,
    staffMemberId: staffMember?.id ?? null,
    staffMemberName: staffMember?.name ?? displayName,
  } satisfies ActorContext;
}

export async function requireActorContext() {
  const actor = await getOptionalActorContext();

  if (!actor) {
    redirect("/auth");
  }

  return actor;
}
