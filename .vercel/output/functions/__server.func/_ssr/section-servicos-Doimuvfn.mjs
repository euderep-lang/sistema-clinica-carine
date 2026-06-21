import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { u as useAuth, I as Input, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, C as Card, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, q as Badge, B as Button, E as cn } from "./router-DcWaovdP.mjs";
import { c as cva } from "../_libs/class-variance-authority.mjs";
import { d as fmt, s as supabase } from "./index.mjs";
import { ak as Info, aI as Power } from "../_libs/lucide-react.mjs";
const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
const Alert = reactExports.forwardRef(({ className, variant, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref, role: "alert", className: cn(alertVariants({ variant }), className), ...props }));
Alert.displayName = "Alert";
const AlertTitle = reactExports.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "h5",
    {
      ref,
      className: cn("mb-1 font-medium leading-none tracking-tight", className),
      ...props
    }
  )
);
AlertTitle.displayName = "AlertTitle";
const AlertDescription = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref, className: cn("text-sm [&_p]:leading-relaxed", className), ...props }));
AlertDescription.displayName = "AlertDescription";
function SectionServicos() {
  const { profile } = useAuth();
  const [items, setItems] = reactExports.useState([]);
  const [search, setSearch] = reactExports.useState("");
  const [professionalFilter, setProfessionalFilter] = reactExports.useState("all");
  const load = async () => {
    if (!profile) return;
    const { data, error } = await supabase.from("services").select(
      "id,name,description,category,default_price,duration_minutes,active,professional_id,professional:profiles!services_professional_id_fkey(full_name)"
    ).order("name");
    if (error) toast.error(error.message);
    else setItems(data ?? []);
  };
  reactExports.useEffect(() => {
    load();
  }, [profile]);
  const professionals = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const item of items) {
      if (item.professional_id && item.professional?.full_name) {
        map.set(item.professional_id, item.professional.full_name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [items]);
  const filtered = reactExports.useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (professionalFilter === "all") return true;
      if (professionalFilter === "clinic") return !item.professional_id;
      return item.professional_id === professionalFilter;
    }).filter((item) => {
      if (!q) return true;
      const prof = item.professional?.full_name?.toLowerCase() ?? "";
      return item.name.toLowerCase().includes(q) || (item.category?.toLowerCase().includes(q) ?? false) || prof.includes(q);
    }).sort((a, b) => {
      const profA = a.professional?.full_name ?? "Clínica";
      const profB = b.professional?.full_name ?? "Clínica";
      const byProf = profA.localeCompare(profB, "pt-BR");
      return byProf !== 0 ? byProf : a.name.localeCompare(b.name, "pt-BR");
    });
  }, [items, search, professionalFilter]);
  const activeCount = filtered.filter((i) => i.active).length;
  const toggleActive = async (item) => {
    const next = !item.active;
    const { error } = await supabase.from("services").update({ active: next }).eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      toast.success(next ? "Procedimento reativado" : "Procedimento desativado pelo admin");
      load();
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "size-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDescription, { children: [
        "Catálogo consolidado da clínica. Cada profissional cadastra e mantém seus procedimentos em",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Administrativo → Procedimentos" }),
        "; as alterações aparecem aqui automaticamente. Como administrador, você pode ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "desativar ou reativar" }),
        " qualquer procedimento da clínica."
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
        filtered.length,
        " procedimento",
        filtered.length !== 1 ? "s" : "",
        " · ",
        activeCount,
        " ativo",
        activeCount !== 1 ? "s" : ""
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 sm:flex-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            placeholder: "Buscar por nome, categoria ou profissional…",
            value: search,
            onChange: (e) => setSearch(e.target.value),
            className: "sm:w-64"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: professionalFilter, onValueChange: setProfessionalFilter, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "sm:w-52", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Profissional" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "Todos os profissionais" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "clinic", children: "Somente clínica (sem vínculo)" }),
            professionals.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: p.id, children: p.name }, p.id))
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Profissional" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Nome" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Categoria" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Preço" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Duração" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Situação" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-right", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 7, className: "py-8 text-center text-muted-foreground", children: items.length === 0 ? "Nenhum procedimento cadastrado ainda. Os profissionais podem incluir os seus em Minhas configurações." : "Nenhum resultado para os filtros aplicados." }) }) : filtered.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-sm", children: item.professional?.full_name ?? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Clínica" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "font-medium", children: item.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-sm text-muted-foreground", children: item.category ?? "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmt(item.default_price) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
          item.duration_minutes ?? 30,
          " min"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: item.active ? "default" : "secondary", children: item.active ? "Ativo" : "Inativo" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "sm",
            variant: item.active ? "ghost" : "outline",
            onClick: () => toggleActive(item),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Power, { className: "mr-1 size-4" }),
              item.active ? "Desativar" : "Reativar"
            ]
          }
        ) })
      ] }, item.id)) })
    ] }) })
  ] });
}
export {
  SectionServicos as S
};
