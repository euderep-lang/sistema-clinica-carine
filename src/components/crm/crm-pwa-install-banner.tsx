import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  captureCrmInstallPrompt,
  getCrmInstallPrompt,
  isCrmStandalone,
  isIosSafari,
  promptCrmInstall,
} from "@/lib/crm-pwa";

export function CrmPwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isCrmStandalone()) return;

    const onBeforeInstall = (e: Event) => {
      captureCrmInstallPrompt(e);
      setVisible(true);
      setIosHint(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIosSafari() && !localStorage.getItem("crm-pwa-ios-dismiss")) {
      setVisible(true);
      setIosHint(true);
    } else if (getCrmInstallPrompt()) {
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!visible || isCrmStandalone()) return null;

  const dismiss = () => {
    setVisible(false);
    if (iosHint) localStorage.setItem("crm-pwa-ios-dismiss", "1");
  };

  const install = async () => {
    const outcome = await promptCrmInstall();
    if (outcome !== "unavailable") dismiss();
  };

  return (
    <div className="mx-2 mb-2 rounded-lg border border-[#075E54]/20 bg-[#dcf8c6] px-3 py-2.5 text-sm text-[#111b21] shadow-sm dark:bg-emerald-950/40 dark:text-emerald-50">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">Instale o CRM WhatsApp</p>
          <p className="mt-0.5 text-xs opacity-80">
            {iosHint
              ? "No Safari: toque em Compartilhar → Adicionar à Tela de Início."
              : "Acesso rápido como app, com notificações e tela cheia."}
          </p>
        </div>
        <button type="button" aria-label="Fechar" onClick={dismiss} className="shrink-0 opacity-60">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        {iosHint ? (
          <Button size="sm" variant="secondary" className="h-8 flex-1 text-xs" onClick={dismiss}>
            <Share className="mr-1.5 size-3.5" />
            Entendi
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-8 flex-1 bg-[#075E54] text-xs text-white hover:bg-[#064e46]"
            onClick={() => void install()}
          >
            <Download className="mr-1.5 size-3.5" />
            Instalar app
          </Button>
        )}
      </div>
    </div>
  );
}
