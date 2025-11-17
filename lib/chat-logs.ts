import { supabase } from './supabase';

type LogChatMessageInput = {
  sessionId: string;
  userMessage: string;
  botAnswer: string;
};

export async function logChatMessage({
  sessionId,
  userMessage,
  botAnswer,
}: LogChatMessageInput) {
  const { error } = await supabase.from('chat_messages').insert({
    session_id: sessionId,
    user_message: userMessage,
    bot_answer: botAnswer,
  });

  if (error) {
    console.error('Failed to log chat message:', error);
  }
}
