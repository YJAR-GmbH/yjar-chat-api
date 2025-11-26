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
    const apiKeyHeader = req.headers.get("x-api-key");
    const envKey = RAW_INTERNAL_API_KEY?.trim() || null;
    const apiKey = apiKeyHeader?.trim() || null;

    if (!envKey) {
      console.error("INTERNAL_API_KEY is not set");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    if (!apiKey || apiKey !== envKey) {
      console.warn("Unauthorized request to /api/chat");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, sessionId } = body || {};

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      return NextResponse.json(
        { error: "OpenAI misconfigured" },
        { status: 500 }
      );
    }

    // ---------------------------------------------
    // 1. Intent Analyse (Lead / Support / Other)
    // ---------------------------------------------
    const intentPrompt = `
Klassifiziere die Nutzeranfrage in eine der Kategorien:

- "lead" → Nutzer interessiert sich für Zusammenarbeit, Preise, Angebote, Website-Erstellung, Marketing, AI-Integration, Kontaktaufnahme.
- "support" → Nutzer beschreibt ein Problem, Fehler, technische Schwierigkeit, "funktioniert nicht", "geht nicht", "Problem", "Bug".
- "other" → normale Unterhaltung oder allgemeine Fragen.

Gib NUR eines der Wörter zurück: lead / support / other.
`;

    const intentCheck = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: intentPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 5
    });

    const intent =
      intentCheck.choices[0]?.message?.content?.trim().toLowerCase() ?? "other";

    // ---------------------------------------------
    // 2. System Prompt – YJAR Assistent
    // ---------------------------------------------
    const systemPrompt = `
Du bist der offizielle AI-Assistent der YJAR GmbH.
Du antwortest professionell, freundlich, kompetent und klar.
Du hilfst Website-Besuchern mit Informationen zu:
- Leistungen der Agentur (Webdesign, Performance Marketing, SEO, Automatisierung, AI-Integration)
- Preisen und Angeboten
- Zusammenarbeit, Prozessen, Terminen
- Kontaktaufnahme

Wenn der Nutzer Interesse an einer Zusammenarbeit zeigt,
bitte ihn höflich um Kontaktinformationen (E-Mail oder Name),
damit ein Teammitglied sich melden kann.

Erfinde niemals Fakten. Antworte knapp und präzise.
Nutze eine klare, moderne, positive Sprache.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "assistant", content: `Interne Info: intent = ${intent}` },
        { role: "user", content: message }
      ]
    });

    const botAnswer = completion.choices[0]?.message?.content ?? "";

    if (!botAnswer) {
      console.error("Empty botAnswer from OpenAI");
      return NextResponse.json(
        { error: "Empty response from model" },
        { status: 500 }
      );
    }

    // ---------------------------------------------
    // 3. Chat-Log speichern
    // ---------------------------------------------
    if (sessionId) {
      logChatMessage({
        sessionId,
        userMessage: message,
        botAnswer
      }).catch((err) => console.error("logChatMessage error:", err));
    }

    // ---------------------------------------------
    // 3.5 Support → an /api/support weiterleiten
    // ---------------------------------------------
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

    // ---------------------------------------------
    // 3.6 Lead → an /api/leads weiterleiten
    // ---------------------------------------------
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

    // ---------------------------------------------
    // 4. Antwort an Frontend zurückgeben
    // ---------------------------------------------
    return NextResponse.json(
      {
        answer: botAnswer,
        intent
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("chat api error:", err);
    return NextResponse.json(
      { error: "chat api failed" },
      { status: 500 }
    );
  }
}
