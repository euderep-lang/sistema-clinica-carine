import { Outlet, useLocation } from "@tanstack/react-router";
import { type ReactNode } from "react";

const MAX_CACHED_PAGES = 12;

const pageCache = new Map<string, ReactNode>();
const pageOrder: string[] = [];

function pageKey(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname;
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
 */
export function KeepAliveOutlet() {
  const { pathname, searchStr } = useLocation();
  const key = pageKey(pathname, searchStr);
  const outlet = <Outlet />;
  touchCache(key, outlet);

  return (
    <>
      {pageOrder.map((cacheKey) => (
        <div
          key={cacheKey}
          className={cacheKey === key ? "contents" : "hidden"}
          aria-hidden={cacheKey !== key}
        >
          {pageCache.get(cacheKey)}
        </div>
      ))}
    </>
  );
}
