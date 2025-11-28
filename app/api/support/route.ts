import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Body aus dem Request lesen
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
    } = body || {};

    // Pflichtfelder prüfen:
    // 1) sessionIdHash muss vorhanden sein
    // 2) Name ist Pflicht
    // 3) Mindestens E-Mail ODER Telefon muss gesetzt sein
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

    // Payload für n8n vorbereiten (an dein funktionierendes curl angepasst)
    const payload = {
      // sessionId aus dem Hash übernehmen
      sessionId: sessionIdHash,
      // Zusammenfassung aus der letzten Nachricht (oder null)
      summary: message ?? null,
      contactName: name ?? null,
      contactEmail: email ?? null,
      contactPhone: phone ?? null,
      // Letzte Chat-Nachrichten optional durchreichen
      lastMessages: Array.isArray(lastMessages) ? lastMessages : [],
      // Zusätzliche Metadaten (optional)
      url: url ?? null,
      userAgent: req.headers.get("user-agent") ?? null,
      ticketTitle: ticketTitle ?? null, 
    };

    // n8n Webhook URL aus den Umgebungsvariablen holen
    const webhookUrl = process.env.N8N_SUPPORT_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "N8N_SUPPORT_WEBHOOK_URL ist nicht konfiguriert" },
        { status: 500 }
      );
    }

    // Request an n8n senden
    const n8nRes = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Antwort von n8n versuchen zu parsen (kann leer sein)
    const result = await n8nRes.json().catch(() => ({}));

    return NextResponse.json(
      {
        ok: true,
        forwarded: true,
        n8nStatus: n8nRes.status,
        n8n: result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    // Fehlerfall sauber behandeln
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
