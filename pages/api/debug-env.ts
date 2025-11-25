import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    url: process.env.SUPABASE_URL || null,
    role: process.env.SUPABASE_SERVICE_ROLE || null,
    role_key: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
    internal_key: process.env.INTERNAL_API_KEY ? "set" : "missing",
  });
}
