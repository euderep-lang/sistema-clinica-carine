import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { toast } from "sonner";
import {
  maskCNPJ, maskPhone, maskCEP, fetchViaCEP,
  getTenantSetting, setTenantSetting, DEFAULT_HOURS, DAY_LABELS,
  type BusinessHours, type ClinicAddress,
} from "@/lib/settings-helpers";

export function SectionClinica() {
  const { tenant, refresh } = useAuth();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(""); const [tradeName, setTradeName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState(""); const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); const [whatsapp, setWhatsapp] = useState("");
  const [addr, setAddr] = useState<ClinicAddress>({});
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!tenant) return;
    (async () => {
      const { data } = await supabase.from("tenants").select("name,trade_name,cnpj,phone,email,logo_url").eq("id", tenant.id).maybeSingle();
      if (data) {
        setName(data.name ?? "");
        setTradeName(data.trade_name ?? "");
        setCnpj(data.cnpj ?? "");
        setPhone(data.phone ?? "");
        setEmail(data.email ?? "");
        setLogoUrl(data.logo_url ?? null);
      }
      const a = await getTenantSetting<ClinicAddress>(tenant.id, "address"); if (a) { setAddr(a); setWebsite(a.website ?? ""); setWhatsapp(a.whatsapp ?? ""); }
      const h = await getTenantSetting<BusinessHours>(tenant.id, "business_hours"); if (h) setHours(h);
    })();
  }, [tenant]);

  const onCEPBlur = async () => {
    if (!addr.cep) return;
    const r = await fetchViaCEP(addr.cep);
    if (r) setAddr((p) => ({ ...p, ...r }));
  };

  const setDay = (d: string, patch: Partial<BusinessHours[string]>) =>
    setHours((p) => ({ ...p, [d]: { ...p[d], ...patch } }));

  const uploadLogo = async (file: File) => {
    if (!tenant) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo deve ter no máximo 2MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${tenant.id}/logo.${ext}`;
      const { error } = await supabase.storage.from("tenant-assets").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("tenant-assets").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl ?? null;
      await supabase.from("tenants").update({ logo_url: url }).eq("id", tenant.id);
      setLogoUrl(url); toast.success("Logo atualizada"); refresh();
    } catch (e) {
      toast.error("Erro ao enviar logo: " + (e as Error).message);
    } finally { setUploading(false); }
  };

  const removeLogo = async () => {
    if (!tenant) return;
    await supabase.from("tenants").update({ logo_url: null }).eq("id", tenant.id);
    setLogoUrl(null); toast.success("Logo removida"); refresh();
  };

  const save = async () => {
    if (!tenant || !name) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tenants").update({
        name,
        trade_name: tradeName.trim() || null,
        cnpj,
        phone,
        email,
      }).eq("id", tenant.id);
      if (error) throw error;
      await setTenantSetting(tenant.id, "address", { ...addr, website, whatsapp });
      await setTenantSetting(tenant.id, "business_hours", hours);
      toast.success("Dados salvos"); refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Dados da Clínica</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Nome da clínica *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Nome fantasia</Label><Input value={tradeName} onChange={(e) => setTradeName(e.target.value)} placeholder="Nome comercial da clínica" /></div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>CNPJ</Label><Input value={cnpj} onChange={(e) => setCnpj(maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00" /></div>
            <div><Label>Telefone principal</Label><Input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" /></div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>WhatsApp</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(maskPhone(e.target.value))} /></div>
            <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          </div>
          <div><Label>Site</Label><Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." /></div>
          <div className="grid md:grid-cols-4 gap-3">
            <div><Label>CEP</Label><Input value={addr.cep ?? ""} onChange={(e) => setAddr((p) => ({ ...p, cep: maskCEP(e.target.value) }))} onBlur={onCEPBlur} placeholder="00000-000" /></div>
            <div className="md:col-span-2"><Label>Logradouro</Label><Input value={addr.logradouro ?? ""} onChange={(e) => setAddr((p) => ({ ...p, logradouro: e.target.value }))} /></div>
            <div><Label>Número</Label><Input value={addr.numero ?? ""} onChange={(e) => setAddr((p) => ({ ...p, numero: e.target.value }))} /></div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>Complemento</Label><Input value={addr.complemento ?? ""} onChange={(e) => setAddr((p) => ({ ...p, complemento: e.target.value }))} /></div>
            <div><Label>Bairro</Label><Input value={addr.bairro ?? ""} onChange={(e) => setAddr((p) => ({ ...p, bairro: e.target.value }))} /></div>
            <div><Label>Cidade</Label><Input value={addr.cidade ?? ""} onChange={(e) => setAddr((p) => ({ ...p, cidade: e.target.value }))} /></div>
          </div>
          <div className="grid md:grid-cols-4 gap-3">
            <div><Label>Estado (UF)</Label><Input maxLength={2} value={addr.estado ?? ""} onChange={(e) => setAddr((p) => ({ ...p, estado: e.target.value.toUpperCase() }))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Horário de funcionamento</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(hours).map(([d, h]) => (
            <div key={d} className="flex items-center gap-3 border rounded-md p-3">
              <div className="w-16 font-medium">{DAY_LABELS[d]}</div>
              <Switch checked={h.active} onCheckedChange={(v) => setDay(d, { active: v })} />
              <span className="text-sm text-muted-foreground w-20">{h.active ? "Aberto" : "Fechado"}</span>
              {h.active && (
                <>
                  <Label className="text-xs">Abertura</Label>
                  <Input type="time" className="w-32" value={h.open} onChange={(e) => setDay(d, { open: e.target.value })} />
                  <Label className="text-xs">Fechamento</Label>
                  <Input type="time" className="w-32" value={h.close} onChange={(e) => setDay(d, { close: e.target.value })} />
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Logo da clínica</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="h-24 w-24 rounded-lg border bg-muted grid place-items-center overflow-hidden">
            {logoUrl ? <img src={logoUrl} alt="logo" className="h-full w-full object-contain" /> : <span className="text-2xl font-bold text-muted-foreground">{initials || "?"}</span>}
          </div>
          <div className="flex-1 space-y-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            <Button variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {logoUrl ? "Trocar logo" : "Enviar logo"}
            </Button>
            {logoUrl && <Button variant="ghost" onClick={removeLogo}><Trash2 className="h-4 w-4 mr-2" />Remover logo</Button>}
            <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Máx 2MB.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={save} disabled={saving || !name}>Salvar Alterações</Button></div>
    </div>
  );
}