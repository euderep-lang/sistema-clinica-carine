import { useEffect, useState } from "react";
import { todayISO, fmtDate } from "@/lib/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { parseBRLInput, fmt } from "@/lib/currency";
import { activePaymentMethods, getCachedPaymentMethodConfigs, loadPaymentMethodConfigs } from "@/lib/payment-methods";
import { maskCPF } from "@/lib/patient-utils";

interface Patient { id: string; full_name: string; cpf: string | null; }
interface Pro { id: string; full_name: string; }
interface Appt { id: string; date: string; professional_id: string | null; }

export function NewBillReceivableDialog({ open, onOpenChange, onSaved, defaultPatientId }: {
  open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void; defaultPatientId?: string;
}) {
  const { tenant } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pros, setPros] = useState<Pro[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [patientId, setPatientId] = useState(defaultPatientId ?? "");
  const [proId, setProId] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [method, setMethod] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [apptId, setApptId] = useState("");
  const [patientOpen, setPatientOpen] = useState(false);
  const [psearch, setPsearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [methods, setMethods] = useState(() =>
    activePaymentMethods(getCachedPaymentMethodConfigs()),
  );

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: pts } = await supabase.from("patients").select("id, full_name, cpf").eq("active", true).order("full_name");
      setPatients((pts ?? []) as Patient[]);
      const { data: prs } = await supabase.from("profiles").select("id, full_name").eq("role", "professional").order("full_name");
      setPros((prs ?? []) as Pro[]);
      try {
        const configs = await loadPaymentMethodConfigs();
        setMethods(activePaymentMethods(configs));
      } catch (e) {
        toast.error((e as Error).message);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!patientId) { setAppts([]); return; }
    (async () => {
      const { data } = await supabase.from("appointments").select("id, date, professional_id").eq("patient_id", patientId).order("date", { ascending: false }).limit(20);
      setAppts((data ?? []) as Appt[]);
    })();
  }, [patientId]);

  useEffect(() => {
    if (!apptId) return;
    const appt = appts.find((a) => a.id === apptId);
    if (appt?.professional_id) setProId(appt.professional_id);
  }, [apptId, appts]);

  const save = async () => {
    if (!tenant) return;
    if (!patientId || !proId || !desc || !amount || !dueDate) {
      toast.error("Preencha paciente, profissional e demais campos obrigatórios");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("bills_receivable" as never).insert({
      tenant_id: tenant.id, patient_id: patientId, professional_id: proId,
      appointment_id: apptId || null, description: desc, amount: parseBRLInput(amount),
      due_date: dueDate, payment_method: method || null, notes: notes || null, status: "pending",
    } as never);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Cobrança criada");
    onOpenChange(false);
    onSaved();
  };

  const patient = patients.find((p) => p.id === patientId);
  const filtered = patients.filter((p) => !psearch || p.full_name.toLowerCase().includes(psearch.toLowerCase()) || (p.cpf ?? "").includes(psearch)).slice(0, 30);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova cobrança</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Paciente *</Label>
            <Popover open={patientOpen} onOpenChange={setPatientOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal">{patient ? patient.full_name : "Selecionar..."}</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Buscar..." value={psearch} onValueChange={setPsearch} />
                  <CommandList><CommandEmpty>Nenhum</CommandEmpty><CommandGroup>
                    {filtered.map((p) => (
                      <CommandItem key={p.id} value={p.id} onSelect={() => { setPatientId(p.id); setPatientOpen(false); }}>
                        <div><div className="font-medium">{p.full_name}</div>{p.cpf && <div className="text-xs text-muted-foreground">{maskCPF(p.cpf)}</div>}</div>
                      </CommandItem>
                    ))}
                  </CommandGroup></CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div><Label>Profissional *</Label>
            <Select value={proId} onValueChange={setProId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{pros.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Descrição *</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor *</Label><Input placeholder="R$ 0,00" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><Label>Vencimento *</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <div><Label>Forma de pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{methods.map((m) => <SelectItem key={m.value} value={m.value}>{m.icon} {m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {appts.length > 0 && (
            <div><Label>Vincular a agendamento</Label>
              <Select value={apptId} onValueChange={setApptId}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>{appts.map((a) => <SelectItem key={a.id} value={a.id}>{fmtDate(a.date)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Observações</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          <div className="text-sm text-muted-foreground">Total: <strong>{fmt(parseBRLInput(amount))}</strong></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}