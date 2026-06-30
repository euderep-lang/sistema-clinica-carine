import { Link } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  Bell,
  ClipboardList,
  Search,
  StickyNote,
  Tag,
  UserPlus,
  UserRound,
} from "lucide-react";
import { fmtDateTime } from "@/lib/locale";
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
import { CrmPatientPanel } from "@/components/crm/crm-patient-panel";
import { CrmTagRulesPanel } from "@/components/crm/crm-tag-rules-panel";
import { CrmTasksPanel } from "@/components/crm/crm-tasks-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  conversationDisplayName,
  TAG_COLORS,
  WA_CLOSE_REASONS,
  WA_OBJECTION_LABELS,
  type WaConversation,
  type WaNote,
  type WaObjectionType,
  type WaReminder,
  type WaTag,
  type WaTransfer,
} from "@/lib/whatsapp-crm";
import { cn } from "@/lib/utils";

const DETAIL_TAB_LABELS: Record<string, string> = {
  tags: "Tags",
  patient: "Paciente",
  notes: "Notas internas",
  tasks: "Tarefas",
  reminders: "Lembretes",
  transfer: "Transferência",
};

export type CrmInboxStaffMember = { id: string; full_name: string; role: string };

export type CrmInboxMsgSearchHit = { id: string; body: string | null; created_at: string };

export type CrmInboxPatientOption = { id: string; full_name: string; phone: string | null };

export type CrmInboxChatHandlerInfo = {
  assignedName: string | null;
  lastOutboundStaff: string | null;
};

export interface CrmInboxDetailPanelProps {
  hiddenOnMobile: boolean;
  detailTab: string;
  onDetailTabChange: (tab: string) => void;
  selected: WaConversation | null;
  selectedId: string | null;
  profileId?: string;
  chatHandlerInfo: CrmInboxChatHandlerInfo;
  conversationTagIds: string[];
  tags: WaTag[];
  notes: WaNote[];
  reminders: WaReminder[];
  transfers: WaTransfer[];
  staff: CrmInboxStaffMember[];
  patientSearch: string;
  onPatientSearchChange: (query: string) => void;
  patientOptions: CrmInboxPatientOption[];
  msgSearch: string;
  onMsgSearchChange: (value: string) => void;
  msgSearchHits: CrmInboxMsgSearchHit[];
  closeReason: string;
  onCloseReasonChange: (value: string) => void;
  newTagName: string;
  onNewTagNameChange: (value: string) => void;
  newTagColor: string;
  onNewTagColorChange: (color: string) => void;
  noteText: string;
  onNoteTextChange: (value: string) => void;
  reminderAt: string;
  onReminderAtChange: (value: string) => void;
  reminderNote: string;
  onReminderNoteChange: (value: string) => void;
  transferTo: string;
  onTransferToChange: (value: string) => void;
  transferNote: string;
  onTransferNoteChange: (value: string) => void;
  onAssignToMe: () => void;
  onLinkPatient: (patientId: string | null) => void;
  onCreatePatientOpen: () => void;
  onAddToPipeline: () => void;
  onRunMsgSearch: () => void;
  onScrollToMessage: (messageId: string) => void;
  onReopenConversation: () => void;
  onCloseConversation: () => void;
  onToggleTag: (tagId: string) => void;
  onMarkObjection: (key: WaObjectionType) => void;
  onCreateTag: () => void;
  onAddNote: () => void;
  onAddReminder: () => void;
  onCompleteReminder: (id: string) => void;
  onDoTransfer: () => void;
}

