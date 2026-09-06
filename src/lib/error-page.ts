export function renderErrorPage(detail?: string): string {
  const safeDetail = (detail ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .slice(0, 600);
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>La página no se ha cargado</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #0b1220; color: #f8fafc; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 32rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #cbd5e1; margin: 0 0 1.25rem; }
      pre { text-align: left; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; color: #93c5fd; background: rgba(148,163,184,0.12); border-radius: 0.5rem; padding: 0.75rem; overflow: auto; max-height: 9rem; white-space: pre-wrap; word-break: break-word; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-top: 1.25rem; }
      button { padding: 0.6rem 1.1rem; border-radius: 0.5rem; font: inherit; cursor: pointer; border: 1px solid transparent; background: #f8fafc; color: #0b1220; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>La página no se ha cargado</h1>
      <p>Ha fallado algo al preparar la partida. Pulsa Reintentar para volver a cargarla desde cero.</p>
      ${safeDetail ? `<pre>${safeDetail}</pre>` : ""}
      <div class="actions">
        <button onclick="(async()=>{try{if('caches' in window){for(const k of await caches.keys())await caches.delete(k);}const r=await (navigator.serviceWorker&&navigator.serviceWorker.getRegistrations());if(r)for(const g of r)await g.unregister();}catch(e){}var u=new URL(location.href);u.searchParams.set('_r',Date.now().toString(36));location.replace(u.toString());})()">Reintentar</button>
      </div>
    </div>
  </body>
</html>`;
}
