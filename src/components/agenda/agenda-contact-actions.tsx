import { MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { telUrl, whatsappUrl } from "@/lib/agenda-utils";

export function AgendaContactActions({
  phone,
  patientName,
  size = "sm",
}: {
  phone: string | null | undefined;
  patientName?: string;
  size?: "sm" | "icon";
}) {
  const wa = whatsappUrl(phone, patientName ? `Olá ${patientName}, ` : undefined);
  const tel = telUrl(phone);

  if (!wa && !tel) return null;

  return (
    <div className="flex items-center gap-1">
      {wa && (
        <Button
          type="button"
          variant="outline"
          size={size === "icon" ? "icon" : "sm"}
          className={size === "icon" ? "size-8 text-emerald-600" : "h-8 gap-1 text-emerald-600"}
          onClick={() => window.open(wa, "_blank")}
          title="WhatsApp"
        >
          <MessageCircle className="size-4" />
          {size === "sm" && <span className="text-xs">WhatsApp</span>}
        </Button>
      )}
      {tel && (
        <Button
          type="button"
          variant="outline"
          size={size === "icon" ? "icon" : "sm"}
          className={size === "icon" ? "size-8" : "h-8 gap-1"}
          onClick={() => { window.location.href = tel; }}
          title="Ligar"
        >
          <Phone className="size-4" />
          {size === "sm" && <span className="text-xs">Ligar</span>}
        </Button>
      )}
    </div>
  );
}
