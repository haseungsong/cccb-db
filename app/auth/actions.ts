"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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
    .eq("name", displayName)
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
      name: displayName,
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
  const email = getText(formData, "email");
  const password = getText(formData, "password");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/auth?mode=login&error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const email = getText(formData, "email");
  const password = getText(formData, "password");
  const displayName = getText(formData, "displayName") || email.split("@")[0] || "담당자";
  const teamName = getText(formData, "teamName");
  const supabase = await createSupabaseServerClient();

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
    redirect(`/auth?mode=signup&error=${encodeURIComponent(error.message)}`);
  }

  if (!data.user) {
    redirect("/auth?mode=signup&error=%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85%20%EC%B2%98%EB%A6%AC%EC%97%90%20%EC%8B%A4%ED%8C%A8%ED%96%88%EC%8A%B5%EB%8B%88%EB%8B%A4.");
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
