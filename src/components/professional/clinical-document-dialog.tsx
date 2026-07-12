import { useEffect, useMemo, useState } from "react";
import { FileDown, Loader2, Pencil, RefreshCw, Save, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/mock-auth";
import { todayISO } from "@/lib/locale";
import { loadLetterheadForPdf } from "@/lib/letterhead";
import {
  formatClinicAddress,
  getTenantSetting,
  type ClinicAddress,
} from "@/lib/settings-helpers";
import { loadCID10List, searchCID10, type CID10 } from "@/lib/cid10";
import {
  buildClinicalDocBody,
  CLINICAL_DOC_TITLE,
  generateClinicalDocumentPDF,
  richHtmlHasContent,
  type ClinicalDocData,
  type ClinicalDocType,
} from "@/lib/clinical-document-pdf";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  deleteClinicalTemplate,
  loadClinicalTemplates,
  saveClinicalDocumentToHistory,
  saveClinicalTemplate,
  TEMPLATE_CATEGORIES,
  type ClinicalDocPayload,
  type ClinicalDocTemplate,
  type TemplateCategory,
} from "@/lib/clinical-documents";

interface PatientLite {
  id: string;
  full_name: string;
  cpf: string | null;
  birth_date: string | null;
}

interface ClinicalDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docType: ClinicalDocType;
  patientId: string;
  patientName?: string;
  onSaved?: () => void;
}

