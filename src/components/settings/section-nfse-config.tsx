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
  codigo_nbs: string;
  codigo_tributacao_nacional_iss: string;
  codigo_tributacao_municipal_iss: string;
  dps_serie: string;
  opcao_simples_nacional: string;
  regime_especial_tributacao: string;
  percentual_total_tributos_simples_nacional: string;
  iss_retido: boolean;
  discriminacao_padrao: string;
  item_lista_servico: string;
  codigo_tributario_municipio: string;
  aliquota: string;
}

const EMPTY: NfseConfig = {
  cnpj: "",
  inscricao_municipal: "",
  codigo_municipio: "",
  codigo_nbs: "",
  codigo_tributacao_nacional_iss: "040101",
  codigo_tributacao_municipal_iss: "",
  dps_serie: "900",
  opcao_simples_nacional: "3",
  regime_especial_tributacao: "0",
  percentual_total_tributos_simples_nacional: "8.42",
  iss_retido: false,
  discriminacao_padrao: "Prestação de serviços de saúde",
  item_lista_servico: "0401",
  codigo_tributario_municipio: "",
  aliquota: "2",
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
      const saved = await getTenantSetting<Partial<NfseConfig> & { aliquota?: number | string }>(
        tenant.id,
        "nfse",
      );
      if (saved) {
        setCfg({
          ...EMPTY,
          ...saved,
          aliquota: saved.aliquota != null ? String(saved.aliquota) : EMPTY.aliquota,
          iss_retido: Boolean(saved.iss_retido),
          opcao_simples_nacional: String(
            saved.opcao_simples_nacional ?? EMPTY.opcao_simples_nacional,
          ),
          regime_especial_tributacao: String(
            saved.regime_especial_tributacao ?? EMPTY.regime_especial_tributacao,
          ),
        } as NfseConfig);
      } else {
        setCfg(EMPTY);
      }
      setLoading(false);
    })();
  }, [open, tenant]);

  const save = async () => {
    if (!tenant) return;
    if (!cfg.cnpj || !cfg.inscricao_municipal || !cfg.codigo_municipio) {
      toast.error("Preencha CNPJ, inscrição municipal e código IBGE do município.");
      return;
    }
    if (cfg.codigo_nbs.replace(/\D/g, "").length !== 9) {
      toast.error("Código NBS deve ter 9 dígitos (pode colar com pontos).");
      return;
    }
    if (cfg.codigo_tributacao_nacional_iss.replace(/\D/g, "").length < 6) {
      toast.error("Informe o código de tributação nacional ISS (cTribNac), ex.: 040101.");
      return;
    }
    const tribMunDigits = cfg.codigo_tributacao_municipal_iss.replace(/\D/g, "");
    if (tribMunDigits.length > 0 && tribMunDigits.length !== 3) {
      toast.error(
        "cTribMun deve ter exatamente 3 dígitos ou ficar vazio. Não use o cTribNac (040101) aqui.",
      );
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
          <DialogTitle>Configurar NFS-e (Emissor Nacional)</DialogTitle>
          <DialogDescription>
            A prefeitura emite pelo Ambiente Nacional da NFS-e (Focus{" "}
            <code>/v2/nfsen</code>). Habilite “Ambiente da NFSe Nacional” na empresa, no painel
            Focus. Token: <code>FOCUS_NFE_TOKEN</code> e <code>FOCUS_NFE_ENV</code> na Vercel.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">CNPJ *</Label>
              <Input
                value={cfg.cnpj}
                onChange={(e) => set({ cnpj: e.target.value })}
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Inscrição municipal *</Label>
              <Input
                value={cfg.inscricao_municipal}
                onChange={(e) => set({ inscricao_municipal: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Código do município (IBGE) *</Label>
              <Input
                value={cfg.codigo_municipio}
                onChange={(e) => set({ codigo_municipio: e.target.value })}
                placeholder="Ex.: 3130903"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Código NBS (9 dígitos) *</Label>
              <Input
                value={cfg.codigo_nbs}
                onChange={(e) => set({ codigo_nbs: e.target.value })}
                placeholder="Ex.: 1.2301.22.00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">cTribNac (tributação nacional ISS) *</Label>
              <Input
                value={cfg.codigo_tributacao_nacional_iss}
                onChange={(e) => set({ codigo_tributacao_nacional_iss: e.target.value })}
                placeholder="Ex.: 040101"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">cTribMun (3 dígitos — deixe vazio na maioria dos casos)</Label>
              <Input
                value={cfg.codigo_tributacao_municipal_iss}
                onChange={(e) => set({ codigo_tributacao_municipal_iss: e.target.value })}
                placeholder="Vazio (não use 040101 — esse é o cTribNac)"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Série da DPS</Label>
              <Input
                value={cfg.dps_serie}
                onChange={(e) => set({ dps_serie: e.target.value })}
                placeholder="900"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Simples Nacional (1=não, 2=MEI, 3=ME/EPP)</Label>
              <Input
                value={cfg.opcao_simples_nacional}
                onChange={(e) => set({ opcao_simples_nacional: e.target.value })}
                placeholder="3"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Regime especial (0=nenhum — use 0 na maioria dos casos)</Label>
              <Input
                value={cfg.regime_especial_tributacao}
                onChange={(e) => set({ regime_especial_tributacao: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">% total de tributos SN (pTotTribSN)</Label>
              <Input
                value={cfg.percentual_total_tributos_simples_nacional}
                onChange={(e) =>
                  set({ percentual_total_tributos_simples_nacional: e.target.value })
                }
                placeholder="8.42"
              />
            </div>
            <label className="flex items-center gap-2 pt-1 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={cfg.iss_retido}
                onChange={(e) => set({ iss_retido: e.target.checked })}
              />
              ISS retido na fonte (pelo tomador)
            </label>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Discriminação padrão</Label>
              <Textarea
                rows={2}
                value={cfg.discriminacao_padrao}
                onChange={(e) => set({ discriminacao_padrao: e.target.value })}
              />
            </div>
            <p className="text-[11px] text-muted-foreground sm:col-span-2">
              Medicina (LC 116 item 04.01) costuma usar cTribNac <code>040101</code>. Confirme NBS e
              alíquota com o contador — o ISS agora é calculado pelo Emissor Nacional.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={saving || loading}>
            {saving && <Loader2 className="mr-1 size-4 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
