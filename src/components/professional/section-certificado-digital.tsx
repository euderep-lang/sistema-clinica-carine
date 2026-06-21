import { useEffect, useRef, useState } from "react";
import { fmtDateTimeFromDate, fmtDateFromDate } from "@/lib/locale";
import { useServerFn } from "@tanstack/react-start";
import { Cloud, FileKey2, Loader2, ShieldCheck, Smartphone, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  discoverCloudCertificates,
  getDigitalCertificateStatus,
  removeDigitalCertificate,
  revokeSafeIdSession,
  saveCloudCertificate,
  saveDigitalCertificate,
  type DigitalCertificateStatus,
} from "@/lib/digital-certificate.functions";
import { isValidCPF, maskCPF } from "@/lib/patient-utils";

const ACCEPT = ".pfx,.p12";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return fmtDateFromDate(new Date(iso));
}

type ConfigTab = "a1" | "cloud";

export function SectionCertificadoDigital() {
  const fetchStatus = useServerFn(getDigitalCertificateStatus);
  const saveCert = useServerFn(saveDigitalCertificate);
  const saveCloud = useServerFn(saveCloudCertificate);
  const discoverCerts = useServerFn(discoverCloudCertificates);
  const removeCert = useServerFn(removeDigitalCertificate);
  const revokeSession = useServerFn(revokeSafeIdSession);

  const [status, setStatus] = useState<DigitalCertificateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<ConfigTab>("a1");

  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [cloudCpf, setCloudCpf] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [cloudSlots, setCloudSlots] = useState<Array<{ slotAlias: string; label: string }>>([]);
  const [selectedSlot, setSelectedSlot] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const s = await fetchStatus();
      setStatus(s);
      if (s.signingMode === "safeid_cloud") {
        setTab("cloud");
        if (s.certificateCpf) setCloudCpf(maskCPF(s.certificateCpf));
        if (s.cloudSlotAlias) setSelectedSlot(s.cloudSlotAlias);
      } else if (s.configured) {
        setTab("a1");
      }
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(msg.trimStart().startsWith("<") ? "Erro ao carregar certificado. Recarregue a página." : msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSaveA1 = async () => {
    if (!file) {
      toast.error("Selecione o arquivo .pfx do SafeID");
      return;
    }
    if (!password.trim()) {
      toast.error("Informe a senha do certificado");
      return;
    }
    setSaving(true);
    try {
      const pfxBase64 = await file.arrayBuffer().then((buf) => {
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
      });
      const next = await saveCert({ data: { pfxBase64, password, provider: "safeid" } });
      setStatus(next);
      setPassword("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Certificado A1 configurado com sucesso");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onDiscoverCloud = async () => {
    const cpf = cloudCpf.replace(/\D/g, "");
    if (!isValidCPF(cpf)) {
      toast.error("CPF inválido");
      return;
    }
    setDiscovering(true);
    setCloudSlots([]);
    setSelectedSlot("");
    try {
      const result = await discoverCerts({ data: { cpf } });
      setCloudSlots(result.slots);
      if (result.slots.length === 1) setSelectedSlot(result.slots[0].slotAlias);
      toast.success("Certificado em nuvem encontrado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDiscovering(false);
    }
  };

  const onSaveCloud = async () => {
    const cpf = cloudCpf.replace(/\D/g, "");
    if (!isValidCPF(cpf)) {
      toast.error("CPF inválido");
      return;
    }
    if (!selectedSlot) {
      toast.error("Selecione o certificado em nuvem");
      return;
    }
    const slot = cloudSlots.find((s) => s.slotAlias === selectedSlot);
    setSaving(true);
    try {
      const next = await saveCloud({
        data: {
          cpf,
          slotAlias: selectedSlot,
          slotLabel: slot?.label,
          certificateCn: slot?.label,
        },
      });
      setStatus(next);
      toast.success("Certificado SafeID em nuvem configurado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async () => {
    setSaving(true);
    try {
      const next = await removeCert();
      setStatus(next);
      setCloudSlots([]);
      setSelectedSlot("");
      toast.success("Certificado removido");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Carregando certificado…
        </CardContent>
      </Card>
    );
  }

  const configuredA1 = status?.configured && status.signingMode === "a1_file";
  const configuredCloud = status?.configured && status.signingMode === "safeid_cloud";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            Certificado digital SafeID
          </CardTitle>
          <CardDescription>
            Escolha entre certificado <strong>A1 (.pfx)</strong> ou <strong>em nuvem</strong> (app SafeID no celular).
            As receitas finalizadas serão assinadas com validade ICP-Brasil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.configured && (
            <div className="rounded-md border bg-muted/30 p-4 text-sm space-y-2">
              <p className="font-medium">
                {configuredCloud ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Cloud className="size-4" /> Certificado em nuvem ativo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <FileKey2 className="size-4" /> Certificado A1 ativo
                  </span>
                )}
              </p>
              <p>
                <span className="text-muted-foreground">Titular:</span>{" "}
                <strong>{status.certificateCn ?? status.cloudSlotLabel ?? "—"}</strong>
              </p>
              {status.certificateCpf && (
                <p>
                  <span className="text-muted-foreground">CPF:</span> {maskCPF(status.certificateCpf)}
                </p>
              )}
              {configuredA1 && (
                <p>
                  <span className="text-muted-foreground">Validade:</span> {formatDate(status.validFrom)} até{" "}
                  {formatDate(status.validUntil)}
                </p>
              )}
              {configuredA1 && status.isExpired && (
                <p className="text-destructive font-medium">Certificado expirado — renove e envie novamente.</p>
              )}
              {configuredA1 && !status.isExpired && status.daysUntilExpiry !== null && status.daysUntilExpiry <= 30 && (
                <p className="text-amber-700">Expira em {status.daysUntilExpiry} dias.</p>
              )}
              {configuredCloud && (
                <div className="space-y-2 text-muted-foreground">
                  {status.safeIdSessionActive && status.safeIdSessionExpiresAt ? (
                    <p className="text-emerald-700 font-medium">
                      Sessão SafeID ativa até{" "}
                      {fmtDateTimeFromDate(new Date(status.safeIdSessionExpiresAt), {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      . Você pode assinar receitas sem autorizar de novo.
                    </p>
                  ) : (
                    <p>
                      Na primeira assinatura do dia, confirme a notificação no app SafeID. A autorização vale por{" "}
                      <strong className="text-foreground">12 horas</strong>.
                    </p>
                  )}
                  {status.safeIdSessionActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          await revokeSession();
                          toast.success("Sessão SafeID encerrada");
                          await load();
                        } catch (e) {
                          toast.error((e as Error).message);
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Encerrar sessão SafeID
                    </Button>
                  )}
                </div>
              )}
              <Button variant="destructive" size="sm" onClick={onRemove} disabled={saving}>
                <Trash2 className="size-4 mr-2" />
                Remover certificado
              </Button>
            </div>
          )}

          <Tabs value={tab} onValueChange={(v) => setTab(v as ConfigTab)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="a1">A1 (.pfx)</TabsTrigger>
              <TabsTrigger value="cloud">Nuvem (app)</TabsTrigger>
            </TabsList>

            <TabsContent value="a1" className="space-y-3 border-t pt-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Envie o arquivo <strong>.pfx</strong> exportado do SafeID Desktop.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Arquivo .pfx / .p12</Label>
                  <Input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPT}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Senha do certificado</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha definida na exportação"
                    autoComplete="off"
                  />
                </div>
              </div>
              <Button onClick={onSaveA1} disabled={saving || !file}>
                {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
                {configuredA1 ? "Substituir certificado A1" : "Salvar certificado A1"}
              </Button>
            </TabsContent>

            <TabsContent value="cloud" className="space-y-4 border-t pt-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Vincule seu certificado <strong>SafeID em nuvem</strong>. Autorize no app uma vez a cada 12 horas para
                assinar várias receitas.
              </p>
              <div className="space-y-1 max-w-sm">
                <Label>CPF do titular do certificado</Label>
                <div className="flex gap-2">
                  <Input
                    value={cloudCpf}
                    onChange={(e) => setCloudCpf(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  <Button variant="outline" onClick={onDiscoverCloud} disabled={discovering}>
                    {discovering ? <Loader2 className="size-4 animate-spin" /> : "Buscar"}
                  </Button>
                </div>
              </div>

              {cloudSlots.length > 0 && (
                <div className="space-y-2">
                  <Label>Certificado encontrado</Label>
                  <RadioGroup value={selectedSlot} onValueChange={setSelectedSlot}>
                    {cloudSlots.map((slot) => (
                      <div key={slot.slotAlias} className="flex items-center gap-2 rounded-md border p-3">
                        <RadioGroupItem value={slot.slotAlias} id={slot.slotAlias} />
                        <Label htmlFor={slot.slotAlias} className="font-normal cursor-pointer">
                          {slot.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              <Button onClick={onSaveCloud} disabled={saving || !selectedSlot}>
                {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Smartphone className="size-4 mr-2" />}
                {configuredCloud ? "Atualizar certificado em nuvem" : "Vincular certificado em nuvem"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileKey2 className="size-4" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Certificado A1: arquivo e senha são criptografados no servidor. Certificado em nuvem: apenas o vínculo
            (CPF/slot) é salvo; o OTP nunca é armazenado.
          </p>
          <p>A assinatura ocorre somente ao finalizar a receita, no servidor ClinicOS.</p>
          <p>
            Integração em nuvem requer credenciais do painel{" "}
            <a
              href="https://www.safeweb.com.br/produtos/safeidintegracao"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              SafeID Integração
            </a>{" "}
            (SAFEID_CLIENT_ID, SAFEID_CLIENT_SECRET e SAFEID_REDIRECT_URI no .env do servidor).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
