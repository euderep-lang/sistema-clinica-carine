import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Info,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  FileAudio,
  Reply,
  Search,
  Send,
  StickyNote,
  Tag,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CrmContactAvatar, CrmContactAvatarFromMap, useWaContactPhotos } from "@/components/crm/crm-contact-avatar";
import { CrmMessageBubble } from "@/components/crm/crm-message-bubble";
import { CrmAudioRecorder } from "@/components/crm/crm-audio-recorder";
import { CrmConnectionBadge } from "@/components/crm/crm-connection-badge";
import { CrmMetricsStrip } from "@/components/crm/crm-metrics-strip";
import { CrmPatientPanel } from "@/components/crm/crm-patient-panel";
import { CrmQuickReplies } from "@/components/crm/crm-quick-replies";
import { CrmGlobalSearch } from "@/components/crm/crm-global-search";
import { CrmBroadcastDialog } from "@/components/crm/crm-broadcast-dialog";
import { CrmTasksPanel } from "@/components/crm/crm-tasks-panel";
import { CrmTagRulesPanel } from "@/components/crm/crm-tag-rules-panel";
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
  crmComposerBar,
  crmFilterPill,
  crmListItemActive,
  crmListItemBase,
  crmListScrollArea,
  crmPanelShell,
} from "@/components/crm/crm-inbox-theme";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { guessMediaTypeFromFile, prepareDocumentFileForWhatsApp, prepareImageFileForWhatsApp } from "@/lib/wa-media-prepare";
import { prepareAudioFileForWhatsApp } from "@/lib/wa-audio-prepare";
import { dedupeConversationsByPhone, phonesMatch } from "@/lib/wa-phone";
import {
  conversationDisplayName,
  conversationPrimaryTagColor,
  fileToBase64,
  formatPhoneBR,
  formatRelativeTime,
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
} from "@/lib/whatsapp-crm.functions";
import {
  fetchWaMediaUrl,
  getWhatsAppStatus,
  markWaConversationRead,
  sendWaMedia,
  sendWaText,
  startWaConversation,
  transferWaConversation,
} from "@/lib/whatsapp.functions";
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

