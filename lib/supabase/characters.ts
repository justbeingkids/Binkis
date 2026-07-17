import { getAdminClient } from "./client";
import { removeCharacterImage } from "./character-images";
import type { Character } from "@/types";

interface DbCharacterRow {
  id: string;
  name: string;
  variant_id: string | null;
  quota: number;
  assigned_count: number;
  weight: number | string;
  win_probability: number | string;
  active: boolean;
  sort_order: number;
  image_url: string | null;
  created_at: string;
}

function toCharacter(row: DbCharacterRow): Character {
  const quota = Number(row.quota);
  const assignedCount = Number(row.assigned_count);
  return {
    id: row.id,
    name: row.name,
    variantId: row.variant_id ?? null,
    quota,
    assignedCount,
    remaining: Math.max(quota - assignedCount, 0),
    weight: Number(row.weight),
    winProbability: Number(row.win_probability),
    active: row.active,
    sortOrder: Number(row.sort_order),
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at,
  };
}

/**
 * Refresh every character's stored win_probability. Called after any change.
 * Non-fatal: the row change itself already succeeded, and assign_character
 * self-heals stale probabilities at award time, so a recompute hiccup must not
 * fail the whole request. Returns the error message (for surfacing) or null.
 */
async function recompute(): Promise<string | null> {
  const supabase = getAdminClient();
  const { error } = await supabase.rpc("recompute_win_probabilities");
  if (error) {
    console.error("recompute_win_probabilities failed:", error.message);
    return error.message;
  }
  return null;
}

export async function listCharacters(): Promise<Character[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listCharacters failed: ${error.message}`);
  return (data ?? []).map((r) => toCharacter(r as DbCharacterRow));
}

export async function findCharacterById(id: string): Promise<Character | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.from("characters").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`findCharacterById failed: ${error.message}`);
  if (!data) return null;
  return toCharacter(data as DbCharacterRow);
}

export async function createCharacter(input: {
  name: string;
  quota: number;
  weight?: number;
  variantId?: string | null;
  sortOrder?: number;
}): Promise<{ character: Character; warning: string | null }> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("characters")
    .insert({
      name: input.name.trim(),
      quota: Math.max(0, Math.trunc(input.quota)),
      weight: input.weight ?? 1,
      variant_id: input.variantId ?? null,
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createCharacter failed: ${error.message}`);
  const warning = await recompute();
  return { character: toCharacter(data as DbCharacterRow), warning };
}

export async function updateCharacter(
  id: string,
  patch: {
    name?: string;
    quota?: number;
    weight?: number;
    active?: boolean;
    variantId?: string | null;
    sortOrder?: number;
  }
): Promise<{ ok: boolean; reason?: "not_found" | "quota_below_assigned"; warning?: string | null }> {
  // Guard: quota can never drop below what's already been awarded.
  if (patch.quota !== undefined) {
    const existing = await findCharacterById(id);
    if (!existing) return { ok: false, reason: "not_found" };
    if (Math.trunc(patch.quota) < existing.assignedCount) {
      return { ok: false, reason: "quota_below_assigned" };
    }
  }

  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.quota !== undefined) update.quota = Math.max(0, Math.trunc(patch.quota));
  if (patch.weight !== undefined) update.weight = Math.max(0, patch.weight);
  if (patch.active !== undefined) update.active = patch.active;
  if (patch.variantId !== undefined) update.variant_id = patch.variantId;
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;

  if (Object.keys(update).length === 0) return { ok: true };

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("characters")
    .update(update)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`updateCharacter failed: ${error.message}`);
  if (!data) return { ok: false, reason: "not_found" };

  const warning = await recompute(); // weight/quota/active all affect the odds
  return { ok: true, warning };
}

export async function deleteCharacter(
  id: string
): Promise<{ ok: boolean; reason?: "not_found" | "has_assignments"; warning?: string | null }> {
  const existing = await findCharacterById(id);
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.assignedCount > 0) return { ok: false, reason: "has_assignments" };

  const supabase = getAdminClient();
  const { error } = await supabase.from("characters").delete().eq("id", id);
  if (error) throw new Error(`deleteCharacter failed: ${error.message}`);
  // Best-effort: drop the stored image so it doesn't linger orphaned in Storage.
  // Never fail the delete over cleanup (the row is already gone).
  try {
    await removeCharacterImage(id);
  } catch (e) {
    console.error("removeCharacterImage on delete failed:", e);
  }
  const warning = await recompute();
  return { ok: true, warning };
}

/** Assign a character to a winning code (idempotent, weighted, race-safe). */
export async function assignCharacter(code: string): Promise<{ id: string; name: string } | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc("assign_character", { p_code: code });
  if (error) throw new Error(`assign_character failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return { id: (row as { id: string }).id, name: (row as { name: string }).name };
}