export function CrmInboxDetailPanel({
  hiddenOnMobile,
  detailTab,
  onDetailTabChange,
  selected,
  selectedId,
  profileId,
  chatHandlerInfo,
  conversationTagIds,
  tags,
  notes,
  reminders,
  transfers,
  staff,
  patientSearch,
  onPatientSearchChange,
  patientOptions,
  msgSearch,
  onMsgSearchChange,
  msgSearchHits,
  closeReason,
  onCloseReasonChange,
  newTagName,
  onNewTagNameChange,
  newTagColor,
  onNewTagColorChange,
  noteText,
  onNoteTextChange,
  reminderAt,
  onReminderAtChange,
  reminderNote,
  onReminderNoteChange,
  transferTo,
  onTransferToChange,
  transferNote,
  onTransferNoteChange,
  onAssignToMe,
  onLinkPatient,
  onCreatePatientOpen,
  onAddToPipeline,
  onRunMsgSearch,
  onScrollToMessage,
  onReopenConversation,
  onCloseConversation,
  onToggleTag,
  onMarkObjection,
  onCreateTag,
  onAddNote,
  onAddReminder,
  onCompleteReminder,
  onDoTransfer,
}: CrmInboxDetailPanelProps) {
  return (
<aside
            className={cn(
              crmDetailAsideShell,
              "min-h-0 min-w-0",
              hiddenOnMobile && "hidden lg:flex",
            )}
          >
            <Tabs value={detailTab} onValueChange={onDetailTabChange} className={crmDetailTabsRoot}>
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
                    {DETAIL_TAB_LABELS[detailTab] ?? "Detalhes"}
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
                            {profileId && selected.assigned_to !== profileId ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2 h-8 w-full text-xs"
                                onClick={onAssignToMe}
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
                        onChange={(e) => onPatientSearchChange(e.target.value)}
                        className="h-9"
                      />
                      <div className="mt-2 space-y-1">
                        {patientOptions.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="block w-full rounded-lg border border-transparent px-2.5 py-2 text-left text-xs transition hover:border-border hover:bg-muted/50"
                            onClick={() => onLinkPatient(p.id)}
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
                          onClick={onCreatePatientOpen}
                        >
                          <UserPlus className="mr-1.5 size-3.5" />
                          Criar novo paciente
                        </Button>
                      ) : null}
                      {selected?.patient_id ? (
                        <Button size="sm" variant="ghost" className="mt-2 h-8 w-full text-xs" onClick={() => onLinkPatient(null)}>
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
                              onClick={onAddToPipeline}
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
                          onChange={(e) => onMsgSearchChange(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && onRunMsgSearch()}
                          className="h-9"
                        />
                        <Button size="icon" variant="outline" className="size-9 shrink-0" onClick={onRunMsgSearch}>
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
                            onClick={() => onScrollToMessage(h.id)}
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
                          <Button size="sm" className="mt-2 w-full" onClick={onReopenConversation}>
                            Reabrir conversa
                          </Button>
                        </>
                      ) : (
                        <>
                          <Select value={closeReason} onValueChange={onCloseReasonChange}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {WA_CLOSE_REASONS.map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="destructive" className="mt-2 w-full" onClick={onCloseConversation}>
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
                                onClick={() => void onToggleTag(t.id)}
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
                              onClick={() => void onMarkObjection(key)}
                            >
                              {label}
                            </Button>
                          ),
                        )}
                      </div>
                    </CrmDetailSection>

                    <CrmDetailSection title="Nova tag">
                      <Input value={newTagName} onChange={(e) => onNewTagNameChange(e.target.value)} placeholder="Nome da tag" className="h-9" />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {TAG_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={cn("size-7 rounded-full transition", newTagColor === c && "ring-2 ring-offset-2 ring-offset-background")}
                            style={{ backgroundColor: c }}
                            onClick={() => onNewTagColorChange(c)}
                          />
                        ))}
                      </div>
                      <Button size="sm" variant="outline" className="mt-3 w-full" onClick={onCreateTag}>
                        Criar tag
                      </Button>
                    </CrmDetailSection>

                    <CrmTagRulesPanel tags={tags} />
                  </TabsContent>

                  <TabsContent value="tasks" className={crmDetailTabContent}>
                    <CrmTasksPanel
                      conversationId={selectedId}
                      staff={staff}
                      currentUserId={profileId ?? ""}
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
                        onChange={(e) => onNoteTextChange(e.target.value)}
                        rows={4}
                        className="min-h-[96px] resize-none border-0 bg-muted/30 px-3 py-2.5 shadow-none focus-visible:ring-1"
                      />
                      <Button
                        size="sm"
                        disabled={!selectedId || !noteText.trim()}
                        className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={onAddNote}
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
                      <Input type="datetime-local" value={reminderAt} onChange={(e) => onReminderAtChange(e.target.value)} className="h-9" />
                      <Input
                        placeholder="Descrição (opcional)"
                        value={reminderNote}
                        onChange={(e) => onReminderNoteChange(e.target.value)}
                        className="mt-2 h-9"
                      />
                      <Button size="sm" disabled={!selectedId || !reminderAt} className="mt-3 w-full" onClick={onAddReminder}>
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
                                <Button size="sm" variant="ghost" className="mt-2 h-7 px-2 text-xs" onClick={() => void onCompleteReminder(r.id)}>
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
                      <Select value={transferTo} onValueChange={onTransferToChange}>
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
                        onChange={(e) => onTransferNoteChange(e.target.value)}
                        className="mt-2 h-9"
                      />
                      <Button size="sm" disabled={!selectedId || !transferTo} className="mt-3 w-full" onClick={onDoTransfer}>
                        Transferir agora
                      </Button>
                    </CrmDetailSection>

                    <CrmDetailSection title="Histórico" bare>
                      {transfers.length === 0 ? (
                        <CrmDetailEmpty icon={ArrowRightLeft} title="Nenhuma transferência" />
                      ) : (
                        <div className="space-y-2">
                          {transfers.map((t) => {
                            const isPendingForMe = profileId === t.to_user_id && !t.seen_at;
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
  );
}
