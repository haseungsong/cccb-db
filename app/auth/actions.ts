"use server";

import { redirect } from "next/navigation";
import { normalizeStaffName } from "@/lib/staff/normalize";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_EMAIL_DOMAIN = "kccbrazil.com.br";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isAllowedCultureCenterEmail(email: string) {
  return normalizeEmail(email).endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

function redirectWithAuthError(mode: "login" | "signup", message: string): never {
  redirect(`/auth?mode=${mode}&error=${encodeURIComponent(message)}`);
}

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

async function ensureStaffMember(displayName: string, email: string) {
  const supabase = createSupabaseAdminClient();
  const canonicalName = normalizeStaffName(displayName);

  if (email) {
    const existingByEmail = await supabase
      .from("staff_members")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (existingByEmail.error) {
      throw existingByEmail.error;
    }

    if (existingByEmail.data) {
      return existingByEmail.data.id;
    }
  }

  const existingByName = await supabase
    .from("staff_members")
    .select("id")
    .eq("name", canonicalName)
    .limit(1)
    .maybeSingle();

  if (existingByName.error) {
    throw existingByName.error;
  }

  if (existingByName.data) {
    return existingByName.data.id;
  }

  const created = await supabase
    .from("staff_members")
    .insert({
      name: canonicalName,
      email: email || null,
      role: "editor",
    })
    .select("id")
    .single();

  if (created.error) {
    throw created.error;
  }

  return created.data.id;
}

async function upsertProfile(input: {
  userId: string;
  email: string;
  displayName: string;
  teamName: string;
}) {
  const supabase = createSupabaseAdminClient();
  const withTeam = await supabase.from("profiles").upsert(
    {
      id: input.userId,
      email: input.email,
      display_name: input.displayName,
      team_name: input.teamName || null,
      role: "editor",
    },
    { onConflict: "id" },
  );

  if (isMissingColumnError(withTeam.error, "team_name")) {
    const fallback = await supabase.from("profiles").upsert(
      {
        id: input.userId,
        email: input.email,
        display_name: input.displayName,
        role: "editor",
      },
      { onConflict: "id" },
    );

    if (fallback.error) {
      throw fallback.error;
    }

    return;
  }

  if (withTeam.error) {
    throw withTeam.error;
  }
}

export async function signInAction(formData: FormData) {
  const email = normalizeEmail(getText(formData, "email"));
  const password = getText(formData, "password");
  const supabase = await createSupabaseServerClient();

  if (!isAllowedCultureCenterEmail(email)) {
    redirectWithAuthError("login", "문화원 공식 이메일(@kccbrazil.com.br)로만 로그인할 수 있습니다.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithAuthError("login", error.message);
  }

  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const email = normalizeEmail(getText(formData, "email"));
  const password = getText(formData, "password");
  const displayName = normalizeStaffName(
    getText(formData, "displayName") || email.split("@")[0] || "담당자",
  );
  const teamName = getText(formData, "teamName");
  const supabase = await createSupabaseServerClient();

  if (!isAllowedCultureCenterEmail(email)) {
    redirectWithAuthError(
      "signup",
      "문화원 공식 이메일(@kccbrazil.com.br)만 계정을 만들 수 있습니다. 다른 이메일에는 인증 메일을 보내지 않습니다.",
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        team_name: teamName,
      },
    },
  });

  if (error) {
    redirectWithAuthError("signup", error.message);
  }

  if (!data.user) {
    redirectWithAuthError("signup", "회원가입 처리에 실패했습니다.");
  }

  await ensureStaffMember(displayName, email);
  await upsertProfile({
    userId: data.user.id,
    email,
    displayName,
    teamName,
  });

  redirect("/?welcome=1");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth");
}
