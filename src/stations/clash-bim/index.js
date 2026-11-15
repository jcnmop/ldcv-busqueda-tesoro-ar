/**
 * ESTACIÓN: Detective de clashes (coordinación BIM en dos fases)
 * Objeto RA: viga con instalaciones cruzándola; una la atraviesa (esfera roja).
 * Fase 1 DETECTAR: marcar todos los conflictos (choques duros y blandos por holgura).
 * Fase 2 RESOLVER: reubicar los elementos en conflicto respetando holgura y cielo raso.
 */
import { puntajePorTiempo } from '../../core/puntaje.js';
import { generarReto, conflictos, clasificar, evaluarDeteccion, evaluarResolucion } from './logica.js';

const INTENTOS_RESOLVER = 2;
let limpiar = () => {};

/** @type {import('../contrato.js').Estacion} */
const estacion = {
  id: 'clash-bim',
  nombre: 'Detective de clashes',
  marcadorId: 'clash-bim',
  pista: 'El marcador está dentro del LDCV, junto al escáner Leica P40.',
  tiempoLimiteMs: 180000,
  puntosMax: 100,

  crearObjeto(THREE) {
    const g = new THREE.Group();
    const concreto = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: 0.9 });
    const viga = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.12), concreto);
    viga.position.z = 0.36;
    g.add(viga);
    const colores = [0x9aa5b1, 0x1e88e5, 0xf2a900, 0x8d6e63];
    colores.forEach((c, i) => {
      const r = i === 1 ? 0.03 : 0.025;
      const tubo = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.7, 12), new THREE.MeshStandardMaterial({ color: c }));
      const x = -0.36 + i * 0.24;
      // el segundo "sube" y atraviesa la viga
      tubo.position.set(x, 0, i === 1 ? 0.34 : 0.22);
      g.add(tubo);
      if (i === 1) {
        const clash = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshBasicMaterial({ color: 0xd0453c, transparent: true, opacity: 0.8 }));
        clash.position.set(x, 0, 0.36);
        g.add(clash);
      }
    });
    // columnas en los extremos
    for (const x of [-0.5, 0.5]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.36), concreto);
      col.position.set(x, 0, 0.18);
      g.add(col);
    }
    return g;
  },

  montarMinijuego(contenedor, ctx) {
    const reto = generarReto();
    const { viga, cieloRaso, holgura, elementos } = reto;
    const reales = conflictos(reto);
    const seleccion = new Set();
    const nuevosZMax = {};
    let fase = 'detectar';
    let intentosResolver = 0;
    let resultadoDeteccion = null;

    // Corte transversal: eje vertical = cota (m)
    const W = 360, H = 320, IZQ = 46, ARR = 16, ABA = 30;
    const zBajo = Math.floor((cieloRaso - 0.08) * 10) / 10;
    const zAlto = Math.ceil((viga.zMax + 0.08) * 10) / 10;
    const Yz = (z) => ARR + (zAlto - z) * ((H - ARR - ABA) / (zAlto - zBajo));
    const col = (W - IZQ) / elementos.length;
    const Xc = (i) => IZQ + col * (i + 0.5);
    const zMaxDe = (e) => nuevosZMax[e.id] ?? e.zMax;

    contenedor.innerHTML = `
      <h2>Detective de clashes</h2>
      <div class="tarjeta" style="padding:12px">
        <p id="instruccion"></p>
      </div>
      <svg id="corte" viewBox="0 0 ${W} ${H}" width="100%" style="background:#0e2748;border-radius:12px;touch-action:manipulation"></svg>
      <p class="muted" style="font-size:.85rem;margin-top:-6px">
        <span style="display:inline-block;width:14px;height:8px;background:#ffd34d;opacity:.7;margin-right:4px"></span>
        holgura mínima ${Math.round(holgura * 100)} cm: el tope debe quedar en <strong>${(viga.zMin - holgura).toFixed(2)} m</strong> o menos ·
        <span style="color:#ce93d8">- - cielo raso ${cieloRaso.toFixed(2)} m</span>: nada puede quedar debajo
      </p>
      <div id="leyenda" class="muted" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.85rem"></div>
      <div id="controles" style="display:flex;flex-direction:column;gap:10px"></div>
      <button id="accion"></button>
      <p id="feedback" class="muted"></p>
    `;
    const svg = contenedor.querySelector('#corte');
    const leyenda = contenedor.querySelector('#leyenda');
    const controles = contenedor.querySelector('#controles');
    const btn = contenedor.querySelector('#accion');
    const fb = contenedor.querySelector('#feedback');
    const instr = contenedor.querySelector('#instruccion');

    const pintar = () => {
      let eje = '';
      for (let z = zBajo; z <= zAlto + 1e-9; z = Math.round((z + 0.1) * 10) / 10) {
        const y = Yz(z);
        eje += `<line x1="${IZQ}" y1="${y}" x2="${W}" y2="${y}" stroke="#fff" stroke-opacity="0.08" />`
          + `<text x="${IZQ - 6}" y="${y + 3}" fill="#9aa5b1" font-size="10" text-anchor="end">${z.toFixed(1)}</text>`;
      }
      const yVA = Yz(viga.zMax), yVB = Yz(viga.zMin), yHol = Yz(viga.zMin - holgura), yCR = Yz(cieloRaso);
      svg.innerHTML = `
        <defs><pattern id="rayado" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#cfd3d8"/><line x1="0" y1="0" x2="0" y2="8" stroke="#9aa5b1" stroke-width="3"/></pattern></defs>
        <text x="4" y="${ARR - 4}" fill="#9aa5b1" font-size="10">cota (m)</text>
        ${eje}
        <rect x="${IZQ}" y="${yVA}" width="${W - IZQ}" height="${yVB - yVA}" fill="url(#rayado)" opacity="0.85" />
        <text x="${W - 6}" y="${yVA + 14}" fill="#0b1f3a" font-size="11" font-weight="700" text-anchor="end">VIGA ${viga.zMin.toFixed(2)}–${viga.zMax.toFixed(2)} m</text>
        <rect x="${IZQ}" y="${yVB}" width="${W - IZQ}" height="${yHol - yVB}" fill="#ffd34d" opacity="0.45" />
        <line x1="${IZQ}" y1="${yHol}" x2="${W}" y2="${yHol}" stroke="#ffd34d" stroke-width="1.5" />
        <line x1="${IZQ}" y1="${yCR}" x2="${W}" y2="${yCR}" stroke="#ce93d8" stroke-width="2" stroke-dasharray="6 4" />
      ` + elementos.map((e, i) => {
        const zMax = zMaxDe(e), zMin = zMax - e.alto;
        const w = Math.min(col * 0.6, Math.max(14, e.alto * 90));
        const y1 = Yz(zMax), y2 = Yz(zMin);
        let stroke = 'transparent';
        if (fase === 'detectar' && seleccion.has(e.id)) stroke = '#f2a900';
        if (fase !== 'detectar' && reales.includes(e.id)) {
          const st = clasificar({ zMax }, viga, holgura) === 'ok' && zMin >= cieloRaso - 1e-9;
          stroke = st ? '#2e9e5b' : '#d0453c';
        }
        return `<g data-id="${e.id}" data-zmin="${zMin.toFixed(2)}" data-zmax="${zMax.toFixed(2)}" style="cursor:pointer">
          <text x="${Xc(i)}" y="${H - 8}" fill="${e.color}" font-size="10" text-anchor="middle">${zMin.toFixed(2)}–${zMax.toFixed(2)}</text>
          <rect x="${Xc(i) - w / 2}" y="${y1}" width="${w}" height="${y2 - y1}" fill="${e.color}" stroke="${stroke}" stroke-width="4" rx="${e.tipo === 'ducto' || e.tipo === 'bandeja' ? 2 : w / 2}" />
          <text x="${Xc(i)}" y="${y2 + 13}" fill="#f7f7f5" font-size="11" font-weight="700" text-anchor="middle">${i + 1}</text>
          <rect x="${Xc(i) - col / 2 + 2}" y="${ARR}" width="${col - 4}" height="${H - ARR}" fill="transparent" />
        </g>`;
      }).join('');
      leyenda.innerHTML = elementos.map((e, i) => `<span><span style="display:inline-block;width:10px;height:10px;background:${e.color};border-radius:2px;margin-right:6px"></span>${i + 1}. ${e.nombre}</span>`).join('');
    };

    const irDetectar = () => {
      instr.innerHTML = `<strong>Fase 1 · Detectar.</strong> Marquen <strong>todos</strong> los elementos en conflicto:
        <br>• <strong>choque duro</strong>: se mete en la viga;
        <br>• <strong>choque blando</strong>: no la toca, pero invade la franja amarilla de holgura (${Math.round(holgura * 100)} cm).
        <br>Puede haber más de uno.`;
      btn.textContent = 'Listo: esos son todos';
      pintar();
    };

    const irResolver = () => {
      fase = 'resolver';
      const { aciertos, falsos, omitidos, total } = resultadoDeteccion;
      fb.innerHTML = `Detección: <strong>${aciertos}/${total}</strong> conflictos encontrados`
        + (falsos ? `, ${falsos} marcado(s) de más` : '') + (omitidos ? `, ${omitidos} sin detectar` : '') + '.';
      instr.innerHTML = `<strong>Fase 2 · Resolver.</strong> Los conflictos reales están en rojo. Muevan cada uno
        <strong>debajo de la franja de holgura</strong> sin bajar del <strong>cielo raso</strong>. Verde = resuelto.`;
      controles.innerHTML = reales.map((id) => {
        const i = elementos.findIndex((e) => e.id === id);
        const e = elementos[i];
        return `<label class="muted">${i + 1}. ${e.nombre} · tope: <strong id="v-${id}">${e.zMax.toFixed(2)}</strong> m
          <input type="range" data-mover="${id}" min="${(cieloRaso + e.alto - 0.05).toFixed(2)}" max="${(viga.zMax).toFixed(2)}" step="0.01" value="${e.zMax.toFixed(2)}" />
        </label>`;
      }).join('');
      btn.textContent = 'Verificar reubicación';
      pintar();
    };

    const terminar = (resol) => {
      const det = resultadoDeteccion;
      ctx.terminar({
        completado: resol.resueltos === resol.total,
        aciertos: det.aciertos + resol.resueltos,
        intentos: intentosResolver,
        detalle: {
          vigaZMin: viga.zMin, vigaZMax: viga.zMax, cieloRaso, holgura,
          conflictos: reales.map((id) => {
            const e = elementos.find((x) => x.id === id);
            const d = resol.detalle.find((x) => x.id === id);
            return { nombre: e.nombre, alto: e.alto, zMaxOriginal: e.zMax, tipo: clasificar(e, viga, holgura), zMaxFinal: d.zMax, resuelto: d.resuelto };
          }),
          deteccion: { aciertos: det.aciertos, falsos: det.falsos, omitidos: det.omitidos, total: det.total },
          resolucion: { resueltos: resol.resueltos, total: resol.total },
        },
      });
    };

    const onToque = (ev) => {
      if (fase !== 'detectar') return;
      const g = ev.target.closest('g[data-id]');
      if (!g) return;
      const id = g.dataset.id;
      if (seleccion.has(id)) seleccion.delete(id); else seleccion.add(id);
      btn.textContent = `Listo: esos son todos (${seleccion.size})`;
      pintar();
    };
    const onMover = (ev) => {
      const id = ev.target.dataset?.mover;
      if (!id) return;
      nuevosZMax[id] = parseFloat(ev.target.value);
      contenedor.querySelector(`#v-${id}`).textContent = nuevosZMax[id].toFixed(2);
      pintar();
    };
    const onAccion = () => {
      if (fase === 'detectar') {
        resultadoDeteccion = evaluarDeteccion(reto, [...seleccion]);
        irResolver();
        return;
      }
      intentosResolver++;
      const resol = evaluarResolucion(reto, nuevosZMax);
      if (resol.resueltos === resol.total) {
        fb.innerHTML += `<br><span style="color:var(--ok)">¡Coordinación resuelta! Todos los elementos cumplen holgura y cielo raso.</span>`;
        btn.disabled = true;
        setTimeout(() => terminar(resol), 1300);
        return;
      }
      const malos = resol.detalle.filter((d) => !d.resuelto).map((d) => {
        const i = elementos.findIndex((e) => e.id === d.id);
        return `${i + 1} (${!d.holguraOk ? 'aún sin holgura' : 'bajo el cielo raso'})`;
      });
      if (intentosResolver >= INTENTOS_RESOLVER) {
        fb.innerHTML += `<br><span style="color:var(--error)">Quedaron sin resolver: ${malos.join(', ')}.</span>`;
        btn.disabled = true;
        setTimeout(() => terminar(resol), 2000);
        return;
      }
      fb.innerHTML = `<span style="color:var(--error)">Falta: ${malos.join(', ')}.</span> Queda 1 intento.`;
      ctx.mostrarAyuda('El tope de cada elemento debe quedar en o bajo el borde inferior de la franja amarilla, y su fondo sobre la línea del cielo raso.');
    };

    svg.addEventListener('click', onToque);
    controles.addEventListener('input', onMover);
    btn.addEventListener('click', onAccion);
    irDetectar();
    limpiar = () => {
      svg.removeEventListener('click', onToque);
      controles.removeEventListener('input', onMover);
      btn.removeEventListener('click', onAccion);
    };
  },

  explicarSolucion(d) {
    if (!d?.conflictos) return [];
    const limite = (d.vigaZMin - d.holgura).toFixed(2);
    return [
      `Viga de ${d.vigaZMin.toFixed(2)} a ${d.vigaZMax.toFixed(2)} m; holgura mínima ${Math.round(d.holgura * 100)} cm (tope ≤ ${limite} m); cielo raso en ${d.cieloRaso.toFixed(2)} m.`,
      `Había ${d.conflictos.length} conflicto(s). Ustedes detectaron ${d.deteccion.aciertos}${d.deteccion.falsos ? `, marcaron ${d.deteccion.falsos} de más` : ''}${d.deteccion.omitidos ? ` y omitieron ${d.deteccion.omitidos}` : ''}.`,
      ...d.conflictos.map((c) => `${c.nombre}: choque ${c.tipo} (tope ${c.zMaxOriginal.toFixed(2)} m). Válido con tope entre ${(d.cieloRaso + c.alto).toFixed(2)} y ${limite} m → ustedes ${c.zMaxFinal.toFixed(2)} m ${c.resuelto ? '✓' : '✗'}.`),
    ];
  },

  desmontar() {
    limpiar();
    limpiar = () => {};
  },

  /** 50 pts detección (aciertos − falsos) + 50 pts resolución, ajustado por tiempo. */
  calcularPuntaje(resultado, tiempoUsadoMs) {
    const d = resultado.detalle;
    if (!d?.deteccion) return 0;
    const det = 50 * Math.max(0, d.deteccion.aciertos - d.deteccion.falsos) / Math.max(1, d.deteccion.total);
    const res = 50 * d.resolucion.resueltos / Math.max(1, d.resolucion.total);
    const factor = puntajePorTiempo(1000, tiempoUsadoMs, estacion.tiempoLimiteMs) / 1000;
    return Math.round((det + res) * factor);
  },
};

export default estacion;
