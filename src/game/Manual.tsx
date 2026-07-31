import "./game.css";

/** Paleta de alto contraste para el manual (fondo oscuro, texto claro). */
const T = {
  body: "#f2ead9",         // texto principal claro sobre fondo oscuro
  soft: "#d8ccae",         // texto secundario
  gold: "#f0c94a",         // títulos
  accent: "#ffd97a",       // resaltados
  hr: "rgba(240,201,74,0.35)",
  chip: "rgba(240,201,74,0.12)",
} as const;

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 18 }}>
      <h3 style={{ color: T.gold, margin: "10px 0 6px", fontSize: 18, letterSpacing: "0.03em" }}>
        <span style={{
          display: "inline-block", minWidth: 26, marginRight: 8, padding: "1px 8px",
          background: T.chip, border: `1px solid ${T.hr}`, borderRadius: 4,
          fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: T.accent,
        }}>{n}</span>
        {title}
      </h3>
      <div style={{ color: T.body, lineHeight: 1.55 }}>{children}</div>
    </section>
  );
}

export function Manual({ onClose }: { onClose: () => void }) {
  return (
    <div className="victory-overlay" onClick={onClose}>
      <div
        className="victory-modal"
        style={{
          maxWidth: 820,
          textAlign: "left",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "#12160f",
          color: T.body,
          padding: "32px 40px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="label" style={{ marginBottom: 4, color: T.soft }}>Manual del jugador</div>
        <div className="title" style={{ marginBottom: 4, color: T.gold, fontSize: 44 }}>Blitz Mundial</div>
        <p style={{ color: T.soft, marginTop: 0, fontStyle: "italic" }}>
          Dominio mundial por turnos para 2 a 6 jugadores en una sola pantalla.
        </p>

        <Section n="1" title="Objetivo">
          <p>Conquistar el mundo eliminando a todos los ejércitos enemigos del tablero. El último jugador con al menos un territorio propio gana la partida.</p>
        </Section>

        <Section n="2" title="Setup inicial">
          <ul>
            <li>Los <b>44 territorios</b> se reparten al azar; cada uno arranca con <b>1 infantería</b>.</li>
            <li>Por rondas y en orden de turno, cada jugador coloca en sus territorios en este orden fijo: <b>aeropuertos → silo → torres → aviones → tanques → infantería</b>.</li>
            <li>Los <b>aviones</b> solo pueden estacionarse sobre <b>aeropuertos</b> propios.</li>
            <li>Cada torre construida otorga <b>+1000 L</b> de petróleo al instante.</li>
            <li>Materiales iniciales por número de jugadores:
              <ul>
                <li><b>2 jugadores</b>: 55 ejércitos, 10 torres, 5 aviones, 6 tanques, 4 aeropuertos, 1 silo.</li>
                <li><b>3 jugadores</b>: 35 ejércitos, 8 torres, 4 aviones, 5 tanques, 3 aeropuertos, 1 silo.</li>
                <li><b>4 jugadores</b>: 30 ejércitos, 6 torres, 3 aviones, 4 tanques, 3 aeropuertos, 1 silo.</li>
                <li><b>5 jugadores</b>: 25 ejércitos, 5 torres, 2 aviones, 3 tanques, 2 aeropuertos, 1 silo.</li>
                <li><b>6 jugadores</b>: 20 ejércitos, 3 torres, 1 avión, 2 tanques, 1 aeropuerto, 1 silo.</li>
              </ul>
            </li>
          </ul>
        </Section>

        <Section n="3" title="Refuerzos por turno">
          <ul>
            <li><b>Mínimo 3</b> infanterías por turno.</li>
            <li><b>+ ⌊territorios / 3⌋</b> — p. ej. 33 territorios → +11; 32 → +10 (nunca se redondea al alza).</li>
            <li><b>+ bono de continente</b> si controlas uno completo — América del Norte: 5, América del Sur: 2, Europa: 5, África: 3, Asia: 7, Oceanía: 2.</li>
            <li><b>+2 infantería</b> por cada carta robada de un territorio que <em>ya poseías</em> en el momento de cobrarla. Si esa carta incluía aeropuerto obtienes <b>+1 torre</b>; si incluía silo, <b>+1 misil</b>.</li>
            <li>Aviones, tanques y torres pendientes se colocan durante el refuerzo. <b>No se puede pasar a Ataque</b> con unidades sin colocar. Excepción: aviones en reserva cuando no tienes ningún aeropuerto donde estacionarlos.</li>
            <li>Con <b>5 o más cartas en mano</b> el canje es <b>obligatorio</b> antes de pasar a Ataque.</li>
          </ul>
        </Section>

        <Section n="4" title="Ataque">
          <ul>
            <li>Solo puedes tener <b>un objetivo por turno</b>: al primer ataque, ese territorio queda bloqueado como único posible durante todo el turno (aún puedes atacarlo desde distintos orígenes y con distintas unidades).</li>
            <li><b>Infantería</b>: gratis. Requiere adyacencia terrestre.</li>
            <li><b>Tanque</b>: cuesta <b>25 L</b> por objetivo (pago único por turno). Sin petróleo, el tanque <b>no puede atacar</b>.</li>
            <li><b>Avión</b>: cuesta <b>50 L por territorio recorrido, ida y vuelta</b>. Alcance global vía aeropuertos, pero el objetivo debe tener frontera con un territorio propio con <b>≥2 infantería</b> para poder trasladar la tropa de ocupación tras ganar. Sin petróleo, el avión <b>no puede atacar</b>.</li>
            <li>Prioridad defensiva: <b>aviones → tanques → infantería</b>.</li>
            <li><b>Tierra quemada</b>: puedes atacar con <b>1 sola infantería</b>. Si pierdes, el territorio de origen queda vacío pero sigue siendo tuyo — cualquier enemigo podrá conquistarlo después sin combate (auto-conquista) y <b>sin cobrar carta</b>.</li>
            <li>Si atacas con 1 infantería y ganas contra 1 defensor, el enemigo desaparece pero al no poder ocupar (siempre debe quedar ≥1 en origen) tu tropa se queda en origen y no cobras carta.</li>
            <li>Solo se cobra carta al final del turno cuando <b>hubo combate</b> y <b>conquistaste</b> al menos un territorio.</li>
          </ul>
        </Section>

        <Section n="5" title="Tanques: apoyo y dados">
          <ul>
            <li>Un <b>tanque atacante</b> siempre va apoyado por más tanques (si los hay) y por infantería. Los <b>dados más altos son para los tanques</b>.</li>
            <li>Contra <b>infantería</b>, cada dado de tanque suma <b>+2</b>. En cualquier empate, gana el defensor (como en Risk clásico).</li>
            <li>Un <b>tanque defensor</b> también forma línea con la infantería. Los dados más altos son para los tanques y con al menos un tanque el defensor puede tirar <b>hasta 3 dados</b> en lugar de 2.</li>
            <li><b>3 o más tanques contra 3 o más tanques</b> → se resuelve como infantería: <b>3 dados vs 2</b>, sin bonos +2.</li>
            <li>Bajas: cada dado perdido se aplica a la unidad a la que correspondía (tanque o infantería) según la asignación de dados.</li>
            <li><b>Tanque contra avión</b>: el tanque tira <b>3 dados</b>; con <b>triple</b> el avión es destruido, en cualquier otro caso se destruye el tanque (misma regla que avión contra tanque).</li>

          </ul>
        </Section>

        <Section n="6" title="Aviones">
          <ul>
            <li><b>1 avión</b> por ataque aéreo. El coste es <b>50 L × distancia × 2</b> (ida y vuelta).</li>
            <li>Contra <b>avión</b>: 1 dado vs 1 dado, empate → pierde el defensor.</li>
            <li>Contra <b>tanque</b>: el tanque tira <b>3 dados</b>; si saca <b>triple</b>, el avión es destruido; si no, se destruye el tanque.</li>
            <li>Contra <b>infantería</b>: el defensor tira 2 dados. <b>Dobles</b>: nulo. <b>Doble 6</b>: el avión es abatido.</li>
            <li>Si conquista, se traslada 1 infantería desde un territorio propio adyacente al objetivo con ≥2 infantería.</li>
          </ul>
        </Section>

        <Section n="7" title="Petróleo y torres">
          <ul>
            <li>Cada torre construida otorga <b>1000 L</b>.</li>
            <li>El petróleo <b>persiste entre turnos</b> — solo cambia al gastarlo, perder/capturar torres, o sufrir un misil.</li>
            <li>Al <b>conquistar</b> un territorio con torres, el petróleo capturado se calcula como <b>⌊oil_defensor / total_torres_defensor⌋ × torres_capturadas</b> y se transfiere al conquistador.</li>
            <li>Cuando el petróleo de un jugador llega a <b>0</b>: se retiran <b>todas sus torres</b> del tablero, sus <b>aviones actúan como tanques</b> y sus <b>tanques como infantería</b> (tanto atacando como defendiendo).</li>
          </ul>
        </Section>

        <Section n="8" title="Silos y misiles nucleares">
          <ul>
            <li><b>Sin silo, no hay misiles.</b> Un jugador que no controla ningún territorio con silo propio <b>no puede lanzar misiles</b>, aunque tenga misiles en su reserva.</li>
            <li>Cada jugador solo puede tener <b>1 silo</b>. Si pierdes tu territorio con silo, el nuevo dueño gana <b>+1 misil</b>.</li>
            <li>Un misil <b>destruye todas las torres</b> del territorio objetivo (no las tropas).</li>
            <li>Pérdida de petróleo del defensor: <b>⌊oil / total_torres⌋ × torres_destruidas</b>. El atacante <b>no recibe petróleo</b> del misil.</li>
            <li>Lanzar un misil <b>no cuenta como ataque</b> y no bloquea el objetivo del turno.</li>
          </ul>
        </Section>

        <Section n="9" title="Cartas (46 en total)">
          <ul>
            <li>44 cartas de territorio (con símbolo <b>S</b> soldado, <b>P</b> avión o <b>T</b> tanque) + <b>2 comodines</b> (W). Se roba <b>1 carta</b> al final del turno si conquistaste al menos un territorio en combate.</li>
            <li>Si la carta corresponde a un territorio que ya posees: <b>+2 infantería</b> el próximo turno (además de +1 torre si tenía aeropuerto y +1 misil si tenía silo).</li>
            <li>Canjes de 3 cartas dan infantería adicional y una recompensa. Con 5+ cartas es obligatorio canjear antes de atacar.</li>
            <li>Tabla de canjes:
              <ul>
                <li><b>1 comodín + 2 iguales</b> → <b>+12 infantería</b> y escoger: 1 misil nuclear, 5 torres, 4 aviones o 5 tanques.</li>
                <li><b>1 comodín + 2 distintos</b> (soldado/tanque/avión) → <b>+10 infantería</b> y escoger: 1 misil nuclear, 4 torres, 3 aviones o 4 tanques.</li>
                <li><b>1 soldado + 1 tanque + 1 avión</b> → <b>+10 infantería</b> y escoger: 1 misil nuclear, 4 torres, 3 aviones o 4 tanques.</li>
                <li><b>3 aviones</b> → <b>+8 infantería</b> y escoger: 3 torres, 2 aviones o 3 tanques.</li>
                <li><b>3 tanques</b> → <b>+6 infantería</b> y escoger: 2 torres, 1 avión o 2 tanques.</li>
                <li><b>3 soldados</b> → <b>+4 infantería</b> y <b>1 torre</b> (recompensa fija).</li>
              </ul>
            </li>
          </ul>
        </Section>

        <Section n="10" title="Fortalecer">
          <ul>
            <li>Movimientos <b>ilimitados</b> al final del turno: infantería y tanques a territorios <b>adyacentes propios</b>; aviones vuelan <b>aeropuerto → aeropuerto</b> a cualquier distancia.</li>
            <li>Coste: tanque <b>25 L</b> por movimiento; avión <b>50 L × distancia</b> por unidad.</li>
            <li>El origen siempre debe conservar <b>≥1 infantería</b>.</li>
          </ul>
        </Section>

        <Section n="11" title="Eliminación de jugadores">
          <ul>
            <li>Un jugador queda <b>eliminado</b> al perder su último territorio.</li>
            <li>El atacante que provoca la eliminación <b>hereda todas las cartas</b> del jugador eliminado.</li>
            <li><b>Excepción tierra quemada</b>: si el último territorio del rival estaba <b>vacío</b> (sin infantería, sin tanques, sin aviones) y se conquista sin combate, el atacante <b>no cobra carta</b> y <b>no hereda</b> las cartas del eliminado — sus cartas van al descarte.</li>
          </ul>
        </Section>

        <div style={{ marginTop: 22, borderTop: `1px solid ${T.hr}`, paddingTop: 14, textAlign: "right" }}>
          <button className="btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
