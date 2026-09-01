/**
 * Emissão de NFS-e via Focus NFe — Emissor Nacional (DPS).
 *
 * A prefeitura passou a emitir pelo Ambiente Nacional da NFS-e.
 * A Focus expõe isso em POST/GET /v2/nfsen (payload achatado), não mais
 * no layout municipal ABRASF POST /v2/nfse.
 *
 * Notas antigas (nfse_modo = municipal) continuam sendo consultadas em /v2/nfse.
 *
 * Requer:
 *  - FOCUS_NFE_TOKEN e FOCUS_NFE_ENV no servidor
 *  - tenant_settings key "nfse" com dados do prestador
 *  - Ambiente Nacional habilitado na empresa, no painel Focus
 *
 * Guia: https://focusnfe.com.br/guides/nfse/municipios-integrados/municipios-da-nfse-nacional/
 */
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ModoNfse = "nacional" | "municipal";

interface NfsePrestadorConfig {
  cnpj: string;
  inscricao_municipal: string;
  codigo_municipio: string;
  item_lista_servico?: string;
  codigo_tributario_municipio?: string;
  aliquota?: number;
  iss_retido?: boolean;
  discriminacao_padrao?: string;
  codigo_nbs?: string;
  natureza_operacao?: string;
  optante_simples_nacional?: boolean;
  regime_especial_tributacao?: string;
  codigo_tributacao_nacional_iss?: string;
  codigo_tributacao_municipal_iss?: string;
  dps_serie?: string;
  opcao_simples_nacional?: string | number;
  percentual_total_tributos_simples_nacional?: string;
}

type PatientSlice = {
  full_name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
};

const REGIME_ESPECIAL_VALIDOS = new Set([0, 1, 2, 3, 4, 5, 6, 9]);

function focusEnvName(): "producao" | "homologacao" {
  const raw = (process.env.FOCUS_NFE_ENV ?? "homologacao").trim().toLowerCase();
  return raw === "producao" || raw === "produção" || raw === "production" ? "producao" : "homologacao";
}

function focusBaseUrl(): string {
  return focusEnvName() === "producao"
    ? "https://api.focusnfe.com.br"
    : "https://homologacao.focusnfe.com.br";
}

function focusToken(): string {
  let token = (process.env.FOCUS_NFE_TOKEN ?? "").trim();
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }
  if (token.toLowerCase().startsWith("basic ")) token = token.slice(6).trim();
  if (token.toLowerCase().startsWith("bearer ")) token = token.slice(7).trim();
  return token;
}

function focusAuthHeader(): string {
  const token = focusToken();
  if (!token) throw new Error("FOCUS_NFE_TOKEN não configurado no servidor.");
  return "Basic " + Buffer.from(`${token}:`).toString("base64");
}

function onlyDigits(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "");
}

function segmentoNfse(modo?: ModoNfse | string | null): string {
  return modo === "municipal" ? "nfse" : "nfsen";
}

function absoluteFocusUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl || typeof pathOrUrl !== "string") return null;
  const s = pathOrUrl.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const base = focusBaseUrl();
  return `${base}${s.startsWith("/") ? s : `/${s}`}`;
}

function extractNfseLinks(body: Record<string, unknown>): {
  portalUrl: string | null;
  pdfUrl: string | null;
} {
  const portal =
    typeof body.url === "string" && body.url.trim() ? body.url.trim() : null;
  const pdfUrl =
    absoluteFocusUrl(body.url_danfse as string | undefined) ||
    absoluteFocusUrl(body.caminho_danfse as string | undefined) ||
    absoluteFocusUrl(body.caminho_pdf_nota_fiscal as string | undefined);
  return { portalUrl: portal, pdfUrl };
}

function extractFocusErrors(body: Record<string, unknown>): string {
  const erros = body.erros as Array<{ mensagem?: string; correcao?: string; codigo?: string }> | undefined;
  if (Array.isArray(erros) && erros.length) {
    return erros.map((e) => [e.mensagem, e.correcao].filter(Boolean).join(" — ")).join("; ");
  }
  if (typeof body.mensagem === "string" && body.mensagem.trim()) return body.mensagem;
  return JSON.stringify(body).slice(0, 500);
}

