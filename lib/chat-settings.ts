import { supabase } from "@/lib/supabase";

const fallbackPrompt = `
Du bist der YJAR Assistent. Falls du diese Nachricht siehst, fehlt der System-Prompt in der Datenbank.
Bitte wende dich an das YJAR Team, damit der System-Prompt hinterlegt wird.
`;

// Holt den aktuellen System-Prompt aus der Tabelle chat_settings
export async function getSystemPrompt(id: string = "default") {
  try {
    const { data, error } = await supabase
      .from("chat_settings")
      .select("system_prompt")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase error (chat_settings get):", error);
      return fallbackPrompt;
    }

    if (!data?.system_prompt) {
      console.warn("System prompt is empty, using fallback.");
      return fallbackPrompt;
    }

    return data.system_prompt;
  } catch (err) {
    console.error("getSystemPrompt failed:", err);
    return fallbackPrompt;
  }
}

// Schreibt einen neuen System-Prompt in die DB
export async function updateSystemPrompt(prompt: string, id: string = "default") {
  try {
    const { data, error } = await supabase
      .from("chat_settings")
      .upsert(
        {
          id,
          system_prompt: prompt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Supabase error (chat_settings update):", error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("updateSystemPrompt failed:", err);
    throw err;
  }
}
