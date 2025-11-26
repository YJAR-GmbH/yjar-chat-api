import { NextResponse } from "next/server";
import { logFeedback } from "@/lib/feedback";

const RAW_INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

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
      console.warn("Unauthorized request to /api/feedback");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    
    const body = await req.json();
    const { sessionIdHash, messageId, vote, comment } = body || {};

    
    if (!sessionIdHash || typeof sessionIdHash !== "string") {
      return NextResponse.json(
        { error: "sessionIdHash is required" },
        { status: 400 }
      );
    }

    if (!messageId || typeof messageId !== "string") {
      return NextResponse.json(
        { error: "messageId is required" },
        { status: 400 }
      );
    }

    if (!vote || (vote !== "up" && vote !== "down")) {
      return NextResponse.json(
        { error: "vote must be 'up' or 'down'" },
        { status: 400 }
      );
    }

 
    await logFeedback({
      sessionIdHash,
      messageId,
      vote,
      comment: comment || null,
    });

  
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err) {
    console.error("feedback api error:", err);
    return NextResponse.json(
      { error: "feedback api failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
