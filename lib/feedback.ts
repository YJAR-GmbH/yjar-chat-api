import { supabase } from './supabase';

type LogFeedbackInput = {
  sessionIdHash: string;
  messageId: string;
  vote: 'up' | 'down';
  comment?: string | null;
};

export async function logFeedback({
  sessionIdHash,
  messageId,
  vote,
  comment = null,
}: LogFeedbackInput) {
  const { error } = await supabase.from('feedback').insert({
    session_id_hash: sessionIdHash,
    message_id: messageId,
    vote,
    comment,
  });

  if (error) {
    console.error('Failed to log feedback:', error);
    throw error;
  }
}
