import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { isCrmStaff } from "@/lib/roles";
import { conversationDisplayName, type WaConversation } from "@/lib/whatsapp-crm";
import { playWaNotificationSound, vibrateWaNotification } from "@/lib/wa-notifications";

/** Notifica lembretes CRM vencidos (poll a cada 60s). */
export function useWaReminderNotifications() {
  const { profile, tenant } = useAuth();

  useEffect(() => {
    if (!profile || !tenant || !isCrmStaff(profile.role)) return;

    const check = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("wa_reminders" as never)
        .select(
          "id, note, remind_at, conversation_id, patient_id, wa_conversations(contact_name, contact_phone, patients(full_name)), patients(full_name)",
        )
        .eq("assigned_to", profile.id)
        .eq("completed", false)
        .lte("remind_at", now)
        .order("remind_at", { ascending: true })
        .limit(5);

      for (const row of (data ?? []) as {
        id: string;
        note: string | null;
        conversation_id: string | null;
        patient_id: string | null;
        wa_conversations: WaConversation | null;
        patients: { full_name: string } | null;
      }[]) {
        const conv = row.wa_conversations;
        const name = conv
          ? conversationDisplayName(conv)
          : row.patients?.full_name ?? "Paciente";
        playWaNotificationSound();
        vibrateWaNotification();
        toast.message(`Lembrete CRM · ${name}`, {
          description: row.note ?? "Hora de retornar ao paciente",
          duration: 12000,
          closeButton: true,
        });
        await supabase
          .from("wa_reminders" as never)
          .update({ completed: true } as never)
          .eq("id", row.id);
      }
    };

    void check();
    const id = window.setInterval(() => void check(), 60_000);
    return () => window.clearInterval(id);
  }, [profile?.id, profile?.role, tenant?.id]);
}
