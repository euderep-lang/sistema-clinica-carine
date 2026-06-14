export function isSafeIdSessionExpiredMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("sessão safeid expirada") ||
    m.includes("sessao safeid expirada") ||
    m.includes("autorize novamente") ||
    m.includes("401") ||
    m.includes("unauthorized") ||
    (m.includes("token") && m.includes("expirad"))
  );
}
