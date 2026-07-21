import { createFileRoute } from "@tanstack/react-router";
import { RapidRisk } from "@/game/RapidRisk";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blitz Mundial — Dominio Mundial" },
      { name: "description", content: "Blitz Mundial: juego de estrategia por turnos estilo Risk para 2 a 6 jugadores en una sola pantalla." },
      { property: "og:title", content: "Blitz Mundial — Dominio Mundial" },
      { property: "og:description", content: "Blitz Mundial: juego de estrategia por turnos estilo Risk para 2 a 6 jugadores en una sola pantalla." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <RapidRisk />;
}
