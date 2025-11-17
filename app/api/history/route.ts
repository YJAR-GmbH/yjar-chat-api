import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-api-key')?.trim() || null;

  if (!INTERNAL_API_KEY) {
    console.error('INTERNAL_API_KEY is not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (!apiKey || apiKey !== INTERNAL_API_KEY.trim()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { sessionId } = body;

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .select('session_id, user_message, bot_answer, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }

  return NextResponse.json(
    {
      sessionId,
      messages: data?.map((row) => ({
        sessionId: row.session_id,
        userMessage: row.user_message,
        botAnswer: row.bot_answer,
        createdAt: row.created_at,
      })),
    },
    { status: 200 },
  );
}
