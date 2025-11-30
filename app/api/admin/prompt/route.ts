import { NextResponse } from "next/server";
import { getSystemPrompt, updateSystemPrompt } from "@/lib/chat-settings";

const ADMIN_PROMPT_TOKEN = process.env.ADMIN_PROMPT_TOKEN;

// ----- CORS -----
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-token",
};

function withCors(response: NextResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function OPTIONS() {
  return withCors(NextResponse.json({}, { status: 200 }));
}

// ----- Auth -----
function isAuthorized(req: Request) {
  const token = req.headers.get("x-admin-token")?.trim() || null;
  const envToken = ADMIN_PROMPT_TOKEN?.trim() || null;

  if (!envToken) {
    console.error("ADMIN_PROMPT_TOKEN is not set");
    return false;
  }

  return token !== null && token === envToken;
}

// ----- GET: aktuellen Prompt holen -----
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return withCors(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
  }

  const prompt = await getSystemPrompt();
  return withCors(NextResponse.json({ prompt }));
}

// ----- POST: Prompt aktualisieren -----
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return withCors(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
  }

  try {
    const body = await req.json();
    const { prompt } = body || {};

    if (!prompt || typeof prompt !== "string") {
      return withCors(
        NextResponse.json({ error: "prompt is required" }, { status: 400 })
      );
    }

    const updated = await updateSystemPrompt(prompt);

    return withCors(
      NextResponse.json({
        prompt: updated?.system_prompt ?? prompt,
      })
    );
  } catch (err) {
    console.error("/api/admin/prompt POST error:", err);
    return withCors(
      NextResponse.json(
        { error: "failed to update prompt" },
        { status: 500 }
      )
    );
  }
}
