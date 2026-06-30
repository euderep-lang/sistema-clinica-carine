import { MessageSquare, FileSignature, CreditCard, Calendar, Cloud, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { WhatsAppIntegrationDiagnostics } from "@/components/settings/whatsapp-integration-diagnostics";
import { SectionNfseConfig } from "@/components/settings/section-nfse-config";
import { getPublicAppUrl } from "@/lib/app-url";

const INTEGRATIONS = [
  { id: "whatsapp", name: "WhatsApp (Z-API)", desc: "CRM com inbox via Z-API — QR code no celular, sem burocracia Meta", icon: MessageSquare, color: "#22c55e", active: true },
  { id: "clicksign", name: "ClickSign", desc: "Assinatura digital de documentos e contratos", icon: FileSignature, color: "#0ea5e9", active: false },
  { id: "mercadopago", name: "Mercado Pago", desc: "Receba pagamentos online e gere links de cobrança", icon: CreditCard, color: "#3b82f6", active: false },
  { id: "gcal", name: "Google Agenda", desc: "Sincronize a agenda com o Google Calendar", icon: Calendar, color: "#ef4444", active: false },
  { id: "gdrive", name: "Google Drive", desc: "Armazene documentos na nuvem automaticamente", icon: Cloud, color: "#eab308", active: false },
  { id: "nfse", name: "Nota Fiscal (Focus NFe)", desc: "Emissão de NFS-e direto pelo financeiro", icon: Receipt, color: "#8b5cf6", active: true },
];

const WEBHOOK_URL = `${getPublicAppUrl()}/api/whatsapp/webhook`;

export function SectionIntegracoes() {
  return (
    <TooltipProvider>
      <div className="grid md:grid-cols-3 gap-4">
        {INTEGRATIONS.map((i) => (
          <Card key={i.id}><CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg grid place-items-center text-white" style={{ background: i.color }}>
                <i.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{i.name}</p>
                <Badge variant="outline" className={i.active ? "bg-green-50 text-green-700 border-green-200 mt-0.5" : "bg-amber-50 text-amber-700 border-amber-200 mt-0.5"}>
                  {i.active ? "Ativo via .env" : "Em breve"}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground min-h-[2.5rem]">{i.desc}</p>
            {i.id === "nfse" ? (
              <div className="space-y-2 text-[11px] text-muted-foreground">
                <p>
                  Variáveis na Vercel:{" "}
                  <code className="rounded bg-muted px-1">FOCUS_NFE_TOKEN</code>,{" "}
                  <code className="rounded bg-muted px-1">FOCUS_NFE_ENV</code>.
                </p>
                <SectionNfseConfig
                  trigger={<Button size="sm" variant="outline" className="w-full">Configurar prestador</Button>}
                />
              </div>
            ) : i.id === "whatsapp" ? (
              <div className="space-y-2 text-[11px] text-muted-foreground">
                <p>
                  Webhook:{" "}
                  <code className="rounded bg-muted px-1 break-all">{WEBHOOK_URL}</code>
                </p>
                <p>
                  Na Vercel (Production):{" "}
                  <code className="rounded bg-muted px-1">SUPABASE_URL</code>,{" "}
                  <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code>,{" "}
                  <code className="rounded bg-muted px-1">CRON_SECRET</code>,{" "}
                  <code className="rounded bg-muted px-1">PUBLIC_APP_URL</code>,{" "}
                  <code className="rounded bg-muted px-1">ZAPI_*</code>.
                </p>
                <WhatsAppIntegrationDiagnostics />
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild><span><Button size="sm" variant="outline" disabled className="w-full">Configurar</Button></span></TooltipTrigger>
                <TooltipContent>Integração em desenvolvimento</TooltipContent>
              </Tooltip>
            )}
          </CardContent></Card>
        ))}
      </div>
    </TooltipProvider>
  );
}
