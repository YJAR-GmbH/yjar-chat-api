// app/api/leads/route.ts

import { NextResponse } from "next/server";
import { createLead } from "@/lib/leads";

export async function POST(req: Request) {
  try {
    // Interner API-Key Check (Zugriff nur vom Chat-Backend)
    const auth = req.headers.get("x-internal-api-key");
    if (!auth || auth !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Request-Body lesen
    const body = await req.json();

    const {
      sessionIdHash,
      name,
      email,
      phone,
      message,
      source,
    } = body || {};

    // sessionIdHash ist Pflicht
    if (!sessionIdHash || typeof sessionIdHash !== "string") {
      return NextResponse.json(
        { error: "sessionIdHash ist erforderlich" },
        { status: 400 }
      );
    }

    // Name ist Pflicht
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name ist erforderlich" },
        { status: 400 }
      );
    }

    // Mindestens E-Mail ODER Telefon ist Pflicht
    const hasEmail = email && String(email).trim().length > 0;
    const hasPhone = phone && String(phone).trim().length > 0;

    if (!hasEmail && !hasPhone) {
      return NextResponse.json(
        { error: "E-Mail oder Telefonnummer ist erforderlich" },
        { status: 400 }
      );
    }

    // Lead in Supabase speichern
    const data = await createLead({
      sessionIdHash: sessionIdHash,
      name: name.trim(),
      email: hasEmail ? String(email).trim() : null,
      phone: hasPhone ? String(phone).trim() : null, // Telefon wird jetzt gespeichert
      message: message ?? null,
      source: source ?? "website-chat",
    });

    // Erfolgreiche Antwort
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error: unknown) {
    // Fehlerbehandlung
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
