import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { fmtDateTime } from "@/lib/locale";
import { Link, getRouteApi } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRightLeft,
  BarChart3,
  Bell,
  ClipboardList,
  ExternalLink,
  FileDown,
  Info,
  Loader2,
  MailOpen,
  MessageSquare,
  Reply,
  RefreshCw,
  Search,
  StickyNote,
  Tag,
  Trash2,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CrmInboxComposer } from "@/components/crm/crm-inbox-composer";
import { CrmInboxListPanel } from "@/components/crm/crm-inbox-list-panel";
import { CrmContactAvatar, CrmContactAvatarFromMap, useWaContactPhotos } from "@/components/crm/crm-contact-avatar";
import { CrmMessageBubble } from "@/components/crm/crm-message-bubble";
import { CrmConnectionBadge } from "@/components/crm/crm-connection-badge";
import { CrmMetricsStrip } from "@/components/crm/crm-metrics-strip";
import { CrmPatientPanel } from "@/components/crm/crm-patient-panel";
import { CrmGlobalSearch } from "@/components/crm/crm-global-search";
import { CrmBroadcastDialog } from "@/components/crm/crm-broadcast-dialog";
import { CrmTasksPanel } from "@/components/crm/crm-tasks-panel";
import { CrmTagRulesPanel } from "@/components/crm/crm-tag-rules-panel";
import { PatientFormDialog } from "@/components/patient-form-dialog";
import {
  CrmDetailEmpty,
  CrmDetailSection,
  crmDetailAsideShell,
  crmDetailContentWrap,
  crmDetailHeader,
  crmDetailScroll,
  crmDetailTabContent,
  crmDetailTabList,
  crmDetailTabsRoot,
  crmDetailTabTrigger,
  crmNoteCard,
} from "@/components/crm/crm-detail-shell";
import {
  crmChatBg,
  crmChatMessagesScroll,
  crmPanelShell,
} from "@/components/crm/crm-inbox-theme";
import { CrmPageShell } from "@/components/crm/crm-pwa-shell";
import { CrmPwaInstallBanner } from "@/components/crm/crm-pwa-install-banner";
import { useCrmListFiltersExpanded } from "@/hooks/use-crm-list-filters-expanded";
import { CrmInlineAlert } from "@/components/crm/crm-inline-alert";
import { useCrmPwaMode } from "@/components/crm/use-crm-pwa-mode";
import { PageHeader } from "@/components/layout/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { buildGenderTemplateVars } from "@/lib/wa-template-gender";
import { normalizeMessageLineBreaks } from "@/lib/wa-automation-quick-replies";
import { prepareAudioFileForWhatsApp } from "@/lib/wa-audio-prepare";
import { dedupeConversationsByPhone, phonesMatch, phoneTail11, normalizeBrazilPhone } from "@/lib/wa-phone";
import { getCachedWaMediaUrl, setCachedWaMediaUrl } from "@/lib/wa-media-url-cache";
import {
  conversationAssigneeName,
  conversationDisplayName,
  conversationHandlerSubtitle,
  conversationPrimaryTagColor,
  fileToBase64,
  formatPhoneBR,
  formatRelativeTime,
  lastOutboundStaffName,
  waMessagePreview,
  TAG_COLORS,
  WA_OBJECTION_LABELS,
  type WaObjectionType,
  CHANNEL_BADGE_CLASS,
  CHANNEL_LABEL,
  type WaConversation,
  type WaMessage,
  type WaNote,
  type WaPendingTransfer,
  type WaReminder,
  type WaTag,
  type WaTransfer,
  WA_STATUS_LABEL,
  WA_CLOSE_REASONS,
} from "@/lib/whatsapp-crm";
import {
  assignWaConversation,
  assignWaQueueToReception,
  closeWaConversation,
  createWaDeal,
  linkWaPatient,
  reopenWaConversation,
  searchWaMessages,
  toggleWaConversationTag,
  markWaObjection,
  processWaFollowUps,
  syncWaChatsFromZApi,
  getWaQuickReplies,
  humanizeWaQuickReply,
} from "@/lib/whatsapp-crm.functions";
import { fetchWaQuickRepliesCached, type WaQuickReplyRow } from "@/lib/wa-quick-replies-cache";
import {
  cancelScheduledWaMessage,
  fetchWaMediaUrl,
  getWhatsAppStatus,
  listScheduledWaMessages,
  markWaConversationRead,
  markWaConversationUnread,
  scheduleWaMessage,
  sendWaContact,
  sendWaClinicLocation,
  sendWaMedia,
  sendWaText,
  startWaConversation,
  transferWaConversation,
} from "@/lib/whatsapp.functions";
import { exportWaConversationToPdf } from "@/lib/crm-export";
import { markCrmPwaSession } from "@/lib/crm-pwa";
import { cn } from "@/lib/utils";
import {
  getWaNotificationPermission,
  isSecureNotificationContext,
  requestWaNotificationPermission,
  waInboxFocus,
  type WaNotificationPermission,
} from "@/lib/wa-notifications";

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
}

type ComposeTarget = {
  phone: string;
  name: string;
  patientId?: string;
};

const crmInboxRoute = getRouteApi("/_authenticated/crm/inbox");

function isTransientNetworkError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("load failed") ||
    m.includes("network request failed")
  );
}

function notifyCrmQueryError(error: { message: string }, context: string) {
  if (isTransientNetworkError(error.message)) {
    console.warn(`[CRM] ${context}: falha temporária de rede`, error.message);
    return;
  }
  toast.error(error.message);
}

const CRM_COMPOSER_MAX_LINES = 4;

