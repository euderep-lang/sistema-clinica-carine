import { supabase } from "@/integrations/supabase/client";
import { loadLetterheadSettings } from "@/lib/letterhead";

const STYLE_ID = "clinicos-letterhead-print";

function ensurePrintStyle() {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  return style;
}

export async function printWithLetterhead(professionalId: string | null | undefined) {
  if (!professionalId) {
    window.print();
    return;
  }

  const settings = await loadLetterheadSettings(professionalId);
  if (!settings.path) {
    window.print();
    return;
  }

  const { data: signed, error } = await supabase.storage
    .from("professional-assets")
    .createSignedUrl(settings.path, 120);
  if (error || !signed?.signedUrl) {
    window.print();
    return;
  }

  const style = ensurePrintStyle();
  const { top, right, bottom, left } = settings.margins;
  style.textContent = `
    @media print {
      @page { margin: ${top}mm ${right}mm ${bottom}mm ${left}mm; }
      html, body {
        background: url("${signed.signedUrl}") no-repeat center center / 100% 100% !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;

  const cleanup = () => {
    style.textContent = "";
  };
  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
}
