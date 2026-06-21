import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { getWhatsAppConnection } from "@/lib/whatsapp-crm.functions";
import { cn } from "@/lib/utils";

export function CrmConnectionBadge({ subtle }: { subtle?: boolean }) {
  const statusFn = useServerFn(getWhatsAppConnection);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const load = () => void statusFn().then((s) => setConnected(s.connected ?? false));
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [statusFn]);

  if (connected === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Conectando…
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        connected
          ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
          : "bg-amber-500/10 text-amber-800 dark:text-amber-300",
        subtle && "bg-transparent px-0 py-0",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          connected ? "animate-pulse bg-emerald-500" : "bg-amber-500",
        )}
      />
      {connected ? "Online" : "Offline"}
    </span>
  );
}
