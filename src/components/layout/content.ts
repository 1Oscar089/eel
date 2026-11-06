/* ============================================================
  content.ts — Área central de trabajo (cascarón)
  ------------------------------------------------------------
  Este archivo YA NO genera el contenido de las vistas: cada
  vista se construye COMPLETA en su propio .ts (migas, botones
  y cuerpo) y aquí SOLO se importa y se agrega al contenedor.

  Estructura que renderiza:
  - #view-container: aquí se agrega la vista de la ruta actual.
  - Estado vacío cuando la ruta aún no tiene vista construida.
  - Pie con copyright y estado de sincronización.

  CÓMO AGREGAR UNA VISTA NUEVA (EDITA AQUÍ, al final):
  1. Constrúyela completa en su módulo (p. ej. estudiantes.ts).
     Debe exportar crearVistaEstudiantes(): HTMLElement con TODO
     adentro: encabezado (migas + botones) y cuerpo.
  2. Agrégale su bloque al montador de rutas de más abajo,
     igual que el bloque de Docentes.
============================================================ */

/** Construye el <main> central y lo devuelve para que main.ts
 *  lo cuelgue del .app-body después del sidebar. */
export function crearContenido(): HTMLElement {
  const main = document.createElement('main');
  main.className = 'content';

  // --- Contenedor de vistas (las vistas se agregan aquí) ---
  const contenedor = document.createElement('div');
  contenedor.id = 'view-container';
  contenedor.className = 'view-container';

  // --- Pie: copyright a la izquierda, sincronización a la derecha ---
  const footer = document.createElement('footer');
  footer.className = 'pie-contenido';
  footer.innerHTML = `
    <span>© 2026 Expediente en Línea</span>
    <span class="sync-estado">Sincronización: pendiente</span>`;

  main.append(contenedor, footer);

  // --- Estado vacío: tarjeta amable para rutas sin vista aún ---
  const crearEstadoVacio = (): HTMLElement => {
    const estado = document.createElement('div');
    estado.className = 'estado-vacio';
    estado.innerHTML = `
      <svg class="estado-vacio-icono" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.5" stroke-linecap="butt"
           stroke-linejoin="miter" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 13.5h6" />
      </svg>
      <p class="estado-vacio-titulo">Vista en construcción</p>
      <p class="estado-vacio-texto">
        Esta sección todavía no tiene vista. Usa el menú lateral para navegar.
      </p>`;
    return estado;
  };

  /* ============================================================
    MONTADOR DE RUTAS (EDITA AQUÍ)
    - Un bloque "if" por vista; provisional hasta el router
      de la Fase 3. El import dinámico mantiene el código de
      cada vista en su propio archivo.
  ============================================================ */
  const pintarVista = (): void => {
    contenedor.textContent = '';
    // Si quedó un modal abierto de la vista anterior, se cierra.
    document.body
      .querySelectorAll('.modal-fondo')
      .forEach((modal) => modal.remove());
    if (window.location.hash === '#/docentes') {
      void import('../docentes/docentes').then(({ crearVistaDocentes }) => {
        contenedor.textContent = '';
        contenedor.appendChild(crearVistaDocentes());
      });
    } else {
      contenedor.appendChild(crearEstadoVacio());
    }
  };
  pintarVista();
  window.addEventListener('hashchange', pintarVista);

  return main;
}