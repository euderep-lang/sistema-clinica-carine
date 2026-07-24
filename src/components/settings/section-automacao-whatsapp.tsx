import { useEffect, useRef, useState } from "react";
import { Bot, Clock, Loader2, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  formatFollowUpStepDelay,
  followUpModeLabel,
  mergedTemplatesForEditing,
  templatesToOverrides,
  WA_AFTER_HOURS_MESSAGE_KEY,
  WA_FOLLOW_UP_TEMPLATES_KEY,
  type FollowUpTemplateOverrides,
} from "@/lib/wa-follow-up-templates";
import {
  buildNpsTemplateVars,
  DEFAULT_NPS_EXTERNAL_MESSAGE,
  DEFAULT_NPS_SYSTEM_MESSAGE,
  DEFAULT_WA_NPS_SETTINGS,
  normalizeWaNpsSettings,
  NPS_TEMPLATE_VARS,
  renderNpsMessage,
  WA_NPS_SETTINGS_KEY,
  type WaNpsMode,
  type WaNpsSettings,
} from "@/lib/wa-nps-settings";

export function SectionAutomacaoWhatsApp() {
  const { tenant } = useAuth();
  const syncAutomationFn = useServerFn(syncAutomationQuickRepliesFn);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [afterHoursMessage, setAfterHoursMessage] = useState(DEFAULT_AFTER_HOURS_MESSAGE);
  const [templates, setTemplates] = useState<FollowUpTemplateOverrides>({});
  const [npsSettings, setNpsSettings] = useState<WaNpsSettings>(DEFAULT_WA_NPS_SETTINGS);
  const taRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const npsTaRef = useRef<HTMLTextAreaElement | null>(null);

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
        setTemplates(mergedTemplatesForEditing(overrides));
        setAfterHoursMessage(afterHours?.trim() || DEFAULT_AFTER_HOURS_MESSAGE);
        setNpsSettings(normalizeWaNpsSettings(npsRaw));
      } finally {
        setLoading(false);
      }
    })();
  }, [tenant]);

  const insertVar = (stepKey: string, varName: string) => {
    const ta = taRefs.current[stepKey];
    const current = templates;
    const seqKey = FOLLOW_UP_SEQUENCE_ORDER.find((sk) =>
      FOLLOW_UP_SEQUENCE_DEFAULTS[sk]?.some((s) => s.key === stepKey),
    );
    if (!seqKey) return;
    const content = current[seqKey]?.[stepKey] ?? "";

    if (!ta) {
      setTemplates((prev) => ({
        ...prev,
        [seqKey]: { ...prev[seqKey], [stepKey]: content + `{{${varName}}}` },
      }));
      return;
    }

    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const next = content.slice(0, start) + `{{${varName}}}` + content.slice(end);
    setTemplates((prev) => ({
      ...prev,
      [seqKey]: { ...prev[seqKey], [stepKey]: next },
    }));
    setTimeout(() => {
      ta.focus();
      const pos = start + varName.length + 4;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const insertNpsVar = (varName: string) => {
    const ta = npsTaRef.current;
    const content = npsSettings.message;
    if (!ta) {
      setNpsSettings((prev) => ({ ...prev, message: content + `{{${varName}}}` }));
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const next = content.slice(0, start) + `{{${varName}}}` + content.slice(end);
    setNpsSettings((prev) => ({ ...prev, message: next }));
    setTimeout(() => {
      ta.focus();
      const pos = start + varName.length + 4;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const setStepTemplate = (sequenceKey: string, stepKey: string, value: string) => {
    setTemplates((prev) => ({
      ...prev,
      [sequenceKey]: { ...prev[sequenceKey], [stepKey]: value },
    }));
  };

  const resetStep = (sequenceKey: string, stepKey: string) => {
    const defaultStep = FOLLOW_UP_SEQUENCE_DEFAULTS[sequenceKey]?.find((s) => s.key === stepKey);
    if (!defaultStep) return;
    setStepTemplate(sequenceKey, stepKey, defaultStep.template);
  };

  const setNpsMode = (mode: WaNpsMode) => {
    setNpsSettings((prev) => {
      const switchingToDefaultMessage =
        (prev.mode === "system" && prev.message.trim() === DEFAULT_NPS_SYSTEM_MESSAGE.trim()) ||
        (prev.mode === "external" && prev.message.trim() === DEFAULT_NPS_EXTERNAL_MESSAGE.trim()) ||
        !prev.message.trim();
      return {
        ...prev,
        mode,
        message: switchingToDefaultMessage
          ? mode === "external"
            ? DEFAULT_NPS_EXTERNAL_MESSAGE
            : DEFAULT_NPS_SYSTEM_MESSAGE
          : prev.message,
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
    npsSettings.message ||
      (npsSettings.mode === "external" ? DEFAULT_NPS_EXTERNAL_MESSAGE : DEFAULT_NPS_SYSTEM_MESSAGE),
    buildNpsTemplateVars({
      patientName: "Maria Silva",
      clinicName: tenant?.name ?? "Sua Clínica",
      systemNpsUrl: "https://app.exemplo.com/nps/abc123",
      externalUrl: npsSettings.externalUrl || "https://g.page/r/exemplo",
    }),
  );

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
            horário).
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
            Enviada automaticamente alguns minutos após marcar a consulta como concluída. Escolha o
            NPS interno do ClinicOS ou um link externo (Google Avaliações, etc.).
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
                relatório NPS do sistema.
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
            <Textarea
              ref={npsTaRef}
              value={npsSettings.message}
              onChange={(e) => setNpsSettings((prev) => ({ ...prev, message: e.target.value }))}
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
                message:
                  prev.mode === "external" ? DEFAULT_NPS_EXTERNAL_MESSAGE : DEFAULT_NPS_SYSTEM_MESSAGE,
              }))
            }
          >
            Restaurar mensagem padrão
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fora do horário de atendimento</CardTitle>
          <CardDescription>
            Resposta automática quando o paciente envia mensagem fora do horário configurado em
            Clínica.
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
                    {steps.map((step) => {
                      const value = templates[sequenceKey]?.[step.key] ?? step.template;
                      const isCustom = value.trim() !== step.template.trim();
                      const preview = renderTemplate(value, previewVars);

                      return (
                        <div key={step.key} className="space-y-3 rounded-lg border p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="gap-1">
                              <Clock className="size-3" />
                              {formatFollowUpStepDelay(step.delayMinutes)}
                            </Badge>
                            <Badge variant="secondary">{followUpModeLabel(step.mode)}</Badge>
                            {isCustom && <Badge>Personalizado</Badge>}
                          </div>
                          <div>
                            <Label>Mensagem</Label>
                            <Textarea
                              ref={(el) => {
                                taRefs.current[step.key] = el;
                              }}
                              value={value}
                              onChange={(e) => setStepTemplate(sequenceKey, step.key, e.target.value)}
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
                              Restaurar padrão
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
