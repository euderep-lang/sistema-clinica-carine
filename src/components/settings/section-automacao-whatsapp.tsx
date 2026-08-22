import { useEffect, useRef, useState } from "react";
import { Bot, Cake, Clock, Loader2, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { syncAutomationQuickRepliesFn } from "@/lib/whatsapp-crm.functions";
import { useAuth } from "@/lib/mock-auth";
import {
  getTenantSetting,
  renderTemplate,
  setTenantSetting,
  SAMPLE_VARS,
  TEMPLATE_VARS,
} from "@/lib/settings-helpers";
import { buildGenderTemplateVars } from "@/lib/wa-template-gender";
import { DEFAULT_AFTER_HOURS_MESSAGE } from "@/lib/wa-business-hours";
import {
  FOLLOW_UP_SEQUENCE_DEFAULTS,
  FOLLOW_UP_SEQUENCE_META,
  FOLLOW_UP_SEQUENCE_ORDER,
  FOLLOW_UP_VARIANT_COUNT,
  formatFollowUpStepDelay,
  followUpModeLabel,
  mergedTemplatesForEditing,
  padTemplatesToFive,
  templatesToOverrides,
  WA_AFTER_HOURS_MESSAGE_KEY,
  WA_FOLLOW_UP_TEMPLATES_KEY,
  type FollowUpTemplateOverrides,
  type FollowUpTemplatesEditState,
} from "@/lib/wa-follow-up-templates";
import {
  buildNpsTemplateVars,
  DEFAULT_NPS_EXTERNAL_MESSAGE,
  DEFAULT_NPS_EXTERNAL_MESSAGE_RETURNING,
  DEFAULT_NPS_SYSTEM_MESSAGE,
  DEFAULT_NPS_SYSTEM_MESSAGE_RETURNING,
  DEFAULT_WA_NPS_SETTINGS,
  normalizeWaNpsSettings,
  NPS_TEMPLATE_VARS,
  pickNpsMessageTemplate,
  renderNpsMessage,
  WA_NPS_SETTINGS_KEY,
  type WaNpsMode,
  type WaNpsSettings,
} from "@/lib/wa-nps-settings";
import {
  BIRTHDAY_TEMPLATE_VARS,
  DEFAULT_BIRTHDAY_TEMPLATES,
  DEFAULT_WA_BIRTHDAY_SETTINGS,
  normalizeWaBirthdaySettings,
  WA_BIRTHDAY_TEMPLATES_KEY,
  type WaBirthdaySettings,
} from "@/lib/wa-birthday-settings";

export function SectionAutomacaoWhatsApp() {
  const { tenant } = useAuth();
  const syncAutomationFn = useServerFn(syncAutomationQuickRepliesFn);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [afterHoursMessage, setAfterHoursMessage] = useState(DEFAULT_AFTER_HOURS_MESSAGE);
  const [templates, setTemplates] = useState<FollowUpTemplatesEditState>({});
  const [npsSettings, setNpsSettings] = useState<WaNpsSettings>(DEFAULT_WA_NPS_SETTINGS);
  const [birthdaySettings, setBirthdaySettings] = useState<WaBirthdaySettings>(DEFAULT_WA_BIRTHDAY_SETTINGS);
  const [activeBirthdayVariant, setActiveBirthdayVariant] = useState(0);
  const [activeNpsMessage, setActiveNpsMessage] = useState<"first" | "returning">("first");
  const [activeVariant, setActiveVariant] = useState<Record<string, number>>({});
  const taRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const npsTaRef = useRef<HTMLTextAreaElement | null>(null);
  const birthdayTaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!tenant) return;
    void (async () => {
      setLoading(true);
      try {
        const overrides = await getTenantSetting<FollowUpTemplateOverrides>(
          tenant.id,
          WA_FOLLOW_UP_TEMPLATES_KEY,
        );
        const afterHours = await getTenantSetting<string>(tenant.id, WA_AFTER_HOURS_MESSAGE_KEY);
        const npsRaw = await getTenantSetting(tenant.id, WA_NPS_SETTINGS_KEY);
        const birthdayRaw = await getTenantSetting(tenant.id, WA_BIRTHDAY_TEMPLATES_KEY);
        setTemplates(mergedTemplatesForEditing(overrides));
        setAfterHoursMessage(afterHours?.trim() || DEFAULT_AFTER_HOURS_MESSAGE);
        setNpsSettings(normalizeWaNpsSettings(npsRaw));
        setBirthdaySettings(normalizeWaBirthdaySettings(birthdayRaw));
      } finally {
        setLoading(false);
      }
    })();
  }, [tenant]);

  const variantIndex = (stepKey: string) => activeVariant[stepKey] ?? 0;

  const insertVar = (stepKey: string, varName: string) => {
    const ta = taRefs.current[stepKey];
    const current = templates;
    const seqKey = FOLLOW_UP_SEQUENCE_ORDER.find((sk) =>
      FOLLOW_UP_SEQUENCE_DEFAULTS[sk]?.some((s) => s.key === stepKey),
    );
    if (!seqKey) return;
    const vi = variantIndex(stepKey);
    const variants = padTemplatesToFive(current[seqKey]?.[stepKey] ?? []);
    const content = variants[vi] ?? "";

    const apply = (nextContent: string) => {
      const nextVariants = [...variants];
      nextVariants[vi] = nextContent;
      setTemplates((prev) => ({
        ...prev,
        [seqKey]: { ...prev[seqKey], [stepKey]: nextVariants },
      }));
    };

    if (!ta) {
      apply(content + `{{${varName}}}`);
      return;
    }

    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const next = content.slice(0, start) + `{{${varName}}}` + content.slice(end);
    apply(next);
    setTimeout(() => {
      ta.focus();
      const pos = start + varName.length + 4;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const insertNpsVar = (varName: string) => {
    const field = activeNpsMessage === "returning" ? "messageReturning" : "message";
    const ta = npsTaRef.current;
    const content = npsSettings[field];
    if (!ta) {
      setNpsSettings((prev) => ({ ...prev, [field]: content + `{{${varName}}}` }));
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const next = content.slice(0, start) + `{{${varName}}}` + content.slice(end);
    setNpsSettings((prev) => ({ ...prev, [field]: next }));
    setTimeout(() => {
      ta.focus();
      const pos = start + varName.length + 4;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const insertBirthdayVar = (varName: string) => {
    const ta = birthdayTaRef.current;
    const variants = padTemplatesToFive(birthdaySettings.templates, DEFAULT_BIRTHDAY_TEMPLATES);
    const content = variants[activeBirthdayVariant] ?? "";
    const apply = (next: string) => {
      const nextVariants = [...variants];
      nextVariants[activeBirthdayVariant] = next;
      setBirthdaySettings((prev) => ({ ...prev, templates: nextVariants }));
    };
    if (!ta) {
      apply(content + `{{${varName}}}`);
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    apply(content.slice(0, start) + `{{${varName}}}` + content.slice(end));
    setTimeout(() => {
      ta.focus();
      const pos = start + varName.length + 4;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const setStepVariant = (sequenceKey: string, stepKey: string, index: number, value: string) => {
    setTemplates((prev) => {
      const current = padTemplatesToFive(prev[sequenceKey]?.[stepKey] ?? []);
      const next = [...current];
      next[index] = value;
      return {
        ...prev,
        [sequenceKey]: { ...prev[sequenceKey], [stepKey]: next },
      };
    });
  };

  const resetStep = (sequenceKey: string, stepKey: string) => {
    const defaultStep = FOLLOW_UP_SEQUENCE_DEFAULTS[sequenceKey]?.find((s) => s.key === stepKey);
    if (!defaultStep) return;
    setTemplates((prev) => ({
      ...prev,
      [sequenceKey]: {
        ...prev[sequenceKey],
        [stepKey]: [...defaultStep.templates],
      },
    }));
  };

  const isDefaultNpsMessage = (mode: WaNpsMode, text: string, returning: boolean) => {
    const trimmed = text.trim();
    if (!trimmed) return true;
    if (mode === "external") {
      return returning
        ? trimmed === DEFAULT_NPS_EXTERNAL_MESSAGE_RETURNING.trim()
        : trimmed === DEFAULT_NPS_EXTERNAL_MESSAGE.trim();
    }
    return returning
      ? trimmed === DEFAULT_NPS_SYSTEM_MESSAGE_RETURNING.trim()
      : trimmed === DEFAULT_NPS_SYSTEM_MESSAGE.trim();
  };

  const setNpsMode = (mode: WaNpsMode) => {
    setNpsSettings((prev) => {
      const keepFirst = !isDefaultNpsMessage(prev.mode, prev.message, false);
      const keepReturning = !isDefaultNpsMessage(prev.mode, prev.messageReturning, true);
      return {
        ...prev,
        mode,
        message: keepFirst
          ? prev.message
          : mode === "external"
            ? DEFAULT_NPS_EXTERNAL_MESSAGE
            : DEFAULT_NPS_SYSTEM_MESSAGE,
        messageReturning: keepReturning
          ? prev.messageReturning
          : mode === "external"
            ? DEFAULT_NPS_EXTERNAL_MESSAGE_RETURNING
            : DEFAULT_NPS_SYSTEM_MESSAGE_RETURNING,
      };
    });
  };

  const save = async () => {
    if (!tenant) return;
    if (npsSettings.mode === "external" && !npsSettings.externalUrl.trim()) {
      toast.error("Informe o link externo de avaliação (ex.: Google)");
      return;
    }
    if (npsSettings.mode === "external") {
      try {
        // eslint-disable-next-line no-new
        new URL(npsSettings.externalUrl.trim());
      } catch {
        toast.error("Link de avaliação inválido. Use uma URL completa (https://...)");
        return;
      }
    }
    setSaving(true);
    try {
      const overrides = templatesToOverrides(templates);
      await setTenantSetting(tenant.id, WA_FOLLOW_UP_TEMPLATES_KEY, overrides);
      await setTenantSetting(tenant.id, WA_AFTER_HOURS_MESSAGE_KEY, afterHoursMessage.trim());
      await setTenantSetting(
        tenant.id,
        WA_NPS_SETTINGS_KEY,
        normalizeWaNpsSettings({
          ...npsSettings,
          externalUrl: npsSettings.externalUrl.trim(),
          message: npsSettings.message.trim(),
          messageReturning: npsSettings.messageReturning.trim(),
        }),
      );
      await setTenantSetting(
        tenant.id,
        WA_BIRTHDAY_TEMPLATES_KEY,
        normalizeWaBirthdaySettings({
          enabled: birthdaySettings.enabled,
          templates: birthdaySettings.templates.map((t) => t.trim()),
        }),
      );
      await syncAutomationFn();
      toast.success("Mensagens automáticas salvas e sincronizadas com o CRM");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const previewVars = {
    ...SAMPLE_VARS,
    ...buildGenderTemplateVars("Feminino"),
    nome_clinica: tenant?.name ?? "Sua Clínica",
  };

  const npsPreview = renderNpsMessage(
    pickNpsMessageTemplate(npsSettings, activeNpsMessage === "returning"),
    buildNpsTemplateVars({
      patientName: "Maria Silva",
      clinicName: tenant?.name ?? "Sua Clínica",
      systemNpsUrl: "https://app.exemplo.com/nps/abc123",
      externalUrl: npsSettings.externalUrl || "https://g.page/r/exemplo",
    }),
  );

  const npsMessageField = activeNpsMessage === "returning" ? "messageReturning" : "message";
  const npsMessageValue = npsSettings[npsMessageField];

  const birthdayVariants = padTemplatesToFive(birthdaySettings.templates, DEFAULT_BIRTHDAY_TEMPLATES);
  const birthdayPreview = renderTemplate(birthdayVariants[activeBirthdayVariant] || DEFAULT_BIRTHDAY_TEMPLATES[0], {
    ...previewVars,
    primeiro_nome: "Maria",
    nome_paciente: "Maria",
    saudacao: "Olá, Maria",
    nome_clinica: tenant?.name ?? "Sua Clínica",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Carregando automações…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="size-5" />
            Automação WhatsApp
          </h2>
          <p className="text-sm text-muted-foreground">
            Edite os textos enviados automaticamente pelo CRM (follow-ups, lembretes, NPS e fora do
            horário). A mensagem de fora do horário é enviada exatamente como cadastrada (sem IA), no máximo 1 por conversa a cada 12h.
          </p>
        </div>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Salvar automações
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="size-4" />
            Avaliação pós-consulta (NPS)
          </CardTitle>
          <CardDescription>
            Enviado sempre após concluir a consulta, no atraso configurado (janela 7h–20h), mesmo se
            o paciente falar no WhatsApp. Se ainda não houver conversa, o sistema abre uma nova pelo
            telefone do cadastro e envia o NPS. Mensagem 1 para quem nunca avaliou; mensagem 2 para
            quem já respondeu o NPS alguma vez.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de avaliação</Label>
              <Select value={npsSettings.mode} onValueChange={(v) => setNpsMode(v as WaNpsMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">NPS do ClinicOS (link interno)</SelectItem>
                  <SelectItem value="external">Link externo (ex.: Google)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Enviar após (minutos)</Label>
              <Input
                type="number"
                min={0}
                max={1440}
                value={npsSettings.delayMinutes}
                onChange={(e) =>
                  setNpsSettings((prev) => ({
                    ...prev,
                    delayMinutes: Math.max(0, Math.min(1440, Number(e.target.value) || 0)),
                  }))
                }
              />
            </div>
          </div>

          {npsSettings.mode === "external" ? (
            <div className="space-y-1.5">
              <Label>Link de avaliação</Label>
              <Input
                type="url"
                placeholder="https://g.page/r/… ou link do Google Avaliações"
                value={npsSettings.externalUrl}
                onChange={(e) => setNpsSettings((prev) => ({ ...prev, externalUrl: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Use a variável {"{{link_avaliacao}}"} na mensagem. Respostas do Google não entram no
                relatório NPS do sistema; a escolha mensagem 1/2 usa o histórico de NPS interno, se
                houver.
              </p>
            </div>
          ) : (
            <p className="text-xs rounded-md border bg-muted/40 px-3 py-2 text-muted-foreground">
              O sistema gera um link único {"{{link_nps}}"} e registra a nota no relatório de NPS da
              clínica.
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Mensagem WhatsApp</Label>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={activeNpsMessage === "first" ? "default" : "outline"}
                onClick={() => setActiveNpsMessage("first")}
              >
                Mensagem 1 · nunca avaliou
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeNpsMessage === "returning" ? "default" : "outline"}
                onClick={() => setActiveNpsMessage("returning")}
              >
                Mensagem 2 · já avaliou
              </Button>
            </div>
            <Textarea
              key={activeNpsMessage}
              ref={npsTaRef}
              value={npsMessageValue}
              onChange={(e) =>
                setNpsSettings((prev) => ({ ...prev, [npsMessageField]: e.target.value }))
              }
              rows={4}
              maxLength={1024}
            />
            <div className="flex flex-wrap gap-1">
              {NPS_TEMPLATE_VARS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertNpsVar(v)}
                  className="rounded bg-muted px-2 py-0.5 font-mono text-xs hover:bg-muted/70"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Prévia</Label>
            <p className="mt-1 rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">{npsPreview}</p>
          </div>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              setNpsSettings((prev) => ({
                ...prev,
                [npsMessageField]:
                  prev.mode === "external"
                    ? activeNpsMessage === "returning"
                      ? DEFAULT_NPS_EXTERNAL_MESSAGE_RETURNING
                      : DEFAULT_NPS_EXTERNAL_MESSAGE
                    : activeNpsMessage === "returning"
                      ? DEFAULT_NPS_SYSTEM_MESSAGE_RETURNING
                      : DEFAULT_NPS_SYSTEM_MESSAGE,
              }))
            }
          >
            Restaurar mensagem padrão
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cake className="size-4" />
            Aniversário (WhatsApp)
          </CardTitle>
          <CardDescription>
            Envio automático no dia do aniversário, entre 7h e 20h. Cinco variações em rotação por
            paciente (no máximo uma mensagem por ano).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <div>
              <Label htmlFor="birthday-enabled">Envio automático ativo</Label>
              <p className="text-xs text-muted-foreground">Desative para pausar sem apagar os textos.</p>
            </div>
            <Switch
              id="birthday-enabled"
              checked={birthdaySettings.enabled}
              onCheckedChange={(checked) =>
                setBirthdaySettings((prev) => ({ ...prev, enabled: checked }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>Variações da mensagem</Label>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: FOLLOW_UP_VARIANT_COUNT }, (_, i) => (
                <Button
                  key={i}
                  type="button"
                  size="sm"
                  variant={activeBirthdayVariant === i ? "default" : "outline"}
                  onClick={() => setActiveBirthdayVariant(i)}
                >
                  Variação {i + 1}
                </Button>
              ))}
            </div>
            <Textarea
              key={activeBirthdayVariant}
              ref={birthdayTaRef}
              value={birthdayVariants[activeBirthdayVariant] ?? ""}
              onChange={(e) => {
                const next = [...birthdayVariants];
                next[activeBirthdayVariant] = e.target.value;
                setBirthdaySettings((prev) => ({ ...prev, templates: next }));
              }}
              rows={5}
              maxLength={1024}
              disabled={!birthdaySettings.enabled}
            />
            <div className="flex flex-wrap gap-1">
              {BIRTHDAY_TEMPLATE_VARS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertBirthdayVar(v)}
                  className="rounded bg-muted px-2 py-0.5 font-mono text-xs hover:bg-muted/70"
                  disabled={!birthdaySettings.enabled}
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Prévia</Label>
            <p className="mt-1 rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">{birthdayPreview}</p>
          </div>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              const next = [...birthdayVariants];
              next[activeBirthdayVariant] = DEFAULT_BIRTHDAY_TEMPLATES[activeBirthdayVariant] ?? "";
              setBirthdaySettings((prev) => ({ ...prev, templates: next }));
            }}
          >
            Restaurar esta variação
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fora do horário de atendimento</CardTitle>
          <CardDescription>
            Resposta automática quando o paciente envia mensagem fora do horário configurado em
            Clínica. Envia exatamente o texto abaixo (sem reformular com IA), uma única vez a cada 12h por conversa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={afterHoursMessage}
            onChange={(e) => setAfterHoursMessage(e.target.value)}
            rows={3}
            maxLength={1024}
          />
          <p className="text-xs text-muted-foreground">
            Prévia: {afterHoursMessage.trim() || DEFAULT_AFTER_HOURS_MESSAGE}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sequências de follow-up</CardTitle>
          <CardDescription>
            Use variáveis como{" "}
            <code className="rounded bg-muted px-1 text-xs">{`{{primeiro_nome}}`}</code>,{" "}
            <code className="rounded bg-muted px-1 text-xs">{`{{data_consulta}}`}</code> e{" "}
            <code className="rounded bg-muted px-1 text-xs">{`{{insatisfeito}}`}</code> (adapta ao sexo
            do cadastro: Feminino/Masculino). Mensagens já agendadas continuam com o texto original;
            novas usam o modelo atualizado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {FOLLOW_UP_SEQUENCE_ORDER.map((sequenceKey) => {
              const meta = FOLLOW_UP_SEQUENCE_META[sequenceKey];
              const steps = FOLLOW_UP_SEQUENCE_DEFAULTS[sequenceKey] ?? [];
              if (!meta || !steps.length) return null;

              return (
                <AccordionItem key={sequenceKey} value={sequenceKey}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="text-left">
                      <div className="font-medium">{meta.label}</div>
                      <div className="text-xs text-muted-foreground">{meta.description}</div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <p className="text-xs text-muted-foreground">
                      Cada passo tem {FOLLOW_UP_VARIANT_COUNT} variações. Elas alternam por paciente a
                      cada envio deste tipo (1→2→…→5→1).
                    </p>
                    {steps.map((step) => {
                      const variants = padTemplatesToFive(
                        templates[sequenceKey]?.[step.key] ?? step.templates,
                      );
                      const vi = variantIndex(step.key);
                      const value = variants[vi] ?? "";
                      const defaults = padTemplatesToFive(step.templates);
                      const isCustom = variants.some((v, i) => v.trim() !== (defaults[i] ?? "").trim());
                      const preview = renderTemplate(value, previewVars);

                      return (
                        <div key={step.key} className="space-y-3 rounded-lg border p-4">
                          <div className="space-y-1">
                            {step.label && (
                              <p className="text-sm font-medium text-foreground">{step.label}</p>
                            )}
                            {step.key === "appointment_booked_now" && (
                              <p className="text-xs text-muted-foreground">
                                Enviada ao agendar ou reagendar. O único lembrete depois é o de
                                1 dia antes, na mensagem abaixo.
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="gap-1">
                                <Clock className="size-3" />
                                {formatFollowUpStepDelay(step.delayMinutes, step.key)}
                              </Badge>
                              <Badge variant="secondary">{followUpModeLabel(step.mode)}</Badge>
                              {isCustom && <Badge>Personalizado</Badge>}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {Array.from({ length: FOLLOW_UP_VARIANT_COUNT }, (_, i) => (
                              <Button
                                key={i}
                                type="button"
                                size="sm"
                                variant={vi === i ? "default" : "outline"}
                                className="h-8 px-2.5"
                                onClick={() =>
                                  setActiveVariant((prev) => ({ ...prev, [step.key]: i }))
                                }
                              >
                                Variação {i + 1}
                              </Button>
                            ))}
                          </div>
                          <div>
                            <Label>Mensagem — variação {vi + 1}</Label>
                            <Textarea
                              ref={(el) => {
                                taRefs.current[step.key] = el;
                              }}
                              value={value}
                              onChange={(e) =>
                                setStepVariant(sequenceKey, step.key, vi, e.target.value)
                              }
                              rows={4}
                              maxLength={1024}
                              className="mt-1"
                            />
                            <div className="mt-1 flex flex-wrap gap-1">
                              {TEMPLATE_VARS.map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => insertVar(step.key, v)}
                                  className="rounded bg-muted px-2 py-0.5 font-mono text-xs hover:bg-muted/70"
                                >
                                  {`{{${v}}}`}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Prévia</Label>
                            <p className="mt-1 rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                              {preview}
                            </p>
                          </div>
                          {isCustom && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => resetStep(sequenceKey, step.key)}
                            >
                              Restaurar padrões (5 variações)
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
