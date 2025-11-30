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

   
    if (!sessionIdHash || !vote) {
      return NextResponse.json(
        { error: "sessionIdHash and vote are required" },
        { status: 400 }
      );
    }

    
    let comment: string | null = null;
    if (userMessage || botAnswer) {
      const userPart = userMessage ? `User: ${userMessage}` : "";
      const botPart = botAnswer ? `Bot: ${botAnswer}` : "";
      comment = [userPart, botPart].filter(Boolean).join(" | ");
    }

    const { data, error } = await supabase
      .from("feedback")
      .insert({
        session_id_hash: sessionIdHash,
        message_id: messageId ?? null,
        vote,
        comment, 
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
