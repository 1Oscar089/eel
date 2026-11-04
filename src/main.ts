/**
 * main.ts — Punto de entrada ÚNICO de la SPA (todo pasa por aquí).
 * Vite compila este archivo y los CSS importados terminan inyectados
 * en el <head> respetando el orden: variables primero, layout después.
 *
 * El <body> del index.html está 100% vacío: todo se inyecta con el DOM.
 *
 * Flujo de la guía: Fase 2 (layout). La autenticación y el router
 * por hash llegan en la Fase 3.
 */

/* ---------- Estilos globales (en este orden) ---------- */
import './styles/variables.css';
import './styles/layout.css';

/* ---------- Componentes del layout ---------- */
import {
  crearUserbar,
  cerrarSidebar,
  limpiarEstadoSegunAncho,
} from './components/layout/userbar';
import { crearSidebar } from './components/layout/sidebar';
import { crearContenido } from './components/layout/content';

function montarLayout(): void {
  const layout = document.createElement('div');
  layout.className = 'app-layout';

  // Barra superior
  layout.appendChild(crearUserbar());

  // Cuerpo: sidebar + contenido
  const cuerpo = document.createElement('div');
  cuerpo.className = 'app-body';
  cuerpo.appendChild(crearSidebar());
  cuerpo.appendChild(crearContenido());
  layout.appendChild(cuerpo);

  // Overlay del drawer (móvil): tocar el fondo cierra el menú
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.addEventListener('click', cerrarSidebar);
  layout.appendChild(overlay);

  document.body.appendChild(layout);

  // Limpia estados del sidebar al pasar de un dispositivo a otro
  window.addEventListener('resize', limpiarEstadoSegunAncho);
}

montarLayout();