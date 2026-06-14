import { MessageSquare, FileSignature, CreditCard, Calendar, Cloud, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const INTEGRATIONS = [
  { id: "zapi", name: "Z-API (WhatsApp)", desc: "Envie mensagens automáticas via WhatsApp", icon: MessageSquare, color: "#22c55e" },
  { id: "clicksign", name: "ClickSign", desc: "Assinatura digital de documentos e contratos", icon: FileSignature, color: "#0ea5e9" },
  { id: "mercadopago", name: "Mercado Pago", desc: "Receba pagamentos online e gere links de cobrança", icon: CreditCard, color: "#3b82f6" },
  { id: "gcal", name: "Google Agenda", desc: "Sincronize a agenda com o Google Calendar", icon: Calendar, color: "#ef4444" },
  { id: "gdrive", name: "Google Drive", desc: "Armazene documentos na nuvem automaticamente", icon: Cloud, color: "#eab308" },
  { id: "nfse", name: "Nota Fiscal", desc: "Emissão automática de NFS-e", icon: Receipt, color: "#8b5cf6" },
];

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
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 mt-0.5">Em breve</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground min-h-[2.5rem]">{i.desc}</p>
            <Tooltip>
              <TooltipTrigger asChild><span><Button size="sm" variant="outline" disabled className="w-full">Configurar</Button></span></TooltipTrigger>
              <TooltipContent>Integração em desenvolvimento</TooltipContent>
            </Tooltip>
          </CardContent></Card>
        ))}
      </div>
    </TooltipProvider>
  );
}