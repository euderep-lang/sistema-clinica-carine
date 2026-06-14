import forge from "node-forge";

export interface CertificateMetadata {
  cn: string | null;
  cpf: string | null;
  validFrom: Date;
  validUntil: Date;
  issuer: string | null;
}

function extractCpfFromSubject(cert: forge.pki.Certificate): string | null {
  const fields = cert.subject.attributes;
  for (const attr of fields) {
    const val = String(attr.value ?? "");
    const digits = val.replace(/\D/g, "");
    if (digits.length === 11) return digits;
  }
  const cn = cert.subject.getField("CN")?.value;
  if (typeof cn === "string") {
    const match = cn.match(/(\d{11})/);
    if (match) return match[1];
  }
  return null;
}

export function parsePfxMetadata(pfxBuffer: Buffer, password: string): CertificateMetadata {
  const binary = pfxBuffer.toString("binary");
  const asn1 = forge.asn1.fromDer(binary);
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  } catch {
    throw new Error("Senha do certificado incorreta ou arquivo inválido.");
  }

  const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = bags[forge.pki.oids.certBag]?.[0];
  const cert = certBag?.cert;
  if (!cert) throw new Error("Nenhum certificado encontrado no arquivo .pfx.");

  const cnField = cert.subject.getField("CN");
  const issuerField = cert.issuer.getField("CN");

  return {
    cn: cnField?.value ? String(cnField.value) : null,
    cpf: extractCpfFromSubject(cert),
    validFrom: cert.validity.notBefore,
    validUntil: cert.validity.notAfter,
    issuer: issuerField?.value ? String(issuerField.value) : null,
  };
}

export function assertCertificateValid(meta: CertificateMetadata) {
  const now = new Date();
  if (now < meta.validFrom) {
    throw new Error("Certificado ainda não é válido.");
  }
  if (now > meta.validUntil) {
    throw new Error("Certificado expirado. Renove seu certificado SafeID A1.");
  }
}
