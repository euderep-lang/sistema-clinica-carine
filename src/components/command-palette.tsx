import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, User, Calendar, Stethoscope } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { initials, avatarColor, maskCPF, maskPhone } from "@/lib/patient-utils";
import { appointmentStatusLabel } from "@/lib/appointment-types";
import { isOpsStaff } from "@/lib/roles";

interface PatientLite {
  id: string;
  full_name: string;
  cpf: string | null;
  phone: string | null;
}

interface ApptResult { id: string; date: string; start_time: string; status: string; patient_name: string; professional_name: string; }
interface ProfResult { id: string; full_name: string; specialty: string | null; }
type SearchItem =
  | { kind: "patient"; data: PatientLite }
  | { kind: "appointment"; data: ApptResult }
  | { kind: "professional"; data: ProfResult };

const RECENT_KEY = "clinicos:recent_patients";
const RECENT_SEARCH_KEY = "clinicos:recent_searches";

function getRecents(): PatientLite[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}

export function pushRecentPatient(p: PatientLite) {
  const cur = getRecents().filter((r) => r.id !== p.id);
  const next = [p, ...cur].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) ?? "[]"); } catch { return []; }
}
function pushRecentSearch(term: string) {
  const t = term.trim(); if (!t) return;
  const cur = getRecentSearches().filter(r => r !== t);
  localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify([t, ...cur].slice(0, 10)));
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [recents, setRecents] = useState<PatientLite[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const ops = profile ? isOpsStaff(profile.role) : false;
  const isPro = profile?.role === "professional";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setRecents(getRecents());
      setRecentSearches(getRecentSearches());
      setQ("");
      setItems([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!q.trim() || !profile) { setItems([]); return; }
    const term = q.trim();
    const t = setTimeout(async () => {
      const cpfDigits = term.replace(/\D/g, "");
      const orParts = [`full_name.ilike.%${term}%`];
      if (cpfDigits.length >= 3) orParts.push(`cpf.ilike.%${cpfDigits}%`);

      let apptsQuery = supabase
        .from("appointments")
        .select("id, date, start_time, status, patients!inner(full_name), profiles!appointments_professional_id_fkey(full_name)")
        .ilike("patients.full_name", `%${term}%`)
        .order("date", { ascending: false })
        .limit(5);
      if (isPro) apptsQuery = apptsQuery.eq("professional_id", profile.id);

      const [{ data: pData }, { data: aData }, { data: profData }] = await Promise.all([
        supabase.from("patients").select("id, full_name, cpf, phone").or(orParts.join(",")).eq("active", true).limit(5),
        apptsQuery,
        ops
          ? supabase.from("profiles").select("id, full_name, specialty").ilike("full_name", `%${term}%`).eq("role", "professional").limit(5)
          : Promise.resolve({ data: [] }),
      ]);
      const merged: SearchItem[] = [
        ...((pData ?? []) as PatientLite[]).map(d => ({ kind: "patient" as const, data: d })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...((aData ?? []) as any[]).map(d => ({ kind: "appointment" as const, data: { id: d.id, date: d.date, start_time: d.start_time, status: d.status, patient_name: d.patients?.full_name ?? "—", professional_name: d.profiles?.full_name ?? "—" } })),
        ...((profData ?? []) as ProfResult[]).map(d => ({ kind: "professional" as const, data: d })),
      ];
      setItems(merged);
      setActive(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q, profile, ops, isPro]);

  const list = useMemo<SearchItem[]>(
    () => (q.trim() ? items : recents.map(d => ({ kind: "patient" as const, data: d }))),
    [q, items, recents]
  );

  const go = (item: SearchItem) => {
    pushRecentSearch(q);
    setOpen(false);
    if (item.kind === "patient") {
      pushRecentPatient(item.data);
      if (isPro) {
        navigate({ to: "/professional/patients/$id/record", params: { id: item.data.id } });
      } else {
        navigate({ to: "/reception/pacientes/$id", params: { id: item.data.id } });
      }
    } else if (item.kind === "appointment") {
      navigate({ to: isPro ? "/professional/dashboard" : "/reception/agenda" });
    } else {
      navigate({ to: "/admin/settings" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, list.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter" && list[active]) { e.preventDefault(); go(list[active]); }
            }}
            placeholder="Buscar pacientes, agendamentos, profissionais..."
            className="border-0 focus-visible:ring-0 shadow-none"
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {!q.trim() && recentSearches.length > 0 && (
            <div className="px-2 pb-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Buscas recentes</div>
              <div className="flex flex-wrap gap-1">
                {recentSearches.map(r => (
                  <button key={r} onClick={() => setQ(r)} className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-accent hover:text-accent-foreground">{r}</button>
                ))}
              </div>
            </div>
          )}
          {list.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {q.trim() ? "Nada encontrado" : "Digite para buscar pacientes, agendamentos ou profissionais"}
            </div>
          )}
          {(["patient", "appointment", "professional"] as const).map(kind => {
            const subset = list.filter(l => l.kind === kind);
            if (subset.length === 0) return null;
            const label = kind === "patient" ? "Pacientes" : kind === "appointment" ? "Agendamentos" : "Profissionais";
            return (
              <div key={kind} className="mb-2">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">{label}</div>
                {subset.map((it) => {
                  const i = list.indexOf(it);
                  if (it.kind === "patient") {
                    const p = it.data;
                    return (
                      <button key={`p-${p.id}`} onMouseEnter={() => setActive(i)} onClick={() => go(it)} className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left ${i === active ? "bg-accent text-accent-foreground" : ""}`}>
                        <div className={`h-9 w-9 rounded-full grid place-items-center text-white text-xs font-semibold ${avatarColor(p.full_name)}`}>{initials(p.full_name) || <User className="h-4 w-4" />}</div>
                        <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{p.full_name}</div><div className="text-xs text-muted-foreground truncate">{p.cpf ? maskCPF(p.cpf) : "—"} · {p.phone ? maskPhone(p.phone) : "Sem telefone"}</div></div>
                      </button>
                    );
                  } else if (it.kind === "appointment") {
                    const a = it.data;
                    return (
                      <button key={`a-${a.id}`} onMouseEnter={() => setActive(i)} onClick={() => go(it)} className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left ${i === active ? "bg-accent text-accent-foreground" : ""}`}>
                        <div className="h-9 w-9 rounded-full grid place-items-center bg-blue-100 text-blue-700"><Calendar className="h-4 w-4" /></div>
                        <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{new Date(a.date).toLocaleDateString("pt-BR")} {a.start_time.slice(0, 5)} — {a.patient_name}</div><div className="text-xs text-muted-foreground truncate flex gap-2 items-center">{a.professional_name} <Badge variant="outline" className="text-[10px]">{appointmentStatusLabel(a.status)}</Badge></div></div>
                      </button>
                    );
                  } else {
                    const p = it.data;
                    return (
                      <button key={`pr-${p.id}`} onMouseEnter={() => setActive(i)} onClick={() => go(it)} className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left ${i === active ? "bg-accent text-accent-foreground" : ""}`}>
                        <div className="h-9 w-9 rounded-full grid place-items-center bg-emerald-100 text-emerald-700"><Stethoscope className="h-4 w-4" /></div>
                        <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{p.full_name}</div><div className="text-xs text-muted-foreground truncate">{p.specialty ?? "Profissional"}</div></div>
                      </button>
                    );
                  }
                })}
              </div>
            );
          })}
        </div>
        <div className="border-t px-3 py-2 text-xs text-muted-foreground flex justify-between">
          <span>↑↓ navegar · ↵ abrir · Esc fechar</span>
          <span>⌘K</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}