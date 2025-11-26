import { NextResponse } from "next/server";
import OpenAI from "openai";
import { logChatMessage } from "@/lib/chat-logs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const RAW_INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

export async function POST(req: Request) {
  try {
    // -----------------------------------------------------
    // (0) API-Key Prüfung
    // -----------------------------------------------------
    const apiKeyHeader = req.headers.get("x-api-key");
    const envKey = RAW_INTERNAL_API_KEY?.trim() || null;
    const apiKey = apiKeyHeader?.trim() || null;

    if (!envKey) {
      console.error("INTERNAL_API_KEY is not set");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    if (!apiKey || apiKey !== envKey) {
      console.warn("Unauthorized request to /api/chat");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // -----------------------------------------------------
    // (1) Body lesen
    // -----------------------------------------------------
    const body = await req.json();
    const { message, sessionId } = body || {};

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      return NextResponse.json({ error: "OpenAI misconfigured" }, { status: 500 });
    }

    // -----------------------------------------------------
    // (2) Intent Analyse (lead / support / other)
    // -----------------------------------------------------
    const intentPrompt = `
Klassifiziere die Nutzeranfrage in genau eine dieser Kategorien:

- "lead" → Nutzer will Zusammenarbeit, Angebot, Preise, Website, Marketing, Automatisierung.
- "support" → Nutzer beschreibt ein Problem, Fehler oder "funktioniert nicht".
- "other" → alle anderen Fragen.

Antwort NUR mit einem der Wörter: lead / support / other.
`;

    const intentCheck = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 5,
      messages: [
        { role: "system", content: intentPrompt },
        { role: "user", content: message }
      ]
    });

    const intent =
      intentCheck.choices[0]?.message?.content?.trim().toLowerCase() || "other";

    // -----------------------------------------------------
    // (3) Haupt-Systemprompt – YJAR Assistent
    // -----------------------------------------------------
    const systemPrompt = `
Du bist der offizielle AI-Assistent der YJAR GmbH.

Antwortstil:
- professionell
- freundlich
- modern
- klar
- keine erfundenen Fakten

Du hilfst Besuchern bei:
• Leistungen (Websites, Marketing, SEO, Automatisierung, KI-Integration)
• Preisen & Angeboten
• Projektablauf
• Terminvereinbarung
• Kontaktaufnahme

Wenn der Nutzer Interesse zeigt:
→ bitte höflich um Name oder E-Mail.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "assistant", content: `Interne Info: intent = ${intent}` },
        { role: "user", content: message }
      ]
    });

    const botAnswer = completion.choices[0]?.message?.content || "";

    if (!botAnswer) {
      return NextResponse.json({ error: "Empty response from model" }, { status: 500 });
    }

    // -----------------------------------------------------
    // (4) Chat-Logs speichern
    // -----------------------------------------------------
    if (sessionId) {
      logChatMessage({
        sessionId,
        userMessage: message,
        botAnswer
      }).catch((err) => console.error("logChatMessage error:", err));
    }

    // -----------------------------------------------------
    // (5) Support-Fälle an /api/support weiterleiten
    // -----------------------------------------------------
    if (intent === "support") {
      const supportPayload = {
        sessionId,
        message,
        url: body.url ?? null,
        userAgent: body.userAgent ?? null
      };

      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/support`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-api-key": process.env.INTERNAL_API_KEY!
          },
          body: JSON.stringify(supportPayload)
        });
      } catch (err) {
        console.error("Support-Weiterleitung Fehler:", err);
      }
    }

    // -----------------------------------------------------
    // (6) Lead-Fälle an /api/leads weiterleiten
    // -----------------------------------------------------
    if (intent === "lead") {
      const leadPayload = {
        sessionIdHash: sessionId ?? null,
        name: body.name ?? null,
        email: body.email ?? null,
        message,
        source: "website-chat"
      };

      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/leads`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-api-key": process.env.INTERNAL_API_KEY!
          },
          body: JSON.stringify(leadPayload)
        });
      } catch (err) {
        console.error("Lead-Weiterleitung Fehler:", err);
      }
    }

    // -----------------------------------------------------
    // (7) Antwort zurück an Frontend
    // -----------------------------------------------------
    return NextResponse.json({ answer: botAnswer, intent }, { status: 200 });
  } catch (err) {
    console.error("chat api error:", err);
    return NextResponse.json({ error: "chat api failed" }, { status: 500 });
  }
}
