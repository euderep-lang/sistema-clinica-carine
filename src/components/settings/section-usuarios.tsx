import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, RefreshCw, Copy, Pencil, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clearKeepAliveCache } from "@/components/keep-alive-outlet";
import { useAuth } from "@/lib/mock-auth";
import {
  createTenantUser,
  deleteTenantUser,
  getTenantUserEmail,
  listTenantUsers,
  updateTenantUser,
  type TenantUserRow,
} from "@/lib/admin-users.functions";
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
const ROLE_CLASS: Record<Role, string> = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  receptionist: "bg-blue-100 text-blue-700 border-blue-200",
  professional: "bg-teal-100 text-teal-700 border-teal-200",
  financial: "bg-amber-100 text-amber-700 border-amber-200",
};

interface Row extends TenantUserRow {}

export function SectionUsuarios() {
  const { profile, refresh } = useAuth();
  const create = useServerFn(createTenantUser);
  const update = useServerFn(updateTenantUser);
  const removeUser = useServerFn(deleteTenantUser);
  const listUsers = useServerFn(listTenantUsers);
  const fetchEmail = useServerFn(getTenantUserEmail);
  const [rows, setRows] = useState<Row[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [tempPwd, setTempPwd] = useState<string | null>(null);
  const [pwdContext, setPwdContext] = useState<"created" | "reset" | null>(null);
  const [resetPwd, setResetPwd] = useState(genPassword());
  const [changePassword, setChangePassword] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  // form
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profession, setProfession] = useState("");
  const [password, setPassword] = useState(genPassword());
  const [role, setRole] = useState<Role>("receptionist");
  const [specialtiesSel, setSpecialtiesSel] = useState<string[]>([]); const [crm, setCrm] = useState(""); const [cpf, setCpf] = useState("");
  const [commission, setCommission] = useState(0); const [phone, setPhone] = useState("");
  const [active, setActive] = useState(true); const [busy, setBusy] = useState(false);

  const toggleSpecialty = (s: string) =>
    setSpecialtiesSel((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  function genPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz!@#$";
    let p = "";
    for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
    return p;
  }

  const load = async () => {
    const { users } = await listUsers();
    setRows(users);
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
    void load().catch((e) => toast.error((e as Error).message));
    void loadSpecialties();
  }, [profile]);

  const openNew = () => {
    setEditing(null); setName(""); setEmail(""); setDisplayName(""); setProfession(""); setPassword(genPassword());
    setRole("receptionist"); setSpecialtiesSel([]); setCrm(""); setCpf(""); setCommission(0); setPhone("");
    setActive(true); setTempPwd(null); setPwdContext(null); setResetPwd(genPassword()); setChangePassword(false);
    void loadSpecialties();
    setOpen(true);
  };
  const openEdit = async (r: Row) => {
    setEditing(r); setName(r.full_name); setEmail(r.email); setRole(r.role);
    setDisplayName(r.display_name ?? ""); setProfession(r.profession ?? "");
    setSpecialtiesSel(r.specialties ?? (r.specialty ? [r.specialty] : [])); setCrm(r.crm ?? ""); setCpf(r.cpf ? maskCPF(r.cpf) : "");
    setCommission(Number(r.commission_pct ?? 0));
    setPhone(r.phone ?? ""); setActive(r.active); setTempPwd(null); setPwdContext(null);
    setResetPwd(genPassword()); setChangePassword(false);
    void loadSpecialties();
    setOpen(true);
    if (!r.email) {
      try {
        const { email: userEmail } = await fetchEmail({ data: { user_id: r.id } });
        setEmail(userEmail);
      } catch (e) {
        toast.error((e as Error).message);
      }
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
        if (editing.id === profile?.id && role !== editing.role) {
          throw new Error("Você não pode mudar seu próprio cargo. Peça a outro administrador.");
        }
        if (changePassword && (!resetPwd || resetPwd.length < 6)) {
          throw new Error("A senha deve ter pelo menos 6 caracteres");
        }
        const cpfToSave =
          role === "professional" ? cpf || (editing.cpf ? maskCPF(editing.cpf) : "") : null;
        const { user: saved } = await update({
          data: {
            user_id: editing.id,
            full_name: name.trim(),
            display_name: displayName.trim() || null,
            profession: role === "professional" ? profession.trim() || null : null,
            role,
            phone: phone || null,
            active,
            specialty: role === "professional" ? specialtiesSel[0] ?? null : null,
            specialties: role === "professional" ? specialtiesSel : null,
            crm: role === "professional" ? crm : null,
            cpf: cpfToSave,
            commission_pct: commission,
            password: changePassword ? resetPwd : null,
          },
        });
        setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
        if (editing.id === profile?.id) await refresh();
        clearKeepAliveCache();
        if (changePassword) {
          setTempPwd(resetPwd);
          setPwdContext("reset");
          setChangePassword(false);
          toast.success("Usuário e senha atualizados");
        } else {
          toast.success("Usuário atualizado");
          setOpen(false);
        }
        await load();
      } else {
        if (!email) { toast.error("E-mail obrigatório"); setBusy(false); return; }
        await create({
          data: {
            email, password, full_name: name,
            display_name: displayName.trim() || null,
            profession: role === "professional" ? profession.trim() || null : null,
            role, phone,
            specialty: specialtiesSel[0] ?? null,
            specialties: role === "professional" ? specialtiesSel : null,
            crm, cpf,
            commission_pct: commission, active,
            appointment_types: role === "professional" ? [...DEFAULT_APPOINTMENT_TYPES] : null,
          },
        });
        setTempPwd(password);
        setPwdContext("created");
        await load();
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const toggleActive = async (r: Row) => {
    try {
      const { user: saved } = await update({
      data: {
        user_id: r.id,
        full_name: r.full_name,
        display_name: r.display_name,
        profession: r.profession,
        role: r.role,
        phone: r.phone,
        active: !r.active,
        specialty: r.specialty,
        specialties: r.specialties,
        crm: r.crm,
        cpf: r.cpf,
        commission_pct: Number(r.commission_pct ?? 0),
      },
    });
    setRows((prev) => prev.map((row) => (row.id === saved.id ? saved : row)));
    if (r.id === profile?.id && !r.active) await refresh();
    clearKeepAliveCache();
    await load();
    toast.success(r.active ? "Desativado" : "Reativado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeUser({ data: { user_id: deleteTarget.id } });
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      clearKeepAliveCache();
      toast.success("Usuário movido para a lixeira");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Usuário</Button></div>
      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead></TableHead><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Cargo</TableHead>
            <TableHead>Profissão</TableHead><TableHead>Conselho</TableHead>
            <TableHead>Situação</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Avatar className="h-8 w-8"><AvatarFallback>{r.full_name.split(" ").slice(0,2).map(s=>s[0]).join("")}</AvatarFallback></Avatar></TableCell>
                <TableCell className="font-medium">
                  {r.full_name}
                  {r.id === profile?.id ? (
                    <span className="ml-2 text-[10px] text-muted-foreground">(você)</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.email || "—"}</TableCell>
                <TableCell><Badge variant="outline" className={ROLE_CLASS[r.role]}>{ROLE_LABEL[r.role]}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.profession ?? "-"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.crm ?? "-"}</TableCell>
                <TableCell><Badge variant="outline" className={r.active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}>{r.active ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(r)}>{r.active ? "Desativar" : "Reativar"}</Button>
                  {r.id !== profile?.id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteTarget(r)}
                      title="Excluir usuário"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>{editing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>
          {tempPwd ? (
            <div className="space-y-3 overflow-y-auto px-6 py-4">
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
            <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
              <div><Label>Nome completo *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div>
                <Label>Como gostaria de ser chamado</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex.: Dra. Carine" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Nome que aparece nas mensagens de WhatsApp, receitas e documentos.
                </p>
              </div>
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
                  <div className="flex items-center gap-2">
                    <Switch checked={changePassword} onCheckedChange={setChangePassword} />
                    <Label>Alterar senha de acesso</Label>
                  </div>
                  {changePassword ? (
                    <>
                      <div className="flex gap-2">
                        <Input value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} />
                        <Button type="button" variant="outline" onClick={() => setResetPwd(genPassword())}><RefreshCw className="h-4 w-4" /></Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        A nova senha será aplicada ao clicar em Salvar. Compartilhe com o usuário para entrar em /login.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Ative a opção acima para definir uma nova senha junto com as demais alterações.
                    </p>
                  )}
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
                {editing?.id === profile?.id ? (
                  <p className="mt-1 text-xs text-amber-600">
                    Seu próprio cargo não pode ser alterado aqui — outro admin precisa fazer isso.
                  </p>
                ) : null}
              </div>
              {role === "professional" && (
                <>
                  <div><Label>CPF *</Label><Input value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} /></div>
                  <div>
                    <Label>Profissão</Label>
                    <Input
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      placeholder="Ex.: Médica, Dentista, Nutricionista…"
                      list="profession-suggestions"
                    />
                    <datalist id="profession-suggestions">
                      {PROFESSION_SUGGESTIONS.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Usada nas receitas e documentos (a especialidade não aparece nos documentos).
                    </p>
                  </div>
                  <div>
                    <Label>Especialidade(s) <span className="text-muted-foreground">(opcional)</span></Label>
                    {specialties.length === 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Nenhuma especialidade cadastrada. Adicione em Configurações → Especialidades.
                      </p>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {specialties.map((s) => {
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
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Conselho</Label><Input value={crm} onChange={(e) => setCrm(e.target.value)} placeholder="Ex.: CRM-MG 12345, CRO-SP 9999, CRN…" /></div>
                    <div><Label>Comissão (%)</Label><Input type="number" min={0} max={100} value={commission} onChange={(e) => setCommission(Number(e.target.value))} /></div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O profissional configura tipos de agendamento em Minhas configurações e procedimentos em Administrativo → Procedimentos, após o primeiro acesso.
                  </p>
                </>
              )}
              <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} /></div>
              <div className="flex items-center gap-2"><Switch checked={active} onCheckedChange={setActive} /><Label>Ativo</Label></div>
            </div>
            <DialogFooter className="shrink-0 border-t px-6 py-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.full_name} será removido do sistema e ficará na lixeira por 30 dias.
              Na restauração, um novo login será recriado com senha temporária.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteUser();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}