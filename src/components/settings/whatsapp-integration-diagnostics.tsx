import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getWhatsAppIntegrationStatus } from "@/lib/whatsapp-crm.functions";

export function WhatsAppIntegrationDiagnostics() {
  const statusFn = useServerFn(getWhatsAppIntegrationStatus);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getWhatsAppIntegrationStatus>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await statusFn();
        setStatus(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar diagnóstico");
      } finally {
        setLoading(false);
      }
    })();
  }, [statusFn]);

  if (loading) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Verificando integração…
      </p>
    );
  }

  if (error) {
    return <p className="text-[11px] text-destructive">{error}</p>;
  }

  if (!status) return null;

  return (
    <div className="space-y-1.5 text-[11px] text-muted-foreground">
      <div className="flex flex-wrap items-center gap-1.5">
        <span>Status:</span>
        <Badge
          variant="outline"
          className={
            status.ok
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }
        >
          {status.ok ? "Operacional" : "Pendências"}
        </Badge>
      </div>
      {status.hints.length > 0 && (
        <ul className="list-inside list-disc space-y-0.5">
          {status.hints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      )}
      <p>
        Cron follow-ups:{" "}
        <code className="rounded bg-muted px-1">
          {status.cron.secretConfigured ? "CRON_SECRET ok" : "CRON_SECRET ausente"}
        </code>
      </p>
    </div>
  );
}
