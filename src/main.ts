
import { testAllFirebaseProjects } from './testFirebase';

testAllFirebaseProjects();

/**
 * main.ts — Punto de entrada de la SPA.
 * ESTADO ACTUAL: Iteración 2 — esqueleto del layout.
 * Todo se construye aquí temporalmente; en las Iteraciones 4–6
 * cada función se extraerá a su propio componente en components/layout/.
 */

/* ---------- Helper DOM provisional (migrará a utils/dom.ts) ---------- */

/** Crea un elemento con clases y texto opcionales, tipado por etiqueta. */
function crearElemento<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  clases: string = '',
  texto: string = ''
): HTMLElementTagNameMap[K] {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto) el.textContent = texto;
  return el;
}

/* ---------- Componentes del layout (temporal en este archivo) ---------- */

/** Barra superior: hamburguesa + logo. Búsqueda, luz y rol llegan después. */
function crearUserbar(): HTMLElement {
  const header = crearElemento('header', 'userbar');

  const btn = crearElemento('button', 'hamburguesa');
  btn.setAttribute('aria-label', 'Alternar menú lateral');
  // Icono provisional; en la Iteración 3 lo cambiamos por tres barras CSS
  btn.textContent = '☰';

  const logo = crearElemento('span', 'logo', 'Expediente en Línea');

  header.appendChild(btn);
  header.appendChild(logo);

  // Iteración 3: aquí va el addEventListener de la hamburguesa
  return header;
}

/** Menú lateral. Por ahora 2 ítems de prueba, luego serán 30 secciones. */
function crearSidebar(): HTMLElement {
  const aside = crearElemento('aside', 'sidebar');
  const nav = crearElemento('nav', 'sidebar-nav');

  const items = ['Inicio', 'Usuario'];
  for (const nombre of items) {
    const item = crearElemento('a', 'sidebar-item');
    item.setAttribute('href', '#/' + nombre.toLowerCase());
    // El texto va envuelto: el modo mini lo oculta con CSS (Iteración 5)
    item.style.color = "white"; 
    item.appendChild(crearElemento('span', 'sidebar-texto', nombre));
    nav.appendChild(item);
  } 
  aside.appendChild(nav);
  return aside;
}

/** Pie de página alineado al contenido, con estado de sincronización. */
function crearFooter(): HTMLElement {
  const footer = crearElemento('footer');
  footer.appendChild(crearElemento('span', '', '© 2026 — Expediente en Línea'));
  footer.appendChild(crearElemento('span', 'sync-estado', 'Sincronización: pendiente'));
  return footer;
}

/** Área dinámica donde el router montará las vistas (por ahora, placeholder). */
function crearContenido(): HTMLElement {
  const main = crearElemento('main', 'content');

  main.appendChild(crearElemento('h4', 'titulo-vista', 'Contenido'));
  main.appendChild(
    crearElemento('p', '', 'Aquí se montarán las vistas de la SPA (placeholder temporal).')
  );
  main.appendChild(crearFooter());

  return main;
}

/* ---------- Ensamblado del layout ---------- */

function montarLayout(): void {
  const layout = crearElemento('div', 'app-layout');

  layout.appendChild(crearUserbar());

  const body = crearElemento('div', 'app-body');
  body.appendChild(crearSidebar());
  body.appendChild(crearContenido());
  layout.appendChild(body);

  // Overlay del drawer móvil: fondo traslúcido desenfocado (solo CSS móvil)
  layout.appendChild(crearElemento('div', 'sidebar-overlay'));

  document.body.appendChild(layout);
}

montarLayout();