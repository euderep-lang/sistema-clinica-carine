import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/mock-auth";
import { getTenantSetting, setTenantSetting } from "@/lib/settings-helpers";

interface NfseConfig {
  cnpj: string;
  inscricao_municipal: string;
  codigo_municipio: string;
  item_lista_servico: string;
  codigo_tributario_municipio: string;
  aliquota: string;
  iss_retido: boolean;
  discriminacao_padrao: string;
}

const EMPTY: NfseConfig = {
  cnpj: "",
  inscricao_municipal: "",
  codigo_municipio: "",
  item_lista_servico: "",
  codigo_tributario_municipio: "",
  aliquota: "2",
  iss_retido: false,
  discriminacao_padrao: "Prestação de serviços de saúde",
};

export function SectionNfseConfig({ trigger }: { trigger: React.ReactNode }) {
  const { tenant } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<NfseConfig>(EMPTY);

  useEffect(() => {
    if (!open || !tenant) return;
    setLoading(true);
    (async () => {
      const saved = await getTenantSetting<Partial<NfseConfig> & { aliquota?: number | string }>(tenant.id, "nfse");
      if (saved) {
        setCfg({
          ...EMPTY,
          ...saved,
          aliquota: saved.aliquota != null ? String(saved.aliquota) : EMPTY.aliquota,
          iss_retido: Boolean(saved.iss_retido),
        } as NfseConfig);
      } else {
        setCfg(EMPTY);
      }
      setLoading(false);
    })();
  }, [open, tenant]);

  const save = async () => {
    if (!tenant) return;
    if (!cfg.cnpj || !cfg.inscricao_municipal || !cfg.codigo_municipio || !cfg.item_lista_servico) {
      toast.error("Preencha CNPJ, inscrição municipal, código do município e item da lista de serviço.");
      return;
    }
    setSaving(true);
    try {
      await setTenantSetting(tenant.id, "nfse", {
        ...cfg,
        aliquota: Number(cfg.aliquota) || 0,
      });
      toast.success("Configuração de NFS-e salva.");
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const set = (patch: Partial<NfseConfig>) => setCfg((c) => ({ ...c, ...patch }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar NFS-e (Focus NFe)</DialogTitle>
          <DialogDescription>
            Dados do prestador para emissão. O token da Focus NFe é configurado na Vercel
            (variáveis <code>FOCUS_NFE_TOKEN</code> e <code>FOCUS_NFE_ENV</code>).
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">CNPJ *</Label>
              <Input value={cfg.cnpj} onChange={(e) => set({ cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Inscrição municipal *</Label>
              <Input value={cfg.inscricao_municipal} onChange={(e) => set({ inscricao_municipal: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Código do município (IBGE) *</Label>
              <Input value={cfg.codigo_municipio} onChange={(e) => set({ codigo_municipio: e.target.value })} placeholder="Ex.: 3550308" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Item lista de serviço *</Label>
              <Input value={cfg.item_lista_servico} onChange={(e) => set({ item_lista_servico: e.target.value })} placeholder="Ex.: 0401" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Código tributário do município</Label>
              <Input value={cfg.codigo_tributario_municipio} onChange={(e) => set({ codigo_tributario_municipio: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Alíquota ISS (%)</Label>
              <Input type="number" step="0.01" value={cfg.aliquota} onChange={(e) => set({ aliquota: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 pt-1 text-sm sm:col-span-2">
              <input type="checkbox" checked={cfg.iss_retido} onChange={(e) => set({ iss_retido: e.target.checked })} />
              ISS retido na fonte
            </label>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Discriminação padrão</Label>
              <Textarea rows={2} value={cfg.discriminacao_padrao} onChange={(e) => set({ discriminacao_padrao: e.target.value })} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => void save()} disabled={saving || loading}>
            {saving && <Loader2 className="mr-1 size-4 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
