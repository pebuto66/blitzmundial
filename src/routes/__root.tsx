import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AutoUpdater } from "../lib/auto-updater";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    if (isChunkLoadError(error)) recoverFromChunkError();
  }, [error]);

  const detail = [error.name, error.message].filter(Boolean).join(": ");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          La página no se ha cargado
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ha fallado algo al preparar la partida. Pulsa Reintentar para cargarla de nuevo desde cero.
        </p>
        {detail ? (
          <pre className="mt-4 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
            {detail}
          </pre>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              void hardReloadWithoutCache();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Continuar sin recargar
          </button>
        </div>
      </div>
    </div>
  );
}


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Blitz Mundial — Dominio Mundial" },
      { name: "description", content: "Blitz Mundial: juego de estrategia por turnos estilo Risk para 2 a 6 jugadores en una sola pantalla." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Blitz Mundial — Dominio Mundial" },
      { property: "og:description", content: "Blitz Mundial: juego de estrategia por turnos estilo Risk para 2 a 6 jugadores en una sola pantalla." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Blitz Mundial — Dominio Mundial" },
      { name: "twitter:description", content: "Blitz Mundial: juego de estrategia por turnos estilo Risk para 2 a 6 jugadores en una sola pantalla." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e748c20f-0462-4723-8c5c-93884d2b39c3/id-preview-5889cd93--c493b3e2-82ab-457e-8176-376830456fcd.lovable.app-1782894365116.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e748c20f-0462-4723-8c5c-93884d2b39c3/id-preview-5889cd93--c493b3e2-82ab-457e-8176-376830456fcd.lovable.app-1782894365116.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <AutoUpdater />
      <Outlet />
    </QueryClientProvider>
  );
}
