import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { Activity, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getPreRegistrationByToken, submitPreRegistration } from "@/lib/platform.functions";

export const Route = createFileRoute("/pre-cadastro/$token")({
  component: PreCadastroPage,
});

function PreCadastroPage() {
  const { token } = Route.useParams();
  const loadFn = useServerFn(getPreRegistrationByToken);
  const submitFn = useServerFn(submitPreRegistration);
  const [loading, setLoading] = useState(true);
  const [clinicName, setClinicName] = useState("");
  const [done, setDone] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await loadFn({ data: token });
        const row = data as {
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          birth_date?: string | null;
          cpf?: string | null;
          health_notes?: string | null;
          tenants?: { name: string } | null;
        };
        setClinicName(row.tenants?.name ?? "Clínica");
        if (row.full_name) setFullName(row.full_name);
        if (row.email) setEmail(row.email);
        if (row.phone) setPhone(row.phone);
        if (row.birth_date) setBirthDate(row.birth_date);
        if (row.cpf) setCpf(row.cpf);
        if (row.health_notes) setHealthNotes(row.health_notes);
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, loadFn]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitFn({
        data: {
          token,
          full_name: fullName,
          email,
          phone,
          birth_date: birthDate || undefined,
          cpf,
          health_notes: healthNotes,
        },
      });
      setDone(true);
      toast.success("Pré-cadastro enviado. Obrigado!");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold">Pré-cadastro</h1>
            <p className="text-sm text-muted-foreground">{clinicName}</p>
          </div>
        </div>

        {done ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm">
            Seus dados foram recebidos. Nos vemos na consulta!
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              Preencha antes da consulta para agilizar seu atendimento.
            </p>
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data de nascimento</Label>
                <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={cpf} onChange={(e) => setCpf(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Queixas / medicamentos / alergias</Label>
              <Textarea
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                rows={4}
                placeholder="Conte-nos o que é importante para a consulta…"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : "Enviar pré-cadastro"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
