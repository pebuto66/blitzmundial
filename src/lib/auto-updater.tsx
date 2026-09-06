import { useEffect } from "react";

import { hardReloadWithoutCache, installChunkRecovery } from "./chunk-recovery";


// Detecta despliegues nuevos y recarga automáticamente, sin que el usuario
// tenga que forzar Ctrl+Shift+R.
//
// 1) Si hay algún service worker heredado registrado, se auto-actualiza y,
//    cuando toma el control, recarga la página (y como red de seguridad se
//    desregistra + limpia cachés para que nunca sirva HTML antiguo).
// 2) En paralelo, sondea el HTML actual buscando un cambio en las URLs
//    hasheadas de los assets (huella del build) y recarga en cuanto cambia.
function extractAssetFingerprint(html: string): string {
  const matches = html.match(/(?:src|href)="\/(?:assets|_build)\/[^"]+"/g);
  return matches ? matches.sort().join("|") : "";
}

const POLL_MS = 15_000;

export function AutoUpdater() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    installChunkRecovery();
    if (!import.meta.env.PROD) return;

    let stopped = false;
    let reloading = false;
    const currentFingerprint = extractAssetFingerprint(document.documentElement.outerHTML);

    const hardReload = () => {
      if (reloading) return;
      reloading = true;
      stopped = true;
      void hardReloadWithoutCache();
    };


    // --- Service worker: autoreload al activarse una versión nueva ---
    const sw = navigator.serviceWorker;
    if (sw) {
      sw.addEventListener("controllerchange", hardReload);
      void sw
        .getRegistrations()
        .then(async (regs) => {
          for (const reg of regs) {
            reg.addEventListener("updatefound", () => {
              const installing = reg.installing;
              if (!installing) return;
              installing.addEventListener("statechange", () => {
                if (installing.state === "activated") hardReload();
              });
            });
            // Un SW antiguo puede seguir sirviendo HTML cacheado: fuera.
            await reg.update().catch(() => undefined);
            await reg.unregister().catch(() => undefined);
          }
          if (regs.length > 0 && "caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
            hardReload();
          }
        })
        .catch(() => undefined);
    }

    // --- Sondeo de la huella del build ---
    const check = async () => {
      if (stopped) return;
      try {
        const res = await fetch(window.location.pathname + "?_ts=" + Date.now(), {
          cache: "no-store",
          headers: { "cache-control": "no-cache" },
        });
        if (!res.ok) return;
        const html = await res.text();
        const next = extractAssetFingerprint(html);
        if (next && currentFingerprint && next !== currentFingerprint) hardReload();
      } catch {
        // fallo de red puntual; se reintenta en el siguiente ciclo
      }
    };

    const interval = window.setInterval(check, POLL_MS);
    const onFocus = () => void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    void check();

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      if (sw) sw.removeEventListener("controllerchange", hardReload);
    };
  }, []);

  return null;
}
