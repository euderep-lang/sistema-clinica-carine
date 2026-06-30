import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import {
  getTenantSetting,
  isLegacySpecialtyList,
  resolveSpecialties,
  setTenantSetting,
} from "@/lib/settings-helpers";

const PROFESSION_SUGGESTIONS = [
  "Médico(a)",
  "Dentista",
  "Psicólogo(a)",
  "Nutricionista",
  "Fisioterapeuta",
  "Biomédico(a)",
  "Enfermeiro(a)",
  "Farmacêutico(a)",
  "Fonoaudiólogo(a)",
  "Terapeuta Ocupacional",
];

export function SectionPerfilProfissional() {
  const { profile, refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profession, setProfession] = useState("");
  const [council, setCouncil] = useState("");
  const [specialtiesSel, setSpecialtiesSel] = useState<string[]>([]);
  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([]);

  const toggleSpecialty = (s: string) =>
    setSpecialtiesSel((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const [{ data, error }, stored] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, display_name, profession, crm, specialty, specialties")
          .eq("id", profile.id)
          .maybeSingle(),
        getTenantSetting<string[]>(profile.tenant_id, "specialties"),
      ]);

      if (error) {
        toast.error(error.message);
      } else if (data) {
        setFullName(data.full_name ?? "");
        setDisplayName((data as { display_name?: string | null }).display_name ?? "");
        setProfession((data as { profession?: string | null }).profession ?? "");
        setCouncil(data.crm ?? "");
        const specs = (data as { specialties?: string[] | null }).specialties;
        setSpecialtiesSel(specs ?? (data.specialty ? [data.specialty] : []));
      }

      const resolved = resolveSpecialties(stored);
      setSpecialtyOptions(resolved);
      if (stored && isLegacySpecialtyList(stored)) {
        await setTenantSetting(profile.tenant_id, "specialties", resolved);
      }

      setLoading(false);
    })();
  }, [profile]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          profession: profession.trim() || null,
          crm: council.trim() || null,
          specialty: specialtiesSel[0] ?? null,
          specialties: specialtiesSel.length > 0 ? specialtiesSel : null,
        })
        .eq("id", profile.id);
      if (error) throw new Error(error.message);
      await refresh();
      toast.success("Perfil atualizado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Carregando…
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meu perfil profissional</CardTitle>
        <CardDescription>
          Nome de exibição, profissão e conselho aparecem em receitas, documentos e mensagens de WhatsApp.
          A especialidade não é exibida nos documentos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Nome completo</Label>
          <Input value={fullName} disabled />
          <p className="mt-1 text-xs text-muted-foreground">
            Para alterar o nome completo, peça ao administrador da clínica.
          </p>
        </div>

        <div>
          <Label>Como gostaria de ser chamado</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ex.: Dra. Carine"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Usado em WhatsApp, receitas e documentos.
          </p>
        </div>

        <div>
          <Label>Profissão</Label>
          <Input
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
            placeholder="Ex.: Médica, Dentista, Nutricionista…"
            list="profession-suggestions-self"
          />
          <datalist id="profession-suggestions-self">
            {PROFESSION_SUGGESTIONS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        <div>
          <Label>Conselho</Label>
          <Input
            value={council}
            onChange={(e) => setCouncil(e.target.value)}
            placeholder="Ex.: CRM-MG 12345, CRO-SP 9999, CRN…"
          />
        </div>

        <div>
          <Label>
            Especialidade(s) <span className="text-muted-foreground">(opcional)</span>
          </Label>
          {specialtyOptions.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Nenhuma especialidade cadastrada na clínica. Peça ao administrador para adicionar em
              Configurações → Especialidades.
            </p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {specialtyOptions.map((s) => {
                const selected = specialtiesSel.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpecialty(s)}
                    className={
                      selected
                        ? "rounded-full border border-teal-300 bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-800"
                        : "rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                    }
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
