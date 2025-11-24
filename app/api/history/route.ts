import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type ChatRow = {
  userMessage: string | null;
  botAnswer: string | null;
  createdAt: string;
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });
} else {
  console.error("Supabase env missing in /api/history", {
    hasUrl: Boolean(SUPABASE_URL),
    hasServiceRole: Boolean(SUPABASE_SERVICE_ROLE),
  });
}

export async function POST(req: Request) {
  try {
    // Авторизация по внутреннему ключу
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase is not configured on server" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as { sessionId?: string };
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .select("userMessage, botAnswer, createdAt")
      .eq("sessionId", sessionId)
      .order("createdAt", { ascending: true });

    if (error) {
      console.error("Supabase error in /api/history:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to load history" },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ messages: [] }, { status: 200 });
    }

    const rows = data as ChatRow[];

    const messages = rows.flatMap((row) => {
      const result: {
        role: "user" | "assistant";
        content: string;
        createdAt: string;
      }[] = [];

      if (row.userMessage) {
        result.push({
          role: "user",
          content: row.userMessage,
          createdAt: row.createdAt,
        });
      }

      if (row.botAnswer) {
        result.push({
          role: "assistant",
          content: row.botAnswer,
          createdAt: row.createdAt,
        });
      }

      return result;
    });

    return NextResponse.json({ messages }, { status: 200 });
  } catch (err: unknown) {
    console.error("Unexpected error in /api/history:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
