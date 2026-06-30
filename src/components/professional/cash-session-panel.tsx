import { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Loader2, Lock, LockOpen, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { fmt, fmtDateTime } from "@/lib/currency";
import { randomUUID } from "@/lib/utils";

interface CashSession {
  id: string;
  opened_at: string;
  opening_amount: number;
  status: string;
  opened_by: string | null;
  opener?: { full_name: string } | null;
}

interface Movement {
  id: string;
  type: "supply" | "withdrawal";
  amount: number;
  reason: string | null;
  created_at: string;
}

export function CashSessionPanel({ onChanged }: { onChanged?: () => void }) {
  const { profile, tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<CashSession | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [cashInflow, setCashInflow] = useState(0);
  const [cashOutflow, setCashOutflow] = useState(0);

  const [openDialog, setOpenDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [moveDialog, setMoveDialog] = useState<null | "supply" | "withdrawal">(null);
  const [moveAmount, setMoveAmount] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const [closeDialog, setCloseDialog] = useState(false);
  const [countedAmount, setCountedAmount] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const { data: sess } = await supabase
        .from("cash_sessions" as never)
        .select("id, opened_at, opening_amount, status, opened_by, opener:opened_by(full_name)")
        .eq("tenant_id", tenant.id)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const s = (sess as CashSession | null) ?? null;
      setSession(s);

      if (s) {
        const [{ data: moves }, { data: pays }, { data: exps }] = await Promise.all([
          supabase
            .from("cash_movements" as never)
            .select("id, type, amount, reason, created_at")
            .eq("session_id", s.id)
            .order("created_at"),
          supabase
            .from("bill_payments" as never)
            .select("amount")
            .eq("status", "active")
            .eq("payment_method", "cash")
            .gte("created_at", s.opened_at),
          supabase
            .from("expenses" as never)
            .select("amount")
            .eq("status", "paid")
            .eq("payment_method", "cash")
            .gte("created_at", s.opened_at),
        ]);
        setMovements((moves ?? []) as unknown as Movement[]);
        setCashInflow(((pays ?? []) as { amount: number }[]).reduce((sum, p) => sum + Number(p.amount), 0));
        setCashOutflow(((exps ?? []) as { amount: number }[]).reduce((sum, e) => sum + Number(e.amount), 0));
      } else {
        setMovements([]);
        setCashInflow(0);
        setCashOutflow(0);
      }
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    void load();
  }, [load]);

  const supplies = movements.filter((m) => m.type === "supply").reduce((s, m) => s + Number(m.amount), 0);
  const withdrawals = movements.filter((m) => m.type === "withdrawal").reduce((s, m) => s + Number(m.amount), 0);
  const expected = session
    ? Number(session.opening_amount) + cashInflow + supplies - cashOutflow - withdrawals
    : 0;
  const difference = countedAmount !== "" ? Number(countedAmount) - expected : null;

  const handleOpen = async () => {
    if (!tenant || !profile) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("cash_sessions" as never).insert({
        id: randomUUID(),
        tenant_id: tenant.id,
        opened_by: profile.id,
        opening_amount: Number(openingAmount) || 0,
        status: "open",
      } as never);
      if (error) throw new Error(error.message);
      toast.success("Caixa aberto.");
      setOpenDialog(false);
      setOpeningAmount("");
      await load();
      onChanged?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleMovement = async () => {
    if (!tenant || !profile || !session || !moveDialog) return;
    const amount = Number(moveAmount);
    if (!amount || amount <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("cash_movements" as never).insert({
        id: randomUUID(),
        tenant_id: tenant.id,
        session_id: session.id,
        type: moveDialog,
        amount,
        reason: moveReason.trim() || null,
        created_by: profile.id,
      } as never);
      if (error) throw new Error(error.message);
      toast.success(moveDialog === "supply" ? "Suprimento registrado." : "Sangria registrada.");
      setMoveDialog(null);
      setMoveAmount("");
      setMoveReason("");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (!profile || !session) return;
    if (countedAmount === "") {
      toast.error("Informe o valor contado.");
      return;
    }
    setSaving(true);
    try {
      const counted = Number(countedAmount);
      const { error } = await supabase
        .from("cash_sessions" as never)
        .update({
          status: "closed",
          closed_by: profile.id,
          closed_at: new Date().toISOString(),
          counted_amount: counted,
          expected_amount: expected,
          difference: counted - expected,
          notes: closeNotes.trim() || null,
        } as never)
        .eq("id", session.id);
      if (error) throw new Error(error.message);
      toast.success("Caixa fechado.");
      setCloseDialog(false);
      setCountedAmount("");
      setCloseNotes("");
      await load();
      onChanged?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2.5"><Lock className="size-5 text-muted-foreground" /></div>
            <div>
              <p className="font-medium">Caixa fechado</p>
              <p className="text-sm text-muted-foreground">Abra o caixa para iniciar os recebimentos em dinheiro do dia.</p>
            </div>
          </div>
          <Button onClick={() => setOpenDialog(true)}>
            <LockOpen className="mr-2 size-4" />Abrir caixa
          </Button>
        </CardContent>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Abrir caixa</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label>Fundo de troco (valor inicial)</Label>
              <Input type="number" step="0.01" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} placeholder="0,00" />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpenDialog(false)}>Cancelar</Button>
              <Button onClick={() => void handleOpen()} disabled={saving}>
                {saving && <Loader2 className="mr-1 size-4 animate-spin" />}Abrir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="size-5 text-emerald-600" />
          Caixa aberto
          <Badge variant="secondary" className="font-normal">desde {fmtDateTime(session.opened_at)}</Badge>
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setMoveDialog("supply")}>
            <ArrowDownLeft className="mr-1 size-4 text-emerald-600" />Suprimento
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMoveDialog("withdrawal")}>
            <ArrowUpRight className="mr-1 size-4 text-red-600" />Sangria
          </Button>
          <Button size="sm" onClick={() => setCloseDialog(true)}>
            <Lock className="mr-1 size-4" />Fechar caixa
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Stat label="Fundo de troco" value={fmt(session.opening_amount)} />
          <Stat label="Entradas (dinheiro)" value={fmt(cashInflow)} tone="success" />
          <Stat label="Suprimentos" value={fmt(supplies)} tone="success" />
          <Stat label="Saídas (dinheiro)" value={fmt(cashOutflow)} tone="danger" />
          <Stat label="Sangrias" value={fmt(withdrawals)} tone="danger" />
          <Stat label="Esperado em caixa" value={fmt(expected)} highlight />
        </div>
        {session.opener?.full_name && (
          <p className="mt-3 text-xs text-muted-foreground">Aberto por {session.opener.full_name}.</p>
        )}
      </CardContent>

      <Dialog open={moveDialog !== null} onOpenChange={(o) => !o && setMoveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{moveDialog === "supply" ? "Suprimento (entrada)" : "Sangria (retirada)"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Valor</Label>
              <Input type="number" step="0.01" value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1">
              <Label>Motivo (opcional)</Label>
              <Input value={moveReason} onChange={(e) => setMoveReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoveDialog(null)}>Cancelar</Button>
            <Button onClick={() => void handleMovement()} disabled={saving}>
              {saving && <Loader2 className="mr-1 size-4 animate-spin" />}Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fechar caixa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Esperado em caixa</span><span className="font-medium">{fmt(expected)}</span></div>
            </div>
            <div className="space-y-1">
              <Label>Valor contado na gaveta</Label>
              <Input type="number" step="0.01" value={countedAmount} onChange={(e) => setCountedAmount(e.target.value)} placeholder="0,00" />
            </div>
            {difference !== null && (
              <div className={`rounded-md border p-3 text-sm ${Math.abs(difference) < 0.01 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                Diferença: <span className="font-semibold">{fmt(difference)}</span>{" "}
                {Math.abs(difference) < 0.01 ? "(conferido)" : difference > 0 ? "(sobra)" : "(falta)"}
              </div>
            )}
            <div className="space-y-1">
              <Label>Observações (opcional)</Label>
              <Textarea rows={2} value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloseDialog(false)}>Cancelar</Button>
            <Button onClick={() => void handleClose()} disabled={saving}>
              {saving && <Loader2 className="mr-1 size-4 animate-spin" />}Fechar caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Stat({ label, value, tone, highlight }: { label: string; value: string; tone?: "success" | "danger"; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-primary/40 bg-primary/5" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-red-600" : ""}`}>{value}</p>
    </div>
  );
}
