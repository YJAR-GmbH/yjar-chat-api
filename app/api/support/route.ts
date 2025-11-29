import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      sessionIdHash,
      name,
      email,
      phone,
      message,
      lastMessages,
      url,
      ticketTitle,
      consent,
    } = body || {};

    // --- Pflichtfelder prüfen ---
    if (!sessionIdHash) {
      return NextResponse.json(
        { error: "sessionIdHash ist erforderlich" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name ist erforderlich" },
        { status: 400 }
      );
    }

    if (
      (!email || !String(email).trim()) &&
      (!phone || !String(phone).trim())
    ) {
      return NextResponse.json(
        { error: "E-Mail oder Telefonnummer ist erforderlich" },
        { status: 400 }
      );
    }

    // --- In Supabase speichern (tickets) ---
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        session_id_hash: sessionIdHash,
        name: name.trim(),
        email: email ? String(email).trim() : null,
        phone: phone ? String(phone).trim() : null,
        message: message ?? null,
        last_messages: Array.isArray(lastMessages) ? lastMessages : [],
        ticket_title: ticketTitle ?? null,
        url: url ?? null,
        consent: consent ?? null,
      })
      .select()
      .single();

    // Fehler nicht schlucken, sondern zurückgeben
    if (ticketError) {
      console.error("Supabase tickets insert error:", ticketError);
      return NextResponse.json(
        { error: ticketError.message },
        { status: 500 }
      );
    }

    // --- Weiter an n8n schicken (optional) ---
    if (process.env.N8N_SUPPORT_WEBHOOK_URL) {
      await fetch(process.env.N8N_SUPPORT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch((err) => console.error("N8N error:", err));
    }

    return NextResponse.json({ ok: true, ticket }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
