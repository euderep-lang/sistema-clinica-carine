import { decryptSecret, encryptSecret } from "@/lib/crypto.server";

type CertRow = {
  signing_mode?: string | null;
  safeid_access_token_encrypted?: string | null;
  safeid_token_expires_at?: string | null;
};

export function isSafeIdSessionActive(row: CertRow | null | undefined): boolean {
  if (!row?.safeid_access_token_encrypted || !row.safeid_token_expires_at) return false;
  return new Date(row.safeid_token_expires_at).getTime() > Date.now();
}

export function getSafeIdAccessToken(row: CertRow | null | undefined): string | null {
  if (!isSafeIdSessionActive(row) || !row?.safeid_access_token_encrypted) return null;
  return decryptSecret(row.safeid_access_token_encrypted).toString("utf8");
}

export function buildSafeIdSessionUpdate(accessToken: string, expiresInSeconds: number) {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  return {
    safeid_access_token_encrypted: encryptSecret(accessToken),
    safeid_token_expires_at: expiresAt,
  };
}

export function clearSafeIdSessionUpdate() {
  return {
    safeid_access_token_encrypted: null,
    safeid_token_expires_at: null,
  };
}
