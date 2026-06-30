/**
 * Emissão de NFS-e via Focus NFe (https://focusnfe.com.br).
 *
 * Requer:
 *  - Variável de ambiente FOCUS_NFE_TOKEN (token da Focus NFe).
 *  - Variável de ambiente FOCUS_NFE_ENV = "producao" | "homologacao" (default homologacao).
 *  - Configuração do prestador salva em tenant_settings (key "nfse"), contendo
 *    CNPJ, inscrição municipal, código do serviço, alíquota ISS, item da lista, etc.
 */
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface NfsePrestadorConfig {
  cnpj: string;
  inscricao_municipal: string;
  codigo_municipio: string; // IBGE
  razao_social?: string;
  item_lista_servico: string; // ex.: "0801"
  codigo_tributario_municipio?: string;
  aliquota: number; // ex.: 2 (=2%)
  iss_retido?: boolean;
  discriminacao_padrao?: string;
  regime_tributario?: string;
}

function focusBaseUrl(): string {
  const env = process.env.FOCUS_NFE_ENV ?? "homologacao";
  return env === "producao"
    ? "https://api.focusnfe.com.br"
    : "https://homologacao.focusnfe.com.br";
}

function focusAuthHeader(): string {
  const token = process.env.FOCUS_NFE_TOKEN;
  if (!token) throw new Error("FOCUS_NFE_TOKEN não configurado no servidor.");
  return "Basic " + Buffer.from(`${token}:`).toString("base64");
}

function onlyDigits(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "");
}

