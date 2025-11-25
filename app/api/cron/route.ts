import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[cron] Supabase env missing");
}

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET() {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  try {
    // вызываем твою SQL-функцию cleanup_chat_messages()
    const { error } = await supabase.rpc("cleanup_chat_messages");

    if (error) {
      console.error("[cron] cleanup_chat_messages error:", error);
      return NextResponse.json(
        { ok: false, error: "cleanup failed" },
        { status: 500 }
      );
    }

    console.log("[cron] cleanup_chat_messages executed");
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[cron] unexpected error:", err);
    return NextResponse.json({ ok: false, error: "unexpected error" }, { status: 500 });
  }
}
