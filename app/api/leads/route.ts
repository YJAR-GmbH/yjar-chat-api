import { NextResponse } from "next/server";
import { createLead } from "@/lib/leads";

export async function POST(req: Request) {
  const auth = req.headers.get("x-internal-api-key");
  if (!auth || auth !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.sessionIdHash) {
      return NextResponse.json(
        { error: "sessionIdHash is required" },
        { status: 400 }
      );
    }

    const data = await createLead({
        sessionIdHash: body.sessionIdHash,
        name: body.name ?? null,
        email: body.email ?? null,
        message: body.message ?? null,
        source: body.source ?? "website-chat",
      });
      
      // Erfolgreiche Antwort zurückgeben
      return NextResponse.json({ ok: true, data });
      
      } catch (error: unknown) {
        // Fehlerbehandlung – sichere Extraktion der Fehlermeldung
        const message =
          error instanceof Error ? error.message : "Unknown error";
      
        return NextResponse.json(
          { error: message },
          { status: 500 }
        );
      }
    }