import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Supabase env missing in /api/history");
}

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
    : null;

type ChatRow = {
  session_id: string;
  user_message: string | null;
  bot_answer: string | null;
  created_at: string;
};

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

    const body = await req.json();
    const { sessionId } = body as { sessionId?: string };

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .select("session_id, user_message, bot_answer, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Supabase error in /api/history:", error);
      return NextResponse.json(
        { error: "Failed to load history" },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as ChatRow[];

    const messages = rows.flatMap((row) => {
      const arr: {
        role: "user" | "assistant";
        content: string;
        createdAt: string;
      }[] = [];

      if (row.user_message) {
        arr.push({
          role: "user",
          content: row.user_message,
          createdAt: row.created_at,
        });
      }

      if (row.bot_answer) {
        arr.push({
          role: "assistant",
          content: row.bot_answer,
          createdAt: row.created_at,
        });
      }

      return arr;
    });

    return NextResponse.json({ messages }, { status: 200 });
  } catch (err: unknown) {
    console.error("Unexpected error in /api/history:", err);
    const message =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: unknown }).message)
        : "Unexpected error in history";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