export function CrmInboxPage() {
  const { conversation: conversationFromUrl, patient: patientFromUrl, phone: phoneFromUrl, draft: draftFromUrl } =
    crmInboxRoute.useSearch();
  const { profile, tenant } = useAuth();
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
  const [msgSearch, setMsgSearch] = useState("");
  const [msgSearchHits, setMsgSearchHits] = useState<{ id: string; body: string | null; created_at: string }[]>([]);
  const [filter, setFilter] = useState<"all" | "mine" | "unread" | "transferred" | "queue" | "closed">("all");
  const [channelFilter, setChannelFilter] = useState<"all" | "whatsapp" | "instagram" | "messenger">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [convTagsMap, setConvTagsMap] = useState<Record<string, string[]>>({});
  const [mobileView, setMobileView] = useState<"list" | "chat" | "details">("list");
  const [replyTo, setReplyTo] = useState<WaMessage | null>(null);
  const [closeReason, setCloseReason] = useState(WA_CLOSE_REASONS[0]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientOptions, setPatientOptions] = useState<{ id: string; full_name: string; phone: string | null }[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
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
  const [notifyPermission, setNotifyPermission] = useState<WaNotificationPermission>(() =>
    getWaNotificationPermission(),
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const selectedIdRef = useRef(selectedId);
  const relatedConvIdsRef = useRef<string[]>([]);
  const loadConversationsRef = useRef<(opts?: { silent?: boolean }) => Promise<void>>(async () => {});
  const reloadListTimerRef = useRef<number | null>(null);
  const initialListLoadedRef = useRef(false);
  const transferToastShown = useRef(false);

  const statusFn = useServerFn(getWhatsAppStatus);
  const sendTextFn = useServerFn(sendWaText);
  const sendMediaFn = useServerFn(sendWaMedia);
  const transferFn = useServerFn(transferWaConversation);
  const readFn = useServerFn(markWaConversationRead);
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
  const searchMsgFn = useServerFn(searchWaMessages);
  const createDealFn = useServerFn(createWaDeal);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const contactPhotos = useWaContactPhotos(conversations);

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
    const [convRes, transferRes, tagLinksRes] = await Promise.all([
      supabase
        .from("wa_conversations" as never)
        .select(
          "id, tenant_id, patient_id, contact_phone, contact_name, channel, external_user_id, assigned_to, status, last_message_at, last_message_preview, unread_count, contact_photo_url, contact_photo_fetched_at, deal_id, patients(full_name), assigned_profile:assigned_to(full_name)",
        )
        .order("last_message_at", { ascending: false, nullsFirst: false }),
      supabase
        .from("wa_transfers" as never)
        .select(
          "id, conversation_id, from_user_id, note, created_at, from_profile:from_user_id(full_name)",
        )
        .eq("to_user_id", profile.id)
        .is("seen_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("wa_conversation_tags" as never).select("conversation_id, tag_id"),
    ]);

    if (convRes.error) toast.error(convRes.error.message);
    if (transferRes.error) toast.error(transferRes.error.message);

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

  const scheduleReloadConversations = useCallback((delayMs = 400) => {
    if (reloadListTimerRef.current) window.clearTimeout(reloadListTimerRef.current);
    reloadListTimerRef.current = window.setTimeout(() => {
      reloadListTimerRef.current = null;
      void loadConversationsRef.current({ silent: true });
    }, delayMs);
  }, []);

  selectedIdRef.current = selectedId;
  waInboxFocus.selectedConversationId = selectedId;
  loadConversationsRef.current = loadConversations;

  useEffect(() => {
    if (conversationFromUrl) {
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

  const loadConversationDetails = useCallback(async (conversationId: string) => {
    setLoadingChat(true);

    const { data: convRow } = await supabase
      .from("wa_conversations" as never)
      .select("id, contact_phone")
      .eq("id", conversationId)
      .maybeSingle();

    const phone = (convRow as { contact_phone?: string } | null)?.contact_phone;
    let relatedIds = [conversationId];

    if (phone && tenant) {
      const { data: related } = await supabase
        .from("wa_conversations" as never)
        .select("id, contact_phone")
        .eq("tenant_id", tenant.id);
      relatedIds = ((related ?? []) as { id: string; contact_phone: string }[])
        .filter((c) => phonesMatch(c.contact_phone, phone))
        .map((c) => c.id);
      if (!relatedIds.length) relatedIds = [conversationId];
    }

    relatedConvIdsRef.current = relatedIds;

    const [msgRes, tagRes, noteRes, remRes, trRes] = await Promise.all([
      supabase
        .from("wa_messages" as never)
        .select(
          "id, conversation_id, direction, message_type, body, media_id, media_mime, media_filename, status, sent_by, created_at, wa_message_id, reply_to_message_id, sender_profile:sent_by(full_name)",
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

  useEffect(() => {
    void loadConversations();
    void loadStaff();
    void loadTags();
  }, [loadConversations, loadStaff, loadTags]);

  useEffect(() => {
    const tick = () => void processFollowUpsFn().catch(() => {});
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [processFollowUpsFn]);

  useEffect(() => {
    if (!selectedId) return;
    void loadConversationDetails(selectedId);
  }, [selectedId, loadConversationDetails]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
          if (relatedConvIdsRef.current.includes(row.conversation_id)) {
            setMessages((prev) => {
              const waId = (row as WaMessage & { wa_message_id?: string }).wa_message_id;
              if (waId && prev.some((m) => (m as WaMessage & { wa_message_id?: string }).wa_message_id === waId)) {
                return prev;
              }
              if (prev.some((m) => m.id === row.id)) return prev;
              return [...prev, row];
            });
          }
          scheduleReloadConversations();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wa_transfers", filter: `tenant_id=eq.${tenantId}` },
        () => scheduleReloadConversations(),
      )
      .subscribe();

    const poll = window.setInterval(() => scheduleReloadConversations(0), 60_000);

    return () => {
      window.clearInterval(poll);
      if (reloadListTimerRef.current) window.clearTimeout(reloadListTimerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [tenant?.id, scheduleReloadConversations]);

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
    const q = search.trim().toLowerCase();
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
  }, [conversations, search, filter, channelFilter, tagFilter, convTagsMap, profile, pendingTransfers]);

  const sendText = async () => {
    const body = text.trim();
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
          text: text.trim(),
          replyToMessageId: replyTo?.id,
        },
      });
      setText("");
      setReplyTo(null);
      await loadConversationDetails(selectedId);
      await loadConversations({ silent: true });
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
    const hits = await searchMsgFn({ data: { conversationId: selectedId, query: msgSearch.trim() } });
    setMsgSearchHits(hits as { id: string; body: string | null; created_at: string }[]);
  };

  const closeConversation = async () => {
    if (!selectedId) return;
    try {
      await closeFn({ data: { conversationId: selectedId, reason: closeReason } });
      toast.success("Conversa encerrada");
      await loadConversations({ silent: true });
      if (selectedId) await loadConversationDetails(selectedId);
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
      if (selectedId) await loadConversationDetails(selectedId);
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
    setSelectedId(id);
    setMobileView("chat");
    setReplyTo(null);
    setMsgSearchHits([]);
  };

  const messagesById = useMemo(() => {
    const map = new Map<string, WaMessage>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

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
      await loadConversationDetails(selectedId);
      await loadConversations({ silent: true });
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
      await loadConversationDetails(selectedId);
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
      await loadConversationDetails(selectedId);
      toast.success("Lembrete criado");
    }
  };

  const completeReminder = async (id: string) => {
    await supabase.from("wa_reminders" as never).update({ completed: true } as never).eq("id", id);
    if (selectedId) await loadConversationDetails(selectedId);
  };

  const doTransfer = async () => {
    if (!selectedId || !transferTo) return;
    try {
      await transferFn({ data: { conversationId: selectedId, toUserId: transferTo, note: transferNote || undefined } });
      toast.success("Conversa transferida");
      setTransferNote("");
      await loadConversations({ silent: true });
      if (selectedId) await loadConversationDetails(selectedId);
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

  const [detailTab, setDetailTab] = useState("tags");
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
      const { url } = await mediaUrlFn({ data: { mediaId, mimeType: mimeType ?? undefined } });
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
    return {
      primeiro_nome: parts[0] ?? name,
      nome_paciente: name,
      nome_clinica: tenant?.name ?? "Clínica",
    };
  }, [composeTarget, selected, tenant?.name]);

  if (configured === false) {
    return (
      <DashboardShell title="CRM WhatsApp">
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
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="CRM WhatsApp" fullWidth>
      <div className="flex h-[calc(100dvh-4rem)] min-w-0 flex-col gap-3 overflow-x-hidden lg:h-[calc(100dvh-7.5rem)]">
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

        <div
          className={cn(crmPanelShell, "min-h-0 flex-1")}
          style={{ gridTemplateColumns: "20% 50% 30%" }}
        >
          {/* Coluna 1 — Contatos */}
          <aside
            className={cn(
              "flex min-h-0 min-w-0 flex-col overflow-hidden border-border/60 bg-muted/20 lg:border-r",
              mobileView !== "list" && "hidden lg:flex",
            )}
          >
            <div className="space-y-2 border-b border-border/50 p-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversa…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 rounded-full border-border/60 bg-background pl-9 text-sm shadow-none"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {(
                  [
                    ["all", "Todas"],
                    ["queue", "Fila"],
                    ["mine", "Minhas"],
                    ["unread", "Não lidas"],
                    ["transferred", "Transferidas"],
                    ["closed", "Encerradas"],
                  ] as const
                ).map(([f, label]) => (
                  <button
                    key={f}
                    type="button"
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                      crmFilterPill(filter === f),
                      f === "transferred" && pendingTransferCount > 0 && filter !== f && "text-violet-700",
                    )}
                    onClick={() => setFilter(f)}
                  >
                    {label}
                    {f === "transferred" && pendingTransferCount > 0 ? (
                      <span className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-violet-600 text-[9px] text-white">
                        {pendingTransferCount}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {(
                  [
                    ["all", "Todos canais"],
                    ["whatsapp", "WhatsApp"],
                    ["instagram", "Instagram"],
                    ["messenger", "Messenger"],
                  ] as const
                ).map(([ch, label]) => (
                  <button
                    key={ch}
                    type="button"
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition",
                      crmFilterPill(channelFilter === ch),
                    )}
                    onClick={() => setChannelFilter(ch)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tags.length > 0 ? (
                <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    type="button"
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition",
                      crmFilterPill(!tagFilter),
                    )}
                    onClick={() => setTagFilter(null)}
                  >
                    Todas tags
                  </button>
                  {tags.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium text-white transition",
                        tagFilter === t.id ? "ring-2 ring-offset-1" : "opacity-80",
                      )}
                      style={{ backgroundColor: t.color }}
                      onClick={() => setTagFilter(tagFilter === t.id ? null : t.id)}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <ScrollArea className={cn("flex-1 py-1", crmListScrollArea)}>
              {loadingList ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma conversa.</p>
              ) : (
                <div className="min-w-0 max-w-full px-2">
                {filteredConversations.map((c) => {
                  const name = conversationDisplayName(c);
                  const pendingTransfer = pendingTransfers[c.id];
                  const isPendingTransfer = !!pendingTransfer;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectConversation(c.id)}
                      className={cn(
                        crmListItemBase,
                        selectedId === c.id && crmListItemActive,
                        isPendingTransfer && "ring-1 ring-violet-400/60 bg-violet-50/80 dark:bg-violet-950/20",
                        !isPendingTransfer && c.unread_count > 0 && selectedId !== c.id && "bg-emerald-500/5",
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <CrmContactAvatarFromMap
                          name={name}
                          conversationId={c.id}
                          photos={contactPhotos}
                          tagColor={resolveTagColor(convTagsMap[c.id])}
                          size="sm"
                          ringClassName={cn(
                            isPendingTransfer && "ring-2 ring-violet-500 ring-offset-1",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                "truncate",
                                isPendingTransfer || c.unread_count > 0 ? "font-semibold" : "font-medium",
                              )}
                            >
                              {name}
                            </p>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {isPendingTransfer
                                ? formatRelativeTime(pendingTransfer.created_at)
                                : formatRelativeTime(c.last_message_at)}
                            </span>
                          </div>
                          {isPendingTransfer ? (
                            <p className="truncate text-xs font-medium text-violet-700 dark:text-violet-300">
                              <ArrowRightLeft className="mr-1 inline size-3" />
                              Transferida por {pendingTransfer.from_profile?.full_name ?? "equipe"}
                              {pendingTransfer.note ? ` · ${pendingTransfer.note}` : ""}
                            </p>
                          ) : (
                            <p
                              className={cn(
                                "truncate text-xs",
                                c.unread_count > 0 ? "font-medium text-foreground" : "text-muted-foreground",
                              )}
                            >
                              {c.last_message_preview ?? "Sem mensagens"}
                            </p>
                          )}
                          <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden">
                            {(c.channel ?? "whatsapp") !== "whatsapp" ? (
                              <Badge
                                variant="secondary"
                                className={cn("h-4 shrink-0 px-1.5 text-[9px]", CHANNEL_BADGE_CLASS[c.channel ?? "whatsapp"])}
                              >
                                {CHANNEL_LABEL[c.channel ?? "whatsapp"] ?? c.channel}
                              </Badge>
                            ) : null}
                            {isPendingTransfer ? (
                              <Badge className="h-4 shrink-0 bg-violet-600 px-1.5 text-[10px] hover:bg-violet-600">
                                Nova transferência
                              </Badge>
                            ) : null}
                            <p className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
                              {c.patients?.full_name && c.contact_name && c.contact_name !== c.patients.full_name
                                ? `${c.contact_name} · `
                                : ""}
                              {c.assigned_profile?.full_name ? (
                                <>→ {c.assigned_profile.full_name}</>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400">Sem responsável</span>
                              )}
                            </p>
                            {c.unread_count > 0 ? (
                              <Badge className="h-4 shrink-0 px-1.5 text-[10px]">{c.unread_count}</Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                </div>
              )}
            </ScrollArea>
            <div className="border-t border-border/50 bg-background/50 p-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full rounded-full text-xs"
                onClick={() => setManualConvOpen(true)}
              >
                <Plus className="mr-1.5 size-3.5" />
                Iniciar por telefone
              </Button>
            </div>
          </aside>

          {/* Coluna 2 — Chat */}
          <main
            className={cn(
              "flex min-h-0 min-w-0 flex-col overflow-hidden",
              mobileView === "list" && "hidden lg:flex",
              mobileView === "details" && "hidden lg:flex",
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
              <>
                <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-background/95 px-3 py-2.5 backdrop-blur-sm">
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
                      <p className="text-xs text-muted-foreground">
                        {composeTarget ? formatPhoneBR(composeTarget.phone) : formatPhoneBR(selected!.contact_phone)}
                      </p>
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
                  <div className="border-b border-violet-200 bg-violet-50 px-4 py-2.5 text-sm dark:border-violet-900 dark:bg-violet-950/40">
                    <p className="flex items-center gap-1.5 font-medium text-violet-800 dark:text-violet-200">
                      <ArrowRightLeft className="size-4 shrink-0" />
                      {selectedPendingTransfer.from_profile?.full_name ?? "Alguém da equipe"} transferiu esta conversa para você
                    </p>
                    {selectedPendingTransfer.note ? (
                      <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">
                        Observação: {selectedPendingTransfer.note}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <ScrollArea className={cn("min-h-0 flex-1 overflow-x-hidden px-3 py-3", crmChatBg)}>
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
                    <div className="space-y-1.5 pb-2">
                      {messages.map((m) => (
                        <CrmMessageBubble
                          key={m.id}
                          message={m}
                          resolveMediaUrl={resolveMediaUrl}
                          replyTo={m.reply_to_message_id ? messagesById.get(m.reply_to_message_id) : null}
                          onReply={setReplyTo}
                          highlighted={msgSearchHits.some((h) => h.id === m.id)}
                        />
                      ))}
                      <div ref={bottomRef} />
                    </div>
                  )}
                </ScrollArea>
                <div className={crmComposerBar}>
                  {replyTo ? (
                    <div className="mb-2 flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-xs">
                      <Reply className="size-3.5 shrink-0 text-emerald-600" />
                      <p className="line-clamp-1 flex-1 text-muted-foreground">{replyTo.body ?? replyTo.message_type}</p>
                      <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setReplyTo(null)}>
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : null}
                  <CrmQuickReplies
                    disabled={sending || (!selectedId && !composeTarget) || selected?.status === "closed"}
                    templateVars={quickReplyVars}
                    onSelect={(t) => setText((prev) => (prev ? `${prev}\n${t}` : t))}
                  />
                  <div className="flex items-end gap-1.5 rounded-2xl border border-border/50 bg-background p-1.5 shadow-sm">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.jpg,.jpeg,.png,.webp,.gif,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void sendFile(f);
                        e.target.value = "";
                      }}
                    />
                    <input
                      ref={videoFileRef}
                      type="file"
                      accept="video/mp4,video/3gpp,video/quicktime,.mp4,.3gp,.mov"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void sendFile(f);
                        e.target.value = "";
                      }}
                    />
                    <input
                      ref={audioFileRef}
                      type="file"
                      accept="audio/*,.mp3,.ogg,.m4a,.aac,.wav"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void sendFile(f);
                        e.target.value = "";
                      }}
                    />
                    <Button variant="ghost" size="icon" className="size-9 shrink-0 rounded-full" onClick={() => fileRef.current?.click()} disabled={sending || !selectedId || selected?.status === "closed" || !!composeTarget || (selected?.channel ?? "whatsapp") !== "whatsapp"} title="Enviar foto ou PDF">
                      <Paperclip className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0 rounded-full"
                      onClick={() => videoFileRef.current?.click()}
                      disabled={sending || !selectedId || selected?.status === "closed" || !!composeTarget || (selected?.channel ?? "whatsapp") !== "whatsapp"}
                      title="Enviar vídeo"
                    >
                      <Video className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0 rounded-full"
                      onClick={() => audioFileRef.current?.click()}
                      disabled={sending || !selectedId || selected?.status === "closed" || !!composeTarget || (selected?.channel ?? "whatsapp") !== "whatsapp"}
                      title="Anexar áudio"
                    >
                      <FileAudio className="size-4" />
                    </Button>
                    <CrmAudioRecorder
                      disabled={sending || !selectedId || selected?.status === "closed" || !!composeTarget || (selected?.channel ?? "whatsapp") !== "whatsapp"}
                      onRecorded={(f) => void sendFile(f)}
                    />
                    <Input
                      placeholder="Digite uma mensagem…"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      disabled={!composeTarget && selected?.status === "closed"}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void sendText())}
                      className="min-h-9 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
                    />
                    <Button
                      size="icon"
                      className="size-9 shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => void sendText()}
                      disabled={sending || !text.trim() || (!composeTarget && selected?.status === "closed")}
                    >
                      {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    </Button>
                  </div>
                </div>
              </>
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
                    ["tags", Tag, "Tags"],
                    ["patient", UserRound, "Paciente"],
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
                    {selected?.patient_id ? (
                      <CrmDetailSection title="Prontuário vinculado" bare>
                        <CrmPatientPanel
                          patientId={selected.patient_id}
                          patientName={selected.patients?.full_name ?? conversationDisplayName(selected)}
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
                      {selected?.patient_id ? (
                        <Button size="sm" variant="ghost" className="mt-2 h-8 w-full text-xs" onClick={() => void linkPatient(null)}>
                          Remover vínculo
                        </Button>
                      ) : null}
                    </CrmDetailSection>

                    <CrmDetailSection title="Funil de vendas">
                      {!selected?.deal_id ? (
                        <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => void addToPipeline()}>
                          Adicionar ao funil
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full" asChild>
                          <Link to="/crm/pipeline">Ver no funil</Link>
                        </Button>
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
                        {msgSearchHits.map((h) => (
                          <div key={h.id} className="rounded-lg bg-muted/40 px-2.5 py-2 text-xs">
                            <p className="line-clamp-2">{h.body}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">{fmtDateTime(h.created_at)}</p>
                          </div>
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
    </DashboardShell>
  );
}
