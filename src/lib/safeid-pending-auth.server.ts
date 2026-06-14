interface PendingSafeIdAuth {
  professionalId: string;
  codeVerifier: string;
  redirectUri: string;
  accessToken?: string;
  expiresAt: number;
}

const pending = new Map<string, PendingSafeIdAuth>();

export function beginPendingSafeIdAuth(
  professionalId: string,
  codeVerifier: string,
  redirectUri: string,
) {
  pending.set(professionalId, {
    professionalId,
    codeVerifier,
    redirectUri,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
}

export function completePendingSafeIdAuth(professionalId: string, accessToken: string) {
  const row = pending.get(professionalId);
  if (!row) throw new Error("Sessão de autorização SafeID expirada. Tente novamente.");
  pending.set(professionalId, { ...row, accessToken });
}

export function getPendingSafeIdAuth(professionalId: string): PendingSafeIdAuth | null {
  const row = pending.get(professionalId);
  if (!row) return null;
  if (row.expiresAt < Date.now()) {
    pending.delete(professionalId);
    return null;
  }
  return row;
}

export function clearPendingSafeIdAuth(professionalId: string) {
  pending.delete(professionalId);
}
