/**
 * content.ts — Área principal de contenido (FASE 2, PASO 2.3).
 * Renderiza: migas de pan, título de la vista, descripción,
 * el contenedor #view-container (donde el router de la Fase 3
 * montará las 30 secciones) y el pie de página.
 */

/** Construye y devuelve el <main class="content">. */
export function crearContenido(): HTMLElement {
  const main = document.createElement('main');
  main.className = 'content';

  main.appendChild(crearMigas('Inicio', 'Panel Principal'));
  main.appendChild(crearTitulo('Panel Principal'));
  main.appendChild(crearDescripcion());

  // Zona de montaje del futuro router SPA
  const contenedor = document.createElement('div');
  contenedor.id = 'view-container';
  contenedor.className = 'view-container';
  contenedor.textContent = 'El router montará aquí las vistas (Fase 3 de la guía)';
  main.appendChild(contenedor);

  main.appendChild(crearFooter());
  return main;
}

function crearMigas(seccion: string, vista: string): HTMLElement {
  const migas = document.createElement('nav');
  migas.className = 'migas';
  migas.setAttribute('aria-label', 'Ruta de navegación');
  migas.textContent = seccion + ' / ' + vista;
  return migas;
}

function crearTitulo(texto: string): HTMLElement {
  const titulo = document.createElement('h4');
  titulo.className = 'titulo-vista';
  titulo.textContent = texto;
  return titulo;
}

function crearDescripcion(): HTMLElement {
  const p = document.createElement('p');
  p.className = 'descripcion-vista';
  p.textContent =
    'Área de trabajo dinámica de la SPA. Todo lo que se ve fue inyectado ' +
    'por TypeScript en un body completamente vacío.';
  return p;
}

function crearFooter(): HTMLElement {
  const footer = document.createElement('footer');

  const izq = document.createElement('span');
  izq.textContent = '© 2026 — Expediente en Línea';

  const der = document.createElement('span');
  der.className = 'sync-estado';
  der.textContent = 'Sincronización: pendiente';

  footer.appendChild(izq);
  footer.appendChild(der);
  return footer;
}