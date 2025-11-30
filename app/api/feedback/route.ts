import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      sessionIdHash,
      vote,
      userMessage,
      botAnswer,
      messageId,
    } = body || {};

    // messageId больше НЕ обязателен
    if (!sessionIdHash || !vote) {
      return NextResponse.json(
        { error: "sessionIdHash and vote are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("feedback")
      .insert({
        session_id_hash: sessionIdHash,
        vote,
        user_message: userMessage ?? null,
        bot_answer: botAnswer ?? null,
        message_id: messageId ?? null, // если захочешь добавить позже
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase feedback insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
