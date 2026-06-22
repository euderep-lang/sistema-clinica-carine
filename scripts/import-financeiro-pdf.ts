/**
 * Importa faturas financeiras do relatório MEDX (PDF) para bills_receivable,
 * consultation_charges, consultation_charge_items e bill_payments.
 *
 * Uso:
 *   bun run scripts/import-financeiro-pdf.ts /caminho/financeiro_detalhado.pdf
 *   bun run scripts/import-financeiro-pdf.ts /caminho/arquivo.pdf --dry-run
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

const TENANT_ID = process.env.TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
const NEW_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const NEW_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PROFESSIONAL_ID = process.env.IMPORT_PROFESSIONAL_ID ?? "";

type ParsedItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type ParsedPayment = {
  date: string;
  methodLabel: string;
  amount: number;
};

type ParsedInvoice = {
  medxId: string;
  invoiceDate: string;
  statusLabel: string;
  items: ParsedItem[];
  genericAmount: number | null;
  subtotal: number;
  discount: number;
  discountPercent: number | null;
  netAmount: number;
  payments: ParsedPayment[];
  openBalance: number;
};

type ParsedPatient = {
  name: string;
  grossTotal: number;
  discountTotal: number;
  netTotal: number;
  paidTotal: number;
  openTotal: number;
  invoices: ParsedInvoice[];
};

function requireEnv(label: string, value: string | undefined): string {
  if (!value) throw new Error(`Variável obrigatória ausente: ${label}`);
  return value;
}

function normalizeName(name: string): string {
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

function parsePercent(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function extractPdfText(pdfPath: string): string {
  try {
    return execSync(`npx pdf-parse text "${pdfPath.replace(/"/g, '\\"')}"`, {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (e) {
    throw new Error(`Falha ao extrair PDF: ${(e as Error).message}`);
  }
}

function cleanPdfText(raw: string): string {
  return raw
    .replace(/FINANCEIRO MEDX[^\n]*\nPágina \d+/g, "")
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "")
    .replace(/Relatório gerado automaticamente[\s\S]*$/m, "")
    .replace(/PACIENTES COM SALDO EM ABERTO[\s\S]*?(?=^[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/m, "");
}

function isPatientHeaderLine(line: string): boolean {
  if (!line || line.length < 5) return false;
  if (/^(Fatura|Procedimento|Subtotal|Desconto|Valor|Data Pgto|TOTAL|SALDO|Sem itens|Paciente|Total |Valor$|Saldo Em|Aberto)/i.test(line)) {
    return false;
  }
  if (/R\$/.test(line)) return false;
  if (/^\d{4}-\d{2}-\d{2}/.test(line)) return false;
  if (/^ATD-/.test(line)) return false;
  if (/^Consulta/.test(line)) return false;
  if (/^Tirzepatida/.test(line)) return false;
  if (/^[A-Z]{2,}/.test(line) && line.includes("(")) return false;
  return /^[A-ZÁÉÍÓÚÂÊÔÃÕÇÉ]/.test(line);
}

function mapPaymentMethod(label: string): string {
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

function inferSessionCount(name: string): number {
  const n = name.toLowerCase();
  const m = n.match(/(\d+)\s*doses?/);
  if (m) return Math.max(1, Number(m[1]));
  if (n.includes("8 doses") || n.includes("progressivas")) return 8;
  if (n.includes("12 semanas")) return 12;
  return 1;
}

function parseFinanceiroPdf(text: string): ParsedPatient[] {
  const lines = cleanPdfText(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const patients: ParsedPatient[] = [];
  let currentPatient: ParsedPatient | null = null;
  let currentInvoice: ParsedInvoice | null = null;
  let inItems = false;
  let inPayments = false;

  const flushInvoice = () => {
    if (!currentPatient || !currentInvoice) return;
    if (currentInvoice.items.length === 0 && currentInvoice.genericAmount == null) {
      currentInvoice.netAmount = currentInvoice.subtotal || currentInvoice.netAmount;
    }
    if (currentInvoice.netAmount === 0 && currentInvoice.subtotal > 0 && currentInvoice.discount > 0) {
      currentInvoice.netAmount = Math.max(0, currentInvoice.subtotal - currentInvoice.discount);
    }
    if (currentInvoice.netAmount === 0 && currentInvoice.subtotal > 0 && currentInvoice.discount === 0) {
      currentInvoice.netAmount = currentInvoice.subtotal;
    }
    currentPatient.invoices.push(currentInvoice);
    currentInvoice = null;
    inItems = false;
    inPayments = false;
  };

  const flushPatient = () => {
    flushInvoice();
    if (currentPatient && currentPatient.invoices.length > 0) {
      patients.push(currentPatient);
    }
    currentPatient = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1] ?? "";

    if (next.startsWith("Total Bruto R$") && isPatientHeaderLine(line)) {
      flushPatient();
      currentPatient = {
        name: line,
        grossTotal: 0,
        discountTotal: 0,
        netTotal: 0,
        paidTotal: 0,
        openTotal: 0,
        invoices: [],
      };
      continue;
    }

    if (!currentPatient) continue;

    if (line.startsWith("Total Bruto R$")) {
      currentPatient.grossTotal = parseMoney(line);
      continue;
    }
    if (line.startsWith("Desconto R$") && !line.includes("(")) {
      currentPatient.discountTotal = parseMoney(line.replace(/^Desconto R\$/, "R$"));
      continue;
    }
    if (line === "Valor" && next.startsWith("Líquido R$")) {
      currentPatient.netTotal = parseMoney(next);
      continue;
    }
    if (line.startsWith("Valor Líquido R$")) {
      currentPatient.netTotal = parseMoney(line);
      continue;
    }
    if (line.startsWith("Total Pago R$")) {
      currentPatient.paidTotal = parseMoney(line);
      continue;
    }
    if (line === "Saldo Em" && next.startsWith("Aberto R$")) {
      currentPatient.openTotal = parseMoney(next);
      continue;
    }
    if (line.startsWith("Saldo Em Aberto R$")) {
      currentPatient.openTotal = parseMoney(line);
      continue;
    }

    const faturaMatch = line.match(
      /^Fatura \d+ · (ATD-\d+) · (\d{4}-\d{2}-\d{2}) · Particular \d+ (.+)$/,
    );
    if (faturaMatch) {
      flushInvoice();
      currentInvoice = {
        medxId: faturaMatch[1],
        invoiceDate: faturaMatch[2],
        statusLabel: faturaMatch[3],
        items: [],
        genericAmount: null,
        subtotal: 0,
        discount: 0,
        discountPercent: null,
        netAmount: 0,
        payments: [],
        openBalance: 0,
      };
      inItems = false;
      inPayments = false;
      continue;
    }

    if (!currentInvoice) continue;

    if (line.startsWith("Sem itens de procedimento detalhados.")) {
      currentInvoice.genericAmount = parseMoney(line);
      continue;
    }

    if (line.startsWith("Procedimento Qtd Valor Unit.")) {
      inItems = true;
      inPayments = false;
      continue;
    }

    if (line.startsWith("Subtotal:")) {
      inItems = false;
      currentInvoice.subtotal = parseMoney(line);
      continue;
    }

    const discountMatch = line.match(/^Desconto \(([\d.,]+)%\):\s*-?\s*R?\$?\s*([\d.,]+)$/);
    if (discountMatch) {
      currentInvoice.discountPercent = parsePercent(discountMatch[1]);
      currentInvoice.discount = parseMoney(discountMatch[2]);
      continue;
    }

    if (line.startsWith("Valor Líquido:")) {
      currentInvoice.netAmount = parseMoney(line);
      continue;
    }

    if (line.startsWith("Data Pgto Forma / Parcela Valor Recebido")) {
      inPayments = true;
      inItems = false;
      continue;
    }

    if (line.startsWith("TOTAL PAGO")) {
      inPayments = false;
      continue;
    }

    if (line.startsWith("SALDO EM ABERTO") || line.startsWith("Saldo em aberto:")) {
      inPayments = false;
      currentInvoice.openBalance = parseMoney(line);
      continue;
    }

    if (inPayments) {
      const payMatch = line.match(/^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+R\$\s*([\d.,]+)$/);
      if (payMatch) {
        currentInvoice.payments.push({
          date: payMatch[1],
          methodLabel: payMatch[2].trim(),
          amount: parseMoney(payMatch[3]),
        });
      }
      continue;
    }

    if (inItems) {
      const itemMatch = line.match(/^(.+?)(\d+)\s+R\$\s*([\d.,]+)\s+R\$\s*([\d.,]+)$/);
      if (itemMatch) {
        currentInvoice.items.push({
          name: itemMatch[1].trim(),
          quantity: Number(itemMatch[2]),
          unitPrice: parseMoney(itemMatch[3]),
          totalPrice: parseMoney(itemMatch[4]),
        });
      }
    }
  }

  flushPatient();
  return patients;
}

async function resolveProfessionalId(supabase: SupabaseClient): Promise<string> {
  if (DEFAULT_PROFESSIONAL_ID) return DEFAULT_PROFESSIONAL_ID;
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .eq("role", "professional")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("Profissional não encontrado. Defina IMPORT_PROFESSIONAL_ID.");
  return data.id;
}

async function loadPatientsMap(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name")
    .eq("tenant_id", TENANT_ID);
  if (error) throw error;
  const map = new Map<string, { id: string; name: string }>();
  for (const p of data ?? []) {
    map.set(normalizeName(p.full_name), { id: p.id, name: p.full_name });
  }
  return map;
}

async function loadExistingMedxIds(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("bills_receivable")
    .select("notes")
    .eq("tenant_id", TENANT_ID)
    .like("notes", "MEDX:%");
  if (error) throw error;
  const ids = new Set<string>();
  for (const row of data ?? []) {
    const m = String(row.notes ?? "").match(/MEDX:(ATD-\d+)/);
    if (m) ids.add(m[1]);
  }
  return ids;
}

async function ensureService(
  supabase: SupabaseClient,
  cache: Map<string, string>,
  name: string,
  unitPrice: number,
  professionalId: string,
  dryRun: boolean,
): Promise<string> {
  const key = normalizeName(name);
  const cached = cache.get(key);
  if (cached) return cached;

  if (dryRun) {
    const fake = `dry-${cache.size + 1}`;
    cache.set(key, fake);
    return fake;
  }

  const sessionCount = inferSessionCount(name);
  const { data, error } = await supabase
    .from("services")
    .insert({
      tenant_id: TENANT_ID,
      name: name.trim(),
      default_price: unitPrice,
      professional_id: professionalId,
      session_count: sessionCount,
      active: true,
      category: "Importado MEDX",
    })
    .select("id")
    .single();
  if (error) throw error;
  cache.set(key, data.id);
  return data.id;
}

async function loadPaymentFeeRates(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("payment_method_configs")
    .select("method, fee_percent, fee_fixed, active")
    .eq("tenant_id", TENANT_ID);
  if (error) throw error;
  const map = new Map<string, { percent: number; fixed: number }>();
  for (const row of data ?? []) {
    if (!row.active) continue;
    map.set(row.method, {
      percent: Number(row.fee_percent ?? 0),
      fixed: Number(row.fee_fixed ?? 0),
    });
  }
  return map;
}

function computePaymentNet(
  amount: number,
  method: string,
  feeRates: Map<string, { percent: number; fixed: number }>,
): { feeAmount: number; netAmount: number } {
  const cfg = feeRates.get(method) ?? { percent: 0, fixed: 0 };
  let feeAmount = Math.round(((amount * cfg.percent) / 100 + cfg.fixed) * 100) / 100;
  if (feeAmount > amount) feeAmount = amount;
  return { feeAmount, netAmount: Math.round((amount - feeAmount) * 100) / 100 };
}

function buildBillStatus(netAmount: number, paidAmount: number): string {
  if (netAmount <= 0) return "paid";
  if (paidAmount <= 0) return "pending";
  if (paidAmount >= netAmount) return "paid";
  return "partial";
}

function buildDescription(invoice: ParsedInvoice): string {
  if (invoice.items.length > 0) {
    const parts = invoice.items.map((it) => `${it.quantity}x ${it.name}`);
    return `Venda MEDX: ${parts.join(", ")}`;
  }
  if (invoice.genericAmount != null) {
    return `Venda MEDX: procedimentos (R$ ${invoice.genericAmount.toFixed(2)})`;
  }
  return `Venda MEDX ${invoice.medxId}`;
}

async function importInvoice(
  supabase: SupabaseClient,
  patientId: string,
  professionalId: string,
  patientName: string,
  invoice: ParsedInvoice,
  serviceCache: Map<string, string>,
  feeRates: Map<string, { percent: number; fixed: number }>,
  dryRun: boolean,
) {
  const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  let netAmount = invoice.netAmount;
  if (netAmount <= 0 && invoice.subtotal > 0) {
    netAmount = Math.max(0, invoice.subtotal - invoice.discount);
  }
  if (netAmount <= 0 && invoice.genericAmount != null) {
    netAmount = invoice.genericAmount;
  }
  if (netAmount <= 0 && invoice.subtotal > 0 && invoice.discount === 0) {
    netAmount = invoice.subtotal;
  }

  const notesParts = [
    `MEDX:${invoice.medxId}`,
    `Paciente: ${patientName}`,
    `Status MEDX: ${invoice.statusLabel}`,
  ];
  if (invoice.discount > 0) {
    notesParts.push(
      `Desconto: R$ ${invoice.discount.toFixed(2)}${invoice.discountPercent != null ? ` (${invoice.discountPercent}%)` : ""}`,
    );
  }
  if (invoice.subtotal > 0) {
    notesParts.push(`Subtotal bruto: R$ ${invoice.subtotal.toFixed(2)}`);
  }
  const notes = notesParts.join(" | ");

  if (dryRun) {
    return {
      medxId: invoice.medxId,
      netAmount,
      paidAmount,
      items: invoice.items.length,
      payments: invoice.payments.length,
    };
  }

  const { data: charge, error: chargeErr } = await supabase
    .from("consultation_charges")
    .insert({
      tenant_id: TENANT_ID,
      patient_id: patientId,
      professional_id: professionalId,
      price_table: "particular",
    })
    .select("id")
    .single();
  if (chargeErr) throw chargeErr;

  const lineItems: ParsedItem[] =
    invoice.items.length > 0
      ? invoice.items
      : invoice.genericAmount != null
        ? [
            {
              name: "Procedimentos MEDX (sem detalhamento)",
              quantity: 1,
              unitPrice: invoice.genericAmount,
              totalPrice: invoice.genericAmount,
            },
          ]
        : netAmount > 0
          ? [
              {
                name: `Fatura ${invoice.medxId}`,
                quantity: 1,
                unitPrice: netAmount,
                totalPrice: netAmount,
              },
            ]
          : [
              {
                name: "Cortesia / desconto total MEDX",
                quantity: 1,
                unitPrice: 0,
                totalPrice: 0,
              },
            ];

  for (const item of lineItems) {
    const serviceId = await ensureService(
      supabase,
      serviceCache,
      item.name,
      item.unitPrice,
      professionalId,
      false,
    );
    const itemType =
      inferSessionCount(item.name) > 1 && item.quantity === 1 ? "session_sale" : "charge";
    const { error: itemErr } = await supabase.from("consultation_charge_items").insert({
      charge_id: charge.id,
      service_id: serviceId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      item_type: itemType,
    });
    if (itemErr) throw itemErr;
  }

  const status = buildBillStatus(netAmount, paidAmount);
  const lastPayment = invoice.payments.at(-1);

  const { data: bill, error: billErr } = await supabase
    .from("bills_receivable")
    .insert({
      tenant_id: TENANT_ID,
      patient_id: patientId,
      professional_id: professionalId,
      consultation_charge_id: charge.id,
      description: buildDescription(invoice),
      amount: netAmount,
      paid_amount: Math.min(paidAmount, netAmount),
      due_date: invoice.invoiceDate,
      competence_date: invoice.invoiceDate,
      paid_date: status === "paid" ? (lastPayment?.date ?? invoice.invoiceDate) : null,
      payment_method: lastPayment ? mapPaymentMethod(lastPayment.methodLabel) : null,
      status,
      notes,
    })
    .select("id")
    .single();
  if (billErr) throw billErr;

  await supabase
    .from("consultation_charges")
    .update({ bill_receivable_id: bill.id })
    .eq("id", charge.id);

  for (const payment of invoice.payments) {
    const method = mapPaymentMethod(payment.methodLabel);
    const { feeAmount, netAmount: paymentNet } = computePaymentNet(
      payment.amount,
      method,
      feeRates,
    );
    const { error: payErr } = await supabase.from("bill_payments").insert({
      tenant_id: TENANT_ID,
      bill_receivable_id: bill.id,
      patient_id: patientId,
      professional_id: professionalId,
      amount: payment.amount,
      fee_amount: feeAmount,
      net_amount: paymentNet,
      payment_method: method,
      paid_date: payment.date,
      notes: payment.methodLabel,
      status: "active",
      created_by: professionalId,
    });
    if (payErr) throw payErr;
  }

  return { medxId: invoice.medxId, billId: bill.id, netAmount, paidAmount };
}

async function main() {
  const filePath = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!filePath) {
    console.error("Uso: bun run scripts/import-financeiro-pdf.ts <financeiro.pdf> [--dry-run]");
    process.exit(1);
  }

  console.log(`Extraindo PDF: ${filePath}`);
  const text = extractPdfText(filePath);
  const patients = parseFinanceiroPdf(text);
  const invoiceCount = patients.reduce((n, p) => n + p.invoices.length, 0);

  console.log(`Pacientes: ${patients.length} | Faturas: ${invoiceCount}`);

  if (dryRun) {
    let missingPatients = 0;
    const supabase = createClient(
      requireEnv("SUPABASE_URL", NEW_URL),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY", NEW_SERVICE_KEY),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const patientMap = await loadPatientsMap(supabase);
    for (const p of patients) {
      if (!patientMap.has(normalizeName(p.name))) missingPatients++;
    }
    console.log(`Pacientes sem match no banco: ${missingPatients}`);
    console.log("Amostra:");
    for (const p of patients.slice(0, 2)) {
      console.log({
        patient: p.name,
        invoices: p.invoices.length,
        open: p.openTotal,
        first: p.invoices[0],
      });
    }
    return;
  }

  const supabase = createClient(
    requireEnv("SUPABASE_URL", NEW_URL),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY", NEW_SERVICE_KEY),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const professionalId = await resolveProfessionalId(supabase);
  const patientMap = await loadPatientsMap(supabase);
  const existingMedx = await loadExistingMedxIds(supabase);

  const { data: existingServices } = await supabase
    .from("services")
    .select("id, name")
    .eq("tenant_id", TENANT_ID);
  const serviceCache = new Map<string, string>();
  for (const s of existingServices ?? []) {
    serviceCache.set(normalizeName(s.name), s.id);
  }
  const feeRates = await loadPaymentFeeRates(supabase);

  let imported = 0;
  let skipped = 0;
  let missing = 0;
  const missingNames = new Set<string>();

  for (const patient of patients) {
    const match = patientMap.get(normalizeName(patient.name));
    if (!match) {
      missing++;
      missingNames.add(patient.name);
      continue;
    }

    for (const invoice of patient.invoices) {
      if (existingMedx.has(invoice.medxId)) {
        skipped++;
        continue;
      }

      await importInvoice(
        supabase,
        match.id,
        professionalId,
        match.name,
        invoice,
        serviceCache,
        feeRates,
        false,
      );
      existingMedx.add(invoice.medxId);
      imported++;
      if (imported % 25 === 0) {
        console.log(`... ${imported} faturas importadas`);
      }
    }
  }

  console.log("\nImportação concluída.");
  console.log(`Importadas: ${imported}`);
  console.log(`Ignoradas (já existiam): ${skipped}`);
  console.log(`Pacientes sem match: ${missing}`);
  if (missingNames.size > 0) {
    console.log("Pacientes não encontrados:");
    for (const name of [...missingNames].sort()) console.log(`  - ${name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
