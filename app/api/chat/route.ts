import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { logChatMessage } from '@/lib/chat-logs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const RAW_INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export async function POST(req: Request) {
  const apiKeyHeader = req.headers.get('x-api-key');


  const envKey = RAW_INTERNAL_API_KEY?.trim() || null;
  const apiKey = apiKeyHeader?.trim() || null;

  if (!envKey) {
    console.error('INTERNAL_API_KEY is not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (!apiKey || apiKey !== envKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { message, sessionId } = body;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [{ role: 'user', content: message }],
  });

  const botAnswer = completion.choices[0]?.message?.content ?? '';

  if (sessionId && message && botAnswer) {
    logChatMessage({ sessionId, userMessage: message, botAnswer }).catch((err) =>
      console.error('logChatMessage error:', err),
    );
  }

  return NextResponse.json({ answer: botAnswer });
}
