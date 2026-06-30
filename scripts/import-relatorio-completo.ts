/**
 * Importa o "RELATÓRIO COMPLETO — MEDX" (PDF combinado: cadastro + evoluções + financeiro)
 * para o ClinicOS, adicionando apenas o que ainda não existe.
 *
 * Uso:
 *   bun run scripts/import-relatorio-completo.ts <arquivo.pdf> --dry-run
 *   bun run scripts/import-relatorio-completo.ts <arquivo.pdf> --apply [--skip-pdf-evolutions]
 *
 * Flags:
 *   --dry-run             Não grava nada; só relata o que entraria.
 *   --apply               Grava no banco.
 *   --skip-pdf-evolutions Ignora as entradas de evolução do tipo "pdf" (documentos).
 *   --create-patients     Cria pacientes do relatório que não existem (nome + contato).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const TENANT_ID = process.env.TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
const NEW_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const NEW_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PROFESSIONAL_ID = process.env.IMPORT_PROFESSIONAL_ID ?? "";

export type EvolutionEntry = { date: string; isPdf: boolean; text: string };
export type Payment = { date: string; methodLabel: string; amount: number };
export type Invoice = {
  medxId: string;
  date: string;
  statusLabel: string;
  total: number;
  payments: Payment[];
  paidTotal: number;
  openBalance: number;
  discount: number;
};
export type PatientBlock = {
  name: string;
  contactRaw: string;
  evolutions: EvolutionEntry[];
  invoices: Invoice[];
};

function requireEnv(label: string, value: string | undefined): string {
  if (!value) throw new Error(`Variável obrigatória ausente: ${label}`);
  return value;
}

export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function parseMoney(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function brDateToIso(d: string): string | null {
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function extractPdfText(pdfPath: string): string {
  return execSync(`npx pdf-parse text "${pdfPath.replace(/"/g, '\\"')}"`, {
    encoding: "utf8",
    maxBuffer: 80 * 1024 * 1024,
  });
}

function cleanLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(l))
    .filter((l) => !/^MEDX — RELATÓRIO COMPLETO/i.test(l))
    .filter((l) => !/^Página\s+\d+$/i.test(l));
}

const EVO_ANCHOR = /^EVOLUÇÕES \/ PRONTUÁRIO \((\d+)\)$/;
const FIN_ANCHOR = /^FINANCEIRO \((\d+) faturas?\)$/;
const EVO_DATE = /^(\d{2}\/\d{2}\/\d{4})\s+(pdf\s+)?(.*)$/;
const INVOICE_LINE = /^(ATD-\d+)\s+·\s+(\d{2}\/\d{2}\/\d{4})\s+·\s+(.+?)\s+R\$\s*([\d.,]+)$/;
const PAYMENT_LINE = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+R\$\s*([\d.,]+)$/;
// Variante sem forma de pagamento: "20/03/2026 R$ 600,00"
const PAYMENT_LINE_NO_METHOD = /^(\d{2}\/\d{2}\/\d{4})\s+R\$\s*([\d.,]+)$/;

export function parseReport(text: string): PatientBlock[] {
  const lines = cleanLines(text);
  const blocks: PatientBlock[] = [];

  // Índice de páginas 1-4: linhas "N Nome E F". Pulamos até o primeiro anchor de EVOLUÇÕES.
  const anchorIdxs: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (EVO_ANCHOR.test(lines[i])) anchorIdxs.push(i);
  }

  // Alguns pacientes não têm linha de contato; nesse caso o nome fica logo acima do anchor.
  // Contato = telefone / cpf / cnpj / email separados por " · " (sem nome próprio).
  const isContactLine = (l: string) => {
    if (!/\d/.test(l) && !l.includes("@")) return false;
    const tokens = l.split("·").map((t) => t.trim()).filter(Boolean);
    if (tokens.length === 0) return false;
    return tokens.every((t) => t.includes("@") || /^[\d\s.+()/-]+$/.test(t));
  };
  const headerFor = (evoIdx: number) => {
    const maybeContact = lines[evoIdx - 1];
    if (isContactLine(maybeContact)) {
      return { nameIdx: evoIdx - 2, name: lines[evoIdx - 2], contactRaw: maybeContact };
    }
    return { nameIdx: evoIdx - 1, name: maybeContact, contactRaw: "" };
  };

  for (let a = 0; a < anchorIdxs.length; a++) {
    const evoIdx = anchorIdxs[a];
    const { name, contactRaw } = headerFor(evoIdx);
    const endIdx = a + 1 < anchorIdxs.length ? headerFor(anchorIdxs[a + 1]).nameIdx : lines.length;

    const block: PatientBlock = { name, contactRaw, evolutions: [], invoices: [] };

    // localizar FINANCEIRO dentro do range
    let finIdx = -1;
    for (let i = evoIdx + 1; i < endIdx; i++) {
      if (FIN_ANCHOR.test(lines[i])) {
        finIdx = i;
        break;
      }
    }
    const evoEnd = finIdx === -1 ? endIdx : finIdx;

    // Evoluções
    let cur: EvolutionEntry | null = null;
    const pushCur = () => {
      if (cur) {
        cur.text = cur.text.trim();
        block.evolutions.push(cur);
        cur = null;
      }
    };
    for (let i = evoIdx + 1; i < evoEnd; i++) {
      const line = lines[i];
      if (line === "Data Tipo Evolução") continue;
      if (line === "Nenhuma evolução registrada.") continue;
      const m = line.match(EVO_DATE);
      if (m) {
        pushCur();
        const iso = brDateToIso(m[1]);
        if (!iso) continue;
        cur = { date: iso, isPdf: Boolean(m[2]), text: m[3] ?? "" };
      } else if (cur) {
        cur.text += `\n${line}`;
      }
    }
    pushCur();

    // Financeiro
    if (finIdx !== -1) {
      let inv: Invoice | null = null;
      let inPayments = false;
      const pushInv = () => {
        if (inv) {
          block.invoices.push(inv);
          inv = null;
        }
        inPayments = false;
      };
      for (let i = finIdx + 1; i < endIdx; i++) {
        const line = lines[i];
        if (line === "Bruto Desconto Líquido Pago Saldo") continue;
        if (line === "Data Pgto Forma de Pagamento Valor Pago") {
          inPayments = true;
          continue;
        }
        const invM = line.match(INVOICE_LINE);
        if (invM) {
          pushInv();
          inv = {
            medxId: invM[1],
            date: brDateToIso(invM[2]) ?? "",
            statusLabel: invM[3].trim(),
            total: parseMoney(invM[4]),
            payments: [],
            paidTotal: 0,
            openBalance: 0,
            discount: 0,
          };
          inPayments = false;
          continue;
        }
        if (!inv) continue;
        if (line.startsWith("TOTAL PAGO:")) {
          inv.paidTotal = parseMoney(line);
          inPayments = false;
          continue;
        }
        if (line.startsWith("SALDO EM ABERTO:")) {
          inv.openBalance = parseMoney(line);
          continue;
        }
        if (line.startsWith("Desconto aplicado:")) {
          inv.discount = Math.abs(parseMoney(line));
          continue;
        }
        // Variante sem pagamentos: "Fatura: R$ X | Sem pagamentos | Saldo: R$ Y"
        // O saldo (Y) é o líquido; a diferença para o bruto (X) é o desconto.
        const semPag = line.match(
          /^Fatura:\s*R\$\s*([\d.,]+)\s*\|\s*Sem pagamentos\s*\|\s*Saldo:\s*R\$\s*([\d.,]+)/i,
        );
        if (semPag) {
          const gross = parseMoney(semPag[1]);
          const saldo = parseMoney(semPag[2]);
          inv.discount = Math.max(0, Math.round((gross - saldo) * 100) / 100);
          inv.openBalance = saldo;
          continue;
        }
        if (inPayments) {
          const pm = line.match(PAYMENT_LINE);
          if (pm) {
            inv.payments.push({
              date: brDateToIso(pm[1]) ?? inv.date,
              methodLabel: pm[2].trim(),
              amount: parseMoney(pm[3]),
            });
          } else {
            const pmn = line.match(PAYMENT_LINE_NO_METHOD);
            if (pmn) {
              inv.payments.push({
                date: brDateToIso(pmn[1]) ?? inv.date,
                methodLabel: "",
                amount: parseMoney(pmn[2]),
              });
            }
          }
        }
      }
      pushInv();
    }

    blocks.push(block);
  }

  return blocks;
}

export function mapPaymentMethod(label: string): string {
  const f = label.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (!f.trim() || f === "-") return "other";
  if (f.includes("pix")) return "pix";
  if (f.includes("dinheiro")) return "cash";
  if (f.includes("debito")) return "debit_card";
  if (f.includes("credito") || f.includes("cartao") || f.includes("link")) return "credit_card";
  if (f.includes("transfer")) return "bank_transfer";
  if (f.includes("convenio") || f.includes("plano")) return "health_insurance";
  return "other";
}

export function buildBillStatus(net: number, paid: number): string {
  if (net <= 0) return "paid";
  if (paid <= 0) return "pending";
  if (paid >= net) return "paid";
  return "partial";
}

async function main() {
  const pdfPath = process.argv[2];
  const dryRun = !process.argv.includes("--apply");
  const skipPdfEvolutions = process.argv.includes("--skip-pdf-evolutions");
  const createPatients = process.argv.includes("--create-patients");

  if (!pdfPath || !existsSync(pdfPath)) {
    console.error("Uso: bun run scripts/import-relatorio-completo.ts <arquivo.pdf> [--apply] [--skip-pdf-evolutions] [--create-patients]");
    process.exit(1);
  }

  console.log("Extraindo PDF…");
  const blocks = parseReport(extractPdfText(pdfPath));
  const totalEvo = blocks.reduce((n, b) => n + b.evolutions.length, 0);
  const totalPdfEvo = blocks.reduce((n, b) => n + b.evolutions.filter((e) => e.isPdf).length, 0);
  const totalInv = blocks.reduce((n, b) => n + b.invoices.length, 0);
  console.log(`Relatório: ${blocks.length} pacientes | ${totalEvo} evoluções (${totalPdfEvo} pdf) | ${totalInv} faturas`);

  const supabase = createClient(
    requireEnv("SUPABASE_URL", NEW_URL),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY", NEW_SERVICE_KEY),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Profissional
  let professionalId = DEFAULT_PROFESSIONAL_ID;
  if (!professionalId) {
    const { data: pro } = await supabase
      .from("profiles")
      .select("id")
      .eq("tenant_id", TENANT_ID)
      .eq("role", "professional")
      .eq("active", true)
      .order("full_name")
      .limit(1)
      .maybeSingle();
    professionalId = pro?.id ?? "";
  }
  if (!professionalId) throw new Error("Profissional não encontrado (defina IMPORT_PROFESSIONAL_ID).");

  // Pacientes existentes
  const { data: patients, error: pErr } = await supabase
    .from("patients")
    .select("id, full_name")
    .eq("tenant_id", TENANT_ID);
  if (pErr) throw pErr;
  const byName = new Map<string, { id: string; full_name: string }>();
  for (const p of patients ?? []) byName.set(normalizeName(p.full_name), { id: p.id, full_name: p.full_name });

  // Faturas MEDX existentes
  const { data: existingBills } = await supabase
    .from("bills_receivable")
    .select("notes")
    .eq("tenant_id", TENANT_ID)
    .like("notes", "MEDX:%");
  const existingMedx = new Set<string>();
  for (const r of existingBills ?? []) {
    const m = String(r.notes ?? "").match(/MEDX:(ATD-\d+)/);
    if (m) existingMedx.add(m[1]);
  }

  // Serviço genérico para itens de cobrança das faturas importadas (consistência com importações anteriores).
  let genericServiceId = "";
  const ensureGenericService = async (): Promise<string> => {
    if (genericServiceId) return genericServiceId;
    const { data: existing } = await supabase
      .from("services")
      .select("id")
      .eq("tenant_id", TENANT_ID)
      .eq("name", "Atendimento MEDX (importado)")
      .maybeSingle();
    if (existing?.id) {
      genericServiceId = existing.id;
      return genericServiceId;
    }
    const { data: created, error } = await supabase
      .from("services")
      .insert({
        tenant_id: TENANT_ID,
        name: "Atendimento MEDX (importado)",
        default_price: 0,
        professional_id: professionalId,
        session_count: 1,
        active: true,
        category: "Importado MEDX",
      })
      .select("id")
      .single();
    if (error || !created) throw error ?? new Error("Falha ao criar serviço genérico");
    genericServiceId = created.id;
    return genericServiceId;
  };

  const stats = {
    matchedPatients: 0,
    newPatients: [] as string[],
    evoToAdd: 0,
    evoPdfToAdd: 0,
    evoDup: 0,
    invToAdd: 0,
    invDup: 0,
    invNoPatient: 0,
  };

  for (const block of blocks) {
    let match = byName.get(normalizeName(block.name));

    if (!match) {
      stats.newPatients.push(`${block.name}  [${block.contactRaw}]`);
      if (!createPatients) continue;
      if (!dryRun) {
        const digits = block.contactRaw.split("·")[0].replace(/\D/g, "");
        const { data: created, error: cErr } = await supabase
          .from("patients")
          .insert({
            tenant_id: TENANT_ID,
            full_name: block.name,
            phone: digits.length >= 10 && digits.length <= 11 ? digits : null,
            active: true,
          })
          .select("id, full_name")
          .single();
        if (cErr || !created) {
          console.error(`Erro ao criar paciente ${block.name}:`, cErr?.message);
          continue;
        }
        match = { id: created.id, full_name: created.full_name };
        byName.set(normalizeName(created.full_name), match);
      } else {
        continue;
      }
    }
    stats.matchedPatients++;

    // Evoluções — dedup por data + prefixo do texto
    const evoToConsider = block.evolutions.filter((e) => (skipPdfEvolutions ? !e.isPdf : true));
    if (evoToConsider.length > 0 && match) {
      const { data: existingEvo } = await supabase
        .from("patient_evolutions")
        .select("date, evolution_text")
        .eq("patient_id", match.id);
      const existingKeys = new Set(
        (existingEvo ?? []).map(
          (e) => `${e.date}|${normalizeName((e.evolution_text ?? "").slice(0, 80))}`,
        ),
      );

      for (const ev of evoToConsider) {
        const body = ev.isPdf ? `[Documento] ${ev.text}` : ev.text;
        if (!body.trim()) continue;
        const key = `${ev.date}|${normalizeName(body.slice(0, 80))}`;
        if (existingKeys.has(key)) {
          stats.evoDup++;
          continue;
        }
        existingKeys.add(key);
        if (ev.isPdf) stats.evoPdfToAdd++;
        else stats.evoToAdd++;

        if (!dryRun) {
          const createdAt = `${ev.date}T12:00:00`;
          const { data: mr, error: mrErr } = await supabase
            .from("medical_records")
            .insert({
              tenant_id: TENANT_ID,
              patient_id: match.id,
              professional_id: professionalId,
              date: ev.date,
              chief_complaint: body.slice(0, 500),
              notes: "Importado do relatório MEDX",
            })
            .select("id")
            .single();
          if (mrErr || !mr) {
            console.error(`Erro medical_record ${block.name} ${ev.date}:`, mrErr?.message);
            continue;
          }
          const { error: evErr } = await supabase.from("patient_evolutions").insert({
            tenant_id: TENANT_ID,
            patient_id: match.id,
            professional_id: professionalId,
            medical_record_id: mr.id,
            date: ev.date,
            evolution_text: body,
            created_at: createdAt,
            updated_at: createdAt,
          });
          if (evErr) console.error(`Erro evolução ${block.name} ${ev.date}:`, evErr.message);
        }
      }
    }

    // Faturas — dedup por ATD id
    for (const inv of block.invoices) {
      if (!match) {
        stats.invNoPatient++;
        continue;
      }
      if (existingMedx.has(inv.medxId)) {
        stats.invDup++;
        continue;
      }
      existingMedx.add(inv.medxId);
      stats.invToAdd++;
      if (dryRun) continue;

      // inv.total é o valor BRUTO; o líquido desconta o "Desconto aplicado".
      const net = Math.max(0, Math.round((inv.total - inv.discount) * 100) / 100);
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0) || inv.paidTotal;
      const status = buildBillStatus(net, paid);
      const lastPay = inv.payments.at(-1);
      const notes = [
        `MEDX:${inv.medxId}`,
        `Paciente: ${match.full_name}`,
        `Status MEDX: ${inv.statusLabel}`,
        inv.discount > 0 ? `Desconto: R$ ${inv.discount.toFixed(2)}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      const { data: charge, error: chErr } = await supabase
        .from("consultation_charges")
        .insert({
          tenant_id: TENANT_ID,
          patient_id: match.id,
          professional_id: professionalId,
          price_table: "particular",
        })
        .select("id")
        .single();
      if (chErr || !charge) {
        console.error(`Erro charge ${inv.medxId}:`, chErr?.message);
        continue;
      }

      const serviceId = await ensureGenericService();
      const { error: itemErr } = await supabase.from("consultation_charge_items").insert({
        charge_id: charge.id,
        service_id: serviceId,
        quantity: 1,
        unit_price: net,
        total_price: net,
        item_type: "charge",
      });
      if (itemErr) console.error(`Erro item ${inv.medxId}:`, itemErr.message);

      const { data: bill, error: bErr } = await supabase
        .from("bills_receivable")
        .insert({
          tenant_id: TENANT_ID,
          patient_id: match.id,
          professional_id: professionalId,
          consultation_charge_id: charge.id,
          description: `Venda MEDX ${inv.medxId}`,
          amount: net,
          paid_amount: Math.min(paid, net),
          due_date: inv.date,
          competence_date: inv.date,
          paid_date: status === "paid" ? (lastPay?.date ?? inv.date) : null,
          payment_method: lastPay ? mapPaymentMethod(lastPay.methodLabel) : null,
          status,
          notes,
        })
        .select("id")
        .single();
      if (bErr || !bill) {
        console.error(`Erro bill ${inv.medxId}:`, bErr?.message);
        continue;
      }
      await supabase.from("consultation_charges").update({ bill_receivable_id: bill.id }).eq("id", charge.id);

      for (const p of inv.payments) {
        if (p.amount <= 0) continue;
        const method = mapPaymentMethod(p.methodLabel);
        const { error: payErr } = await supabase.from("bill_payments").insert({
          tenant_id: TENANT_ID,
          bill_receivable_id: bill.id,
          patient_id: match.id,
          professional_id: professionalId,
          amount: p.amount,
          fee_amount: 0,
          net_amount: p.amount,
          payment_method: method,
          paid_date: p.date,
          notes: p.methodLabel,
          status: "active",
          created_by: professionalId,
        });
        if (payErr) console.error(`Erro pagamento ${inv.medxId}:`, payErr.message);
      }
    }
  }

  console.log("\n===== RESUMO =====");
  console.log(`Pacientes no relatório: ${blocks.length}`);
  console.log(`Pacientes encontrados no ClinicOS: ${stats.matchedPatients}`);
  console.log(`Pacientes NOVOS (não existem): ${stats.newPatients.length}`);
  console.log(`Evoluções de texto ${dryRun ? "a adicionar" : "adicionadas"}: ${stats.evoToAdd}`);
  console.log(`Evoluções pdf/documento ${skipPdfEvolutions ? "(IGNORADAS)" : dryRun ? "a adicionar" : "adicionadas"}: ${stats.evoPdfToAdd}`);
  console.log(`Evoluções duplicadas (puladas): ${stats.evoDup}`);
  console.log(`Faturas ${dryRun ? "a adicionar" : "adicionadas"}: ${stats.invToAdd}`);
  console.log(`Faturas duplicadas (puladas): ${stats.invDup}`);

  if (stats.newPatients.length) {
    console.log("\n--- Pacientes do relatório que NÃO existem no ClinicOS ---");
    for (const n of stats.newPatients) console.log("  •", n);
    if (!createPatients) console.log("  (use --create-patients para cadastrá-los)");
  }

  console.log(dryRun ? "\n(DRY-RUN — nada foi gravado)" : "\n✓ Importação concluída.");
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
