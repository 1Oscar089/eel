/* ============================================================
  content.ts — Área central de trabajo (migas + título + vistas)
  ------------------------------------------------------------
  GUÍA RÁPIDA DE EDICIÓN:
  - Nombre distinto para la raíz de una sección   → SECCIÓN 2.
  - Conectar una vista real a su ruta (router)    → SECCIÓN 2.
  - Apariencia                                    → src/styles/layout.css.

  Estructura que renderiza:
  - Migas de pan FUNCIONALES: clic en la sección te lleva a ella.
  - Título de la vista + ZONA DE ACCIONES a la par: cada vista real
    puede colocar ahí sus botones (p. ej. "Agregar docente").
  - #view-container: aquí se monta la vista de la ruta actual.
  - Pie con copyright y estado de sincronización.

  Router provisional (hasta Fase 3): con cada cambio de hash se
  busca la ruta en VISTAS (SECCIÓN 2); si no hay vista construida
  se muestra el texto provisional.
============================================================ */

/* ============================================================
  SECCIÓN 1 · IMPORTS (NO EDITAR)
============================================================ */
// sidebar: registro de secciones y subsecciones (nombres y rutas)
import { infoDeRuta, RUTA_POR_DEFECTO } from './sidebar';
// Vistas reales montadas por el router provisional:
import { renderDocentes } from '../docentes/docentes';

/* ============================================================
  SECCIÓN 2 · CONFIGURACIÓN (EDITA AQUÍ)
============================================================ */
/**
 * Nombre de la vista RAÍZ de cada sección: es lo que se muestra
 * como título y como última miga cuando NO hay subsección elegida.
 * Clave = ruta de la sección (el hash). Si una sección no está en
 * esta lista, se usa su propio nombre (p. ej. Inicio → "Inicio").
 *
 * AHORA MISMO ESTÁ VACÍO: Inicio no tiene subsecciones y muestra
 * su propio nombre en título y migas. Si quieres que la raíz de
 * una sección se llame distinto, descomenta y ajusta:
 *
 * const NOMBRES_RAIZ: Record<string, string> = {
 *   '#/inicio': 'Página principal',
 * };
 */
const NOMBRES_RAIZ: Record<string, string> = {};

/**
 * ROUTER PROVISIONAL (hasta Fase 3): cada ruta con vista real se
 * registra aquí. La función recibe DOS contenedores:
 *   - contenedor → #view-container (el cuerpo de la vista).
 *   - acciones   → zona de botones junto al título (opcional).
 * Ejemplo de la próxima vista:  '#/usuarios': renderUsuarios,
 */
type Vista = (contenedor: HTMLElement, acciones: HTMLElement) => void;

const VISTAS: Record<string, Vista> = {
  '#/docentes': renderDocentes,
};

/* ============================================================
  SECCIÓN 3 · ESTADO INTERNO (NO EDITAR)
============================================================ */
/** <nav> de las migas ya montado (null antes de montar). */
let migas: HTMLElement | null = null;

/** <h4> del título ya montado (null antes de montar). */
let titulo: HTMLElement | null = null;

/** Zona de botones junto al título (null antes de montar). */
let accionesVista: HTMLElement | null = null;

/** #view-container ya montado (null antes de montar). */
let contenedorVista: HTMLElement | null = null;

