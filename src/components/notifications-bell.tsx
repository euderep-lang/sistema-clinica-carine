import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Clock, AlertCircle, Package, Cake, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { fmt } from "@/lib/currency";
import { isFinancialStaff, isOpsStaff } from "@/lib/roles";

interface Notif {
  key: string;
  type: "appointment" | "bill" | "stock" | "birthday";
  title: string;
  href: string;
}

const READ_KEY = "notif:read";
function getRead(): Record<string, boolean> { try { return JSON.parse(localStorage.getItem(READ_KEY) ?? "{}"); } catch { return {}; } }
function setRead(v: Record<string, boolean>) { localStorage.setItem(READ_KEY, JSON.stringify(v)); }

// Module-level cache so navigating between pages doesn't re-fire 4 queries.
let cachedNotifs: Notif[] | null = null;
let cachedAt = 0;

const ICONS = {
  appointment: { icon: Clock, color: "text-amber-500 bg-amber-100" },
  bill: { icon: AlertCircle, color: "text-red-500 bg-red-100" },
  stock: { icon: Package, color: "text-orange-500 bg-orange-100" },
  birthday: { icon: Cake, color: "text-pink-500 bg-pink-100" },
};

export function NotificationsBell() {
  const { profile } = useAuth();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [read, setReadState] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function load() {
    if (!profile) return;
    setReadState(getRead());
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const hhmm = now.toTimeString().slice(0, 5);
    const list: Notif[] = [];
    const ops = isOpsStaff(profile.role);
    const financial = isFinancialStaff(profile.role);
    const isPro = profile.role === "professional";

    let lateApptsQuery = supabase
      .from("appointments")
      .select("id, start_time, status, patients(full_name), profiles!appointments_professional_id_fkey(full_name)")
      .eq("date", today)
      .in("status", ["scheduled", "confirmed"])
      .lt("start_time", hhmm)
      .limit(20);
    if (isPro) lateApptsQuery = lateApptsQuery.eq("professional_id", profile.id);

    let overdueBillsQuery = financial
      ? supabase
          .from("bills_receivable")
          .select("id, amount, due_date, patients(full_name)")
          .eq("status", "pending")
          .lt("due_date", today)
          .limit(20)
      : null;
    if (overdueBillsQuery && isPro) overdueBillsQuery = overdueBillsQuery.eq("professional_id", profile.id);

    const [lateApptsRes, overdueBillsRes, lowStockRes, ptsRes] = await Promise.all([
      (ops || isPro) ? lateApptsQuery : Promise.resolve({ data: [] }),
      overdueBillsQuery ?? Promise.resolve({ data: [] }),
      financial
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (supabase as any).from("inventory_items").select("id, name, current_stock, min_stock, unit").limit(50)
        : Promise.resolve({ data: [] }),
      ops
        ? supabase.from("patients").select("id, full_name, birth_date").not("birth_date", "is", null).limit(500)
        : Promise.resolve({ data: [] }),
    ]);

    ((lateApptsRes.data ?? []) as unknown as { id: string; start_time: string; patients?: { full_name: string }; profiles?: { full_name: string } }[]).forEach(a => {
      list.push({
        key: `appt:${a.id}`,
        type: "appointment",
        title: `Consulta de ${a.patients?.full_name ?? "—"} com ${a.profiles?.full_name ?? "—"} era às ${a.start_time.slice(0, 5)} e ainda não foi iniciada`,
        href: isPro ? "/professional/dashboard" : "/reception/agenda",
      });
    });
    ((overdueBillsRes.data ?? []) as unknown as { id: string; amount: number; due_date: string; patients?: { full_name: string } }[]).forEach(b => {
      list.push({ key: `bill:${b.id}`, type: "bill", title: `Cobrança de ${fmt(b.amount)} para ${b.patients?.full_name ?? "—"} venceu em ${new Date(b.due_date).toLocaleDateString("pt-BR")}`, href: "/financial/receivables" });
    });
    ((lowStockRes.data ?? []) as { id: string; name: string; current_stock: number; min_stock: number; unit: string }[])
      .filter(i => i.current_stock <= i.min_stock).slice(0, 20).forEach(i => {
        list.push({ key: `stock:${i.id}`, type: "stock", title: `${i.name} com estoque baixo: ${i.current_stock} ${i.unit} (mínimo: ${i.min_stock})`, href: "/financial/inventory" });
      });
    ((ptsRes.data ?? []) as { id: string; full_name: string; birth_date: string }[]).forEach(p => {
      const d = new Date(p.birth_date);
      if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth()) {
        list.push({ key: `bday:${p.id}:${today}`, type: "birthday", title: `Hoje é aniversário de ${p.full_name}`, href: "/reception/marketing" });
      }
    });

    setNotifs(list);
    cachedNotifs = list;
    cachedAt = Date.now();
  }

  useEffect(() => {
    setReadState(getRead());
    if (cachedNotifs && Date.now() - cachedAt < 60_000) {
      setNotifs(cachedNotifs);
    } else {
      // Defer to next idle tick so it doesn't block first paint / navigation.
      const w = window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (h: number) => void;
      };
      const handle: number = w.requestIdleCallback
        ? w.requestIdleCallback(() => load(), { timeout: 2000 })
        : window.setTimeout(load, 300);
      const t = setInterval(load, 5 * 60_000);
      return () => {
        clearInterval(t);
        if (w.cancelIdleCallback) w.cancelIdleCallback(handle);
        else clearTimeout(handle);
      };
    }
    const t = setInterval(load, 5 * 60_000);
    return () => clearInterval(t);
  }, []);

  const unread = notifs.filter(n => !read[n.key]).length;

  function go(n: Notif) {
    const next = { ...read, [n.key]: true }; setRead(next); setReadState(next);
    setOpen(false);
    navigate({ to: n.href });
  }

  function markAll() {
    const next = { ...read }; notifs.forEach(n => { next[n.key] = true; }); setRead(next); setReadState(next);
  }

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) load(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-0 max-h-[420px] overflow-hidden flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-semibold text-sm">Notificações</div>
          {notifs.length > 0 && unread > 0 && <button className="text-xs text-primary hover:underline" onClick={markAll}>Marcar tudo como lido</button>}
        </div>
        <div className="flex-1 overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle2 className="size-8 text-green-500" />
              Tudo em dia!
            </div>
          ) : (
            notifs.map(n => {
              const { icon: Icon, color } = ICONS[n.type];
              const isRead = !!read[n.key];
              return (
                <button key={n.key} onClick={() => go(n)} className={`w-full text-left px-3 py-2 hover:bg-muted flex gap-2 border-b last:border-0 ${isRead ? "opacity-60" : "bg-primary/5"}`}>
                  <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 text-xs">{n.title}</div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}