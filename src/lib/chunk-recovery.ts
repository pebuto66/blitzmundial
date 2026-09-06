// Recuperación de fallos al cargar trozos de código (chunks) en móvil.
//
// En iOS/Android el navegador suspende la pestaña y, tras publicar una versión
// nueva, el HTML antiguo puede pedir archivos que ya no existen. El síntoma es
// "Failed to fetch dynamically imported module" / "Importing a module script
// failed". Aquí reintentamos y, si no hay manera, recargamos UNA sola vez.

const RELOAD_KEY = "bm:chunk-reload-at";
const RELOAD_COOLDOWN_MS = 60_000;

const CHUNK_ERROR_PATTERNS = [
  "failed to fetch dynamically imported module",
  "importing a module script failed",
  "error loading dynamically imported module",
  "unable to preload css",
  "dynamically imported module",
  "loading chunk",
  "chunkloaderror",
];

export function isChunkLoadError(error: unknown): boolean {
  const message =
    typeof error === "string"
      ? error
      : error && typeof error === "object"
        ? String((error as { message?: unknown }).message ?? "")
        : "";
  const lower = message.toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((p) => lower.includes(p));
}

function canReload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Number.isFinite(last) && Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

export async function clearBrowserCaches(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* sin cachés que limpiar */
  }
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(regs.map((r) => r.unregister().catch(() => undefined)));
  } catch {
    /* sin service workers */
  }
}

/** Recarga forzando red: limpia cachés/SW y añade una marca anticaché a la URL. */
export async function hardReloadWithoutCache(): Promise<void> {
  if (typeof window === "undefined") return;
  await clearBrowserCaches();
  const url = new URL(window.location.href);
  url.searchParams.set("_r", Date.now().toString(36));
  window.location.replace(url.toString());
}

/** Recarga una única vez ante un fallo de carga de código. */
export function recoverFromChunkError(): void {
  if (typeof window === "undefined") return;
  if (!canReload()) return;
  void hardReloadWithoutCache();
}

/** Reintenta un import dinámico con esperas crecientes antes de rendirse. */
export async function retryImport<T>(factory: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await factory();
    } catch (error) {
      lastError = error;
      if (!isChunkLoadError(error)) throw error;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 400 * 2 ** i));
      }
    }
  }
  recoverFromChunkError();
  throw lastError;
}

let installed = false;

export function installChunkRecovery(): void {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  // Vite avisa cuando falla la precarga de un chunk.
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    recoverFromChunkError();
  });

  window.addEventListener("error", (event) => {
    const target = event.target as HTMLElement | null;
    const isAssetTag =
      target && (target.tagName === "SCRIPT" || target.tagName === "LINK");
    if (isAssetTag || isChunkLoadError(event.error) || isChunkLoadError(event.message)) {
      recoverFromChunkError();
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkLoadError(event.reason)) recoverFromChunkError();
  });
}
