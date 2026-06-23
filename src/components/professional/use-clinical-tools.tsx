import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Brain,
  Download,
  FileSearch,
  FlaskConical,
  Link2,
  Loader2,
  Share2,
  type LucideIcon,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createExamRequest,
  createPreRegistrationLink,
  interpretExamText,
  requestPatientDataExport,
  shareClinicalRecord,
  summarizePatientRecord,
} from "@/lib/platform.functions";
import { supabase } from "@/integrations/supabase/client";

export type ClinicalToolBarItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  onClick: () => void;
};

export function useClinicalTools(patientId: string, patientName: string) {
  const summaryFn = useServerFn(summarizePatientRecord);
  const examFn = useServerFn(createExamRequest);
  const interpretFn = useServerFn(interpretExamText);
  const exportFn = useServerFn(requestPatientDataExport);
  const shareFn = useServerFn(shareClinicalRecord);
  const preRegFn = useServerFn(createPreRegistrationLink);

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [examOpen, setExamOpen] = useState(false);
  const [examList, setExamList] = useState("");
  const [examIndication, setExamIndication] = useState("");
  const [interpretOpen, setInterpretOpen] = useState(false);
  const [interpretText, setInterpretText] = useState("");
  const [interpretResult, setInterpretResult] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareWithId, setShareWithId] = useState("");
  const [professionals, setProfessionals] = useState<{ id: string; full_name: string }[]>([]);

  const loadSummary = async () => {
    setSummaryLoading(true);
    setSummaryOpen(true);
    try {
      const res = await summaryFn({ data: patientId });
      setSummary((res as { summary: string }).summary);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const submitExam = async () => {
    const exams = examList.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    if (!exams.length) {
      toast.error("Informe ao menos um exame.");
      return;
    }
    try {
      await examFn({
        data: { patientId, exams, clinicalIndication: examIndication || undefined },
      });
      toast.success("Solicitação de exames registrada.");
      setExamOpen(false);
      setExamList("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const runInterpret = async () => {
    try {
      const res = await interpretFn({
        data: { text: interpretText, patientContext: patientName },
      });
      setInterpretResult((res as { interpretation: string }).interpretation);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const exportData = async () => {
    try {
      const data = await exportFn({ data: patientId });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `paciente-${patientId.slice(0, 8)}-lgpd.json`;
      a.click();
      toast.success("Exportação LGPD concluída.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const openShare = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "professional")
      .order("full_name");
    setProfessionals((data ?? []) as { id: string; full_name: string }[]);
    setShareOpen(true);
  };

  const submitShare = async () => {
    if (!shareWithId) return;
    try {
      await shareFn({
        data: { patientId, sharedWithProfessionalId: shareWithId },
      });
      toast.success("Prontuário compartilhado.");
      setShareOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const copyPreRegLink = async () => {
    try {
      const res = await preRegFn({ data: { patientId } });
      const url = `${window.location.origin}${(res as { url: string }).url}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link de pré-cadastro copiado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const barItems: ClinicalToolBarItem[] = [
    {
      key: "summary",
      label: "Resumo IA",
      icon: Brain,
      iconClass: "text-violet-600",
      onClick: () => void loadSummary(),
    },
    {
      key: "exam",
      label: "Solicitar exames",
      icon: FlaskConical,
      iconClass: "text-sky-600",
      onClick: () => setExamOpen(true),
    },
    {
      key: "interpret",
      label: "Interpretar laudo",
      icon: FileSearch,
      iconClass: "text-amber-600",
      onClick: () => setInterpretOpen(true),
    },
    {
      key: "share",
      label: "Compartilhar",
      icon: Share2,
      iconClass: "text-blue-600",
      onClick: () => void openShare(),
    },
    {
      key: "export",
      label: "Exportar LGPD",
      icon: Download,
      iconClass: "text-muted-foreground",
      onClick: () => void exportData(),
    },
    {
      key: "prereg",
      label: "Link pré-cadastro",
      icon: Link2,
      iconClass: "text-muted-foreground",
      onClick: () => void copyPreRegLink(),
    },
  ];

  const dialogs = (
    <>
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resumo do prontuário</DialogTitle>
          </DialogHeader>
          {summaryLoading ? (
            <Loader2 className="mx-auto size-5 animate-spin" />
          ) : (
            <p className="whitespace-pre-wrap text-sm">{summary}</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={examOpen} onOpenChange={setExamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar exames</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Exames (separados por vírgula ou linha)</Label>
              <Textarea value={examList} onChange={(e) => setExamList(e.target.value)} rows={3} />
            </div>
            <div>
              <Label>Indicação clínica</Label>
              <Input value={examIndication} onChange={(e) => setExamIndication(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void submitExam()}>Registrar solicitação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={interpretOpen} onOpenChange={setInterpretOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Interpretação de exame (IA)</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Cole o texto do laudo…"
            value={interpretText}
            onChange={(e) => setInterpretText(e.target.value)}
            rows={6}
          />
          {interpretResult && (
            <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
              {interpretResult}
            </p>
          )}
          <DialogFooter>
            <Button onClick={() => void runInterpret()} disabled={!interpretText.trim()}>
              Interpretar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar prontuário</DialogTitle>
          </DialogHeader>
          <Label>Profissional</Label>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={shareWithId}
            onChange={(e) => setShareWithId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
          <DialogFooter>
            <Button onClick={() => void submitShare()} disabled={!shareWithId}>
              Compartilhar evoluções
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return { barItems, dialogs };
}
