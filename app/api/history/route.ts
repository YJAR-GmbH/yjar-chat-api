// app/api/history/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
 
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env vars");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    // авторизация как в /api/chat
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
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
        { error: "Failed to load history" },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ messages: [] }, { status: 200 });
    }

    const messages = data.flatMap((row) => {
      const arr: {
        role: "user" | "assistant";
        content: string;
        createdAt: string;
      }[] = [];

      if (row.userMessage) {
        arr.push({
          role: "user",
          content: row.userMessage,
          createdAt: row.createdAt,
        });
      }

      if (row.botAnswer) {
        arr.push({
          role: "assistant",
          content: row.botAnswer,
          createdAt: row.createdAt,
        });
      }

      return arr;
    });

    return NextResponse.json({ messages }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in /api/history:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
