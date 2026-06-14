import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, RefreshCw, Copy, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_APPOINTMENT_TYPES } from "@/lib/appointment-types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { createTenantUser, getTenantUserEmail, resetTenantUserPassword } from "@/lib/admin-users.functions";
import {
  getTenantSetting,
  isLegacySpecialtyList,
  maskPhone,
  resolveSpecialties,
  setTenantSetting,
} from "@/lib/settings-helpers";
import { isValidCPF, maskCPF } from "@/lib/patient-utils";
import { toast } from "sonner";

type Role = "admin" | "receptionist" | "professional" | "financial";

const ROLE_LABEL: Record<Role, string> = { admin: "Administrador", receptionist: "Recepcionista", professional: "Profissional", financial: "Financeiro" };
const ROLE_CLASS: Record<Role, string> = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  receptionist: "bg-blue-100 text-blue-700 border-blue-200",
  professional: "bg-teal-100 text-teal-700 border-teal-200",
  financial: "bg-amber-100 text-amber-700 border-amber-200",
};

interface Row {
  id: string;
  full_name: string;
  role: Role;
  specialty: string | null;
  crm: string | null;
  cpf: string | null;
  phone: string | null;
  active: boolean;
  commission_pct: number | null;
  email?: string;
}

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz!@#$";
  let p = ""; for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)]; return p;
}

