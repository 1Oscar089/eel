/* ============================================================
  notificaciones.ts — NOTIFICACIONES PUSH (ENTRADAS 26 y 30)
  ------------------------------------------------------------
  Sistema ÚNICO de avisos informativos de la app. REGLA a partir
  de esta entrada:
  · Si el aviso pide datos o confirmación → MODAL (lo construye
    la vista, p. ej. "Eliminar docente").
  · Si el aviso es SOLO información → NOTIFICACIÓN PUSH de este
    archivo: aparece ARRIBA A LA DERECHA, con color según el
    estado (verde = éxito, amarillo = advertencia, rojo =
    error), dura 5 SEGUNDOS y se quita sola. No bloquea nada.
  NOVEDAD ENTRADA 30: AUTODIAGNÓSTICO en consola. Si el CSS de
  las notificaciones (SECCIÓN 15 de layout.css) falta o quedó
  viejo, el aviso se crearía FUERA de la pantalla y "no se vería
  nunca"; ahora la consola (F12) avisa con un [EEL] y explica
  cómo corregirlo. No cambia nada más del funcionamiento.
  USO (desde cualquier vista o servicio):
    import { mostrarNotificacion } from '../../servicios/notificaciones';
    mostrarNotificacion('Docente guardado', 'exito');
    mostrarNotificacion('Revisa los campos marcados', 'advertencia');
    mostrarNotificacion('No se pudo guardar', 'error');
  Los estilos viven en layout.css (SECCIÓN 15 · NOTIFICACIONES).
============================================================ */

/* ============================================================
  SECCIÓN 1 · TIPOS Y CONSTANTES (NO EDITAR)
============================================================ */

/** Estado de la notificación: define su color. */
export type TipoNotificacion = 'exito' | 'advertencia' | 'error';

/** Duración en pantalla: 4.5 s visible + 0.5 s de salida
 *  animada = 5 segundos en total. */
const DURACION_MS = 5000;

/* ============================================================
  SECCIÓN 2 · ICONOS SVG (NO EDITAR)
  Trazo uniforme; heredan el color del estado con currentColor.
  innerHTML se usa SOLO para SVG, como manda la convención del
  proyecto.
============================================================ */
const ICONOS: Record<TipoNotificacion, string> = {
  exito: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>`,
  advertencia: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <path d="M10.3 4.2L2.3 18a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4" />
      <path d="M12 17h.01" />
    </svg>`,
  error: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6" />
      <path d="M9 9l6 6" />
    </svg>`,
};

/* ============================================================
  SECCIÓN 3 · MOSTRAR NOTIFICACIÓN (NO EDITAR)
============================================================ */

/** Muestra una notificación push ARRIBA A LA DERECHA. Varias
 *  seguidas se apilan en columna; cada una se quita sola a los
 *  5 segundos. No bloquea nada y no hay que cerrarla. */
export function mostrarNotificacion(
  texto: string,
  tipo: TipoNotificacion = 'exito',
): void {
  // Contenedor fijo: se crea la primera vez y se reutiliza.
  let contenedor = document.querySelector<HTMLElement>(
    '.notificaciones-contenedor',
  );
  if (contenedor === null) {
    contenedor = document.createElement('div');
    contenedor.className = 'notificaciones-contenedor';
    document.body.appendChild(contenedor);

    // AUTODIAGNÓSTICO (solo consola, ENTRADA 30): si en tu
    // layout.css falta la SECCIÓN 15 (NOTIFICACIONES PUSH), el
    // aviso se crea pero SIN posición fija — queda al final de la
    // página, fuera de la pantalla, y por eso "no sale". Este
    // aviso en la consola (F12) lo detecta y dice qué hacer.
    const estilo = window.getComputedStyle(contenedor);
    if (estilo.position !== 'fixed') {
      console.warn(
        '[EEL] Las notificaciones push NO se verán: tu ' +
          'src/styles/layout.css no tiene la SECCIÓN 15 ' +
          '(NOTIFICACIONES PUSH, ENTRADA 26/30). Reemplaza ese ' +
          'archivo con la versión completa de la ENTRADA 30 y ' +
          'recarga con Ctrl+F5.',
      );
    }
  }

  // Tarjeta: icono (colorea el estado) + texto.
  const nota = document.createElement('div');
  nota.className = 'notificacion notificacion-' + tipo;
  nota.setAttribute('role', 'status');
  nota.setAttribute('aria-live', 'polite');

  const icono = document.createElement('span');
  icono.className = 'notificacion-icono';
  icono.setAttribute('aria-hidden', 'true');
  icono.innerHTML = ICONOS[tipo]; // SOLO SVG

  const mensaje = document.createElement('span');
  mensaje.className = 'notificacion-texto';
  mensaje.textContent = texto;

  nota.append(icono, mensaje);
  contenedor.appendChild(nota);

  // Salida animada a los 4.5 s y eliminación a los 5 s.
  window.setTimeout(() => {
    nota.classList.add('notificacion-salida');
  }, DURACION_MS - 500);
  window.setTimeout(() => {
    nota.remove();
  }, DURACION_MS);
}