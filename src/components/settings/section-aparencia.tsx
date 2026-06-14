import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { toast } from "sonner";
import { applyThemeColors, FONT_OPTIONS, applyFont, getTenantSetting, setTenantSetting, loadGoogleFont } from "@/lib/settings-helpers";

const DEFAULT_PRIMARY = "#1a2b4a";
const DEFAULT_SECONDARY = "#0ea5e9";

export function SectionAparencia() {
  const { tenant, refresh } = useAuth();
  const [primary, setPrimary] = useState(DEFAULT_PRIMARY);
  const [secondary, setSecondary] = useState(DEFAULT_SECONDARY);
  const [font, setFont] = useState("system");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!tenant) return;
    setPrimary(tenant.primary_color || DEFAULT_PRIMARY);
    setSecondary(tenant.secondary_color || DEFAULT_SECONDARY);
    getTenantSetting<string>(tenant.id, "font_preference").then((f) => f && setFont(f));
    FONT_OPTIONS.forEach((o) => "google" in o && o.google && loadGoogleFont(o.id));
  }, [tenant]);

  const reset = () => { setPrimary(DEFAULT_PRIMARY); setSecondary(DEFAULT_SECONDARY); };

  const save = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      await supabase.from("tenants").update({ primary_color: primary, secondary_color: secondary }).eq("id", tenant.id);
      await setTenantSetting(tenant.id, "font_preference", font);
      applyThemeColors(primary, secondary); applyFont(font);
      toast.success("Aparência salva"); refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Cores</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Cor Primária</Label>
              <div className="flex gap-2 mt-1">
                <Input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-10 w-16 p-1" />
                <Input value={primary} onChange={(e) => setPrimary(e.target.value)} className="flex-1" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Usada na barra lateral, botões principais e elementos de destaque.</p>
            </div>
            <div>
              <Label>Cor secundária / destaque</Label>
              <div className="flex gap-2 mt-1">
                <Input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="h-10 w-16 p-1" />
                <Input value={secondary} onChange={(e) => setSecondary(e.target.value)} className="flex-1" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Usada em badges, links e destaques secundários.</p>
            </div>
            <Button variant="outline" onClick={reset}>Restaurar Cores Padrão</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tipografia</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {FONT_OPTIONS.map((opt) => (
                <button key={opt.id} type="button" onClick={() => setFont(opt.id)}
                  className={`relative rounded-lg border p-4 text-left transition hover:bg-muted/50 ${font === opt.id ? "border-primary ring-2 ring-primary/30" : ""}`}>
                  {font === opt.id && <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground grid place-items-center"><Check className="h-3 w-3" /></div>}
                  <div className="text-xs text-muted-foreground mb-1">{opt.label}</div>
                  <div className="text-lg font-semibold" style={{ fontFamily: opt.stack }}>Aa Bb Cc</div>
                  <div className="text-xs mt-1" style={{ fontFamily: opt.stack }}>A rápida raposa marrom</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end"><Button onClick={save} disabled={saving}>Salvar Aparência</Button></div>
      </div>

      <div>
        <Card>
          <CardHeader><CardTitle>Prévia da aparência</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden" style={{ background: "#f8fafc" }}>
              <div className="flex h-72">
                <div className="w-48 text-white p-3 space-y-1" style={{ background: primary, fontFamily: FONT_OPTIONS.find((f) => f.id === font)?.stack }}>
                  <div className="text-sm font-semibold mb-3">{tenant?.name ?? "Sua Clínica"}</div>
                  <div className="px-2 py-1.5 rounded text-sm opacity-80">Painel</div>
                  <div className="px-2 py-1.5 rounded text-sm opacity-80">Agenda</div>
                  <div className="px-2 py-1.5 rounded text-sm font-medium" style={{ background: secondary }}>Pacientes</div>
                  <div className="px-2 py-1.5 rounded text-sm opacity-80">Financeiro</div>
                </div>
                <div className="flex-1 p-4 space-y-3" style={{ fontFamily: FONT_OPTIONS.find((f) => f.id === font)?.stack }}>
                  <div className="font-semibold text-slate-800">Página de exemplo</div>
                  <button className="px-3 py-2 rounded text-white text-sm font-medium" style={{ background: primary }}>Botão Primário</button>
                  <div><Badge style={{ background: secondary, color: "#fff" }}>Etiqueta</Badge></div>
                  <a className="text-sm underline" style={{ color: secondary }}>Link de exemplo</a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}