export function SectionUsuarios() {
  const { profile } = useAuth();
  const create = useServerFn(createTenantUser);
  const fetchEmail = useServerFn(getTenantUserEmail);
  const resetPassword = useServerFn(resetTenantUserPassword);
  const [rows, setRows] = useState<Row[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [tempPwd, setTempPwd] = useState<string | null>(null);
  const [pwdContext, setPwdContext] = useState<"created" | "reset" | null>(null);
  const [resetPwd, setResetPwd] = useState(genPassword());

  // form
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [password, setPassword] = useState(genPassword());
  const [role, setRole] = useState<Role>("receptionist");
  const [specialty, setSpecialty] = useState(""); const [crm, setCrm] = useState(""); const [cpf, setCpf] = useState("");
  const [commission, setCommission] = useState(0); const [phone, setPhone] = useState("");
  const [active, setActive] = useState(true); const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id,full_name,role,specialty,crm,cpf,phone,active,commission_pct")
      .order("full_name");
    setRows((data ?? []) as Row[]);
  };

  const loadSpecialties = async () => {
    if (!profile) return;
    const stored = await getTenantSetting<string[]>(profile.tenant_id, "specialties");
    const resolved = resolveSpecialties(stored);
    setSpecialties(resolved);
    if (stored && isLegacySpecialtyList(stored)) {
      await setTenantSetting(profile.tenant_id, "specialties", resolved);
    }
  };

  useEffect(() => {
    load();
    void loadSpecialties();
  }, [profile]);

  const openNew = () => {
    setEditing(null); setName(""); setEmail(""); setPassword(genPassword());
    setRole("receptionist"); setSpecialty(""); setCrm(""); setCpf(""); setCommission(0); setPhone("");
    setActive(true); setTempPwd(null); setPwdContext(null); setResetPwd(genPassword());
    void loadSpecialties();
    setOpen(true);
  };
  const openEdit = async (r: Row) => {
    setEditing(r); setName(r.full_name); setEmail(""); setRole(r.role);
    setSpecialty(r.specialty ?? ""); setCrm(r.crm ?? ""); setCpf(r.cpf ? maskCPF(r.cpf) : "");
    setCommission(Number(r.commission_pct ?? 0));
    setPhone(r.phone ?? ""); setActive(r.active); setTempPwd(null); setPwdContext(null);
    setResetPwd(genPassword());
    void loadSpecialties();
    setOpen(true);
    try {
      const { email: userEmail } = await fetchEmail({ data: { user_id: r.id } });
      setEmail(userEmail);
    } catch (e) {
      setEmail("");
      toast.error((e as Error).message);
    }
  };

  const save = async () => {
    if (!name) { toast.error("Nome obrigatório"); return; }
    if (role === "professional") {
      if (!cpf.replace(/\D/g, "")) { toast.error("CPF é obrigatório para profissionais"); return; }
      if (!isValidCPF(cpf)) { toast.error("CPF inválido"); return; }
    }
    setBusy(true);
    try {
      if (editing) {
        if (editing.id === profile?.id && role !== editing.role) throw new Error("Você não pode mudar seu próprio cargo");
        const { error } = await supabase.from("profiles").update({
          full_name: name, role, phone, active,
          specialty: role === "professional" ? specialty : null,
          crm: role === "professional" ? crm : null,
          cpf: role === "professional" ? cpf.replace(/\D/g, "") : null,
          commission_pct: role === "professional" ? commission : 0,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Usuário atualizado"); setOpen(false); load();
      } else {
        if (!email) { toast.error("E-mail obrigatório"); setBusy(false); return; }
        await create({
          data: {
            email, password, full_name: name, role, phone, specialty, crm, cpf,
            commission_pct: commission, active,
            appointment_types: role === "professional" ? [...DEFAULT_APPOINTMENT_TYPES] : null,
          },
        });
        setTempPwd(password);
        setPwdContext("created");
        load();
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const applyPasswordReset = async () => {
    if (!editing) return;
    if (!resetPwd || resetPwd.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setBusy(true);
    try {
      await resetPassword({ data: { user_id: editing.id, password: resetPwd } });
      setTempPwd(resetPwd);
      setPwdContext("reset");
      toast.success("Senha redefinida");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (r: Row) => {
    await supabase.from("profiles").update({ active: !r.active }).eq("id", r.id);
    toast.success(r.active ? "Desativado" : "Reativado"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Usuário</Button></div>
      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead></TableHead><TableHead>Nome</TableHead><TableHead>Cargo</TableHead>
            <TableHead>Especialidade</TableHead><TableHead>CRM</TableHead>
            <TableHead>Situação</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Avatar className="h-8 w-8"><AvatarFallback>{r.full_name.split(" ").slice(0,2).map(s=>s[0]).join("")}</AvatarFallback></Avatar></TableCell>
                <TableCell className="font-medium">{r.full_name}</TableCell>
                <TableCell><Badge variant="outline" className={ROLE_CLASS[r.role]}>{ROLE_LABEL[r.role]}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.specialty ?? "-"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.crm ?? "-"}</TableCell>
                <TableCell><Badge variant="outline" className={r.active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}>{r.active ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(r)}>{r.active ? "Desativar" : "Reativar"}</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle></DialogHeader>
          {tempPwd ? (
            <div className="space-y-3">
              <DialogDescription>
                {pwdContext === "reset"
                  ? "Senha redefinida. Compartilhe a nova senha com o usuário para ele entrar em /login."
                  : "Usuário criado com sucesso. O acesso é feito com o e-mail cadastrado e a senha abaixo em /login."}
              </DialogDescription>
              {email && (
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">E-mail de acesso: </span>
                  <span className="font-medium">{email}</span>
                </div>
              )}
              <div className="border rounded-md p-3 bg-muted flex items-center justify-between">
                <code className="font-mono text-sm">{tempPwd}</code>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(tempPwd); toast.success("Copiada"); }}><Copy className="h-4 w-4 mr-1" />Copiar</Button>
              </div>
              <DialogFooter><Button onClick={() => setOpen(false)}>Fechar</Button></DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <div><Label>Nome completo *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div>
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  value={editing ? (email || "Carregando…") : email}
                  disabled={!!editing}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {editing && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    O e-mail de login não pode ser alterado aqui. Use redefinir senha abaixo se o usuário esqueceu o acesso.
                  </p>
                )}
              </div>
              {!editing ? (
                <div>
                  <Label>Senha temporária</Label>
                  <div className="flex gap-2">
                    <Input value={password} onChange={(e) => setPassword(e.target.value)} />
                    <Button type="button" variant="outline" onClick={() => setPassword(genPassword())}><RefreshCw className="h-4 w-4" /></Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Após salvar, copie e envie ao usuário. Ele entra em /login com este e-mail e esta senha.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border p-3 space-y-2">
                  <Label>Redefinir senha</Label>
                  <div className="flex gap-2">
                    <Input value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} />
                    <Button type="button" variant="outline" onClick={() => setResetPwd(genPassword())}><RefreshCw className="h-4 w-4" /></Button>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={applyPasswordReset} disabled={busy}>
                    Aplicar nova senha
                  </Button>
                </div>
              )}
              <div><Label>Cargo *</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="receptionist">Recepcionista</SelectItem>
                    <SelectItem value="professional">Profissional</SelectItem>
                    <SelectItem value="financial">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {role === "professional" && (
                <>
                  <div><Label>CPF *</Label><Input value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} /></div>
                  <div><Label>Especialidade</Label>
                    <Select value={specialty} onValueChange={setSpecialty}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{specialties.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>CRM</Label><Input value={crm} onChange={(e) => setCrm(e.target.value)} placeholder="CRM-MG 12345" /></div>
                    <div><Label>Comissão (%)</Label><Input type="number" min={0} max={100} value={commission} onChange={(e) => setCommission(Number(e.target.value))} /></div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O profissional configura tipos de agendamento em Minhas configurações e procedimentos em Administrativo → Procedimentos, após o primeiro acesso.
                  </p>
                </>
              )}
              <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} /></div>
              <div className="flex items-center gap-2"><Switch checked={active} onCheckedChange={setActive} /><Label>Ativo</Label></div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}