import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // API-Key Prüfung
    const apiKeyHeader = req.headers.get("x-internal-api-key");
    if (!apiKeyHeader || apiKeyHeader !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Pflichtfeld
    if (!body.sessionId || !body.message) {
      return NextResponse.json(
        { error: "sessionId und message sind erforderlich" },
        { status: 400 }
      );
    }

    // Daten für n8n Webhook vorbereiten
    const payload = {
      sessionId: body.sessionId,
      summary: body.summary ?? null,
      contactName: body.contactName ?? null,
      contactEmail: body.contactEmail ?? null,
      contactPhone: body.contactPhone ?? null,
      lastMessages: body.lastMessages ?? [],
      message: body.message,
      url: body.url ?? null,
      userAgent: body.userAgent ?? null
    };
    

    // Request an n8n Support Workflow senden
    const webhookUrl = process.env.N8N_SUPPORT_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "N8N webhook is not configured" },
        { status: 500 }
      );
    }

    const n8nRes = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await n8nRes.json().catch(() => ({}));

    return NextResponse.json(
      {
        ok: true,
        forwarded: true,
        n8n: result
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