async function getNfseConfig(tenantId: string): Promise<NfsePrestadorConfig> {
  const { data } = await supabaseAdmin
    .from("tenant_settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("key", "nfse")
    .maybeSingle();
  if (!data?.value) {
    throw new Error("Configuração de NFS-e não encontrada. Configure os dados do prestador em Integrações.");
  }
  const cfg = (typeof data.value === "string" ? JSON.parse(data.value) : data.value) as NfsePrestadorConfig;
  if (!cfg.cnpj || !cfg.inscricao_municipal || !cfg.codigo_municipio || !cfg.item_lista_servico) {
    throw new Error("Configuração de NFS-e incompleta (CNPJ, inscrição municipal, código do município e item da lista de serviço são obrigatórios).");
  }
  return cfg;
}

export const emitNfse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { billId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, tenant_id, role")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.tenant_id) throw new Error("Perfil não encontrado");

    const { data: bill, error: billErr } = await supabaseAdmin
      .from("bills_receivable")
      .select("id, tenant_id, amount, description, nfse_status, nfse_focus_ref, patients(full_name, cpf, email, phone, address_street, address_number, address_neighborhood, address_city, address_state, address_zip)")
      .eq("id", data.billId)
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();
    if (billErr || !bill) throw new Error("Fatura não encontrada");

    const b = bill as unknown as {
      id: string;
      tenant_id: string;
      amount: number;
      description: string | null;
      nfse_status: string | null;
      patients: {
        full_name: string; cpf: string | null; email: string | null; phone: string | null;
        address_street: string | null; address_number: string | null; address_neighborhood: string | null;
        address_city: string | null; address_state: string | null; address_zip: string | null;
      } | null;
    };

    if (b.nfse_status === "issued") throw new Error("NFS-e já emitida para esta fatura.");

    const cfg = await getNfseConfig(profile.tenant_id);
    const ref = `bill-${b.id}`;
    const valor = Number(b.amount);
    const discriminacao = b.description?.trim() || cfg.discriminacao_padrao || "Prestação de serviços de saúde";

    const tomadorCpf = onlyDigits(b.patients?.cpf);
    const tomador: Record<string, unknown> = {
      razao_social: b.patients?.full_name ?? "Consumidor",
      email: b.patients?.email ?? undefined,
    };
    if (tomadorCpf.length === 11) tomador.cpf = tomadorCpf;
    if (b.patients?.address_street) {
      tomador.endereco = {
        logradouro: b.patients.address_street,
        numero: b.patients.address_number ?? "S/N",
        bairro: b.patients.address_neighborhood ?? "",
        codigo_municipio: cfg.codigo_municipio,
        uf: b.patients.address_state ?? "",
        cep: onlyDigits(b.patients.address_zip),
      };
    }

    const payload = {
      data_emissao: new Date().toISOString(),
      prestador: {
        cnpj: onlyDigits(cfg.cnpj),
        inscricao_municipal: cfg.inscricao_municipal,
        codigo_municipio: cfg.codigo_municipio,
      },
      tomador,
      servico: {
        aliquota: cfg.aliquota,
        discriminacao,
        iss_retido: cfg.iss_retido ?? false,
        item_lista_servico: cfg.item_lista_servico,
        codigo_tributario_municipio: cfg.codigo_tributario_municipio ?? undefined,
        valor_servicos: valor,
      },
    };

    const res = await fetch(`${focusBaseUrl()}/v2/nfse?ref=${encodeURIComponent(ref)}`, {
      method: "POST",
      headers: { Authorization: focusAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (res.status === 422 || (body.codigo && body.status === "erro")) {
      const msg = (body.mensagem as string) || JSON.stringify(body.erros ?? body);
      await supabaseAdmin
        .from("bills_receivable")
        .update({ nfse_status: "failed", nfse_focus_ref: ref, nfse_message: msg } as never)
        .eq("id", b.id);
      throw new Error(`Focus NFe recusou: ${msg}`);
    }

    if (!res.ok && res.status !== 202) {
      const msg = (body.mensagem as string) || `HTTP ${res.status}`;
      await supabaseAdmin
        .from("bills_receivable")
        .update({ nfse_status: "failed", nfse_focus_ref: ref, nfse_message: msg } as never)
        .eq("id", b.id);
      throw new Error(`Erro ao emitir NFS-e: ${msg}`);
    }

    await supabaseAdmin
      .from("bills_receivable")
      .update({ nfse_status: "processing", nfse_focus_ref: ref, nfse_message: null } as never)
      .eq("id", b.id);

    return { ref, status: "processing" as const };
  });

export const consultNfse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { billId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.tenant_id) throw new Error("Perfil não encontrado");

    const { data: bill } = await supabaseAdmin
      .from("bills_receivable")
      .select("id, nfse_focus_ref")
      .eq("id", data.billId)
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();
    const ref = (bill as { nfse_focus_ref: string | null } | null)?.nfse_focus_ref;
    if (!ref) throw new Error("Esta fatura ainda não foi enviada para emissão.");

    const res = await fetch(`${focusBaseUrl()}/v2/nfse/${encodeURIComponent(ref)}`, {
      headers: { Authorization: focusAuthHeader() },
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const status = body.status as string | undefined;

    if (status === "autorizado") {
      await supabaseAdmin
        .from("bills_receivable")
        .update({
          nfse_status: "issued",
          nfse_number: (body.numero as string) ?? null,
          nfse_issued_at: new Date().toISOString(),
          nfse_url: (body.url as string) ?? null,
          nfse_pdf_url: (body.caminho_danfse as string)
            ? `${focusBaseUrl()}${body.caminho_danfse as string}`
            : null,
          nfse_message: null,
        } as never)
        .eq("id", data.billId);
      return { status: "issued" as const, numero: body.numero ?? null };
    }

    if (status === "erro" || status === "cancelado") {
      const msg = (body.mensagem as string) || "Falha na emissão";
      await supabaseAdmin
        .from("bills_receivable")
        .update({ nfse_status: status === "cancelado" ? "cancelled" : "failed", nfse_message: msg } as never)
        .eq("id", data.billId);
      return { status: status === "cancelado" ? ("cancelled" as const) : ("failed" as const), message: msg };
    }

    return { status: "processing" as const };
  });
