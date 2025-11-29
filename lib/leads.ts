import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type LeadPayload = {
  sessionIdHash: string;
  name?: string | null;
  email?: string | null;
  phone: string | null;  
  message?: string | null;
  source?: string | null; 
};

export async function createLead(payload: LeadPayload) {
  const { data, error } = await supabase
    .from("leads")
    .insert({
      session_id_hash: payload.sessionIdHash,
      name: payload.name ?? null,
      email: payload.email ?? null,
      phone: payload.email ?? null,
      message: payload.message ?? null,
      source: payload.source ?? "website-chat",
    })
    .select()
    .single();

  if (error) {
    throw new Error("Supabase insert error: " + error.message);
  }

  return data;
}
