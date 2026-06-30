export type WaQuickReplyRow = {
  id: string;
  name: string;
  content: string;
  category?: string;
  shortcut?: string | null;
};

let cachedReplies: WaQuickReplyRow[] | null = null;
let cacheTenantId: string | null = null;
let inflight: Promise<WaQuickReplyRow[]> | null = null;
let backgroundSeedDone = false;

export function invalidateWaQuickRepliesCache() {
  cachedReplies = null;
  cacheTenantId = null;
  inflight = null;
}

export function getCachedWaQuickReplies(tenantId: string): WaQuickReplyRow[] | null {
  if (cacheTenantId === tenantId && cachedReplies) return cachedReplies;
  return null;
}

export async function fetchWaQuickRepliesCached(
  tenantId: string,
  fetchFn: () => Promise<WaQuickReplyRow[]>,
): Promise<WaQuickReplyRow[]> {
  if (cacheTenantId === tenantId && cachedReplies) return cachedReplies;

  if (!inflight) {
    inflight = fetchFn()
      .then((rows) => {
        cachedReplies = rows;
        cacheTenantId = tenantId;
        return rows;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}

export function markWaQuickRepliesSeeded() {
  backgroundSeedDone = true;
}

export function shouldRunWaQuickRepliesBackgroundSeed() {
  return !backgroundSeedDone;
}
