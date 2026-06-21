import { Link } from "@tanstack/react-router";
import { MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildCrmInboxSearch } from "@/lib/crm-navigation";
import { telUrl } from "@/lib/agenda-utils";

export function AgendaContactActions({
  phone,
  patientId,
  patientName,
  size = "sm",
}: {
  phone: string | null | undefined;
  patientId?: string | null;
  patientName?: string;
  size?: "sm" | "icon";
}) {
  const crmSearch = buildCrmInboxSearch({
    patientId,
    phone,
    draft: patientName ? `Olá ${patientName}, ` : undefined,
  });
  const tel = telUrl(phone);
  const hasCrm = !!(crmSearch.patient || crmSearch.phone);

  if (!hasCrm && !tel) return null;

  return (
    <div className="flex items-center gap-1">
      {hasCrm && (
        <Button
          variant="outline"
          size={size === "icon" ? "icon" : "sm"}
          className={size === "icon" ? "size-8 text-emerald-600" : "h-8 gap-1 text-emerald-600"}
          asChild
          title="CRM WhatsApp"
        >
          <Link to="/crm/inbox" search={crmSearch}>
            <MessageCircle className="size-4" />
            {size === "sm" && <span className="text-xs">CRM</span>}
          </Link>
        </Button>
      )}
      {tel && (
        <Button
          type="button"
          variant="outline"
          size={size === "icon" ? "icon" : "sm"}
          className={size === "icon" ? "size-8" : "h-8 gap-1"}
          onClick={() => {
            window.location.href = tel;
          }}
          title="Ligar"
        >
          <Phone className="size-4" />
          {size === "sm" && <span className="text-xs">Ligar</span>}
        </Button>
      )}
    </div>
  );
}
