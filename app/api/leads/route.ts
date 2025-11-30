// app/api/leads/route.ts

import { NextResponse } from "next/server";
import { createLead } from "@/lib/leads";

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("x-internal-api-key");
    if (!auth || auth !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      sessionIdHash,
      name,
      email,
      phone,
      message,
      source,
      ticketTitle,
      lastMessages,
      url,
      consent,
    } = body || {};

    if (!sessionIdHash) {
      return NextResponse.json({ error: "sessionIdHash ist erforderlich" }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    }

    const hasEmail = email && String(email).trim().length > 0;
    const hasPhone = phone && String(phone).trim().length > 0;

    if (!hasEmail && !hasPhone) {
      return NextResponse.json(
        { error: "E-Mail oder Telefonnummer ist erforderlich" },
        { status: 400 }
      );
    }

    // save lead
    const data = await createLead({
      sessionIdHash,
      name: name.trim(),
      email: hasEmail ? String(email).trim() : null,
      phone: hasPhone ? String(phone).trim() : null,
      message: message ?? null,
      source: source ?? "website-chat",
    });

    // send n8n PRODUKTION
    if (process.env.N8N_LEAD_WEBHOOK_URL) {
      await fetch(process.env.N8N_LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionIdHash,
          name,
          email,
          phone,
          message,
          lastMessages,
          ticketTitle,
          url,
          consent,
          type: "lead",
        }),
      }).catch((e) => console.error("LEAD N8N ERROR:", e));
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
