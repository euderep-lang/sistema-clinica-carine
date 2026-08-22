import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, CalendarPlus, MailOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_WIDTH = 76;
const MAX_OPEN = ACTION_WIDTH * 3;
const THRESHOLD = 48;

type SwipeAction = "unread" | "schedule" | "reminder";

interface CrmConversationSwipeRowProps {
  children: ReactNode;
  /** Só ativa swipe em mobile (touch). */
  enabled?: boolean;
  onUnread: () => void;
  onSchedule: () => void;
  onReminder: () => void;
}

/**
 * Arrastar para a esquerda revela: Não lida · Agendar · Lembrete.
 * O deslocamento no drag vai direto no DOM (sem setState) para não travar o iPhone.
 */
export function CrmConversationSwipeRow({
  children,
  enabled = true,
  onUnread,
  onSchedule,
  onReminder,
}: CrmConversationSwipeRowProps) {
  const startX = useRef(0);
  const startY = useRef(0);
  const baseOffset = useRef(0);
  const dragging = useRef(false);
  const lockAxis = useRef<"x" | "y" | null>(null);
  const offsetRef = useRef(0);
  const slideRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const applyOffset = (value: number, animate: boolean) => {
    offsetRef.current = value;
    const el = slideRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 180ms ease-out" : "none";
    el.style.transform = `translate3d(${value}px,0,0)`;
    el.style.willChange = value === 0 ? "auto" : "transform";
  };

  const close = () => {
    applyOffset(0, true);
    baseOffset.current = 0;
    setOpen(false);
  };

  const runAction = (action: SwipeAction) => {
    close();
    if (action === "unread") onUnread();
    else if (action === "schedule") onSchedule();
    else onReminder();
  };

  useEffect(() => {
    if (!enabled) return;
    const el = slideRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startX.current = t.clientX;
      startY.current = t.clientY;
      baseOffset.current = offsetRef.current;
      dragging.current = true;
      lockAxis.current = null;
      applyOffset(offsetRef.current, false);
    };

    const onMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;
      if (!lockAxis.current) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        lockAxis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (lockAxis.current !== "x") return;
      e.preventDefault();
      applyOffset(Math.min(0, Math.max(-MAX_OPEN, baseOffset.current + dx)), false);
    };

    const onEnd = () => {
      if (!dragging.current) return;
      dragging.current = false;
      if (lockAxis.current !== "x") {
        lockAxis.current = null;
        return;
      }
      const opened = offsetRef.current < -THRESHOLD;
      const next = opened ? -MAX_OPEN : 0;
      applyOffset(next, true);
      baseOffset.current = next;
      setOpen(opened);
      lockAxis.current = null;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex">
        <button
          type="button"
          className="flex w-[76px] flex-col items-center justify-center gap-0.5 bg-sky-600 text-[10px] font-medium text-white active:bg-sky-700"
          onClick={(e) => {
            e.stopPropagation();
            runAction("unread");
          }}
        >
          <MailOpen className="size-4" />
          Não lida
        </button>
        <button
          type="button"
          className="flex w-[76px] flex-col items-center justify-center gap-0.5 bg-emerald-600 text-[10px] font-medium text-white active:bg-emerald-700"
          onClick={(e) => {
            e.stopPropagation();
            runAction("schedule");
          }}
        >
          <CalendarPlus className="size-4" />
          Agendar
        </button>
        <button
          type="button"
          className="flex w-[76px] flex-col items-center justify-center gap-0.5 bg-amber-500 text-[10px] font-medium text-white active:bg-amber-600"
          onClick={(e) => {
            e.stopPropagation();
            runAction("reminder");
          }}
        >
          <Bell className="size-4" />
          Lembrete
        </button>
      </div>

      <div
        ref={slideRef}
        className={cn("relative z-[1] bg-[#ffffff] dark:bg-[#111b21]")}
        style={{ transform: "translate3d(0,0,0)" }}
        onClickCapture={(e) => {
          if (open || offsetRef.current < -8) {
            e.preventDefault();
            e.stopPropagation();
            close();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
