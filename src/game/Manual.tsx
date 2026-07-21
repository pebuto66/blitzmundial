import "./game.css";

export function Manual({ onClose }: { onClose: () => void }) {
  return (
    <div className="victory-overlay" onClick={onClose}>
      <div
        className="victory-modal"
        style={{ maxWidth: 780, textAlign: "left", maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="label" style={{ marginBottom: 4 }}>Manual del jugador</div>
        <div className="title" style={{ marginBottom: 12 }}>Rapid Risk</div>

        <h3 style={{ color: "#c9a227", marginTop: 8 }}>1. Objetivo</h3>
        <p>Conquistar el mundo eliminando a todos los ejércitos enemigos del tablero.</p>

        <h3 style={{ color: "#c9a227" }}>2. Setup inicial</h3>
        <ul>
          <li>Los territorios se reparten aleatoriamente y cada uno empieza con 1 infantería.</li>
          <li>Por turnos, cada jugador coloca sus <b>aeropuertos → silo → torres → aviones → tanques → infantería</b>.</li>
          <li>Los <b>aviones</b> solo se colocan sobre <b>aeropuertos</b> propios.</li>
        </ul>

        <h3 style={{ color: "#c9a227" }}>3. Refuerzos por turno</h3>
        <ul>
          <li><b>Mínimo 3</b> infanterías por turno.</li>
          <li><b>+ floor(territorios / 3)</b> — por ejemplo 33 territorios → +11; 32 → +10 (nunca se redondea al alza).</li>
          <li><b>+ bono de continente</b> si controlas uno completo (NA:5, SA:2, EU:5, AF:3, AS:7, OC:2).</li>
          <li><b>+2 infantería</b> por cada carta robada de un territorio que ya posees.</li>
          <li>Aviones/tanques/torres pendientes se colocan también en refuerzo. <b>No se puede pasar a Ataque</b> con unidades sin colocar; excepción: aviones en reserva cuando no tienes ningún aeropuerto donde estacionarlos.</li>
          <li>Con <b>5+ cartas</b> el canje es obligatorio antes de pasar a Ataque.</li>
        </ul>

        <h3 style={{ color: "#c9a227" }}>4. Ataque</h3>
        <ul>
          <li>Solo puedes tener <b>un objetivo por turno</b>: al primer ataque el territorio queda bloqueado como el único que puedes atacar durante todo ese turno (con la misma o distinta unidad, desde territorios distintos).</li>
          <li><b>Infantería</b>: gratis. Adyacencia obligatoria.</li>
          <li><b>Tanque</b>: cuesta <b>50 L de petróleo</b> por objetivo (pago único). Suma <b>+2</b> a cada dado vs infantería. Sin petróleo, el tanque <b>no puede atacar</b>.</li>
          <li><b>Avión</b>: cuesta <b>100 L</b> por territorio recorrido, ida y vuelta. Alcance global vía aeropuertos, pero el objetivo debe tener <b>frontera con un territorio propio</b> con ≥2 infantería para poder trasladar la tropa de ocupación. Sin petróleo, el avión <b>no puede atacar</b>.</li>
          <li>Prioridad de defensa: aviones → tanques → infantería.</li>
          <li><b>Tierra quemada</b>: puedes atacar con 1 sola infantería. Si pierdes, ese territorio queda vacío (sigue siendo tuyo). Cualquier enemigo puede entonces conquistarlo sin combate (tirará solo, sin dados enemigos, se considera ataque ganado) pero <b>no cobrará carta</b> porque no hubo combate.</li>
          <li>Si atacas con 1 infantería y ganas contra 1 defensor, el enemigo desaparece pero al no poder ocupar, tu tropa se queda en origen y no cobras carta.</li>
          <li>Solo se cobra carta cuando <b>hay combate</b> y conquistas el territorio.</li>
        </ul>

        <h3 style={{ color: "#c9a227" }}>5. Petróleo y torres</h3>
        <ul>
          <li>Cada torre otorga <b>1000 L</b> al construirla.</li>
          <li>El petróleo <b>persiste entre turnos</b> — solo baja al gastarlo o perder torres, y sube al construir o capturar torres.</li>
          <li>Al conquistar un territorio con torres, el petróleo (torres × 1000, hasta el máximo disponible del rival) se <b>transfiere al conquistador</b>.</li>
          <li>Cuando un jugador se queda <b>sin petróleo</b>: todas sus torres se retiran del tablero. Sus <b>aviones se comportan como tanques</b> y sus <b>tanques como infantería</b>, tanto al atacar como al defender.</li>
        </ul>

        <h3 style={{ color: "#c9a227" }}>6. Silos y misiles nucleares</h3>
        <ul>
          <li>Solo hay <b>1 silo</b> por jugador. Si lo pierdes, el nuevo dueño gana 1 misil.</li>
          <li>Un misil destruye <b>todas las torres</b> del territorio objetivo (no las tropas).</li>
          <li>Pérdida de petróleo del defensor: <code>floor(oil_actual / total_torres_del_defensor) × torres_destruidas</code>. El atacante <b>no recibe petróleo</b>.</li>
        </ul>

        <h3 style={{ color: "#c9a227" }}>7. Cartas (46 en total)</h3>
        <ul>
          <li>44 cartas de territorio + 2 comodines. Se roban al final de un turno con <b>al menos una conquista con combate</b>.</li>
          <li>Si la carta corresponde a un territorio propio: <b>+2 infantería</b> el próximo turno; +1 torre si tenía aeropuerto; +1 misil si tenía silo.</li>
          <li>Canjes de 3 cartas dan infantería y una recompensa a elegir. Con 5+ cartas es obligatorio canjear.</li>
        </ul>

        <h3 style={{ color: "#c9a227" }}>8. Fortalecer</h3>
        <ul>
          <li>Movimientos ilimitados: infantería y tanques a territorios <b>adyacentes propios</b>. Aviones vuelan aeropuerto → aeropuerto a cualquier distancia.</li>
          <li>Coste: tanque 50 L por movimiento; avión 100 L por territorio recorrido.</li>
          <li>El origen siempre debe conservar ≥1 infantería.</li>
        </ul>

        <h3 style={{ color: "#c9a227" }}>9. Conectividad especial</h3>
        <ul>
          <li><b>Oriente Medio ↔ Los Balcanes</b>: sin conexión terrestre. Solo aviones.</li>
          <li><b>Mongolia ↔ Omsk</b>: sin conexión terrestre. Solo aviones.</li>
        </ul>

        <div style={{ marginTop: 18, textAlign: "right" }}>
          <button className="btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}