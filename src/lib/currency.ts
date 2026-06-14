export const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const fmt = (n: number | string | null | undefined) => BRL.format(Number(n ?? 0));

export const parseBRLInput = (s: string): number => {
  const clean = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
};

export const fmtDate = (s: string | null | undefined) => {
  if (!s) return "—";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
};

export const isOverdue = (due: string, status: string) =>
  (status === "pending" || status === "partial") && new Date(due + "T00:00:00") < new Date(new Date().toDateString());

export const PAYMENT_METHODS: { value: string; label: string; icon: string }[] = [
  { value: "cash", label: "Dinheiro", icon: "💵" },
  { value: "pix", label: "Pix", icon: "📱" },
  { value: "credit_card", label: "Crédito", icon: "💳" },
  { value: "debit_card", label: "Débito", icon: "💳" },
  { value: "health_insurance", label: "Convênio", icon: "🏥" },
  { value: "bank_transfer", label: "Transferência", icon: "🏦" },
  { value: "other", label: "Outro", icon: "•" },
];

export const PAYMENT_LABEL: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map((p) => [p.value, p.label]));

export const BILL_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", partial: "Parcial", paid: "Pago", overdue: "Vencida", cancelled: "Cancelada",
};

export const BILL_STATUS_CLASS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  partial: "bg-orange-100 text-orange-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-700",
};

export const BUDGET_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho", sent: "Enviado", approved: "Aprovado", rejected: "Rejeitado", expired: "Expirado",
};

export const BUDGET_STATUS_CLASS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

export const PAYABLE_CATEGORIES = ["Aluguel","Salários","Materiais","Equipamentos","Divulgação","Serviços","Impostos","Outros"];