export function CrmInboxPage() {
  const { conversation: conversationFromUrl, patient: patientFromUrl, phone: phoneFromUrl, draft: draftFromUrl, source: sourceFromUrl } =
    crmInboxRoute.useSearch();
  const { profile, tenant } = useAuth();
  const pwaMode = useCrmPwaMode();

  useEffect(() => {
    if (sourceFromUrl === "pwa") markCrmPwaSession();
  }, [sourceFromUrl]);

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<Record<string, WaPendingTransfer>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [tags, setTags] = useState<WaTag[]>([]);
  const [conversationTagIds, setConversationTagIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<WaNote[]>([]);
  const [reminders, setReminders] = useState<WaReminder[]>([]);
  const [transfers, setTransfers] = useState<WaTransfer[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [msgSearch, setMsgSearch] = useState("");
  const [msgSearchHits, setMsgSearchHits] = useState<{ id: string; body: string | null; created_at: string }[]>([]);
  const [filter, setFilter] = useState<"all" | "mine" | "unread" | "transferred" | "queue" | "closed">("all");
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "instagram" | "messenger">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [listFiltersOpen, setListFiltersOpen] = useCrmListFiltersExpanded();
  const [convTagsMap, setConvTagsMap] = useState<Record<string, string[]>>({});
  const [mobileView, setMobileView] = useState<"list" | "chat" | "details">("list");
  const [visibleCount, setVisibleCount] = useState(30);
  const [replyTo, setReplyTo] = useState<WaMessage | null>(null);
  const [closeReason, setCloseReason] = useState(WA_CLOSE_REASONS[0]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientOptions, setPatientOptions] = useState<{ id: string; full_name: string; phone: string | null }[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [humanizing, setHumanizing] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [noteText, setNoteText] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [reminderNote, setReminderNote] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newMsg, setNewMsg] = useState("");
  const [composeTarget, setComposeTarget] = useState<ComposeTarget | null>(null);
  const [manualConvOpen, setManualConvOpen] = useState(false);
  const [createPatientOpen, setCreatePatientOpen] = useState(false);
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [shareContactOpen, setShareContactOpen] = useState(false);
  const [shareContactName, setShareContactName] = useState("");
  const [shareContactPhone, setShareContactPhone] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [scheduledList, setScheduledList] = useState<
    { id: string; body: string; send_at: string; status: string; created_at: string; error: string | null }[]
  >([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [notifyPermission, setNotifyPermission] = useState<WaNotificationPermission>(() =>
    getWaNotificationPermission(),
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const pendingScrollToBottomRef = useRef(false);
  const prevMessageCountRef = useRef(0);
  const prevSelectedIdRef = useRef<string | null>(null);
  const listSentinelRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const adjustComposerHeight = useCallback(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    const style = window.getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const borderTop = parseFloat(style.borderTopWidth) || 0;
    const borderBottom = parseFloat(style.borderBottomWidth) || 0;
    const maxHeight =
      lineHeight * CRM_COMPOSER_MAX_LINES + paddingTop + paddingBottom + borderTop + borderBottom;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSentRef = useRef(0);
  const typingClearTimerRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const selectedIdRef = useRef(selectedId);
  const relatedConvIdsRef = useRef<string[]>([]);
  const loadConversationsRef = useRef<(opts?: { silent?: boolean }) => Promise<void>>(async () => {});
  const reloadListTimerRef = useRef<number | null>(null);
  const listReloadInFlightRef = useRef(false);
  const initialListLoadedRef = useRef(false);
  const transferToastShown = useRef(false);

  const statusFn = useServerFn(getWhatsAppStatus);
  const sendTextFn = useServerFn(sendWaText);
  const sendMediaFn = useServerFn(sendWaMedia);
  const sendContactFn = useServerFn(sendWaContact);
  const sendClinicLocationFn = useServerFn(sendWaClinicLocation);
  const transferFn = useServerFn(transferWaConversation);
  const readFn = useServerFn(markWaConversationRead);
  const unreadFn = useServerFn(markWaConversationUnread);
  const syncChatsFn = useServerFn(syncWaChatsFromZApi);
  const mediaUrlFn = useServerFn(fetchWaMediaUrl);
  const startConvFn = useServerFn(startWaConversation);
  const closeFn = useServerFn(closeWaConversation);
  const reopenFn = useServerFn(reopenWaConversation);
  const linkPatientFn = useServerFn(linkWaPatient);
  const assignFn = useServerFn(assignWaConversation);
  const assignQueueFn = useServerFn(assignWaQueueToReception);
  const toggleTagFn = useServerFn(toggleWaConversationTag);
  const markObjectionFn = useServerFn(markWaObjection);
  const processFollowUpsFn = useServerFn(processWaFollowUps);
  const quickRepliesFn = useServerFn(getWaQuickReplies);
  const searchMsgFn = useServerFn(searchWaMessages);
  const createDealFn = useServerFn(createWaDeal);
  const scheduleFn = useServerFn(scheduleWaMessage);
  const listScheduledFn = useServerFn(listScheduledWaMessages);
  const cancelScheduledFn = useServerFn(cancelScheduledWaMessage);
  const humanizeFn = useServerFn(humanizeWaQuickReply);

  /** Pré-carrega respostas rápidas antes de abrir qualquer conversa. */
  useEffect(() => {
    if (!tenant?.id) return;
    void fetchWaQuickRepliesCached(tenant.id, async () => {
      const rows = await quickRepliesFn();
      return rows as WaQuickReplyRow[];
    });
  }, [tenant?.id, quickRepliesFn]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const chatHandlerInfo = useMemo(() => {
    const assignedName = conversationAssigneeName(selected);
    const lastOutboundStaff = lastOutboundStaffName(messages);
    return { assignedName, lastOutboundStaff };
  }, [selected, messages]);

  const chatHandlerSubtitle = useMemo(
    () =>
      conversationHandlerSubtitle({
        typingUser,
        assignedName: chatHandlerInfo.assignedName,
        lastOutboundStaff: chatHandlerInfo.lastOutboundStaff,
        phone: selected ? formatPhoneBR(selected.contact_phone) : undefined,
      }),
    [typingUser, chatHandlerInfo, selected],
  );

  const resolveTagColor = useCallback(
    (tagIds: string[] | undefined) => conversationPrimaryTagColor(tagIds, tags),
    [tags],
  );

  useEffect(() => {
    void statusFn().then((s) => {
      setConfigured(s.configured);
      setProvider(s.provider ?? null);
    });
  }, [statusFn]);

  const loadConversations = useCallback(async (opts?: { silent?: boolean }) => {
    if (!profile) return;
    const silent = opts?.silent ?? initialListLoadedRef.current;
    if (!silent) setLoadingList(true);
    const [convRes, transferRes] = await Promise.all([
      supabase
        .from("wa_conversations" as never)
        .select(
          "id, tenant_id, patient_id, contact_phone, contact_name, channel, external_user_id, assigned_to, status, last_message_at, last_message_preview, unread_count, contact_photo_url, contact_photo_fetched_at, deal_id, patients(full_name, gender), assigned_profile:assigned_to(full_name)",
        )
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(500),
      supabase
        .from("wa_transfers" as never)
        .select(
          "id, conversation_id, from_user_id, note, created_at, from_profile:from_user_id(full_name)",
        )
        .eq("to_user_id", profile.id)
        .is("seen_at", null)
        .order("created_at", { ascending: false }),
    ]);

    if (convRes.error) notifyCrmQueryError(convRes.error, "carregar conversas");
    if (transferRes.error) notifyCrmQueryError(transferRes.error, "carregar transferências");

    const convIds = ((convRes.data ?? []) as WaConversation[]).map((c) => c.id);
    const tagLinksRes =
      convIds.length > 0
        ? await supabase
            .from("wa_conversation_tags" as never)
            .select("conversation_id, tag_id")
            .in("conversation_id", convIds)
        : { data: [] as { conversation_id: string; tag_id: string }[], error: null };

    if (tagLinksRes.error) notifyCrmQueryError(tagLinksRes.error, "carregar tags");

    const tagMap: Record<string, string[]> = {};
    for (const row of (tagLinksRes.data ?? []) as { conversation_id: string; tag_id: string }[]) {
      if (!tagMap[row.conversation_id]) tagMap[row.conversation_id] = [];
      tagMap[row.conversation_id].push(row.tag_id);
    }
    setConvTagsMap(tagMap);

    const nextConversations = dedupeConversationsByPhone((convRes.data ?? []) as WaConversation[]);
    setConversations((prev) => {
      if (
        prev.length === nextConversations.length &&
        prev.every(
          (p, i) =>
            p.id === nextConversations[i]?.id &&
            p.last_message_at === nextConversations[i]?.last_message_at &&
            p.last_message_preview === nextConversations[i]?.last_message_preview &&
            p.unread_count === nextConversations[i]?.unread_count &&
            p.status === nextConversations[i]?.status &&
            p.assigned_to === nextConversations[i]?.assigned_to,
        )
      ) {
        return prev;
      }
      return nextConversations;
    });

    const pending: Record<string, WaPendingTransfer> = {};
    for (const row of (transferRes.data ?? []) as WaPendingTransfer[]) {
      if (!pending[row.conversation_id]) pending[row.conversation_id] = row;
    }
    setPendingTransfers(pending);
    initialListLoadedRef.current = true;
    setLoadingList(false);
  }, [profile]);

  const scheduleReloadConversations = useCallback((delayMs = 900) => {
    if (reloadListTimerRef.current) window.clearTimeout(reloadListTimerRef.current);
    reloadListTimerRef.current = window.setTimeout(() => {
      reloadListTimerRef.current = null;
      if (listReloadInFlightRef.current) return;
      listReloadInFlightRef.current = true;
      void loadConversationsRef.current({ silent: true }).finally(() => {
        listReloadInFlightRef.current = false;
      });
    }, delayMs);
  }, []);

  const patchConversationPreview = useCallback(
    (conversationId: string, row: Pick<WaMessage, "body" | "message_type" | "media_filename" | "created_at" | "direction">) => {
      const preview = waMessagePreview(row);
      const at = row.created_at ?? new Date().toISOString();
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          return {
            ...c,
            last_message_at: at,
            last_message_preview: preview.slice(0, 120),
            unread_count:
              row.direction === "inbound" && selectedIdRef.current !== conversationId
                ? (c.unread_count ?? 0) + 1
                : selectedIdRef.current === conversationId
                  ? 0
                  : c.unread_count,
          };
        }),
      );
    },
    [],
  );

  selectedIdRef.current = selectedId;
  waInboxFocus.selectedConversationId = selectedId;
  loadConversationsRef.current = loadConversations;

  useEffect(() => {
    if (conversationFromUrl) {
      pendingScrollToBottomRef.current = true;
      setSelectedId(conversationFromUrl);
      setMobileView("chat");
    }
  }, [conversationFromUrl]);

  useEffect(() => {
    if (!patientFromUrl || conversationFromUrl) return;

    const byPatient = conversations.find((c) => c.patient_id === patientFromUrl);
    if (byPatient) {
      setSelectedId(byPatient.id);
      setMobileView("chat");
      if (draftFromUrl) setText(draftFromUrl);
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data: patient } = await supabase
        .from("patients")
        .select("phone, full_name")
        .eq("id", patientFromUrl)
        .maybeSingle();
      if (cancelled || !patient?.phone) {
        if (!cancelled && patient && !patient.phone) {
          toast.error("Paciente sem telefone cadastrado.");
        }
        return;
      }

      const patientPhone = patient.phone;
      const byPhone = conversations.find((c) => phonesMatch(c.contact_phone, patientPhone));

      if (byPhone) {
        setSelectedId(byPhone.id);
        setMobileView("chat");
        if (draftFromUrl) setText(draftFromUrl);
        if (!byPhone.patient_id) {
          void linkPatientFn({ data: { conversationId: byPhone.id, patientId: patientFromUrl } })
            .then(() => loadConversationsRef.current({ silent: true }))
            .catch(() => {});
        }
        return;
      }

      setComposeTarget({
        phone: patient.phone,
        name: patient.full_name ?? patient.phone,
        patientId: patientFromUrl,
      });
      setSelectedId(null);
      setMobileView("chat");
      if (draftFromUrl) setText(draftFromUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [patientFromUrl, conversationFromUrl, conversations, draftFromUrl]);

  useEffect(() => {
    if (!phoneFromUrl || conversationFromUrl || patientFromUrl) return;

    const byPhone = conversations.find((c) => phonesMatch(c.contact_phone, phoneFromUrl));

    if (byPhone) {
      setSelectedId(byPhone.id);
      setMobileView("chat");
      if (draftFromUrl) setText(draftFromUrl);
      return;
    }

    setComposeTarget({
      phone: phoneFromUrl,
      name: phoneFromUrl,
    });
    setSelectedId(null);
    setMobileView("chat");
    if (draftFromUrl) setText(draftFromUrl);
  }, [phoneFromUrl, patientFromUrl, conversationFromUrl, conversations, draftFromUrl]);

  useEffect(() => {
    return () => {
      waInboxFocus.selectedConversationId = null;
    };
  }, []);

  const enableNotifications = async () => {
    if (!isSecureNotificationContext()) {
      toast.info(
        "Neste endereço (IP local, sem HTTPS) o navegador não abre pop-up. Mesmo assim você recebe som e alerta na tela quando chega mensagem.",
        { duration: 9000 },
      );
      return;
    }
    const permission = await requestWaNotificationPermission();
    setNotifyPermission(permission);
    if (permission === "granted") toast.success("Notificações ativadas");
    else if (permission === "denied") {
      toast.info(
        "Pop-up bloqueado. No Chrome: ícone ao lado da URL → Configurações do site → Notificações → Permitir.",
        { duration: 9000 },
      );
    }
  };

  const loadStaff = useCallback(async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("tenant_id", tenant.id)
      .in("role", ["admin", "professional", "receptionist"])
      .eq("active", true)
      .order("full_name");
    setStaff((data ?? []) as StaffMember[]);
  }, [tenant]);

  const loadTags = useCallback(async () => {
    const { data } = await supabase.from("wa_tags" as never).select("id, name, color").order("name");
    setTags((data ?? []) as WaTag[]);
  }, []);

  const loadConversationDetails = useCallback(async (conversationId: string, opts?: { refresh?: boolean }) => {
    const refresh = opts?.refresh ?? false;
    if (!refresh) {
      setLoadingChat(true);
      setMessages([]);
    }

    const { data: convRow } = await supabase
      .from("wa_conversations" as never)
      .select("id, contact_phone")
      .eq("id", conversationId)
      .maybeSingle();

    const phone = (convRow as { contact_phone?: string } | null)?.contact_phone;
    let relatedIds = [conversationId];

    if (phone && tenant) {
      const tail = phoneTail11(phone);
      const normalized = normalizeBrazilPhone(phone);
      let related: { id: string; contact_phone: string }[] = [];

      if (tail) {
        const { data } = await supabase
          .from("wa_conversations" as never)
          .select("id, contact_phone")
          .eq("tenant_id", tenant.id)
          .eq("phone_tail", tail);
        related = (data ?? []) as { id: string; contact_phone: string }[];
      }

      if (!related.length && normalized) {
        const { data } = await supabase
          .from("wa_conversations" as never)
          .select("id, contact_phone")
          .eq("tenant_id", tenant.id)
          .eq("contact_phone", normalized);
        related = (data ?? []) as { id: string; contact_phone: string }[];
      }

      if (!related.length) {
        related = [{ id: conversationId, contact_phone: phone }];
      }

      relatedIds = related
        .filter((c) => phonesMatch(c.contact_phone, phone))
        .map((c) => c.id);
      if (!relatedIds.includes(conversationId)) relatedIds.push(conversationId);
      if (!relatedIds.length) relatedIds = [conversationId];
    }

    relatedConvIdsRef.current = relatedIds;

    const [msgRes, tagRes, noteRes, remRes, trRes] = await Promise.all([
      supabase
        .from("wa_messages" as never)
        .select(
          "id, conversation_id, direction, message_type, body, media_id, media_mime, media_filename, status, sent_by, created_at, wa_message_id, reply_to_message_id, raw_payload, sender_profile:sent_by(full_name)",
        )
        .in("conversation_id", relatedIds)
        .order("created_at", { ascending: true }),
      supabase.from("wa_conversation_tags" as never).select("tag_id").in("conversation_id", relatedIds),
      supabase
        .from("wa_notes" as never)
        .select("id, content, created_at, author_id, author:author_id(full_name)")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("wa_reminders" as never)
        .select("id, remind_at, note, completed, assigned_to, assignee:assigned_to(full_name)")
        .eq("conversation_id", conversationId)
        .order("remind_at", { ascending: true }),
      supabase
        .from("wa_transfers" as never)
        .select(
          "id, from_user_id, to_user_id, note, created_at, seen_at, from_profile:from_user_id(full_name), to_profile:to_user_id(full_name)",
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false }),
    ]);

    const rawMessages = (msgRes.data ?? []) as WaMessage[];
    const seenWaIds = new Set<string>();
    const dedupedMessages = rawMessages.filter((m) => {
      const waId = (m as WaMessage & { wa_message_id?: string }).wa_message_id;
      if (!waId) return true;
      if (seenWaIds.has(waId)) return false;
      seenWaIds.add(waId);
      return true;
    });

    setMessages(dedupedMessages);
    setConversationTagIds([
      ...new Set(((tagRes.data ?? []) as { tag_id: string }[]).map((t) => t.tag_id)),
    ]);
    setNotes((noteRes.data ?? []) as WaNote[]);
    setReminders((remRes.data ?? []) as WaReminder[]);
    setTransfers((trRes.data ?? []) as WaTransfer[]);
    setLoadingChat(false);
    void readFn({ data: { conversationId } });
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)),
    );
    setPendingTransfers((prev) => {
      if (!prev[conversationId]) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, [readFn, tenant]);

  /** Recarrega mensagens sem limpar o chat (evita salto de scroll) e vai ao fim. */
  const reloadChatWithScroll = useCallback(
    async (conversationId: string) => {
      pendingScrollToBottomRef.current = true;
      await loadConversationDetails(conversationId, { refresh: true });
    },
    [loadConversationDetails],
  );

  useEffect(() => {
    void loadConversations();
    void loadStaff();
    void loadTags();
  }, [loadConversations, loadStaff, loadTags]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        void processFollowUpsFn().catch(() => {});
      }
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [processFollowUpsFn]);

  useEffect(() => {
    if (!selectedId) return;
    void loadConversationDetails(selectedId);
  }, [selectedId, loadConversationDetails]);

  useLayoutEffect(() => {
    adjustComposerHeight();
  }, [text, adjustComposerHeight]);

  const scrollChatToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const run = () => {
      const el = chatScrollRef.current;
      if (!el) return;
      const top = el.scrollHeight;
      if (behavior === "smooth") {
        el.scrollTo({ top, behavior: "smooth" });
      } else {
        el.scrollTop = top;
      }
    };
    run();
    requestAnimationFrame(run);
  }, []);

  const isChatNearBottom = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  }, []);

  /** Ao trocar de conversa, prepara scroll instantâneo para a mensagem mais recente. */
  useEffect(() => {
    if (selectedId === prevSelectedIdRef.current) return;
    prevSelectedIdRef.current = selectedId;
    pendingScrollToBottomRef.current = Boolean(selectedId);
    prevMessageCountRef.current = 0;
  }, [selectedId]);

  /** Abertura da conversa: vai direto ao fim. Novas mensagens: suave se já estava no fim. */
  useLayoutEffect(() => {
    if (!selectedId || loadingChat || messages.length === 0) return;

    const stick = pendingScrollToBottomRef.current;
    const grew = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (stick) {
      pendingScrollToBottomRef.current = false;
      scrollChatToBottom("auto");
      return;
    }

    if (grew && isChatNearBottom()) {
      scrollChatToBottom("smooth");
    }
  }, [messages, loadingChat, selectedId, scrollChatToBottom, isChatNearBottom]);

  const handleChatContentResize = useCallback(() => {
    if (pendingScrollToBottomRef.current || isChatNearBottom()) {
      scrollChatToBottom("auto");
    }
  }, [scrollChatToBottom, isChatNearBottom]);

  /** Mídia/imagens podem aumentar a altura após o primeiro paint — garante fim da conversa visível. */
  useEffect(() => {
    if (!selectedId || loadingChat || messages.length === 0) return;

    const t1 = window.setTimeout(() => {
      if (pendingScrollToBottomRef.current || isChatNearBottom()) scrollChatToBottom("auto");
    }, 120);
    const t2 = window.setTimeout(() => {
      if (pendingScrollToBottomRef.current || isChatNearBottom()) scrollChatToBottom("auto");
    }, 400);

    const el = chatScrollRef.current;
    const list = el?.firstElementChild;
    let raf = 0;
    let observe = true;
    const stopObserve = window.setTimeout(() => {
      observe = false;
    }, 1200);

    const ro =
      list &&
      new ResizeObserver(() => {
        if (!observe) return;
        if (!pendingScrollToBottomRef.current && !isChatNearBottom()) return;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => scrollChatToBottom("auto"));
      });
    if (list && ro) ro.observe(list);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(stopObserve);
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [selectedId, loadingChat, messages.length, scrollChatToBottom, isChatNearBottom]);

  useEffect(() => {
    const tenantId = tenant?.id;
    if (!tenantId) return;

    for (const ch of supabase.getChannels()) {
      if (ch.topic.startsWith(`wa-crm:${tenantId}`)) {
        void supabase.removeChannel(ch);
      }
    }

    const channel = supabase
      .channel(`wa-crm:${tenantId}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wa_conversations", filter: `tenant_id=eq.${tenantId}` },
        () => scheduleReloadConversations(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wa_messages", filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          const row = payload.new as WaMessage;
          const inActiveChat = relatedConvIdsRef.current.includes(row.conversation_id);
          if (inActiveChat) {
            if (row.direction === "outbound") {
              pendingScrollToBottomRef.current = true;
            }
            setMessages((prev) => {
              const waId = (row as WaMessage & { wa_message_id?: string }).wa_message_id;
              if (waId && prev.some((m) => (m as WaMessage & { wa_message_id?: string }).wa_message_id === waId)) {
                return prev;
              }
              if (prev.some((m) => m.id === row.id)) return prev;
              return [...prev, row];
            });
            patchConversationPreview(row.conversation_id, row);
          }
          if (!inActiveChat || row.direction === "inbound") {
            scheduleReloadConversations();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wa_transfers", filter: `tenant_id=eq.${tenantId}` },
        () => scheduleReloadConversations(),
      )
      .subscribe();

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") scheduleReloadConversations(0);
    }, 120_000);

    return () => {
      window.clearInterval(poll);
      if (reloadListTimerRef.current) window.clearTimeout(reloadListTimerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [tenant?.id, scheduleReloadConversations, patchConversationPreview]);

  // Indicador "digitando…" entre a equipe (Realtime broadcast por conversa).
  useEffect(() => {
    setTypingUser(null);
    if (typingClearTimerRef.current) window.clearTimeout(typingClearTimerRef.current);
    const tenantId = tenant?.id;
    if (!tenantId || !selectedId) {
      typingChannelRef.current = null;
      return;
    }

    const channel = supabase.channel(`wa-typing:${tenantId}:${selectedId}`, {
      config: { broadcast: { self: false } },
    });
    channel
      .on("broadcast", { event: "typing" }, (msg) => {
        const payload = msg.payload as { userId?: string; name?: string };
        if (!payload?.name || payload.userId === profile?.id) return;
        setTypingUser(payload.name);
        if (typingClearTimerRef.current) window.clearTimeout(typingClearTimerRef.current);
        typingClearTimerRef.current = window.setTimeout(() => setTypingUser(null), 3500);
      })
      .subscribe();
    typingChannelRef.current = channel;

    return () => {
      typingChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [tenant?.id, selectedId, profile?.id]);

  const broadcastTyping = useCallback(() => {
    const channel = typingChannelRef.current;
    if (!channel || !profile) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1800) return;
    lastTypingSentRef.current = now;
    void channel.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: profile.id, name: profile.full_name },
    });
  }, [profile]);

  const pendingTransferCount = useMemo(() => Object.keys(pendingTransfers).length, [pendingTransfers]);

  useEffect(() => {
    if (pendingTransferCount > 0 && !transferToastShown.current) {
      transferToastShown.current = true;
      toast.info(
        pendingTransferCount === 1
          ? "Você tem 1 conversa transferida para você"
          : `Você tem ${pendingTransferCount} conversas transferidas para você`,
        { description: "Confira na aba Transferidas" },
      );
    }
  }, [pendingTransferCount]);

  const selectedPendingTransfer = selectedId ? pendingTransfers[selectedId] : undefined;

  const filteredConversations = useMemo(() => {
    let list = conversations;
    const q = deferredSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          (c.contact_name?.toLowerCase().includes(q) ?? false) ||
          c.contact_phone.includes(q) ||
          (c.last_message_preview?.toLowerCase().includes(q) ?? false) ||
          (pendingTransfers[c.id]?.from_profile?.full_name?.toLowerCase().includes(q) ?? false),
      );
    }
    if (filter === "mine" && profile) list = list.filter((c) => c.assigned_to === profile.id);
    if (filter === "unread") list = list.filter((c) => c.unread_count > 0);
    if (filter === "transferred") list = list.filter((c) => !!pendingTransfers[c.id]);
    if (filter === "queue") list = list.filter((c) => !c.assigned_to && c.status === "open");
    if (filter === "closed") list = list.filter((c) => c.status === "closed");
    if (channelFilter !== "all") {
      list = list.filter((c) => (c.channel ?? "whatsapp") === channelFilter);
    }
    if (tagFilter) {
      list = list.filter((c) => convTagsMap[c.id]?.includes(tagFilter));
    }

    return [...list].sort((a, b) => {
      const aPending = pendingTransfers[a.id];
      const bPending = pendingTransfers[b.id];
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      if (aPending && bPending) {
        return new Date(bPending.created_at).getTime() - new Date(aPending.created_at).getTime();
      }
      return (
        new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime()
      );
    });
  }, [conversations, deferredSearch, filter, channelFilter, tagFilter, convTagsMap, profile, pendingTransfers]);

  const listFilterSummary = useMemo(() => {
    const chips: { key: string; label: string; color?: string }[] = [];
    if (filter !== "all") {
      const labels: Record<Exclude<typeof filter, "all">, string> = {
        queue: "Fila",
        mine: "Minhas",
        unread: "Não lidas",
        transferred: "Transferidas",
        closed: "Encerradas",
      };
      chips.push({ key: "status", label: labels[filter] });
    }
    if (channelFilter !== "all") {
      const labels: Record<Exclude<typeof channelFilter, "all">, string> = {
        whatsapp: "WhatsApp",
        instagram: "Instagram",
        messenger: "Messenger",
      };
      chips.push({ key: "channel", label: labels[channelFilter] });
    }
    if (tagFilter) {
      const tag = tags.find((t) => t.id === tagFilter);
      if (tag) chips.push({ key: "tag", label: tag.name, color: tag.color });
    }
    return chips;
  }, [filter, channelFilter, tagFilter, tags]);

  const hasActiveListFilters = listFilterSummary.length > 0;

  // Renderização incremental: evita montar centenas de itens de uma vez.
  useEffect(() => {
    setVisibleCount(30);
  }, [deferredSearch, filter, channelFilter, tagFilter]);

  const visibleConversations = useMemo(
    () => filteredConversations.slice(0, visibleCount),
    [filteredConversations, visibleCount],
  );

  const photoConversations = useMemo(() => {
    const ids = new Set(visibleConversations.map((c) => c.id));
    if (selected && !ids.has(selected.id)) return [...visibleConversations, selected];
    return visibleConversations;
  }, [visibleConversations, selected]);

  const contactPhotos = useWaContactPhotos(photoConversations, selectedId ? [selectedId] : []);

  const msgSearchHighlightIds = useMemo(
    () => new Set(msgSearchHits.map((h) => h.id)),
    [msgSearchHits],
  );
  const hasMoreConversations = filteredConversations.length > visibleConversations.length;

  useEffect(() => {
    if (!hasMoreConversations) return;
    const sentinel = listSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => c + 30);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreConversations, visibleConversations.length]);

  const humanizeComposer = async () => {
    const body = normalizeMessageLineBreaks(text);
    if (!body || humanizing || sending) return;

    const contactName = composeTarget?.name ?? (selected ? conversationDisplayName(selected) : "");
    const firstName = contactName.trim().split(/\s+/)[0] || null;

    setHumanizing(true);
    try {
      const result = await humanizeFn({
        data: {
          message: body,
          conversationId: selectedId ?? null,
          patientFirstName: firstName,
          contactName: contactName || null,
        },
      });
      setText(result.text);
      if (!result.configured) {
        toast.info("Configure OPENAI_API_KEY para reformular com IA.");
      } else if (result.usedAi) {
        toast.success("Mensagem reformulada pela IA");
      } else {
        toast.info("Mensagem mantida — revise e envie quando quiser.");
      }
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível reformular");
    } finally {
      setHumanizing(false);
    }
  };

  const sendText = async () => {
    const body = normalizeMessageLineBreaks(text);
    if (!body || sending) return;

    if (composeTarget) {
      setSending(true);
      try {
        const res = await startConvFn({
          data: {
            phone: composeTarget.phone,
            name: composeTarget.name,
            patientId: composeTarget.patientId,
            text: body,
          },
        });
        setComposeTarget(null);
        setText("");
        await loadConversations({ silent: true });
        pendingScrollToBottomRef.current = true;
        setSelectedId(res.conversationId);
        setMobileView("chat");
        toast.success("Conversa iniciada");
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setSending(false);
      }
      return;
    }

    if (!selectedId) return;
    setSending(true);
    try {
      await sendTextFn({
        data: {
          conversationId: selectedId,
          text: body,
          replyToMessageId: replyTo?.id,
        },
      });
      setText("");
      setReplyTo(null);
      await reloadChatWithScroll(selectedId);
      patchConversationPreview(selectedId, {
        body,
        message_type: "text",
        media_filename: null,
        created_at: new Date().toISOString(),
        direction: "outbound",
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const runMsgSearch = async () => {
    if (!selectedId || !msgSearch.trim()) {
      setMsgSearchHits([]);
      return;
    }
    const hits = await searchMsgFn({
      data: {
        conversationId: selectedId,
        query: msgSearch.trim(),
        relatedConversationIds: relatedConvIdsRef.current,
      },
    });
    const list = hits as { id: string; body: string | null; created_at: string }[];
    setMsgSearchHits(list);
    if (list.length > 0) {
      // Rola até a ocorrência mais recente automaticamente.
      scrollToMessage(list[list.length - 1].id);
    } else {
      toast.info("Nenhuma mensagem encontrada nesta conversa");
    }
  };

  const scrollToMessage = (messageId: string) => {
    setMobileView("chat");
    requestAnimationFrame(() => {
      const container = chatScrollRef.current;
      const el = document.getElementById(`msg-${messageId}`);
      if (!container || !el) return;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset = elRect.top - containerRect.top + container.scrollTop;
      const target = offset - container.clientHeight / 2 + el.clientHeight / 2;
      container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
      el.classList.add("ring-2", "ring-amber-400/90", "ring-offset-1");
      window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-amber-400/90", "ring-offset-1");
      }, 2200);
    });
  };

  const closeConversation = async () => {
    if (!selectedId) return;
    try {
      await closeFn({ data: { conversationId: selectedId, reason: closeReason } });
      toast.success("Conversa encerrada");
      await loadConversations({ silent: true });
      if (selectedId) await loadConversationDetails(selectedId, { refresh: true });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const reopenConversation = async () => {
    if (!selectedId) return;
    try {
      await reopenFn({ data: { conversationId: selectedId } });
      toast.success("Conversa reaberta");
      await loadConversations({ silent: true });
      if (selectedId) await loadConversationDetails(selectedId, { refresh: true });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const searchPatients = async (q: string) => {
    setPatientSearch(q);
    if (!tenant || q.trim().length < 2) {
      setPatientOptions([]);
      return;
    }
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, phone")
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .ilike("full_name", `%${q.trim()}%`)
      .limit(8);
    setPatientOptions((data ?? []) as typeof patientOptions);
  };

  const linkPatient = async (patientId: string | null) => {
    if (!selectedId) return;
    try {
      await linkPatientFn({ data: { conversationId: selectedId, patientId } });
      toast.success(patientId ? "Paciente vinculado" : "Vínculo removido");
      setPatientSearch("");
      setPatientOptions([]);
      await loadConversations({ silent: true });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const selectConversation = (id: string) => {
    setComposeTarget(null);
    pendingScrollToBottomRef.current = true;
    setSelectedId(id);
    setMobileView("chat");
    setReplyTo(null);
    setMsgSearchHits([]);
  };

  const insertEmoji = (emoji: string) => {
    const el = composerRef.current;
    if (!el) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
      adjustComposerHeight();
    });
  };

  const markUnread = async () => {
    if (!selectedId) return;
    try {
      await unreadFn({ data: { conversationId: selectedId } });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId ? { ...c, unread_count: c.unread_count > 0 ? c.unread_count : 1 } : c,
        ),
      );
      toast.success("Marcada como não lida");
      setSelectedId(null);
      setMobileView("list");
      await loadConversations({ silent: true });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const refreshScheduled = useCallback(async () => {
    if (!selectedId) {
      setScheduledList([]);
      return;
    }
    try {
      const list = await listScheduledFn({ data: { conversationId: selectedId } });
      setScheduledList(list);
    } catch {
      setScheduledList([]);
    }
  }, [selectedId, listScheduledFn]);

  useEffect(() => {
    void refreshScheduled();
  }, [refreshScheduled]);

  const openSchedule = () => {
    if (!text.trim()) {
      toast.info("Digite a mensagem antes de agendar");
      return;
    }
    // Sugestão: daqui a 1 hora, arredondado.
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    setScheduleAt(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
    setScheduleOpen(true);
  };

  const confirmSchedule = async () => {
    if (!selectedId || !text.trim() || !scheduleAt) return;
    setScheduling(true);
    try {
      const when = new Date(scheduleAt);
      await scheduleFn({
        data: { conversationId: selectedId, body: text.trim(), sendAt: when.toISOString() },
      });
      toast.success(`Mensagem agendada para ${fmtDateTime(when.toISOString())}`);
      setText("");
      setScheduleOpen(false);
      await refreshScheduled();
    } catch (e) {
      toast.error((e as Error).message || "Falha ao agendar");
    } finally {
      setScheduling(false);
    }
  };

  const cancelScheduled = async (id: string) => {
    try {
      await cancelScheduledFn({ data: { id } });
      setScheduledList((prev) => prev.filter((s) => s.id !== id));
      toast.success("Agendamento cancelado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const exportConversation = () => {
    if (!selected) return;
    try {
      exportWaConversationToPdf(selected, messages, {
        clinicName: tenant?.name ?? "Clínica",
        displayName: conversationDisplayName(selected),
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const doSyncChats = async () => {
    setSyncing(true);
    try {
      const res = await syncChatsFn();
      toast.success(
        res.synced > 0
          ? `${res.synced} conversa(s) sincronizada(s) do WhatsApp`
          : "Nenhuma conversa nova encontrada",
      );
      await loadConversations({ silent: true });
    } catch (e) {
      toast.error((e as Error).message || "Falha ao sincronizar conversas");
    } finally {
      setSyncing(false);
      setSyncConfirmOpen(false);
    }
  };

  const onPatientCreated = async (patientId: string) => {
    setCreatePatientOpen(false);
    if (!selectedId) return;
    try {
      await linkPatientFn({ data: { conversationId: selectedId, patientId } });
      toast.success("Paciente criado e vinculado");
      await loadConversations({ silent: true });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const messagesById = useMemo(() => {
    const map = new Map<string, WaMessage>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  const openShareContact = async () => {
    if (!selected) return;
    setShareContactName(selected.patients?.full_name ?? selected.contact_name ?? "");
    setShareContactPhone("");
    if (selected.patient_id) {
      const { data } = await supabase
        .from("patients")
        .select("full_name, phone")
        .eq("id", selected.patient_id)
        .maybeSingle();
      if (data) {
        setShareContactName((data as { full_name: string }).full_name);
        setShareContactPhone((data as { phone: string | null }).phone ?? "");
      }
    }
    setShareContactOpen(true);
  };

  const sendShareContact = async () => {
    if (!selectedId) return;
    setSending(true);
    try {
      await sendContactFn({
        data: {
          conversationId: selectedId,
          contactName: shareContactName.trim(),
          contactPhone: shareContactPhone.trim(),
        },
      });
      toast.success("Contato enviado");
      setShareContactOpen(false);
      await reloadChatWithScroll(selectedId);
      patchConversationPreview(selectedId, {
        body: `👤 Contato: ${shareContactName.trim()}`,
        message_type: "contact",
        media_filename: null,
        created_at: new Date().toISOString(),
        direction: "outbound",
      });
    } catch (e) {
      toast.error((e as Error).message || "Falha ao enviar contato");
    } finally {
      setSending(false);
    }
  };

  const sendClinicLocation = async () => {
    if (!selectedId) return;
    setSending(true);
    try {
      await sendClinicLocationFn({ data: { conversationId: selectedId } });
      toast.success("Localização da clínica enviada");
      await reloadChatWithScroll(selectedId);
      patchConversationPreview(selectedId, {
        body: "📍 Localização",
        message_type: "location",
        media_filename: null,
        created_at: new Date().toISOString(),
        direction: "outbound",
      });
    } catch (e) {
      toast.error((e as Error).message || "Falha ao enviar localização");
    } finally {
      setSending(false);
    }
  };

  const sendFile = async (file: File) => {
    if (!selectedId) return;
    setSending(true);
    try {
      let prepared = file;
      let mediaType = guessMediaTypeFromFile(file);

      if (mediaType === "image") {
        try {
          prepared = await prepareImageFileForWhatsApp(file);
          mediaType = "image";
        } catch (e) {
          toast.error((e as Error).message || "Não foi possível preparar a imagem.");
          return;
        }
      } else if (mediaType === "audio") {
        try {
          prepared = await prepareAudioFileForWhatsApp(file);
          mediaType = "audio";
        } catch (e) {
          toast.error(
            (e as Error).message ||
              "Não foi possível converter o áudio. Tente um arquivo MP3 ou OGG.",
          );
          return;
        }
      } else if (mediaType === "document") {
        try {
          prepared = await prepareDocumentFileForWhatsApp(file);
        } catch (e) {
          toast.error((e as Error).message || "Documento inválido ou muito grande (máx. 2 MB).");
          return;
        }
      }

      const mimeType = prepared.type || "application/octet-stream";
      if (prepared.size > 5 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 5 MB após compressão.");
        return;
      }

      const base64 = await fileToBase64(prepared);
      await sendMediaFn({
        data: {
          conversationId: selectedId,
          base64,
          mimeType,
          filename: prepared.name,
          mediaType,
        },
      });
      toast.success(
        mediaType === "audio" ? "Áudio enviado" : mediaType === "image" ? "Foto enviada" : "Arquivo enviado",
      );
      const preview =
        mediaType === "audio" ? "🎤 Áudio" : mediaType === "image" ? "📷 Imagem" : `📎 ${prepared.name}`;
      await reloadChatWithScroll(selectedId);
      patchConversationPreview(selectedId, {
        body: preview,
        message_type: mediaType,
        media_filename: prepared.name,
        created_at: new Date().toISOString(),
        direction: "outbound",
      });
    } catch (e) {
      toast.error((e as Error).message || "Falha ao enviar arquivo.");
    } finally {
      setSending(false);
    }
  };

  const createTag = async () => {
    if (!profile || !newTagName.trim()) return;
    const { error } = await supabase.from("wa_tags" as never).insert({
      tenant_id: profile.tenant_id,
      name: newTagName.trim(),
      color: newTagColor,
    } as never);
    if (error) toast.error(error.message);
    else {
      setNewTagName("");
      await loadTags();
    }
  };

  const toggleTag = async (tagId: string) => {
    if (!selectedId) return;
    const has = conversationTagIds.includes(tagId);
    try {
      await toggleTagFn({
        data: {
          conversationId: selectedId,
          tagId,
          apply: !has,
        },
      });
      setConversationTagIds((prev) =>
        has ? prev.filter((id) => id !== tagId) : [...prev, tagId],
      );
      await loadConversations({ silent: true });
      toast.success(has ? "Tag removida" : "Tag aplicada");
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível alterar a tag");
    }
  };

  const markObjection = async (objectionType: WaObjectionType) => {
    if (!selectedId) return;
    try {
      const { suggestedMessage } = await markObjectionFn({
        data: { conversationId: selectedId, objectionType },
      });
      if (suggestedMessage) {
        setText(suggestedMessage);
        setDetailTab("tags");
      }
      toast.success("Objeção registrada — envie a mensagem manualmente");
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível registrar objeção");
    }
  };

  const addNote = async () => {
    if (!selectedId || !profile || !noteText.trim()) return;
    const { error } = await supabase.from("wa_notes" as never).insert({
      tenant_id: profile.tenant_id,
      conversation_id: selectedId,
      author_id: profile.id,
      content: noteText.trim(),
    } as never);
    if (error) toast.error(error.message);
    else {
      setNoteText("");
      await loadConversationDetails(selectedId, { refresh: true });
    }
  };

  const addReminder = async () => {
    if (!selectedId || !profile || !reminderAt) return;
    const { error } = await supabase.from("wa_reminders" as never).insert({
      tenant_id: profile.tenant_id,
      conversation_id: selectedId,
      assigned_to: selected?.assigned_to ?? profile.id,
      remind_at: new Date(reminderAt).toISOString(),
      note: reminderNote.trim() || null,
      created_by: profile.id,
    } as never);
    if (error) toast.error(error.message);
    else {
      setReminderAt("");
      setReminderNote("");
      await loadConversationDetails(selectedId, { refresh: true });
      toast.success("Lembrete criado");
    }
  };

  const completeReminder = async (id: string) => {
    await supabase.from("wa_reminders" as never).update({ completed: true } as never).eq("id", id);
    if (selectedId) await loadConversationDetails(selectedId, { refresh: true });
  };

  const doTransfer = async () => {
    if (!selectedId || !transferTo) return;
    try {
      await transferFn({ data: { conversationId: selectedId, toUserId: transferTo, note: transferNote || undefined } });
      toast.success("Conversa transferida");
      setTransferNote("");
      await loadConversations({ silent: true });
      if (selectedId) await loadConversationDetails(selectedId, { refresh: true });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const startConversation = async () => {
    if (!newPhone.trim() || !newMsg.trim()) return;
    setSending(true);
    try {
      const res = await startConvFn({
        data: { phone: newPhone, name: newName || undefined, text: newMsg.trim() },
      });
      setNewPhone("");
      setNewName("");
      setNewMsg("");
      setManualConvOpen(false);
      setComposeTarget(null);
      await loadConversations({ silent: true });
      setSelectedId(res.conversationId);
      setMobileView("chat");
      toast.success("Conversa iniciada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const addToPipeline = async () => {
    if (!selectedId) return;
    try {
      await createDealFn({ data: { conversationId: selectedId } });
      toast.success("Negócio adicionado ao funil");
      await loadConversations({ silent: true });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const [detailTab, setDetailTab] = useState("patient");
  const detailTabLabels: Record<string, string> = {
    tags: "Tags",
    patient: "Paciente",
    notes: "Notas internas",
    tasks: "Tarefas",
    reminders: "Lembretes",
    transfer: "Transferência",
  };

  const assignToMe = async () => {
    if (!selectedId || !profile) return;
    try {
      await assignFn({ data: { conversationId: selectedId } });
      toast.success("Conversa atribuída a você");
      await loadConversations({ silent: true });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const assignQueueToReception = async (allOpen = false) => {
    try {
      const res = await assignQueueFn({ data: { allOpen } });
      await loadConversations({ silent: true });
      toast.success(`${res.updated} conversa(s) atribuída(s) à recepção`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const resolveMediaUrl = useCallback(
    async (mediaId: string, mimeType?: string | null) => {
      const cached = getCachedWaMediaUrl(mediaId, mimeType);
      if (cached) return cached;
      const { url } = await mediaUrlFn({ data: { mediaId, mimeType: mimeType ?? undefined } });
      setCachedWaMediaUrl(mediaId, mimeType, url);
      return url;
    },
    [mediaUrlFn],
  );

  const patientLink = useMemo(() => {
    if (!selected?.patient_id) return null;
    if (profile?.role === "professional") {
      return {
        to: "/professional/patients/$id/record" as const,
        params: { id: selected.patient_id },
      };
    }
    return {
      to: "/reception/pacientes/$id" as const,
      params: { id: selected.patient_id },
    };
  }, [selected?.patient_id, profile?.role]);

  const quickReplyVars = useMemo(() => {
    const name = composeTarget?.name ?? (selected ? conversationDisplayName(selected) : "");
    if (!name) return undefined;
    const parts = name.trim().split(/\s+/);
    const first = parts[0] ?? name;
    const gender = selected?.patients?.gender ?? null;
    return {
      ...buildGenderTemplateVars(gender),
      primeiro_nome: first,
      nome_paciente: first,
      nome_clinica: tenant?.name ?? "Clínica",
    };
  }, [composeTarget, selected, tenant?.name]);

  if (configured === false) {
    return (
      <CrmPageShell title="CRM WhatsApp">
        <PageHeader title="CRM WhatsApp" description="Inbox compartilhado via Z-API ou Meta" />
        <Card className="p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">WhatsApp não configurado</p>
          <p className="mt-2">
            Para <strong>Z-API</strong> (recomendado para começar), adicione no <code className="rounded bg-muted px-1">.env</code>:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>WHATSAPP_PROVIDER=zapi</li>
            <li>ZAPI_INSTANCE_ID</li>
            <li>ZAPI_TOKEN</li>
            <li>ZAPI_CLIENT_TOKEN (se ativou token de segurança)</li>
          </ul>
          <p className="mt-3">
            Webhook Z-API (HTTPS):{" "}
            <code className="rounded bg-muted px-1">https://sistema-clinicos.vercel.app/api/whatsapp/webhook</code>
          </p>
          <p className="mt-3 text-xs">
            No painel Z-API → Instâncias → editar → configure o webhook <strong>Ao receber</strong>.
            Ative também &quot;notificar mensagens enviadas por mim&quot; para espelhar respostas do celular no CRM.
          </p>
        </Card>
      </CrmPageShell>
    );
  }

  const pwaHeader =
    pwaMode && mobileView !== "list"
      ? {
          title:
            mobileView === "details"
              ? "Dados do contato"
              : selected
                ? conversationDisplayName(selected)
                : composeTarget
                  ? composeTarget.name
                  : "Conversa",
          subtitle:
            mobileView === "chat" && selected
              ? chatHandlerSubtitle
              : undefined,
          showBack: true,
          onBack: () => setMobileView(mobileView === "details" ? "chat" : "list"),
          right:
            mobileView === "chat" && selected ? (
              <button
                type="button"
                aria-label="Detalhes"
                className="flex size-10 items-center justify-center rounded-full transition-colors active:bg-white/10"
                onClick={() => setMobileView("details")}
              >
                <Info className="size-5" />
              </button>
            ) : undefined,
        }
      : pwaMode
        ? { title: "WhatsApp Business", subtitle: tenant?.name ?? "Conversas da clínica" }
        : undefined;

  return (
    <CrmPageShell
      title="CRM WhatsApp"
      fullWidth
      pwa={
        pwaMode
          ? {
              activeTab: "inbox",
              hideBottomNav: mobileView !== "list",
              header: pwaHeader,
            }
          : undefined
      }
    >
      <div
        className={cn(
          "flex min-w-0 flex-col overflow-x-hidden",
          pwaMode ? "h-full gap-0" : "h-[calc(100dvh-4rem)] gap-3 lg:h-[calc(100dvh-7.5rem)]",
        )}
      >
        {/* Toolbar desktop */}
        <div className="hidden min-w-0 shrink-0 flex-wrap items-center justify-between gap-3 lg:flex">
          <div className="min-w-0 shrink">
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-xl font-semibold tracking-tight">Inbox WhatsApp</h1>
              <CrmConnectionBadge subtle />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {provider === "zapi"
                ? "Sincronizado com Z-API · celular e CRM juntos"
                : "Atendimento compartilhado da clínica"}
            </p>
          </div>
          <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2">
            <CrmGlobalSearch onOpenConversation={(id) => selectConversation(id)} />
            <CrmBroadcastDialog conversations={conversations} provider={provider} />
            {provider === "zapi" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSyncConfirmOpen(true)}
                disabled={syncing}
                title="Importar conversas existentes do WhatsApp para o CRM"
              >
                {syncing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-4" />
                )}
                Sincronizar
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link to="/crm/pipeline">Funil</Link>
            </Button>
            {profile?.role === "admin" ? (
              <Button variant="outline" size="sm" asChild>
                <Link to="/crm/analytics">
                  <BarChart3 className="mr-2 size-4" />
                  Métricas
                </Link>
              </Button>
            ) : null}
            <CrmMetricsStrip
              compact
              onFilterUnassigned={() => {
                setFilter("queue");
                setMobileView("list");
              }}
              onFilterUnread={() => {
                setFilter("unread");
                setMobileView("list");
              }}
            />
            {(profile?.role === "admin" || profile?.role === "receptionist") ? (
              <Button variant="outline" size="sm" onClick={() => void assignQueueToReception(true)}>
                Atribuir à recepção
              </Button>
            ) : null}
            {notifyPermission === "granted" ? null : (
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => void enableNotifications()}>
                <Bell className="mr-1.5 size-4" />
                {isSecureNotificationContext() ? "Notificações" : "Alertas"}
              </Button>
            )}
          </div>
        </div>

        {!pwaMode ? (
        <div className="flex items-center justify-between gap-2 px-1 lg:hidden">
          {mobileView !== "list" ? (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => setMobileView(mobileView === "details" ? "chat" : "list")}
            >
              <ArrowLeft className="size-5" />
            </Button>
          ) : (
            <div className="size-9" />
          )}
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate font-semibold">
              {mobileView === "list"
                ? "WhatsApp"
                : selected
                  ? conversationDisplayName(selected)
                  : composeTarget
                    ? composeTarget.name
                    : "Conversa"}
            </p>
            {mobileView === "list" ? (
              <p className="truncate text-xs text-muted-foreground">Inbox da clínica</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <CrmConnectionBadge />
            {mobileView === "chat" && selected ? (
              <Button variant="ghost" size="icon" onClick={() => setMobileView("details")}>
                <Info className="size-5" />
              </Button>
            ) : (
              <div className="size-9" />
            )}
          </div>
        </div>
        ) : null}

        {!pwaMode ? (
        <CrmMetricsStrip
          onFilterUnassigned={() => {
            setFilter("queue");
            setMobileView("list");
          }}
          onFilterUnread={() => {
            setFilter("unread");
            setMobileView("list");
          }}
        />
        ) : null}

        {pwaMode && mobileView === "list" ? <CrmPwaInstallBanner /> : null}

        <div
          className={cn(
            crmPanelShell,
            "min-h-0 flex-1",
            pwaMode && mobileView === "chat" && "h-full",
          )}
          style={pwaMode ? undefined : { gridTemplateColumns: "20% 55% 25%" }}
        >
          <CrmInboxListPanel
            hiddenOnMobile={mobileView !== "list"}
            search={search}
            onSearchChange={setSearch}
            listFiltersOpen={listFiltersOpen}
            onListFiltersOpenChange={setListFiltersOpen}
            hasActiveListFilters={hasActiveListFilters}
            listFilterSummary={listFilterSummary}
            filter={filter}
            onFilterChange={setFilter}
            channelFilter={channelFilter}
            onChannelFilterChange={setChannelFilter}
            tagFilter={tagFilter}
            onTagFilterChange={setTagFilter}
            tags={tags}
            pendingTransferCount={pendingTransferCount}
            loadingList={loadingList}
            filteredCount={filteredConversations.length}
            visibleConversations={visibleConversations}
            selectedId={selectedId}
            pendingTransfers={pendingTransfers}
            contactPhotos={contactPhotos}
            convTagsMap={convTagsMap}
            resolveTagColor={resolveTagColor}
            onSelectConversation={selectConversation}
            hasMoreConversations={hasMoreConversations}
            listSentinelRef={listSentinelRef}
            onLoadMore={() => setVisibleCount((c) => c + 30)}
            onManualConvOpen={() => setManualConvOpen(true)}
            provider={provider}
            onSyncConfirmOpen={() => setSyncConfirmOpen(true)}
            syncing={syncing}
          />

          {/* Coluna 2 — Chat */}
          <main
            className={cn(
              "flex min-h-0 min-w-0 flex-col overflow-hidden",
              mobileView === "list" && "hidden lg:flex",
              mobileView === "details" && "hidden lg:flex",
              (pwaMode && mobileView === "chat") || mobileView === "chat"
                ? "h-full flex-1 lg:h-auto lg:flex-none"
                : "",
            )}
          >
            {!selected && !composeTarget ? (
              <div className={cn("flex flex-1 flex-col items-center justify-center", crmChatBg)}>
                <div className="rounded-2xl bg-background/80 px-8 py-10 text-center shadow-sm backdrop-blur-sm">
                  <MessageSquare className="mx-auto mb-3 size-10 text-emerald-600/40" />
                  <p className="font-medium text-foreground">Selecione uma conversa</p>
                  <p className="mt-1 text-sm text-muted-foreground">Escolha um contato na lista ou inicie por telefone</p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div
                  className={cn(
                    "shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-[#f0f2f5]/95 px-3 py-2.5 backdrop-blur-sm dark:bg-[#202c33]/95",
                    pwaMode && mobileView === "chat" ? "hidden lg:flex" : "flex",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {composeTarget ? (
                      <CrmContactAvatar
                        name={composeTarget.name}
                        conversationId="compose"
                        size="md"
                      />
                    ) : selected ? (
                      <CrmContactAvatarFromMap
                        name={conversationDisplayName(selected)}
                        conversationId={selected.id}
                        photos={contactPhotos}
                        tagColor={resolveTagColor(conversationTagIds)}
                        size="md"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate font-semibold tracking-tight">
                        {composeTarget ? composeTarget.name : conversationDisplayName(selected!)}
                      </p>
                      {!composeTarget && typingUser ? (
                        <p className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="inline-flex gap-0.5">
                            <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                            <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                            <span className="size-1 animate-bounce rounded-full bg-current" />
                          </span>
                          {typingUser} está digitando…
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground">
                            {composeTarget ? formatPhoneBR(composeTarget.phone) : formatPhoneBR(selected!.contact_phone)}
                          </p>
                          {!composeTarget && selected ? (
                            <p
                              className={cn(
                                "mt-0.5 flex items-center gap-1 text-xs font-medium",
                                chatHandlerInfo.assignedName || chatHandlerInfo.lastOutboundStaff
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400",
                              )}
                            >
                              <UserRound className="size-3 shrink-0" aria-hidden />
                              {chatHandlerInfo.assignedName
                                ? `Atendido por ${chatHandlerInfo.assignedName}`
                                : chatHandlerInfo.lastOutboundStaff
                                  ? `Última resposta: ${chatHandlerInfo.lastOutboundStaff}`
                                  : "Sem responsável"}
                            </p>
                          ) : null}
                        </>
                      )}
                      {!composeTarget && patientLink ? (
                        <Link
                          to={patientLink.to}
                          params={patientLink.params}
                          className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                          Prontuário
                          <ExternalLink className="size-3" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {composeTarget ? (
                      <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 font-normal text-emerald-700">
                        Nova conversa
                      </Badge>
                    ) : selected ? (
                      <>
                        <Badge variant="secondary" className="font-normal">
                          {WA_STATUS_LABEL[selected.status] ?? selected.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-full text-xs"
                          onClick={() => void markUnread()}
                          title="Marcar como não lida e voltar à lista"
                        >
                          <MailOpen className="mr-1.5 size-3.5" />
                          <span className="hidden lg:inline">Não lida</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-full text-xs"
                          onClick={exportConversation}
                          title="Exportar conversa em PDF (LGPD)"
                        >
                          <FileDown className="mr-1.5 size-3.5" />
                          <span className="hidden lg:inline">Exportar</span>
                        </Button>
                        {profile && selected.assigned_to !== profile.id ? (
                          <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => void assignToMe()}>
                            Assumir
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
                {!composeTarget && selectedPendingTransfer ? (
                  <CrmInlineAlert tone="violet">
                    <p className="flex items-start gap-1.5 font-medium">
                      <ArrowRightLeft className="mt-0.5 size-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        {selectedPendingTransfer.from_profile?.full_name ?? "Alguém da equipe"} transferiu
                        esta conversa para você
                      </span>
                    </p>
                    {selectedPendingTransfer.note ? (
                      <p className="mt-1 text-xs opacity-90">Observação: {selectedPendingTransfer.note}</p>
                    ) : null}
                  </CrmInlineAlert>
                ) : null}
                <div ref={chatScrollRef} className={cn(crmChatMessagesScroll, crmChatBg)}>
                  {composeTarget ? (
                    <div className="flex min-h-[min(50vh,320px)] flex-col items-center justify-center py-12">
                      <div className="max-w-sm rounded-2xl bg-background/85 px-5 py-4 text-center text-sm text-muted-foreground shadow-sm backdrop-blur-sm">
                        <p className="font-medium text-foreground">Nova conversa</p>
                        <p className="mt-2">
                          Digite abaixo e envie para iniciar o chat com{" "}
                          <span className="font-medium text-foreground">{composeTarget.name}</span> no WhatsApp.
                        </p>
                      </div>
                    </div>
                  ) : loadingChat ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex min-h-[min(50vh,320px)] flex-col items-center justify-center px-6 py-12">
                      <div className="max-w-md rounded-2xl bg-background/85 px-5 py-4 text-center text-sm text-muted-foreground shadow-sm backdrop-blur-sm">
                        <p className="font-medium text-foreground">Sem histórico nesta conversa</p>
                        <p className="mt-2">
                          O CRM só guarda mensagens que chegam pelo <strong>webhook</strong> depois de configurado.
                          A Z-API não permite importar conversas antigas do celular.
                        </p>
                        <p className="mt-2">
                          Envie ou receba uma mensagem agora para começar o histórico aqui.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 pb-1.5">
                      {messages.map((m) => (
                        <CrmMessageBubble
                          key={m.id}
                          message={m}
                          resolveMediaUrl={resolveMediaUrl}
                          replyTo={m.reply_to_message_id ? messagesById.get(m.reply_to_message_id) : null}
                          onReply={setReplyTo}
                          highlighted={msgSearchHighlightIds.has(m.id)}
                          onContentResize={handleChatContentResize}
                        />
                      ))}
                      <div ref={bottomRef} />
                    </div>
                  )}
                </div>
                <CrmInboxComposer
                  composeTarget={composeTarget}
                  selectedId={selectedId}
                  selectedStatus={selected?.status}
                  selectedChannel={selected?.channel}
                  sending={sending}
                  humanizing={humanizing}
                  text={text}
                  onTextChange={(v) => {
                    setText(v);
                    if (selectedId) broadcastTyping();
                  }}
                  onComposerInput={adjustComposerHeight}
                  onSend={() => void sendText()}
                  onHumanize={() => void humanizeComposer()}
                  onSchedule={openSchedule}
                  onInsertEmoji={insertEmoji}
                  onSendFile={(f) => void sendFile(f)}
                  onShareContact={() => void openShareContact()}
                  onShareLocation={() => void sendClinicLocation()}
                  composerRef={composerRef}
                  fileRef={fileRef}
                  videoFileRef={videoFileRef}
                  audioFileRef={audioFileRef}
                  scheduledList={scheduledList}
                  replyTo={replyTo}
                  onCancelScheduled={(id) => void cancelScheduled(id)}
                  onClearReply={() => setReplyTo(null)}
                  quickRepliesDisabled={sending || (!selectedId && !composeTarget) || selected?.status === "closed"}
                  quickReplyVars={quickReplyVars}
                  onQuickReplySelect={(t) => setText((prev) => (prev ? `${prev}\n\n${t}` : t))}
                />
              </div>
            )}
          </main>

          {/* Coluna 3 — Funções (tags, paciente, tarefas…) */}
          <aside
            className={cn(
              crmDetailAsideShell,
              "min-h-0 min-w-0",
              mobileView !== "details" && "hidden lg:flex",
            )}
          >
            <Tabs value={detailTab} onValueChange={setDetailTab} className={crmDetailTabsRoot}>
              <TabsList className={crmDetailTabList}>
                {(
                  [
                    ["patient", UserRound, "Paciente"],
                    ["tags", Tag, "Tags"],
                    ["notes", StickyNote, "Notas"],
                    ["tasks", ClipboardList, "Tarefas"],
                    ["reminders", Bell, "Alertas"],
                    ["transfer", ArrowRightLeft, "Equipe"],
                  ] as const
                ).map(([value, Icon, label]) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className={cn(crmDetailTabTrigger, "h-auto data-[state=active]:shadow-none")}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="leading-none">{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className={crmDetailContentWrap}>
                <div className={crmDetailHeader}>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {detailTabLabels[detailTab] ?? "Detalhes"}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold">
                    {selected ? conversationDisplayName(selected) : "Selecione uma conversa"}
                  </p>
                </div>

                <div className={crmDetailScroll}>
                  <TabsContent value="patient" className={crmDetailTabContent}>
                    {selected ? (
                      <CrmDetailSection title="Atendimento">
                        <div className="flex items-start gap-2">
                          <UserRound className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">
                              {chatHandlerInfo.assignedName ??
                                chatHandlerInfo.lastOutboundStaff ??
                                "Sem responsável"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {chatHandlerInfo.assignedName
                                ? "Responsável pela conversa"
                                : chatHandlerInfo.lastOutboundStaff
                                  ? "Última pessoa que respondeu (conversa não assumida)"
                                  : "Ninguém assumiu esta conversa ainda"}
                            </p>
                            {profile && selected.assigned_to !== profile.id ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2 h-8 w-full text-xs"
                                onClick={() => void assignToMe()}
                              >
                                Assumir conversa
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </CrmDetailSection>
                    ) : null}

                    {selected?.patient_id ? (
                      <CrmDetailSection title="Prontuário vinculado" bare>
                        <CrmPatientPanel
                          patientId={selected.patient_id}
                          patientName={selected.patients?.full_name ?? conversationDisplayName(selected)}
                          conversationId={selected.id}
                        />
                      </CrmDetailSection>
                    ) : (
                      <CrmDetailEmpty
                        icon={UserRound}
                        title="Sem paciente vinculado"
                        description="Busque e vincule um paciente para ver agenda e histórico."
                      />
                    )}

                    <CrmDetailSection title="Vincular paciente">
                      <Input
                        placeholder="Buscar por nome…"
                        value={patientSearch}
                        onChange={(e) => void searchPatients(e.target.value)}
                        className="h-9"
                      />
                      <div className="mt-2 space-y-1">
                        {patientOptions.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="block w-full rounded-lg border border-transparent px-2.5 py-2 text-left text-xs transition hover:border-border hover:bg-muted/50"
                            onClick={() => void linkPatient(p.id)}
                          >
                            {p.full_name}
                            {p.phone ? <span className="text-muted-foreground"> · {p.phone}</span> : null}
                          </button>
                        ))}
                      </div>
                      {!selected?.patient_id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 h-8 w-full text-xs"
                          disabled={!selectedId}
                          onClick={() => setCreatePatientOpen(true)}
                        >
                          <UserPlus className="mr-1.5 size-3.5" />
                          Criar novo paciente
                        </Button>
                      ) : null}
                      {selected?.patient_id ? (
                        <Button size="sm" variant="ghost" className="mt-2 h-8 w-full text-xs" onClick={() => void linkPatient(null)}>
                          Remover vínculo
                        </Button>
                      ) : null}
                    </CrmDetailSection>

                    <CrmDetailSection title="Funil de vendas">
                      {selected ? (
                        <>
                          {!selected.deal_id ? (
                            <Button
                              size="sm"
                              className="w-full bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => void addToPipeline()}
                            >
                              Adicionar ao funil (manual)
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="mt-2 w-full" asChild>
                              <Link to="/crm/pipeline">Ver no funil</Link>
                            </Button>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">Selecione uma conversa.</p>
                      )}
                    </CrmDetailSection>

                    <CrmDetailSection title="Buscar no histórico">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Texto da mensagem…"
                          value={msgSearch}
                          onChange={(e) => setMsgSearch(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && void runMsgSearch()}
                          className="h-9"
                        />
                        <Button size="icon" variant="outline" className="size-9 shrink-0" onClick={() => void runMsgSearch()}>
                          <Search className="size-4" />
                        </Button>
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {msgSearchHits.length > 0 ? (
                          <p className="text-[10px] text-muted-foreground">
                            {msgSearchHits.length} ocorrência(s) · toque para ir até a mensagem
                          </p>
                        ) : null}
                        {msgSearchHits.map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => scrollToMessage(h.id)}
                            className="block w-full rounded-lg bg-muted/40 px-2.5 py-2 text-left text-xs transition hover:bg-muted"
                          >
                            <p className="line-clamp-2">{h.body}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">{fmtDateTime(h.created_at)}</p>
                          </button>
                        ))}
                      </div>
                    </CrmDetailSection>

                    <CrmDetailSection title="Status da conversa">
                      {selected?.status === "closed" ? (
                        <>
                          <p className="text-xs text-muted-foreground">
                            Encerrada{selected.close_reason ? `: ${selected.close_reason}` : ""}
                          </p>
                          <Button size="sm" className="mt-2 w-full" onClick={() => void reopenConversation()}>
                            Reabrir conversa
                          </Button>
                        </>
                      ) : (
                        <>
                          <Select value={closeReason} onValueChange={setCloseReason}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {WA_CLOSE_REASONS.map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="destructive" className="mt-2 w-full" onClick={() => void closeConversation()}>
                            Encerrar conversa
                          </Button>
                        </>
                      )}
                    </CrmDetailSection>
                  </TabsContent>

                  <TabsContent value="tags" className={crmDetailTabContent}>
                    <CrmDetailSection title="Tags da conversa" description="Clique na tag colorida (com ✓) para remover">
                      <div className="flex flex-wrap gap-1.5">
                        {tags.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Nenhuma tag criada ainda.</p>
                        ) : (
                          tags.map((t) => {
                            const active = conversationTagIds.includes(t.id);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                disabled={!selectedId}
                                onClick={() => void toggleTag(t.id)}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white transition hover:scale-[1.02] active:scale-[0.98]",
                                  active
                                    ? "ring-2 ring-offset-2 ring-offset-background shadow-sm"
                                    : "opacity-60 hover:opacity-100",
                                  !selectedId && "cursor-not-allowed opacity-40",
                                )}
                                style={{ backgroundColor: t.color }}
                                title={active ? "Clique para remover" : "Clique para aplicar"}
                              >
                                {active ? "✓ " : null}
                                {t.name}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </CrmDetailSection>

                    <CrmDetailSection
                      title="Objeção do lead"
                      description="Dispara sequência manual — a secretária envia a mensagem sugerida"
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {(Object.entries(WA_OBJECTION_LABELS) as [WaObjectionType, string][]).map(
                          ([key, label]) => (
                            <Button
                              key={key}
                              type="button"
                              size="sm"
                              variant={selected?.objection_type === key ? "default" : "outline"}
                              className="h-8 rounded-full text-xs"
                              disabled={!selectedId}
                              onClick={() => void markObjection(key)}
                            >
                              {label}
                            </Button>
                          ),
                        )}
                      </div>
                    </CrmDetailSection>

                    <CrmDetailSection title="Nova tag">
                      <Input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Nome da tag" className="h-9" />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {TAG_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={cn("size-7 rounded-full transition", newTagColor === c && "ring-2 ring-offset-2 ring-offset-background")}
                            style={{ backgroundColor: c }}
                            onClick={() => setNewTagColor(c)}
                          />
                        ))}
                      </div>
                      <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => void createTag()}>
                        Criar tag
                      </Button>
                    </CrmDetailSection>

                    <CrmTagRulesPanel tags={tags} />
                  </TabsContent>

                  <TabsContent value="tasks" className={crmDetailTabContent}>
                    <CrmTasksPanel
                      conversationId={selectedId}
                      staff={staff}
                      currentUserId={profile?.id ?? ""}
                    />
                  </TabsContent>

                  <TabsContent value="notes" className={crmDetailTabContent}>
                    <CrmDetailSection
                      title="Nova nota"
                      description="Visível só para a equipe — não é enviada ao WhatsApp."
                    >
                      <Textarea
                        placeholder="Ex.: paciente prefere horário da tarde, aguardando exames…"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        rows={4}
                        className="min-h-[96px] resize-none border-0 bg-muted/30 px-3 py-2.5 shadow-none focus-visible:ring-1"
                      />
                      <Button
                        size="sm"
                        disabled={!selectedId || !noteText.trim()}
                        className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => void addNote()}
                      >
                        Salvar nota
                      </Button>
                    </CrmDetailSection>

                    <CrmDetailSection title={notes.length ? `Histórico (${notes.length})` : "Histórico"} bare>
                      {notes.length === 0 ? (
                        <CrmDetailEmpty
                          icon={StickyNote}
                          title="Nenhuma nota ainda"
                          description="Registre observações internas sobre este atendimento."
                        />
                      ) : (
                        <div className="space-y-2">
                          {notes.map((n) => (
                            <div key={n.id} className={crmNoteCard}>
                              <p className="text-sm leading-relaxed text-foreground/90">{n.content}</p>
                              <p className="mt-2 text-[10px] text-muted-foreground">
                                {n.author?.full_name ?? "Equipe"} · {fmtDateTime(n.created_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CrmDetailSection>
                  </TabsContent>

                  <TabsContent value="reminders" className={crmDetailTabContent}>
                    <CrmDetailSection title="Novo lembrete">
                      <Input type="datetime-local" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} className="h-9" />
                      <Input
                        placeholder="Descrição (opcional)"
                        value={reminderNote}
                        onChange={(e) => setReminderNote(e.target.value)}
                        className="mt-2 h-9"
                      />
                      <Button size="sm" disabled={!selectedId || !reminderAt} className="mt-3 w-full" onClick={() => void addReminder()}>
                        Criar lembrete
                      </Button>
                    </CrmDetailSection>

                    <CrmDetailSection title="Pendentes" bare>
                      {reminders.length === 0 ? (
                        <CrmDetailEmpty icon={Bell} title="Sem lembretes" description="Crie alertas para retornar a este contato." />
                      ) : (
                        <div className="space-y-2">
                          {reminders.map((r) => (
                            <div
                              key={r.id}
                              className={cn(
                                "rounded-xl border border-border/40 bg-background p-3 shadow-sm",
                                r.completed && "opacity-50",
                              )}
                            >
                              <p className="text-sm font-medium">{fmtDateTime(r.remind_at)}</p>
                              {r.note ? <p className="mt-1 text-xs text-muted-foreground">{r.note}</p> : null}
                              {!r.completed ? (
                                <Button size="sm" variant="ghost" className="mt-2 h-7 px-2 text-xs" onClick={() => void completeReminder(r.id)}>
                                  Marcar concluído
                                </Button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </CrmDetailSection>
                  </TabsContent>

                  <TabsContent value="transfer" className={crmDetailTabContent}>
                    <CrmDetailSection title="Transferir conversa">
                      <Select value={transferTo} onValueChange={setTransferTo}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Transferir para…" /></SelectTrigger>
                        <SelectContent>
                          {staff.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Observação para quem recebe"
                        value={transferNote}
                        onChange={(e) => setTransferNote(e.target.value)}
                        className="mt-2 h-9"
                      />
                      <Button size="sm" disabled={!selectedId || !transferTo} className="mt-3 w-full" onClick={() => void doTransfer()}>
                        Transferir agora
                      </Button>
                    </CrmDetailSection>

                    <CrmDetailSection title="Histórico" bare>
                      {transfers.length === 0 ? (
                        <CrmDetailEmpty icon={ArrowRightLeft} title="Nenhuma transferência" />
                      ) : (
                        <div className="space-y-2">
                          {transfers.map((t) => {
                            const isPendingForMe = profile?.id === t.to_user_id && !t.seen_at;
                            return (
                              <div
                                key={t.id}
                                className={cn(
                                  "rounded-xl border p-3 text-xs",
                                  isPendingForMe
                                    ? "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100"
                                    : "border-border/40 bg-background",
                                )}
                              >
                                <p className="font-medium">
                                  {t.from_profile?.full_name ?? "—"} → {t.to_profile?.full_name}
                                </p>
                                {isPendingForMe ? (
                                  <Badge className="mt-1 h-4 bg-violet-600 px-1.5 text-[10px] hover:bg-violet-600">
                                    Aguardando leitura
                                  </Badge>
                                ) : null}
                                <p className="mt-1 text-muted-foreground">{fmtDateTime(t.created_at)}</p>
                                {t.note ? <p className="mt-1 italic text-muted-foreground">{t.note}</p> : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CrmDetailSection>
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </aside>
        </div>
      </div>

      <Dialog open={manualConvOpen} onOpenChange={setManualConvOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar conversa por telefone</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="manual-phone">Telefone (com DDD)</Label>
              <Input
                id="manual-phone"
                placeholder="(33) 99999-9999"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-name">Nome (opcional)</Label>
              <Input
                id="manual-name"
                placeholder="Nome do contato"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-msg">Primeira mensagem</Label>
              <Input
                id="manual-msg"
                placeholder="Olá, tudo bem?"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualConvOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={sending || !newPhone.trim() || !newMsg.trim()} onClick={() => void startConversation()}>
              {sending ? "Enviando…" : "Iniciar conversa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareContactOpen} onOpenChange={setShareContactOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar contato</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="share-contact-name">Nome</Label>
              <Input
                id="share-contact-name"
                value={shareContactName}
                onChange={(e) => setShareContactName(e.target.value)}
                placeholder="Nome do contato"
              />
            </div>
            <div>
              <Label htmlFor="share-contact-phone">Telefone</Label>
              <Input
                id="share-contact-phone"
                value={shareContactPhone}
                onChange={(e) => setShareContactPhone(e.target.value)}
                placeholder="(33) 99999-9999"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareContactOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={sending || !shareContactName.trim() || !shareContactPhone.trim()}
              onClick={() => void sendShareContact()}
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : "Enviar contato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agendar envio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <p className="line-clamp-4 whitespace-pre-wrap">{text}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-at">Data e hora do envio</Label>
              <Input
                id="schedule-at"
                type="datetime-local"
                value={scheduleAt}
                min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                onChange={(e) => setScheduleAt(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                A mensagem será enviada automaticamente no horário escolhido, mesmo com o CRM fechado.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={scheduling}>
              Cancelar
            </Button>
            <Button onClick={() => void confirmSchedule()} disabled={scheduling || !scheduleAt}>
              {scheduling ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Agendando…
                </>
              ) : (
                "Agendar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PatientFormDialog
        open={createPatientOpen}
        onOpenChange={setCreatePatientOpen}
        initial={
          selected
            ? {
                full_name:
                  selected.contact_name && selected.contact_name !== selected.contact_phone
                    ? selected.contact_name
                    : "",
                phone: localPhoneFromContact(selected.contact_phone),
              }
            : undefined
        }
        onSaved={(id) => void onPatientCreated(id)}
      />

      <AlertDialog open={syncConfirmOpen} onOpenChange={setSyncConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sincronizar conversas do WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto importa as conversas existentes da sua conta Z-API para o CRM (nome e telefone
              dos contatos). É útil para trazer contatos que já existiam no celular. Mensagens novas
              chegam sozinhas pelo webhook — use a sincronização apenas para popular contatos antigos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={syncing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void doSyncChats();
              }}
              disabled={syncing}
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sincronizando…
                </>
              ) : (
                "Sincronizar agora"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CrmPageShell>
  );
}

/** Telefone local (sem +55) para pré-preencher o cadastro de paciente. */
function localPhoneFromContact(contactPhone: string): string {
  const digits = contactPhone.replace(/\D/g, "");
  const local = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  if (local.length === 11) return local.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (local.length === 10) return local.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return local;
}