/* ============================================================
  SECCIÓN 4 · ENCABEZADO: MIGAS Y TÍTULO SEGÚN EL HASH (NO EDITAR)
  Se ejecuta al montar y en cada cambio de hash (clic en las
  migas, en el sidebar o en una subsección).
============================================================ */
function actualizarEncabezado(): void {
  if (migas === null || titulo === null) return;

  // Hash actual (sin hash se usa la ruta por defecto del sidebar)
  const ruta =
    window.location.hash === '' ? RUTA_POR_DEFECTO : window.location.hash;

  // Datos de la ruta; si el hash no pertenece a ninguna sección
  // registrada, cae a la ruta por defecto.
  const info = infoDeRuta(ruta) ?? infoDeRuta('');

  // Nombre de la vista actual, en este orden:
  // nombre raíz configurable (SECCIÓN 2) → subsección → sección.
  const nombreVista =
    NOMBRES_RAIZ[ruta] ?? info?.subseccionTitulo ?? info?.seccionTitulo ?? '';

  titulo.textContent = nombreVista;

  // Migas: [Sección](enlace) / [Vista actual](texto plano).
  // La sección SIEMPRE es enlace a su ruta (funcional). La vista
  // actual es texto: es donde el usuario ya está.
  migas.innerHTML = '';
  if (info === null) return;

  const enlaceSeccion = document.createElement('a');
  enlaceSeccion.className = 'migas-enlace';
  enlaceSeccion.href = info.seccionRuta;
  enlaceSeccion.textContent = info.seccionTitulo;
  migas.appendChild(enlaceSeccion);

  // El segundo nivel solo se dibuja si la vista no coincide con
  // el nombre de la sección (evita "Usuario / Usuario").
  if (nombreVista !== info.seccionTitulo) {
    const separador = document.createElement('span');
    separador.className = 'migas-separador';
    separador.textContent = '/';
    migas.appendChild(separador);

    const actual = document.createElement('span');
    actual.className = 'migas-actual';
    actual.textContent = nombreVista;
    migas.appendChild(actual);
  }
}

/* ============================================================
  SECCIÓN 5 · ROUTER PROVISIONAL (NO EDITAR)
  Monta la vista de la ruta actual (o el texto provisional) y
  limpia la zona de acciones del encabezado. Cada vista real
  vuelve a poner ahí sus propios botones.
============================================================ */
function renderizarVista(): void {
  if (contenedorVista === null || accionesVista === null) return;

  // Cada navegación parte de cero
  contenedorVista.replaceChildren();
  accionesVista.replaceChildren();

  const ruta =
    window.location.hash === '' ? RUTA_POR_DEFECTO : window.location.hash;

  const vista = VISTAS[ruta];
  if (vista === undefined) {
    // Ruta sin vista construida: panel provisional como antes
    contenedorVista.classList.remove('con-vista');
    contenedorVista.textContent =
      'El router montará aquí las vistas (Fase 3 de la guía)';
    return;
  }

  contenedorVista.classList.add('con-vista');
  vista(contenedorVista, accionesVista);
}

/** Actualiza encabezado (migas + título) y vista. */
function actualizarTodo(): void {
  actualizarEncabezado();
  renderizarVista();
}

/* ============================================================
  SECCIÓN 6 · RENDER (NO EDITAR)
============================================================ */

/** Construye el <main> central y lo devuelve para que main.ts
 *  lo cuelgue del .app-body después del sidebar. */
export function crearContenido(): HTMLElement {
  const main = document.createElement('main');
  main.className = 'content';

  // --- Migas de pan (funcionales: se llenan en actualizarEncabezado) ---
  const navMigas = document.createElement('nav');
  navMigas.className = 'migas';
  navMigas.setAttribute('aria-label', 'Ruta de navegación');
  migas = navMigas;

  // --- Título de la vista (cambia con el hash) ---
  const tituloVista = document.createElement('h4');
  tituloVista.className = 'titulo-vista';
  titulo = tituloVista;

  // --- Zona de acciones a la par del título (botones de la vista) ---
  const acciones = document.createElement('div');
  acciones.className = 'content-acciones';
  accionesVista = acciones;

  // Fila del encabezado: título a la izquierda, acciones a la derecha
  const cabecera = document.createElement('div');
  cabecera.className = 'content-cabecera';
  cabecera.append(tituloVista, acciones);

  // --- Contenedor de vistas (aquí monta el router provisional) ---
  const contenedor = document.createElement('div');
  contenedor.id = 'view-container';
  contenedor.className = 'view-container';
  contenedorVista = contenedor;

  // --- Pie: copyright a la izquierda, sincronización a la derecha ---
  const footer = document.createElement('footer');
  footer.className = 'pie-contenido';
  footer.innerHTML = `
    <span>© 2026 Expediente en Línea</span>
    <span class="sync-estado">Sincronización: pendiente</span>`;

  main.append(navMigas, cabecera, contenedor, footer);

  // Migas, título y vista según el hash con el que se entró...
  actualizarTodo();
  // ...y en cada navegación (migas, sidebar o flechas del navegador)
  window.addEventListener('hashchange', actualizarTodo);

  return main;
}