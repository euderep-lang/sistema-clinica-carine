/**
 * Reconcilia 100% o financeiro do ClinicOS com o "RELATÓRIO COMPLETO — MEDX".
 *
 * Para cada fatura (ATD-id) do relatório, ajusta a fatura correspondente no
 * ClinicOS para refletir exatamente o relatório:
 *   - amount        = líquido (bruto - desconto)
 *   - discount_value = desconto
 *   - paid_amount   = total pago (limitado ao líquido)
 *   - status        = paid / partial / pending
 *   - pagamentos    = recriados conforme as linhas do relatório (data, forma, valor)
 *   - bill_discounts = recriado conforme o desconto
 *
 * NÃO altera os itens da cobrança (produtos/serviços vendidos), apenas os
 * valores financeiros e os pagamentos.
 *
 * Uso:
 *   bun run scripts/reconciliar-financeiro.ts <arquivo.pdf> --dry-run
 *   bun run scripts/reconciliar-financeiro.ts <arquivo.pdf> --apply
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import {
  parseReport,
  extractPdfText,
  mapPaymentMethod,
  buildBillStatus,
  type Invoice,
} from "./import-relatorio-completo";

const TENANT_ID = process.env.TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
const NEW_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const NEW_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function money(n: number): number {
  return Math.round(n * 100) / 100;
}
function eqMoney(a: number, b: number): boolean {
  return Math.abs(money(a) - money(b)) < 0.005;
}
function isoDate(d: unknown): string {
  if (!d) return "";
  const s = String(d);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
}

type InvoiceComputed = {
  medxId: string;
  patientName: string;
  date: string;
  statusLabel: string;
  gross: number;
  discount: number;
  net: number;
  paid: number;
  status: string;
  payments: { date: string; method: string; amount: number }[];
};

function computeInvoice(inv: Invoice, patientName: string): InvoiceComputed {
  const gross = money(inv.total);
  const discount = money(inv.discount);
  const net = Math.max(0, money(gross - discount));
  const paymentsSum = inv.payments.reduce((s, p) => s + p.amount, 0);
  const paid = money(paymentsSum > 0 ? paymentsSum : inv.paidTotal);
  const status = buildBillStatus(net, paid);
  const payments = inv.payments
    .filter((p) => p.amount > 0)
    .map((p) => ({ date: p.date, method: mapPaymentMethod(p.methodLabel), amount: money(p.amount) }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.amount - b.amount));
  return { medxId: inv.medxId, patientName, date: inv.date, statusLabel: inv.statusLabel, gross, discount, net, paid, status, payments };
}

function paymentSig(p: { date: string; method: string; amount: number }): string {
  return `${isoDate(p.date)}|${p.method}|${money(p.amount).toFixed(2)}`;
}

async function main() {
  const pdfPath = process.argv[2];
  const apply = process.argv.includes("--apply");
  if (!pdfPath || !existsSync(pdfPath)) {
    console.error("Uso: bun run scripts/reconciliar-financeiro.ts <arquivo.pdf> [--apply]");
    process.exit(1);
  }
  if (!NEW_URL || !NEW_SERVICE_KEY) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes.");

  console.log("Extraindo PDF…");
  const blocks = parseReport(extractPdfText(pdfPath));

  // Mapa medxId -> fatura computada (a partir do relatório)
  const reportInvoices = new Map<string, InvoiceComputed>();
  for (const b of blocks) {
    for (const inv of b.invoices) {
      if (!inv.medxId) continue;
      reportInvoices.set(inv.medxId, computeInvoice(inv, b.name));
    }
  }
  console.log(`Relatório: ${reportInvoices.size} faturas em ${blocks.length} pacientes`);

  const supabase = createClient(NEW_URL, NEW_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Carrega todas as faturas MEDX existentes
  const { data: bills, error: bErr } = await supabase
    .from("bills_receivable")
    .select("id, patient_id, professional_id, amount, paid_amount, discount_value, status, paid_date, payment_method, notes, due_date")
    .eq("tenant_id", TENANT_ID)
    .like("notes", "MEDX:%");
  if (bErr) throw bErr;

  const billByMedx = new Map<string, (typeof bills)[number]>();
  for (const b of bills ?? []) {
    const m = String(b.notes ?? "").match(/MEDX:(ATD-\d+)/);
    if (m) billByMedx.set(m[1], b);
  }
  console.log(`ClinicOS: ${billByMedx.size} faturas MEDX`);

  // Carrega pagamentos de todas as faturas MEDX
  const billIds = (bills ?? []).map((b) => b.id);
  const paymentsByBill = new Map<string, { date: string; method: string; amount: number; id: string; status: string }[]>();
  for (let i = 0; i < billIds.length; i += 200) {
    const chunk = billIds.slice(i, i + 200);
    const { data: pays } = await supabase
      .from("bill_payments")
      .select("id, bill_receivable_id, amount, payment_method, paid_date, status")
      .in("bill_receivable_id", chunk);
    for (const p of pays ?? []) {
      const arr = paymentsByBill.get(p.bill_receivable_id) ?? [];
      arr.push({ id: p.id, date: isoDate(p.paid_date), method: p.payment_method, amount: money(Number(p.amount)), status: p.status });
      paymentsByBill.set(p.bill_receivable_id, arr);
    }
  }

  const changes: { medxId: string; patient: string; diffs: string[]; rep: InvoiceComputed }[] = [];
  const missing: string[] = [];
  const dbOnly: string[] = [];
  let unchanged = 0;

  for (const [medxId, rep] of reportInvoices) {
    const bill = billByMedx.get(medxId);
    if (!bill) {
      missing.push(`${medxId} — ${rep.patientName} (líq R$ ${rep.net.toFixed(2)})`);
      continue;
    }
    const curAmount = money(Number(bill.amount));
    const curPaid = money(Number(bill.paid_amount));
    const curDisc = money(Number(bill.discount_value ?? 0));
    const desiredPaid = money(Math.min(rep.paid, rep.net));

    const diffs: string[] = [];
    if (!eqMoney(curAmount, rep.net)) diffs.push(`amount ${curAmount.toFixed(2)}→${rep.net.toFixed(2)}`);
    if (!eqMoney(curDisc, rep.discount)) diffs.push(`desconto ${curDisc.toFixed(2)}→${rep.discount.toFixed(2)}`);
    if (!eqMoney(curPaid, desiredPaid)) diffs.push(`pago ${curPaid.toFixed(2)}→${desiredPaid.toFixed(2)}`);
    if (bill.status !== rep.status) diffs.push(`status ${bill.status}→${rep.status}`);

    const curPays = (paymentsByBill.get(bill.id) ?? []).filter((p) => p.status === "active");
    const curSig = curPays.map(paymentSig).sort().join(" ; ");
    const repSig = rep.payments.map(paymentSig).sort().join(" ; ");
    if (curSig !== repSig) diffs.push(`pagamentos (${curPays.length}→${rep.payments.length})`);

    if (diffs.length === 0) {
      unchanged++;
      continue;
    }
    changes.push({ medxId, patient: rep.patientName, diffs, rep });

    if (apply) {
      const lastPay = rep.payments.at(-1);
      const paidDate = rep.status === "paid" ? (lastPay?.date ?? rep.date) : null;
      const method = lastPay ? lastPay.method : null;

      const { error: upErr } = await supabase
        .from("bills_receivable")
        .update({
          amount: rep.net,
          paid_amount: desiredPaid,
          discount_value: rep.discount,
          status: rep.status,
          paid_date: paidDate,
          payment_method: method,
        })
        .eq("id", bill.id);
      if (upErr) {
        console.error(`Erro update bill ${medxId}:`, upErr.message);
        continue;
      }

      // Recria pagamentos
      await supabase.from("bill_payments").delete().eq("bill_receivable_id", bill.id);
      for (const p of rep.payments) {
        const { error: payErr } = await supabase.from("bill_payments").insert({
          tenant_id: TENANT_ID,
          bill_receivable_id: bill.id,
          patient_id: bill.patient_id,
          professional_id: bill.professional_id,
          amount: p.amount,
          fee_amount: 0,
          net_amount: p.amount,
          payment_method: p.method,
          paid_date: p.date,
          notes: "Reconciliação MEDX",
          status: "active",
          created_by: bill.professional_id,
        });
        if (payErr) console.error(`Erro pagamento ${medxId}:`, payErr.message);
      }

      // Recria descontos
      await supabase.from("bill_discounts").delete().eq("bill_receivable_id", bill.id);
      if (rep.discount > 0) {
        const { error: dErr } = await supabase.from("bill_discounts").insert({
          tenant_id: TENANT_ID,
          bill_receivable_id: bill.id,
          patient_id: bill.patient_id,
          professional_id: bill.professional_id,
          amount: rep.discount,
          applied_date: rep.date,
          notes: "Desconto MEDX (reconciliação)",
          created_by: bill.professional_id,
        });
        if (dErr) console.error(`Erro desconto ${medxId}:`, dErr.message);
      }
    }
  }

  // Faturas no banco que não estão no relatório
  for (const medxId of billByMedx.keys()) {
    if (!reportInvoices.has(medxId)) dbOnly.push(medxId);
  }

  console.log("\n===== RECONCILIAÇÃO FINANCEIRA =====");
  console.log(`Faturas no relatório: ${reportInvoices.size}`);
  console.log(`Faturas idênticas (sem mudança): ${unchanged}`);
  console.log(`Faturas ${apply ? "ATUALIZADAS" : "a atualizar"}: ${changes.length}`);
  console.log(`Faturas do relatório SEM correspondência no ClinicOS: ${missing.length}`);
  console.log(`Faturas no ClinicOS que NÃO estão no relatório: ${dbOnly.length}`);

  if (changes.length) {
    console.log("\n--- Mudanças ---");
    for (const c of changes) {
      console.log(`  • ${c.medxId} (${c.patient}): ${c.diffs.join(", ")}`);
    }
  }
  if (missing.length) {
    console.log("\n--- Faturas do relatório ausentes no ClinicOS ---");
    for (const m of missing) console.log("  •", m);
  }
  if (dbOnly.length) {
    console.log("\n--- Faturas no ClinicOS ausentes no relatório ---");
    for (const m of dbOnly) console.log("  •", m);
  }

  console.log(apply ? "\n✓ Reconciliação aplicada." : "\n(DRY-RUN — nada foi gravado)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
