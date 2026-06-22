import { useEffect, useRef, useState } from "react";
import { Bot, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

export function SectionAutomacaoWhatsApp() {
  const { tenant } = useAuth();
  const syncAutomationFn = useServerFn(syncAutomationQuickRepliesFn);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [afterHoursMessage, setAfterHoursMessage] = useState(DEFAULT_AFTER_HOURS_MESSAGE);
  const [templates, setTemplates] = useState<FollowUpTemplateOverrides>({});
  const taRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    if (!tenant) return;
    void (async () => {
      setLoading(true);
      try {
        const overrides = await getTenantSetting<FollowUpTemplateOverrides>(tenant.id, WA_FOLLOW_UP_TEMPLATES_KEY);
        const afterHours = await getTenantSetting<string>(tenant.id, WA_AFTER_HOURS_MESSAGE_KEY);
        setTemplates(mergedTemplatesForEditing(overrides));
        setAfterHoursMessage(afterHours?.trim() || DEFAULT_AFTER_HOURS_MESSAGE);
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

  const save = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      const overrides = templatesToOverrides(templates);
      await setTenantSetting(tenant.id, WA_FOLLOW_UP_TEMPLATES_KEY, overrides);
      await setTenantSetting(tenant.id, WA_AFTER_HOURS_MESSAGE_KEY, afterHoursMessage.trim());
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
            Edite os textos enviados automaticamente pelo CRM (follow-ups, lembretes e fora do horário).
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Salvar automações
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fora do horário de atendimento</CardTitle>
          <CardDescription>
            Resposta automática quando o paciente envia mensagem fora do horário configurado em Clínica.
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
            do cadastro: Feminino/Masculino).
            Mensagens já agendadas continuam com o texto original; novas usam o modelo atualizado.
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
                        <div key={step.key} className="rounded-lg border p-4 space-y-3">
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
                            <p className="mt-1 rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">{preview}</p>
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
