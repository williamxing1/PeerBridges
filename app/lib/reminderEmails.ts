import { supabase } from "../../lib/supabase/client";

export async function dispatchReminderEmails() {
  try {
    const { error } = await supabase.functions.invoke("send-reminder-emails");
    if (error) throw error;
  } catch (error) {
    console.error("Could not dispatch reminder emails", error);
  }
}
