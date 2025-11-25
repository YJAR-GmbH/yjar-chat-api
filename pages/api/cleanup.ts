import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
    : null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = req.headers["x-api-key"];
  if (!INTERNAL_API_KEY || apiKey !== INTERNAL_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  try {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error, count } = await supabase
      .from("chat_messages")
      .delete({ count: "exact" })
      .lt("created_at", thirtyDaysAgo);

    if (error) {
      console.error("Supabase error in cleanup:", error);
      return res.status(500).json({ error: "Cleanup failed" });
    }

    return res.status(200).json({ success: true, deleted: count ?? 0 });
  } catch (err) {
    console.error("Unexpected error in cleanup:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
