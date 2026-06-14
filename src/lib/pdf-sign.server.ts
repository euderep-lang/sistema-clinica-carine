import { plainAddPlaceholder } from "@signpdf/placeholder-plain";
import { SignPdf } from "@signpdf/signpdf";
import { P12Signer } from "@signpdf/signer-p12";

export interface SignPdfOptions {
  pfxBuffer: Buffer;
  password: string;
  reason?: string;
  location?: string;
  contactInfo?: string;
  name?: string;
}

export async function signPdfBuffer(pdfBuffer: Buffer, opts: SignPdfOptions): Promise<Buffer> {
  const withPlaceholder = plainAddPlaceholder({
    pdfBuffer,
    reason: opts.reason ?? "Assinatura de receita médica",
    contactInfo: opts.contactInfo ?? "",
    name: opts.name ?? "Profissional de saúde",
    location: opts.location ?? "Brasil",
  });

  const signer = new P12Signer(opts.pfxBuffer, { passphrase: opts.password });
  const signPdf = new SignPdf();
  return signPdf.sign(withPlaceholder, signer);
}
