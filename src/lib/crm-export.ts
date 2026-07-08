import type { WaConversation, WaMessage } from "@/lib/whatsapp-crm";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function messageContent(m: WaMessage): string {
  if (m.body && m.body.trim()) return escapeHtml(m.body.trim());
  const labels: Record<string, string> = {
    audio: "🎤 Áudio",
    image: "🖼️ Imagem",
    video: "🎬 Vídeo",
    document: "📎 Documento",
    sticker: "Sticker",
  };
  return `<em>${labels[m.message_type] ?? `[${escapeHtml(m.message_type)}]`}</em>`;
}

function fmt(dt: string): string {
  try {
    return new Date(dt).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    });
  } catch {
    return dt;
  }
}

/**
 * Exporta a conversa para PDF via diálogo de impressão do navegador
 * (escolher "Salvar como PDF"). Formato pensado para registro/LGPD.
 */
export function exportWaConversationToPdf(
  conversation: WaConversation,
  messages: WaMessage[],
  options?: { clinicName?: string; displayName?: string },
): void {
  const name =
    options?.displayName ??
    conversation.contact_name ??
    conversation.patients?.full_name ??
    conversation.contact_phone;
  const clinic = options?.clinicName ?? "Clínica";
  const generatedAt = new Date().toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

  const rows = messages
    .map((m) => {
      const outbound = m.direction === "outbound";
      const who = outbound
        ? `${escapeHtml(clinic)}${m.sender_profile?.full_name ? ` · ${escapeHtml(m.sender_profile.full_name)}` : ""}`
        : escapeHtml(name);
      return `
        <div class="msg ${outbound ? "out" : "in"}">
          <div class="bubble">
            <div class="meta">${who} · ${fmt(m.created_at)}</div>
            <div class="text">${messageContent(m)}</div>
          </div>
        </div>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Conversa - ${escapeHtml(name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #18181b; margin: 0; padding: 24px; background: #fff; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .header { border-bottom: 2px solid #e4e4e7; padding-bottom: 12px; margin-bottom: 16px; }
  .header p { margin: 2px 0; font-size: 12px; color: #52525b; }
  .lgpd { font-size: 10px; color: #71717a; margin-top: 8px; font-style: italic; }
  .msg { display: flex; margin: 6px 0; }
  .msg.out { justify-content: flex-end; }
  .bubble { max-width: 75%; border-radius: 10px; padding: 8px 10px; background: #f4f4f5; }
  .msg.out .bubble { background: #d9fdd3; }
  .meta { font-size: 9px; color: #71717a; margin-bottom: 3px; }
  .text { font-size: 12px; white-space: pre-wrap; word-break: break-word; line-height: 1.45; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <h1>Histórico de conversa — ${escapeHtml(name)}</h1>
    <p>Contato: ${escapeHtml(conversation.contact_phone)}</p>
    ${conversation.patients?.full_name ? `<p>Paciente: ${escapeHtml(conversation.patients.full_name)}</p>` : ""}
    <p>Total de mensagens: ${messages.length}</p>
    <p>Exportado em: ${escapeHtml(generatedAt)}</p>
    <p class="lgpd">Documento gerado para fins de registro. Contém dados pessoais — tratar conforme a LGPD (Lei 13.709/2018).</p>
  </div>
  ${rows || '<p style="font-size:12px;color:#71717a">Sem mensagens.</p>'}
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=720,height=900");
  if (!win) {
    throw new Error("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.");
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
