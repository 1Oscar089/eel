/* ============================================================
  main.ts — PUNTO DE ENTRADA ÚNICO (aquí pasa todo)
  ------------------------------------------------------------
  Orden de arranque:
  1. Se importan los CSS (variables ANTES que layout).
  2. Se importan los componentes del esqueleto.
  3. montarLayout() construye el DOM y lo cuelga del <body>.
============================================================ */

/* ---------- 1. Estilos (el orden importa) ---------- */
// Tokens de diseño: SOLO medidas, capas z, transiciones y tipografía
import './styles/variables.css';
// Colores, componentes del layout y las media queries
import './styles/layout.css';
// Proyecto 1 · vista de inicio de sesión
import './styles/login.css';

/* ---------- 2. Componentes del esqueleto ---------- */
// userbar: barra superior + lógica de abrir/cerrar el sidebar
import { crearUserbar, cerrarSidebar, limpiarEstadoSegunAncho } from './components/layout/userbar';
// sidebar: menú lateral de navegación
import { crearSidebar } from './components/layout/sidebar';
// content: área central (migas, título, contenedor de vistas, pie)
import { crearContenido } from './components/layout/content';
// Proyecto 1 · login (vista única mientras no exista el router post-login)
import { crearLogin, CLAVE_SESION } from './components/proyecto-1/login';

/* ---------- 3. Montaje de la aplicación ---------- */
/**
 * Árbol que se construye (el <body> de index.html está vacío):
 *
 * body
 * └── .app-layout                 (columna: userbar arriba, resto abajo)
 *     ├── header.userbar          (hamburguesa + logo)
 *     ├── .app-body               (fila: sidebar | content)
 *     │   ├── nav.sidebar         (280px → 72px / flotante / drawer)
 *     │   └── main.content        (flex:1 → se expande solo al colapsar)
 *     └── .sidebar-overlay        (fondo oscuro tras el menú flotante)
 */
function montarLayout(): void {
  // Contenedor raíz organizado en columna
  const layout = document.createElement('div');
  layout.className = 'app-layout';

  // Barra superior con hamburguesa y logo
  layout.appendChild(crearUserbar());

  // Zona horizontal: navegación + área de trabajo
  const cuerpo = document.createElement('div');
  cuerpo.className = 'app-body';
  cuerpo.appendChild(crearSidebar());   // el content con flex:1 llena lo restante
  cuerpo.appendChild(crearContenido());
  layout.appendChild(cuerpo);

  // Overlay: al hacer clic fuera del menú flotante, se cierra
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.addEventListener('click', cerrarSidebar);
  layout.appendChild(overlay);

  // Inyección del esqueleto en el body
  document.body.appendChild(layout);

  // Al redimensionar la ventana, limpia clases que ya no aplican
  window.addEventListener('resize', limpiarEstadoSegunAncho);
}

// Arranque: sin sesión guardada se muestra el login; con sesión, el sistema
if (sessionStorage.getItem(CLAVE_SESION) !== null) {
  montarLayout();
} else {
  document.body.appendChild(crearLogin());
}