import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    url: process.env.SUPABASE_URL || null,
    role: process.env.SUPABASE_SERVICE_ROLE || null,
    role_key: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
    internal_key: process.env.INTERNAL_API_KEY ? "set" : "missing",
  });
}
