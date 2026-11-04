/**
 * sidebar.ts — Menú lateral acordeón (FASE 2, PASO 2.3).
 * Versión inicial con 2 secciones de prueba (boceto del usuario)
 * e iconos SVG inline. Las 30 secciones con subsecciones se
 * registrarán en la Fase 4 de la guía.
 */

/** Contrato mínimo de un ítem del menú. */
interface ItemMenu {
  titulo: string;
  ruta: string;    // ruta por hash (el router llega en la Fase 3)
  icono: string;   // SVG inline (fill = currentColor desde el CSS)
  activo?: boolean;
}

const ICONO_INICIO =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>';

const ICONO_USUARIO =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';

const ICONO_CALIFICACION =
  '<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://w3.org">' + 
  '<path d="M 3 3 L 15 3M21 12 L21 21L3 21L3 3" stroke="black" fill="none" stroke-width="3" stroke-linecap="round"/><path d="M11 10L24 0L10 15L7 7z" stroke="black" fill="black"></svg'


/** Ítems de prueba: Inicio y Usuario. */
const ITEMS_MENU: ItemMenu[] = [
  { titulo: 'Inicio', ruta: '#/inicio', icono: ICONO_INICIO, activo: true },
  { titulo: 'Usuario', ruta: '#/usuario', icono: ICONO_USUARIO },
  { titulo: 'Calificaciones', ruta: '#/calificaciones', icono: ICONO_CALIFICACION},

];

/** Construye y devuelve el <aside class="sidebar">. */
export function crearSidebar(): HTMLElement {
  const aside = document.createElement('aside');
  aside.className = 'sidebar';

  const nav = document.createElement('nav');
  nav.className = 'sidebar-nav';
  nav.setAttribute('aria-label', 'Secciones');

  for (const item of ITEMS_MENU) {
    nav.appendChild(crearItem(item));
  }

  aside.appendChild(nav);
  return aside;
}

function crearItem(item: ItemMenu): HTMLElement {
  const enlace = document.createElement('a');
  enlace.className = item.activo ? 'sidebar-item activo' : 'sidebar-item';
  enlace.href = item.ruta;

  const icono = document.createElement('span');
  icono.className = 'sidebar-icono';
  icono.innerHTML = item.icono;

  const texto = document.createElement('span');
  texto.className = 'sidebar-texto';
  texto.textContent = item.titulo;

  enlace.appendChild(icono);
  enlace.appendChild(texto);
  return enlace;
}

function seleccionarItem(ruta: string): void {
  document.querySelectorAll('a.sidebar-item').forEach(enlace => {
    const esActual = enlace.getAttribute('href') === ruta;
    enlace.classList.toggle('activo', esActual);
  });
}

window.addEventListener('hashchange', () => seleccionarItem(window.location.hash));
seleccionarItem(window.location.hash || '#/inicio');