import QRCode from "qrcode";
import { ITI_VALIDATOR_URL } from "@/lib/iti-validation";

export async function createValidationQrBase64(url = ITI_VALIDATOR_URL): Promise<string> {
  const buffer = await QRCode.toBuffer(url, {
    type: "png",
    width: 256,
    margin: 1,
    errorCorrectionLevel: "M",
  });
  return buffer.toString("base64");
}
