import { Outlet, useLocation } from "@tanstack/react-router";
import { type ReactNode } from "react";

const MAX_CACHED_PAGES = 12;

const pageCache = new Map<string, ReactNode>();
const pageOrder: string[] = [];

function pageKey(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname;
}

/** CRM usa shell fixed + lock de viewport — não pode ficar montado em background
 *  (overlays/Dialog/Sheet e body.crm-mobile-app bloqueiam toque no celular). */
function isCrmPath(pathname: string) {
  return pathname === "/crm" || pathname.startsWith("/crm/");
}

function touchCache(key: string, node: ReactNode) {
  pageCache.set(key, node);
  const existing = pageOrder.indexOf(key);
  if (existing >= 0) pageOrder.splice(existing, 1);
  pageOrder.push(key);

  while (pageOrder.length > MAX_CACHED_PAGES) {
    const evict = pageOrder.shift();
    if (evict) pageCache.delete(evict);
  }
}

/** Limpa páginas em cache (ex.: ao sair da conta). */
export function clearKeepAliveCache() {
  pageCache.clear();
  pageOrder.length = 0;
}

/**
 * Mantém páginas visitadas montadas em memória para preservar filtros,
 * rolagem e dados ao voltar pelo menu lateral.
 * Rotas /crm/* ficam de fora (desmontam ao sair).
 */
export function KeepAliveOutlet() {
  const { pathname, searchStr } = useLocation();
  const key = pageKey(pathname, searchStr);

  // CRM: render direto, sem cache — e limpa páginas anteriores para não deixar
  // portal/overlay de Dialog/Sheet cobrindo a tela.
  if (isCrmPath(pathname)) {
    if (pageOrder.length > 0) clearKeepAliveCache();
    return <Outlet />;
  }

  // Saiu do CRM: garante que nenhuma página CRM fique no cache.
  for (const cachedKey of [...pageOrder]) {
    const cachedPath = cachedKey.split("?")[0] ?? cachedKey;
    if (isCrmPath(cachedPath)) {
      pageCache.delete(cachedKey);
      const idx = pageOrder.indexOf(cachedKey);
      if (idx >= 0) pageOrder.splice(idx, 1);
    }
  }

  const outlet = <Outlet />;
  touchCache(key, outlet);

  return (
    <>
      {pageOrder.map((cacheKey) => (
        <div
          key={cacheKey}
          className={cacheKey === key ? "contents" : "hidden"}
          aria-hidden={cacheKey !== key}
          // Páginas ocultas não devem capturar toque (portals filhos ainda podem;
          // por isso CRM fica fora do keep-alive).
          inert={cacheKey !== key ? true : undefined}
        >
          {pageCache.get(cacheKey)}
        </div>
      ))}
    </>
  );
}