export function ClinicalDocumentDialog({
  open,
  onOpenChange,
  docType,
  patientId,
  patientName,
  onSaved,
}: ClinicalDocumentDialogProps) {
  const { profile, tenant } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [patient, setPatient] = useState<PatientLite | null>(null);
  const [templates, setTemplates] = useState<ClinicalDocTemplate[]>([]);
  const [date, setDate] = useState(todayISO());

  // Campos — atestado
  const [days, setDays] = useState("");
  const [rest, setRest] = useState("");
  const [cidOpen, setCidOpen] = useState(false);
  const [cidQuery, setCidQuery] = useState("");
  const [cidList, setCidList] = useState<CID10[]>([]);
  const [cid, setCid] = useState<{ code: string; description: string } | null>(null);

  // Campos — declaração
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [companion, setCompanion] = useState("");

  // Campos — exames
  const [examsText, setExamsText] = useState("");
  const [clinicalIndication, setClinicalIndication] = useState("");

  // Conteúdo do documento (editor de texto rico) — fonte da verdade do PDF.
  const [bodyHtml, setBodyHtml] = useState("");
  const [editorKey, setEditorKey] = useState(0);

  // Salvar modelo
  const [saveTplOpen, setSaveTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplDefault, setTplDefault] = useState(false);
  const [tplCategory, setTplCategory] = useState<TemplateCategory>("exames");
  const [browseTplCategory, setBrowseTplCategory] = useState<TemplateCategory>("exames");
  const [selectedBrowseTplId, setSelectedBrowseTplId] = useState<string | null>(null);
  const [editingTplId, setEditingTplId] = useState<string | null>(null);

  const title = CLINICAL_DOC_TITLE[docType];
  const useCategories = docType === "exames";

  const resetFields = () => {
    setDays("");
    setRest("");
    setCid(null);
    setCidQuery("");
    setPeriodStart("");
    setPeriodEnd("");
    setCompanion("");
    setExamsText("");
    setClinicalIndication("");
    setBodyHtml("");
    setEditorKey((k) => k + 1);
  };

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /** Monta o HTML inicial do corpo a partir dos campos estruturados. */
  const buildDefaultHtml = (
    ctx: { name: string; date: string },
    fields: {
      days?: string;
      rest?: string;
      cid?: { code: string; description: string } | null;
      periodStart?: string;
      periodEnd?: string;
      companion?: string;
      exams?: string[];
      clinicalIndication?: string;
      customBody?: string;
    },
  ): string => {
    const paras = buildClinicalDocBody({
      type: docType,
      patientName: ctx.name,
      professionalName: profile?.full_name ?? "",
      date: ctx.date,
      days: fields.days ? Number(fields.days) : undefined,
      rest: fields.rest,
      periodStart: fields.periodStart,
      periodEnd: fields.periodEnd,
      companion: fields.companion,
      customBody: fields.customBody,
    });
    let html = paras.map((t) => `<p>${escapeHtml(t)}</p>`).join("");
    if (docType === "exames") {
      const items = (fields.exams ?? []).filter(Boolean);
      const lis = items.length
        ? items.map((e) => `<li>${escapeHtml(e)}</li>`).join("")
        : "<li><br></li>";
      html += `<ol>${lis}</ol>`;
      if (fields.clinicalIndication?.trim()) {
        html += `<p>Indicação clínica: ${escapeHtml(fields.clinicalIndication.trim())}</p>`;
      }
    }
    if (docType === "atestado" && fields.cid) {
      html += `<p><i>CID: ${escapeHtml(fields.cid.code)}${
        fields.cid.description ? ` — ${escapeHtml(fields.cid.description)}` : ""
      }</i></p>`;
    }
    return html;
  };

  const setEditorContent = (html: string) => {
    setBodyHtml(html);
    setEditorKey((k) => k + 1);
  };

  const regenerateFromFields = () => {
    setEditorContent(
      buildDefaultHtml(
        { name: patient?.full_name ?? patientName ?? "", date },
        {
          days,
          rest,
          cid,
          periodStart,
          periodEnd,
          companion,
          exams: examList,
          clinicalIndication,
        },
      ),
    );
  };

  useEffect(() => {
    if (!open || !profile) return;
    setLoading(true);
    resetFields();
    setDate(todayISO());
    setSaveTplOpen(false);
    setEditingTplId(null);
    setTplName("");
    setTplDefault(false);
    setTplCategory("exames");
    setBrowseTplCategory("exames");
    setSelectedBrowseTplId(null);
    (async () => {
      try {
        const [{ data: pt }, tpls] = await Promise.all([
          supabase
            .from("patients")
            .select("id, full_name, cpf, birth_date")
            .eq("id", patientId)
            .maybeSingle(),
          loadClinicalTemplates(profile.id, docType),
        ]);
        const ptLite = (pt as PatientLite) ?? null;
        setPatient(ptLite);
        setTemplates(tpls);
        const def = tpls.find((t) => t.is_default);
        const nameForDoc = ptLite?.full_name ?? patientName ?? "";
        if (def) {
          setBrowseTplCategory((def.category ?? "exames") as TemplateCategory);
          setSelectedBrowseTplId(def.id);
          applyTemplate(def, nameForDoc);
        } else {
          const firstCat =
            (TEMPLATE_CATEGORIES.find((c) =>
              tpls.some((t) => (t.category ?? "exames") === c.value),
            )?.value as TemplateCategory | undefined) ?? "exames";
          setBrowseTplCategory(firstCat);
          setEditorContent(buildDefaultHtml({ name: nameForDoc, date: todayISO() }, {}));
        }
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile?.id, patientId, docType]);

  const applyTemplate = (tpl: ClinicalDocTemplate, nameOverride?: string) => {
    const p = tpl.payload ?? {};
    const cidFromTpl = p.cid ? { code: p.cid, description: p.cidDescription ?? "" } : null;
    if (docType === "atestado") {
      setDays(p.days != null ? String(p.days) : "");
      setRest(p.rest ?? "");
      setCid(cidFromTpl);
    } else if (docType === "declaracao") {
      setPeriodStart(p.periodStart ?? "");
      setPeriodEnd(p.periodEnd ?? "");
      setCompanion(p.companion ?? "");
    } else {
      setExamsText((p.exams ?? []).join("\n"));
      setClinicalIndication(p.clinicalIndication ?? "");
    }

    const name = nameOverride ?? patient?.full_name ?? patientName ?? "";
    if (p.bodyHtml && richHtmlHasContent(p.bodyHtml)) {
      setEditorContent(p.bodyHtml);
    } else {
      setEditorContent(
        buildDefaultHtml(
          { name, date },
          {
            days: p.days != null ? String(p.days) : "",
            rest: p.rest,
            cid: cidFromTpl,
            periodStart: p.periodStart,
            periodEnd: p.periodEnd,
            companion: p.companion,
            exams: p.exams,
            clinicalIndication: p.clinicalIndication,
            customBody: p.customBody,
          },
        ),
      );
    }
    toast.success(`Modelo "${tpl.name}" aplicado`);
  };

  const editTemplate = (tpl: ClinicalDocTemplate) => {
    applyTemplate(tpl);
    setEditingTplId(tpl.id);
    setTplName(tpl.name);
    setTplCategory((tpl.category ?? "exames") as TemplateCategory);
    setTplDefault(tpl.is_default);
    setSaveTplOpen(true);
  };

  const cancelTemplateEdit = () => {
    setSaveTplOpen(false);
    setEditingTplId(null);
    setTplName("");
    setTplDefault(false);
    setTplCategory("exames");
  };

  const examList = useMemo(
    () => examsText.split(/\n/).map((s) => s.trim()).filter(Boolean),
    [examsText],
  );

  const templatesInBrowseCategory = useMemo(
    () => templates.filter((t) => (t.category ?? "exames") === browseTplCategory),
    [templates, browseTplCategory],
  );

  const selectedBrowseTemplate = useMemo(
    () => templates.find((t) => t.id === selectedBrowseTplId) ?? null,
    [templates, selectedBrowseTplId],
  );

  useEffect(() => {
    if (!useCategories) return;
    setSelectedBrowseTplId((prev) => {
      if (prev && templatesInBrowseCategory.some((t) => t.id === prev)) return prev;
      return templatesInBrowseCategory[0]?.id ?? null;
    });
  }, [useCategories, templatesInBrowseCategory]);

  const buildPayload = (): ClinicalDocPayload => {
    const htmlPart = richHtmlHasContent(bodyHtml) ? { bodyHtml } : {};
    if (docType === "atestado") {
      return {
        days: days ? Number(days) : undefined,
        cid: cid?.code,
        cidDescription: cid?.description,
        rest: rest.trim() || undefined,
        ...htmlPart,
      };
    }
    if (docType === "declaracao") {
      return {
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
        companion: companion.trim() || undefined,
        ...htmlPart,
      };
    }
    return {
      exams: examList,
      clinicalIndication: clinicalIndication.trim() || undefined,
      ...htmlPart,
    };
  };

  const buildDocData = async (): Promise<ClinicalDocData | null> => {
    if (!profile || !tenant || !patient) return null;
    const [tenantRow, addr, letterhead] = await Promise.all([
      supabase.from("tenants").select("name, address, phone, email, cnpj").eq("id", tenant.id).maybeSingle(),
      getTenantSetting<ClinicAddress>(tenant.id, "address"),
      loadLetterheadForPdf(profile.id),
    ]);

    const bodyParagraphs = buildClinicalDocBody({
      type: docType,
      patientName: patient.full_name,
      professionalName: profile.full_name,
      date,
      days: days ? Number(days) : undefined,
      rest,
      periodStart,
      periodEnd,
      companion,
    });

    if (docType === "exames" && clinicalIndication.trim()) {
      bodyParagraphs.push(`Indicação clínica: ${clinicalIndication.trim()}`);
    }

    const cidLine =
      docType === "atestado" && cid
        ? `CID: ${cid.code}${cid.description ? ` — ${cid.description}` : ""}`
        : null;

    return {
      type: docType,
      date,
      bodyHtml: richHtmlHasContent(bodyHtml) ? bodyHtml : null,
      bodyParagraphs,
      examItems: docType === "exames" ? examList : undefined,
      cidLine,
      clinic: {
        name: tenantRow.data?.name ?? tenant.name,
        address: formatClinicAddress(addr) ?? tenantRow.data?.address ?? null,
        phone: tenantRow.data?.phone ?? null,
        email: tenantRow.data?.email ?? null,
        cnpj: tenantRow.data?.cnpj ?? null,
        city: addr?.cidade ?? null,
      },
      patient: {
        full_name: patient.full_name,
        cpf: patient.cpf,
        birth_date: patient.birth_date,
      },
      professional: {
        full_name: profile.display_name?.trim() || profile.full_name,
        crm: profile.crm ?? null,
        specialty: profile.specialty ?? null,
        profession: profile.profession ?? null,
        cpf: profile.cpf ?? null,
      },
      letterhead,
    };
  };

  const validate = (): boolean => {
    if (!richHtmlHasContent(bodyHtml)) {
      toast.error("O conteúdo do documento está vazio.");
      return false;
    }
    return true;
  };

  const summaryText = (): string => {
    if (docType === "atestado") return days ? `${days} dia(s)` : "";
    if (docType === "exames") return examList.slice(0, 3).join(", ");
    return "";
  };

  const handleGeneratePdf = async () => {
    if (!validate()) return;
    setGenerating(true);
    try {
      const data = await buildDocData();
      if (!data) return;
      const blob = generateClinicalDocumentPDF(data);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!validate() || !profile || !tenant) return;
    setGenerating(true);
    try {
      const data = await buildDocData();
      if (!data) return;
      const blob = generateClinicalDocumentPDF(data);
      await saveClinicalDocumentToHistory({
        tenantId: tenant.id,
        patientId,
        professionalId: profile.id,
        docType,
        date,
        payload: buildPayload(),
        summary: summaryText(),
        pdfBlob: blob,
      });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success(`${title} salvo no prontuário.`);
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!profile || !tenant) return;
    if (!tplName.trim()) {
      toast.error("Dê um nome ao modelo.");
      return;
    }
    try {
      await saveClinicalTemplate({
        tenantId: tenant.id,
        professionalId: profile.id,
        docType,
        category: useCategories ? tplCategory : undefined,
        name: tplName.trim(),
        payload: buildPayload(),
        isDefault: tplDefault,
        templateId: editingTplId,
      });
      toast.success(editingTplId ? "Modelo atualizado." : "Modelo salvo.");
      setSaveTplOpen(false);
      setEditingTplId(null);
      setTplName("");
      setTplDefault(false);
      setTplCategory("exames");
      setTemplates(await loadClinicalTemplates(profile.id, docType));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!profile) return;
    try {
      await deleteClinicalTemplate(id);
      setTemplates(await loadClinicalTemplates(profile.id, docType));
      toast.success("Modelo removido.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const runCidSearch = async (q: string) => {
    setCidQuery(q);
    if (q.trim().length < 2) {
      setCidList([]);
      return;
    }
    try {
      const list = await loadCID10List();
      setCidList(searchCID10(list, q, 20));
    } catch {
      setCidList([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paciente: <span className="font-medium text-foreground">{patient?.full_name ?? patientName ?? "—"}</span>
            </p>

            {/* Modelos */}
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-xs">Meus modelos</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (saveTplOpen) {
                      cancelTemplateEdit();
                    } else {
                      setEditingTplId(null);
                      setSaveTplOpen(true);
                    }
                  }}
                >
                  <Save className="mr-1 size-3.5" />
                  Salvar como modelo
                </Button>
              </div>

              {templates.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Nenhum modelo salvo ainda.</p>
              ) : useCategories ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)]">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Categoria</Label>
                    <Select
                      value={browseTplCategory}
                      onValueChange={(v) => setBrowseTplCategory(v as TemplateCategory)}
                    >
                      <SelectTrigger className="h-9 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Modelos
                      {templatesInBrowseCategory.length > 0
                        ? ` (${templatesInBrowseCategory.length})`
                        : ""}
                    </Label>
                    <div
                      role="listbox"
                      aria-label="Modelos da categoria"
                      className="max-h-40 overflow-y-auto overscroll-contain rounded-md border bg-background"
                    >
                      {templatesInBrowseCategory.length === 0 ? (
                        <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                          Nenhum modelo nesta categoria.
                        </p>
                      ) : (
                        templatesInBrowseCategory.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            role="option"
                            aria-selected={selectedBrowseTplId === t.id}
                            onClick={() => setSelectedBrowseTplId(t.id)}
                            onDoubleClick={() => applyTemplate(t)}
                            className={cn(
                              "flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0",
                              selectedBrowseTplId === t.id
                                ? "bg-primary/10 font-medium text-primary"
                                : "hover:bg-muted/50",
                              editingTplId === t.id && "ring-1 ring-inset ring-primary/40",
                            )}
                          >
                            {t.is_default ? (
                              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                            ) : (
                              <span className="size-3.5 shrink-0" aria-hidden />
                            )}
                            <span className="truncate">{t.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                    {selectedBrowseTemplate ? (
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => applyTemplate(selectedBrowseTemplate)}
                        >
                          Usar modelo
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => editTemplate(selectedBrowseTemplate)}
                        >
                          <Pencil className="mr-1 size-3.5" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void handleDeleteTemplate(selectedBrowseTemplate.id)}
                        >
                          <Trash2 className="mr-1 size-3.5" />
                          Excluir
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {templates.map((t) => (
                    <span
                      key={t.id}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs",
                        editingTplId === t.id && "border-primary ring-1 ring-primary",
                      )}
                    >
                      <button type="button" className="font-medium hover:text-primary" onClick={() => applyTemplate(t)}>
                        {t.is_default && <Star className="mr-1 inline size-3 fill-amber-400 text-amber-400" />}
                        {t.name}
                      </button>
                      <button type="button" onClick={() => editTemplate(t)} title="Editar modelo" className="text-muted-foreground hover:text-primary">
                        <Pencil className="size-3" />
                      </button>
                      <button type="button" onClick={() => void handleDeleteTemplate(t.id)} title="Remover modelo" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {saveTplOpen && (
              <div className="space-y-2 rounded-lg border border-dashed p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">
                    {editingTplId ? "Editar modelo" : "Novo modelo"}
                  </p>
                  <button
                    type="button"
                    onClick={cancelTemplateEdit}
                    className="text-muted-foreground hover:text-foreground"
                    title="Fechar"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Nome do modelo</Label>
                  <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Ex.: Atestado 1 dia, Exames de sangue…" />
                </div>
                {useCategories && (
                  <div className="space-y-1">
                    <Label className="text-xs">Categoria</Label>
                    <select
                      value={tplCategory}
                      onChange={(e) => setTplCategory(e.target.value as TemplateCategory)}
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                    >
                      {TEMPLATE_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <label className="flex items-center gap-1.5 pb-2 text-xs">
                  <input type="checkbox" checked={tplDefault} onChange={(e) => setTplDefault(e.target.checked)} />
                  Padrão
                </label>
                <Button type="button" size="sm" onClick={() => void handleSaveTemplate()}>
                  {editingTplId ? "Salvar alterações" : "Salvar"}
                </Button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
            </div>

            {/* Campos por tipo */}
            {docType === "atestado" && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Dias de afastamento</Label>
                    <Input type="number" min={0} value={days} onChange={(e) => setDays(e.target.value)} placeholder="Ex.: 3" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">CID (opcional)</Label>
                    <Popover open={cidOpen} onOpenChange={setCidOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start font-normal">
                          {cid ? `${cid.code} — ${cid.description}` : "Selecionar CID…"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput placeholder="Buscar CID ou descrição…" value={cidQuery} onValueChange={(v) => void runCidSearch(v)} />
                          <CommandList>
                            <CommandEmpty>Digite ao menos 2 caracteres.</CommandEmpty>
                            <CommandGroup>
                              {cid && (
                                <CommandItem value="__clear" onSelect={() => { setCid(null); setCidOpen(false); }}>
                                  Remover CID
                                </CommandItem>
                              )}
                              {cidList.map((c) => (
                                <CommandItem key={c.code} value={c.code} onSelect={() => { setCid(c); setCidOpen(false); }}>
                                  <span className="font-mono text-xs">{c.code}</span>
                                  <span className="ml-2 truncate">{c.description}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Observação / repouso (opcional)</Label>
                  <Input value={rest} onChange={(e) => setRest(e.target.value)} placeholder="Ex.: devendo permanecer em repouso domiciliar" />
                </div>
              </div>
            )}

            {docType === "declaracao" && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Das (hora)</Label>
                    <Input type="time" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Às (hora)</Label>
                    <Input type="time" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Acompanhante (opcional)</Label>
                    <Input value={companion} onChange={(e) => setCompanion(e.target.value)} placeholder="Nome" />
                  </div>
                </div>
              </div>
            )}

            {docType === "exames" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Exames (um por linha)</Label>
                  <Textarea
                    rows={5}
                    value={examsText}
                    onChange={(e) => setExamsText(e.target.value)}
                    placeholder={"Hemograma completo\nGlicemia de jejum\nTSH"}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Indicação clínica (opcional)</Label>
                  <Input value={clinicalIndication} onChange={(e) => setClinicalIndication(e.target.value)} />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Conteúdo do documento</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={regenerateFromFields}
                >
                  <RefreshCw className="mr-1 size-3.5" />
                  Gerar a partir dos campos
                </Button>
              </div>
              <RichTextEditor
                key={editorKey}
                value={bodyHtml}
                onChange={setBodyHtml}
                placeholder="Escreva o conteúdo do documento. Use a barra acima para formatar (fonte, tamanho, negrito, itálico, listas)."
              />
              <p className="text-[11px] text-muted-foreground">
                O PDF é gerado exatamente como escrito aqui, com a formatação aplicada.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="outline" onClick={() => void handleGeneratePdf()} disabled={generating || loading}>
            <FileDown className="mr-1 size-4" />
            Apenas visualizar
          </Button>
          <Button onClick={() => void handleSave()} disabled={generating || loading}>
            {generating ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Save className="mr-1 size-4" />}
            Gerar e salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