function omitEmptyStringsDeep(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value === "string") return value.trim() === "" ? undefined : value;
  if (Array.isArray(value)) {
    return value.map(omitEmptyStringsDeep).filter((x) => x !== undefined);
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = omitEmptyStringsDeep(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return value;
}

function codigoTribNac(cfg: NfsePrestadorConfig): string {
  const raw = onlyDigits(cfg.codigo_tributacao_nacional_iss || "");
  if (raw.length >= 6) return raw.slice(0, 6);
  const item = onlyDigits(cfg.item_lista_servico || "");
  if (item.length === 4) return `${item}01`;
  if (item.length === 3) return `${item.padStart(4, "0")}01`;
  if (item.length >= 6) return item.slice(0, 6);
  throw new Error(
    "Configure o código de tributação nacional ISS (cTribNac) em Integrações → NFS-e. Ex.: 040101 para medicina (item 04.01 da LC 116).",
  );
}

function codigoNbsDigits(cfg: NfsePrestadorConfig): string {
  const nbs = onlyDigits(cfg.codigo_nbs || "");
  if (nbs.length !== 9) {
    throw new Error(
      "Código NBS deve ter 9 dígitos (sem pontos). Ex.: 1.2301.22.00 vira 123012200. Configure em Integrações → NFS-e.",
    );
  }
  return nbs;
}

function parseIbge(valor: string | undefined): number {
  const n = parseInt(onlyDigits(valor || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function dataEmissaoSaoPaulo(): { dataEmissao: string; dataCompetencia: string } {
  const agora = new Date();
  const local = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return {
    dataEmissao: `${local.toISOString().substring(0, 19)}-03:00`,
    dataCompetencia: local.toISOString().substring(0, 10),
  };
}

async function fetchPdfBytes(pdfUrl: string): Promise<Buffer> {
  const isFocusHost = /focusnfe\.com\.br/i.test(pdfUrl);
  const tryFetch = (withAuth: boolean) =>
    fetch(pdfUrl, {
      headers: withAuth ? { Authorization: focusAuthHeader() } : undefined,
    });

  let res = await tryFetch(isFocusHost);
  if (!res.ok && isFocusHost) {
    res = await tryFetch(false);
  } else if (!res.ok && !isFocusHost) {
    res = await tryFetch(true);
  }
  if (!res.ok) {
    throw new Error(`Não foi possível baixar o PDF (HTTP ${res.status}).`);
  }
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const buf = Buffer.from(await res.arrayBuffer());
  if (contentType.includes("json") || (buf[0] === 0x7b && buf.length < 2048)) {
    const text = buf.toString("utf8");
    try {
      const err = JSON.parse(text) as { mensagem?: string; message?: string };
      throw new Error(err.mensagem || err.message || "Focus não disponibilizou o PDF.");
    } catch (e) {
      if (e instanceof Error && !e.message.startsWith("Unexpected")) throw e;
    }
  }
  return buf;
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
  if (!cfg.cnpj || !cfg.inscricao_municipal || !cfg.codigo_municipio) {
    throw new Error("Configuração de NFS-e incompleta (CNPJ, inscrição municipal e código do município são obrigatórios).");
  }
  return cfg;
}

async function buscarIbgePorCep(cepDigits: string): Promise<{
  logradouro: string;
  bairro: string;
  uf: string;
  codigo_municipio: number;
} | null> {
  if (cepDigits.length !== 8) return null;
  const tryUrl = async (url: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;
      const data = (await res.json()) as { erro?: boolean; ibge?: string; logradouro?: string; bairro?: string; uf?: string };
      if (data.erro || !data.ibge) return null;
      const ibge = parseInt(String(data.ibge), 10);
      if (!Number.isFinite(ibge)) return null;
      return {
        logradouro: data.logradouro || "",
        bairro: data.bairro || "",
        uf: (data.uf || "").toUpperCase(),
        codigo_municipio: ibge,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
  return (
    (await tryUrl(`https://viacep.com.br/ws/${cepDigits}/json/`)) ||
    (await tryUrl(`https://opencep.com/v1/${cepDigits}`))
  );
}

async function proximoNumeroDps(tenantId: string): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc("proximo_numero_dps_nfse" as never, {
    p_tenant_id: tenantId,
  } as never);
  if (error || data == null) {
    throw new Error(
      `Falha ao gerar número da DPS: ${error?.message || "função ausente. Aplique a migration 082_nfse_emissor_nacional.sql."}`,
    );
  }
  return String(data);
}

type ConsultOutcome =
  | { status: "issued"; numero: string | null; url: string | null; pdfUrl: string | null }
  | { status: "failed"; message: string }
  | { status: "cancelled"; message: string }
  | { status: "processing" };

async function consultarEAtualizarBill(opts: {
  billId: string;
  ref: string;
  modo: ModoNfse;
}): Promise<ConsultOutcome> {
  const res = await fetch(
    `${focusBaseUrl()}/v2/${segmentoNfse(opts.modo)}/${encodeURIComponent(opts.ref)}`,
    { headers: { Authorization: focusAuthHeader() } },
  );
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const status = String(body.status || "");

  if (
    body.codigo === "nao_encontrado" ||
    (typeof body.mensagem === "string" && /n[aã]o encontrad/i.test(body.mensagem))
  ) {
    const msg =
      "Emissão não encontrada no Emissor Nacional. Corrija o cadastro e emita novamente.";
    await supabaseAdmin
      .from("bills_receivable")
      .update({ nfse_status: "failed", nfse_message: msg } as never)
      .eq("id", opts.billId);
    return { status: "failed", message: msg };
  }

  if (status === "autorizado") {
    const { portalUrl, pdfUrl } = extractNfseLinks(body);
    const numero =
      body.numero != null
        ? String(body.numero)
        : body.chave_nfse != null
          ? String(body.chave_nfse)
          : null;
    await supabaseAdmin
      .from("bills_receivable")
      .update({
        nfse_status: "issued",
        nfse_number: numero,
        nfse_issued_at: new Date().toISOString(),
        nfse_url: portalUrl,
        nfse_pdf_url: pdfUrl,
        nfse_message: null,
        nfse_modo: opts.modo,
      } as never)
      .eq("id", opts.billId);
    return { status: "issued", numero, url: portalUrl, pdfUrl };
  }

  if (status === "erro" || status === "erro_autorizacao" || status === "rejeitado" || status === "denegado") {
    const msg = extractFocusErrors(body) || "Falha na emissão";
    await supabaseAdmin
      .from("bills_receivable")
      .update({ nfse_status: "failed", nfse_message: msg, nfse_modo: opts.modo } as never)
      .eq("id", opts.billId);
    return { status: "failed", message: msg };
  }

  if (status === "cancelado") {
    const msg = extractFocusErrors(body) || "NFS-e cancelada";
    await supabaseAdmin
      .from("bills_receivable")
      .update({ nfse_status: "cancelled", nfse_message: msg, nfse_modo: opts.modo } as never)
      .eq("id", opts.billId);
    return { status: "cancelled", message: msg };
  }

  return { status: "processing" };
}

async function requireFinanceProfile(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, tenant_id, role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.tenant_id) throw new Error("Perfil não encontrado");
  return profile as { id: string; tenant_id: string; role: string };
}

export const emitNfse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { billId: string; amount?: number; description?: string }) => d)
  .handler(async ({ data, context }) => {
    const profile = await requireFinanceProfile(context.userId);

    const { data: bill, error: billErr } = await supabaseAdmin
      .from("bills_receivable")
      .select(
        "id, tenant_id, amount, description, nfse_status, nfse_focus_ref, patients(full_name, cpf, email, phone, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip)",
      )
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
      patients: PatientSlice | null;
    };

    if (b.nfse_status === "issued") throw new Error("NFS-e já emitida para esta fatura.");

    const cfg = await getNfseConfig(profile.tenant_id);
    const ref = `bill-${b.id}`;
    const valor =
      data.amount != null && Number.isFinite(Number(data.amount)) && Number(data.amount) > 0
        ? Number(data.amount)
        : Number(b.amount);
    if (!(valor > 0)) throw new Error("Informe um valor válido para a NFS-e.");
    const valorServicos = Math.round(valor * 100) / 100;
    const discriminacao =
      data.description?.trim() ||
      b.description?.trim() ||
      cfg.discriminacao_padrao ||
      "Prestação de serviços de saúde";

    const tomadorCpfCnpj = onlyDigits(b.patients?.cpf);
    if (!tomadorCpfCnpj) {
      throw new Error("Paciente sem CPF/CNPJ cadastrado — obrigatório para emitir a NFS-e.");
    }

    const cnpjPrestador = onlyDigits(cfg.cnpj);
    const inscricaoMunicipalRaw = onlyDigits(cfg.inscricao_municipal);
    const inscricaoMunicipal = inscricaoMunicipalRaw ? inscricaoMunicipalRaw.padStart(15, "0") : "";
    const codigoMunicipioPrestador = parseIbge(cfg.codigo_municipio);
    if (!codigoMunicipioPrestador) {
      throw new Error("Código IBGE do município do prestador inválido.");
    }

    const opcaoCfg = parseInt(String(cfg.opcao_simples_nacional ?? ""), 10);
    const codigoOpcaoSimplesNacional = [1, 2, 3].includes(opcaoCfg)
      ? opcaoCfg
      : cfg.optante_simples_nacional === false
        ? 1
        : 3;

    const regimeEspecialCfg = parseInt(String(cfg.regime_especial_tributacao ?? "0"), 10);
    const regimeEspecial = REGIME_ESPECIAL_VALIDOS.has(regimeEspecialCfg) ? regimeEspecialCfg : 0;
    const percentualTribSN = cfg.percentual_total_tributos_simples_nacional?.trim() || "8.42";
    const dpsSerie = (cfg.dps_serie || "900").trim();
    const tribNac = codigoTribNac(cfg);
    const nbs = codigoNbsDigits(cfg);
    const tribMun = (cfg.codigo_tributacao_municipal_iss || cfg.codigo_tributario_municipio || "").trim();

    const cep = onlyDigits(b.patients?.address_zip);
    let logradouro = (b.patients?.address_street || "").trim();
    let bairro = (b.patients?.address_neighborhood || "").trim();
    let codigoMunicipioTomador = 0;
    if (cep.length === 8) {
      const via = await buscarIbgePorCep(cep);
      if (via) {
        codigoMunicipioTomador = via.codigo_municipio;
        if (!logradouro) logradouro = via.logradouro;
        if (!bairro) bairro = via.bairro;
      }
    }
    if (!codigoMunicipioTomador) codigoMunicipioTomador = codigoMunicipioPrestador;
    if (!logradouro || cep.length !== 8) {
      throw new Error(
        "Complete o endereço da paciente (CEP com 8 dígitos e logradouro) para emitir a NFS-e no Emissor Nacional.",
      );
    }

    const numeroDps = await proximoNumeroDps(profile.tenant_id);
    const { dataEmissao, dataCompetencia } = dataEmissaoSaoPaulo();

    const tomador: Record<string, unknown> = {
      razao_social_tomador: b.patients?.full_name ?? "Consumidor",
      ...(tomadorCpfCnpj.length === 11
        ? { cpf_tomador: tomadorCpfCnpj }
        : { cnpj_tomador: tomadorCpfCnpj }),
      email_tomador: b.patients?.email?.trim() || undefined,
      logradouro_tomador: logradouro,
      numero_tomador: (b.patients?.address_number || "").trim() || "S/N",
      bairro_tomador: bairro || "Não informado",
      codigo_municipio_tomador: codigoMunicipioTomador,
      cep_tomador: cep,
    };
    const complemento = (b.patients?.address_complement || "").trim();
    if (complemento) tomador.complemento_tomador = complemento;
    const tel = onlyDigits(b.patients?.phone);
    if (tel) tomador.telefone_tomador = tel;

    const payloadRaw: Record<string, unknown> = {
      data_emissao: dataEmissao,
      serie_dps: dpsSerie,
      numero_dps: numeroDps,
      data_competencia: dataCompetencia,
      emitente_dps: "1",
      codigo_municipio_emissora: codigoMunicipioPrestador,
      cnpj_prestador: cnpjPrestador,
      inscricao_municipal_prestador: inscricaoMunicipal,
      codigo_opcao_simples_nacional: String(codigoOpcaoSimplesNacional),
      ...(codigoOpcaoSimplesNacional !== 1 ? { regime_tributario_simples_nacional: "1" } : {}),
      regime_especial_tributacao: String(regimeEspecial),
      ...tomador,
      codigo_municipio_prestacao: codigoMunicipioPrestador,
      codigo_tributacao_nacional_iss: tribNac,
      codigo_tributacao_municipal_iss: tribMun,
      codigo_nbs: nbs,
      descricao_servico: discriminacao,
      valor_servico: valorServicos,
      tributacao_iss: "1",
      tipo_retencao_iss: cfg.iss_retido ? "2" : "1",
      situacao_tributaria_pis_cofins: "00",
      finalidade_emissao: "0",
      consumidor_final: "1",
      indicador_destinatario: "0",
      ...(codigoOpcaoSimplesNacional === 1
        ? { indicador_total_tributacao: "0" }
        : { percentual_total_tributos_simples_nacional: percentualTribSN }),
    };

    const payload = omitEmptyStringsDeep(payloadRaw) as Record<string, unknown>;

    const res = await fetch(`${focusBaseUrl()}/v2/nfsen?ref=${encodeURIComponent(ref)}`, {
      method: "POST",
      headers: { Authorization: focusAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (res.status === 422 || (body.codigo && body.status === "erro")) {
      const msg = extractFocusErrors(body);
      await supabaseAdmin
        .from("bills_receivable")
        .update({
          nfse_status: "failed",
          nfse_focus_ref: ref,
          nfse_message: msg,
          nfse_modo: "nacional",
          nfse_amount: valorServicos,
          nfse_description: discriminacao,
        } as never)
        .eq("id", b.id);
      throw new Error(`Emissor Nacional recusou: ${msg}`);
    }

    if (!res.ok && res.status !== 202) {
      const msg = extractFocusErrors(body) || `HTTP ${res.status}`;
      await supabaseAdmin
        .from("bills_receivable")
        .update({
          nfse_status: "failed",
          nfse_focus_ref: ref,
          nfse_message: msg,
          nfse_modo: "nacional",
        } as never)
        .eq("id", b.id);
      if (res.status === 401) {
        const focusEnv = focusEnvName();
        throw new Error(
          `Erro ao emitir NFS-e: token Focus rejeitado (401) em ${focusEnv}. Confirme FOCUS_NFE_TOKEN e habilite o Ambiente da NFSe Nacional na empresa, no painel Focus.`,
        );
      }
      throw new Error(`Erro ao emitir NFS-e: ${msg}`);
    }

    const st = String(body.status || "");
    if (st === "autorizado") {
      const { portalUrl, pdfUrl } = extractNfseLinks(body);
      const numero =
        body.numero != null
          ? String(body.numero)
          : body.chave_nfse != null
            ? String(body.chave_nfse)
            : null;
      await supabaseAdmin
        .from("bills_receivable")
        .update({
          nfse_status: "issued",
          nfse_number: numero,
          nfse_issued_at: new Date().toISOString(),
          nfse_url: portalUrl,
          nfse_pdf_url: pdfUrl,
          nfse_focus_ref: ref,
          nfse_message: null,
          nfse_modo: "nacional",
          nfse_amount: valorServicos,
          nfse_description: discriminacao,
        } as never)
        .eq("id", b.id);
      return {
        ref,
        status: "issued" as const,
        numero,
        url: portalUrl,
        pdfUrl,
      };
    }

    if (st === "erro_autorizacao" || st === "rejeitado" || st === "denegado") {
      const msg = extractFocusErrors(body) || `NFS-e não autorizada (${st})`;
      await supabaseAdmin
        .from("bills_receivable")
        .update({
          nfse_status: "failed",
          nfse_focus_ref: ref,
          nfse_message: msg,
          nfse_modo: "nacional",
          nfse_amount: valorServicos,
          nfse_description: discriminacao,
        } as never)
        .eq("id", b.id);
      throw new Error(msg);
    }

    await supabaseAdmin
      .from("bills_receivable")
      .update({
        nfse_status: "processing",
        nfse_focus_ref: ref,
        nfse_message: null,
        nfse_modo: "nacional",
        nfse_amount: valorServicos,
        nfse_description: discriminacao,
      } as never)
      .eq("id", b.id);

    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const consulted = await consultarEAtualizarBill({ billId: b.id, ref, modo: "nacional" });
      if (consulted.status === "issued") {
        return {
          ref,
          status: "issued" as const,
          numero: consulted.numero,
          url: consulted.url,
          pdfUrl: consulted.pdfUrl,
        };
      }
      if (consulted.status === "failed") throw new Error(consulted.message);
      if (consulted.status === "cancelled") throw new Error(consulted.message);
    }

    return { ref, status: "processing" as const };
  });

export const consultNfse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { billId: string }) => d)
  .handler(async ({ data, context }) => {
    const profile = await requireFinanceProfile(context.userId);

    const { data: bill } = await supabaseAdmin
      .from("bills_receivable")
      .select("id, nfse_focus_ref, nfse_modo")
      .eq("id", data.billId)
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();
    const row = bill as { nfse_focus_ref: string | null; nfse_modo: string | null } | null;
    const ref = row?.nfse_focus_ref;
    if (!ref) throw new Error("Esta fatura ainda não foi enviada para emissão.");
    const modo: ModoNfse = row?.nfse_modo === "municipal" ? "municipal" : "nacional";
    return consultarEAtualizarBill({ billId: data.billId, ref, modo });
  });

export const downloadNfsePdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { billId: string }) => d)
  .handler(async ({ data, context }) => {
    const profile = await requireFinanceProfile(context.userId);

    const { data: bill } = await supabaseAdmin
      .from("bills_receivable")
      .select("id, nfse_number, nfse_pdf_url, nfse_url, nfse_focus_ref, nfse_status, nfse_modo")
      .eq("id", data.billId)
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();

    const row = bill as {
      id: string;
      nfse_number: string | null;
      nfse_pdf_url: string | null;
      nfse_url: string | null;
      nfse_focus_ref: string | null;
      nfse_status: string | null;
      nfse_modo: string | null;
    } | null;

    if (!row) throw new Error("Cobrança não encontrada");
    if (row.nfse_status !== "issued" && !row.nfse_pdf_url) {
      throw new Error("PDF disponível apenas após a NFS-e ser autorizada.");
    }

    let pdfUrl = row.nfse_pdf_url;
    let portalUrl: string | null = row.nfse_url;
    const modo: ModoNfse = row.nfse_modo === "municipal" ? "municipal" : "nacional";
    if (row.nfse_focus_ref) {
      const res = await fetch(
        `${focusBaseUrl()}/v2/${segmentoNfse(modo)}/${encodeURIComponent(row.nfse_focus_ref)}`,
        { headers: { Authorization: focusAuthHeader() } },
      );
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const links = extractNfseLinks(body);
      if (links.portalUrl) portalUrl = links.portalUrl;
      if (links.pdfUrl) pdfUrl = links.pdfUrl;
      if (links.pdfUrl || links.portalUrl || body.numero) {
        await supabaseAdmin
          .from("bills_receivable")
          .update({
            nfse_pdf_url: links.pdfUrl ?? row.nfse_pdf_url,
            nfse_url: links.portalUrl ?? row.nfse_url,
            nfse_number: body.numero != null ? String(body.numero) : row.nfse_number,
          } as never)
          .eq("id", row.id);
      }
    }
    if (!pdfUrl) {
      const hint = portalUrl
        ? " Use “Visualizar NFS-e” para abrir no portal e imprimir/salvar."
        : "";
      throw new Error(`O Emissor Nacional ainda não disponibilizou o PDF desta nota.${hint}`);
    }

    const buf = await fetchPdfBytes(pdfUrl);
    const numero = row.nfse_number?.replace(/\W+/g, "_") || row.id.slice(0, 8);
    return {
      fileName: `NFSe-${numero}.pdf`,
      mimeType: "application/pdf",
      base64: buf.toString("base64"),
      portalUrl,
    };
  });
