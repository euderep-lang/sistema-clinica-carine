import { useState } from "react";
import { CalendarClock, ChevronDown, ChevronUp, Reply, Trash2, X } from "lucide-react";
import { fmtDateTime } from "@/lib/locale";
import type { WaMessage } from "@/lib/whatsapp-crm";
import { cn } from "@/lib/utils";

type ScheduledItem = {
  id: string;
  body: string;
  send_at: string;
};

export function CrmComposerAlerts({
  scheduledList,
  replyTo,
  onCancelScheduled,
  onClearReply,
}: {
  scheduledList: ScheduledItem[];
  replyTo: WaMessage | null;
  onCancelScheduled: (id: string) => void;
  onClearReply: () => void;
}) {
  const [scheduledOpen, setScheduledOpen] = useState(true);

  if (!scheduledList.length && !replyTo) return null;

  return (
    <div
      className={cn(
        "mb-1.5 shrink-0 space-y-1.5",
        "max-h-[min(38dvh,240px)] overflow-y-auto overscroll-contain",
        "[-webkit-overflow-scrolling:touch]",
      )}
    >
      {scheduledList.length > 0 ? (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-2.5 py-2 text-[11px] leading-snug dark:border-amber-900/50 dark:bg-amber-950/30">
          <button
            type="button"
            className="flex w-full items-start gap-2 text-left"
            onClick={() => setScheduledOpen((v) => !v)}
          >
            <CalendarClock className="mt-0.5 size-3.5 shrink-0 text-amber-700 dark:text-amber-300" />
            <span className="min-w-0 flex-1 font-medium text-amber-900 dark:text-amber-100">
              {scheduledList.length} mensagem(ns) agendada(s)
            </span>
            {scheduledOpen ? (
              <ChevronUp className="size-3.5 shrink-0 opacity-60" />
            ) : (
              <ChevronDown className="size-3.5 shrink-0 opacity-60" />
            )}
          </button>
          {scheduledOpen ? (
            <ul className="mt-1.5 space-y-1.5 border-t border-amber-200/60 pt-1.5 dark:border-amber-900/40">
              {scheduledList.map((s) => (
                <li key={s.id} className="flex items-start gap-2">
                  <span className="shrink-0 tabular-nums text-amber-800 dark:text-amber-200">
                    {fmtDateTime(s.send_at)}
                  </span>
                  <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] text-muted-foreground">
                    {s.body}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-red-600"
                    onClick={() => onCancelScheduled(s.id)}
                    title="Cancelar agendamento"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {replyTo ? (
        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-background px-2.5 py-2 text-[11px] leading-snug">
          <Reply className="mt-0.5 size-3 shrink-0 text-emerald-600" />
          <p className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] text-muted-foreground">
            {replyTo.body ?? replyTo.message_type}
          </p>
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            onClick={onClearReply}
            aria-label="Cancelar resposta"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
