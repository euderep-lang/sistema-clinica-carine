export interface WaConversation {
  id: string;
  tenant_id: string;
  patient_id: string | null;
  contact_phone: string;
  contact_name: string | null;
  channel?: "whatsapp" | "instagram" | "messenger";
  external_user_id?: string | null;
  assigned_to: string | null;
  status: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  contact_photo_url?: string | null;
  contact_photo_fetched_at?: string | null;
  close_reason?: string | null;
  closed_at?: string | null;
  first_response_at?: string | null;
  objection_type?: string | null;
  price_sent_at?: string | null;
  pipeline_stage_id?: string | null;
  deal_id?: string | null;
  patients?: { full_name: string } | null;
  assigned_profile?: { full_name: string } | null;
}

export interface WaMessage {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  message_type: string;
  body: string | null;
  media_id: string | null;
  media_mime: string | null;
  media_filename: string | null;
  status: string;
  sent_by: string | null;
  created_at: string;
  reply_to_message_id?: string | null;
  sender_profile?: { full_name: string } | null;
}

export interface WaTag {
  id: string;
  name: string;
  color: string;
}

export interface WaNote {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author?: { full_name: string } | null;
}

export interface WaReminder {
  id: string;
  remind_at: string;
  note: string | null;
  completed: boolean;
  assigned_to: string;
  assignee?: { full_name: string } | null;
}

export interface WaTransfer {
  id: string;
  from_user_id: string | null;
  to_user_id: string;
  note: string | null;
  created_at: string;
  seen_at?: string | null;
  from_profile?: { full_name: string } | null;
  to_profile?: { full_name: string } | null;
}

export interface WaPendingTransfer {
  id: string;
  conversation_id: string;
  from_user_id: string | null;
  note: string | null;
  created_at: string;
  from_profile?: { full_name: string } | null;
}

export const WA_STATUS_LABEL: Record<string, string> = {
  open: "Aberta",
  pending: "Pendente",
  closed: "Encerrada",
};

export const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  messenger: "Messenger",
};

export const CHANNEL_BADGE_CLASS: Record<string, string> = {
  whatsapp: "bg-emerald-100 text-emerald-800",
  instagram: "bg-pink-100 text-pink-800",
  messenger: "bg-blue-100 text-blue-800",
};

export const TASK_TYPE_LABEL: Record<string, string> = {
  call: "Ligar",
  follow_up: "Follow-up",
  meeting: "Reunião",
  whatsapp: "WhatsApp",
  other: "Outro",
};

export const TASK_PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export const WA_CLOSE_REASONS = [
  "Resolvido",
  "Sem resposta do paciente",
  "Agendamento concluído",
  "Encaminhado ao profissional",
  "Spam / fora de escopo",
  "Outro",
] as const;

export function waMessageStatusTicks(status: string): string {
  switch (status) {
    case "read":
    case "played":
      return "✓✓";
    case "delivered":
    case "received":
      return "✓✓";
    case "sent":
      return "✓";
    case "failed":
      return "!";
    default:
      return "";
  }
}

export const TAG_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#8b5cf6",
];

export const WA_OBJECTION_LABELS = {
  vou_pensar: "Vou pensar",
  achei_caro: "Achei caro",
  preciso_agenda: "Preciso ver agenda",
  medo_hormonio: "Medo de hormônio/remédio",
} as const;

export type WaObjectionType = keyof typeof WA_OBJECTION_LABELS;

export const QUICK_REPLY_CATEGORY_LABELS: Record<string, string> = {
  all: "Todas",
  atendimento: "Atendimento",
  agenda: "Agenda",
  vendas: "Vendas",
  lead_sem_resposta: "Lead sem resposta",
  lead_valor: "Lead pediu valor",
  agendamento: "Agendamento",
  pos_consulta: "Pós-consulta",
  falta: "Falta",
  objecao: "Objeção",
  reativacao: "Reativação",
  personalizadas: "Personalizadas",
  geral: "Geral",
  marketing: "Marketing",
};

/** Cor da primeira tag aplicada à conversa (ordem do catálogo de tags). */
export function conversationPrimaryTagColor(
  tagIds: string[] | undefined,
  tags: { id: string; color: string }[],
): string | null {
  if (!tagIds?.length || !tags.length) return null;
  for (const tag of tags) {
    if (tagIds.includes(tag.id)) return tag.color;
  }
  return null;
}

export function formatPhoneBR(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  return phone;
}

export { fmtRelativeTime as formatRelativeTime, fmtMessageTime as formatMessageTime } from "@/lib/locale";

export function conversationDisplayName(c: {
  contact_name: string | null;
  contact_phone: string;
  patients?: { full_name: string } | null;
}): string {
  return c.patients?.full_name ?? c.contact_name ?? formatPhoneBR(c.contact_phone);
}

export function isDirectMediaUrl(mediaId: string | null | undefined): boolean {
  if (!mediaId) return false;
  return /^https?:\/\//i.test(mediaId) || mediaId.startsWith("data:");
}

export function waMessagePreview(msg: {
  message_type: string;
  body: string | null;
  media_filename?: string | null;
}): string {
  if (msg.body?.trim()) return msg.body.trim();
  switch (msg.message_type) {
    case "audio":
      return "Áudio";
    case "image":
      return "Imagem";
    case "video":
      return "Vídeo";
    case "document":
      return msg.media_filename ?? "Documento";
    default:
      return "Nova mensagem";
  }
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function guessWaMediaType(mime: string): "image" | "audio" | "video" | "document" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "document";
}
