import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Supabase env missing in /api/cleanup");
}

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
    : null;

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!INTERNAL_API_KEY || !apiKey || apiKey !== INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error, count } = await supabase
      .from("chat_messages")
      .delete({ count: "exact" })
      .lt("created_at", thirtyDaysAgo);

    if (error) {
      console.error("Supabase error in /api/cleanup:", error);
      return NextResponse.json(
        { error: "Failed to cleanup old messages" },
        { status: 500 }
      );
    }

    console.log(`Cleanup complete. Deleted rows: ${count ?? 0}`);

    return NextResponse.json(
      { success: true, deleted: count ?? 0 },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Unexpected error in /api/cleanup:", err);

    const message =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: unknown }).message)
        : "Unexpected error during cleanup";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
