import { useEffect } from "react";

// Poll the current URL for a new build fingerprint. When the set of hashed
// asset URLs (script/link tags) in the fresh HTML differs from what this
// page loaded with, force a hard reload so users always see the newest
// deploy without needing Ctrl+Shift+R.
function extractAssetFingerprint(html: string): string {
  const matches = html.match(/(?:src|href)="\/(?:assets|_build)\/[^"]+"/g);
  return matches ? matches.sort().join("|") : "";
}

export function AutoUpdater() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!import.meta.env.PROD) return;

    let currentFingerprint = "";
    let stopped = false;

    const initial = extractAssetFingerprint(document.documentElement.outerHTML);
    currentFingerprint = initial;

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
        if (next && currentFingerprint && next !== currentFingerprint) {
          stopped = true;
          window.location.reload();
        }
      } catch {
        // network hiccup; ignore
      }
    };

    const interval = window.setInterval(check, 60_000);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") check();
    });

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
