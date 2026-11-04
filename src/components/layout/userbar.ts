/**
 * userbar.ts — Barra superior de navegación (FASE 2, PASO 2.3).
 * Por ahora: hamburguesa funcional + logo.
 * La búsqueda global, la luz de conexión y el selector de rol
 * se agregan en fases posteriores de la guía.
 */

/** Media query que define "tablet o menor" (mismo breakpoint del CSS). */
const MQ_TABLET = '(max-width: 1024px)';

/** ¿Está el sidebar visible en algún estado expandido o abierto? */
export function sidebarEstaAbierto(): boolean {
  const layout = document.querySelector('.app-layout');
  return !!layout && (
    layout.classList.contains('sidebar-open') ||
    layout.classList.contains('sidebar-mini')
  );
}

/**
 * Alterna el sidebar según el dispositivo:
 * - Escritorio (>1024px): clase .sidebar-mini (72px, el contenido se expande solo).
 * - Tablet / Móvil: clase .sidebar-open (drawer flotante + overlay).
 */
export function alternarSidebar(): void {
  const layout = document.querySelector('.app-layout');
  if (!layout) return;

  if (window.matchMedia(MQ_TABLET).matches) {
    layout.classList.toggle('sidebar-open');
  } else {
    layout.classList.toggle('sidebar-mini');
  }
}

/** Cierra el drawer (lo usa el overlay al hacer clic). */
export function cerrarSidebar(): void {
  document.querySelector('.app-layout')?.classList.remove('sidebar-open');
}

/** Al redimensionar, limpia estados que ya no aplican al nuevo ancho. */
export function limpiarEstadoSegunAncho(): void {
  const layout = document.querySelector('.app-layout');
  if (!layout) return;

  if (window.matchMedia(MQ_TABLET).matches) {
    layout.classList.remove('sidebar-mini'); // en tablet/móvil no aplica mini
  } else {
    layout.classList.remove('sidebar-open'); // en escritorio no aplica drawer
  }
}

/** Construye y devuelve el <header class="userbar">. */
export function crearUserbar(): HTMLElement {
  const header = document.createElement('header');
  header.className = 'userbar';

  // Botón hamburguesa (3 barras dibujadas con CSS)
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'hamburguesa';
  btn.setAttribute('aria-label', 'Alternar menú lateral');
  btn.setAttribute('aria-expanded', 'false');
  for (let i = 0; i < 3; i++) {
    btn.appendChild(crearBarra());
  }
  btn.addEventListener('click', () => {
    alternarSidebar();
    btn.setAttribute('aria-expanded', sidebarEstaAbierto() ? 'true' : 'false');
  });

  // Logotipo provisional (texto). El isotipo real llegará vía public/assets
  const logo = document.createElement('span');
  logo.className = 'logo';
  logo.textContent = 'Expediente en Línea';

  header.appendChild(btn);
  header.appendChild(logo);
  return header;
}

function crearBarra(): HTMLElement {
  const barra = document.createElement('span');
  barra.className = 'hamburguesa-barra';
  return barra;
}