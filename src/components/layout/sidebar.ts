/* ============================================================
  sidebar.ts — Menú lateral de navegación + subsecciones
  ------------------------------------------------------------
  GUÍA RÁPIDA DE EDICIÓN:
  - Habilitar/deshabilitar secciones del menú    → SECCIÓN 4.
  - Agregar/quitar subsecciones de una sección   → SECCIÓN 4.
  - Quién ve cada sección o subsección           → SECCIÓN 4 (roles: ...).
  - Grupos de roles listos (TODOS, PERSONAL...)  → SECCIÓN 2 (EDITA AQUÍ).

  ORDEN DEL MENÚ (AUTOMÁTICO, SECCIÓN 6):
  - "Inicio" SIEMPRE queda arriba, sea cual sea el orden en que
    se escriban los bloques de la SECCIÓN 4.
  - Todas las demás secciones se ordenan SOLOS por orden
    alfabético (A-Z, español): p. ej. Docentes antes que
    Estudiantes.
  - Las subsecciones de cada sección también se listan en orden
    alfabético (SECCIÓN 5).
  Al habilitar una sección NUEVA solo se agrega su bloque: no
  hace falta pensar dónde va, el menú la coloca donde toca.

  ACCESO POR ROLES (SECCIÓN 4):
  - Cada sección y cada subsección declaran `roles`: la lista de
    roles que pueden verla. Grupos listos (SECCIÓN 2):
      roles: SOLO_ADMIN               → solo Administrador
      roles: DIRECCION                → admin + director
      roles: PERSONAL                 → admin + director + profesor
      roles: TODOS                    → todos, incl. padre de familia
    o un grupo a la medida:  roles: ['admin', 'estudiante']
  - Sección restringida → la sección COMPLETA desaparece para los
    roles que no están en su lista.
  - Subsección restringida → la sección SE SIGUE viendo, pero esa
    subsección no aparece en su lista.
  - Si a un rol no le queda NINGUNA subsección visible, la sección
    navega directo (no abre la vista de subsecciones).

  COMPORTAMIENTO DE LAS SUBSECCIONES (en los 3 dispositivos):
  1. Clic en una sección CON subsecciones: navega a la sección y el
     menú se sustituye COMPLETO por la vista de subsecciones; arriba
     solo queda la flecha atrás (←).
  2. La flecha atrás (o ESC, o un segundo clic en la misma sección)
     cierra las subsecciones y regresa el menú.
  3. Clic en una sección SIN subsecciones: navega y, si había
     subsecciones abiertas, el menú regresa solo.
  - Escritorio: si el sidebar estaba en mini (72px), se expande solo.
  - Tablet/móvil: si el menú está cerrado, se abre el panel flotante.
  - Al cerrar el panel flotante o colapsar a mini, las subsecciones
    se cierran solas y el menú vuelve a su lugar.

  Iconos: catálogo con +14,000 SVG listos para copiar en
  download/iconos-svg.txt y download/catalogo-iconos.html
============================================================ */

/* ============================================================
  SECCIÓN 1 · IMPORTS Y TIPOS (NO EDITAR)
============================================================ */
import { rolEfectivo, type Rol } from '../proyecto-1/login';

/** Subsección: opción de segundo nivel que vive DENTRO del sidebar.
 *  `roles` decide quién ve ESTA subsección (la sección puede verse
 *  igual aunque alguna subsección quede oculta). */
export interface SubSeccion {
  titulo: string;   // texto visible en la vista de subsecciones
  ruta: string;     // hash de navegación, p. ej. '#/inicio/resumen'
  roles: Rol[];     // quiénes pueden ver esta subsección
}

/** Contrato de datos de una opción del menú.
 *  `roles` decide quién ve la sección COMPLETA. */
export interface ItemMenu {
  titulo: string;                  // texto visible
  ruta: string;                    // hash de navegación, p. ej. '#/inicio'
  roles: Rol[];                    // quiénes pueden ver esta sección
  icono: string;                   // SVG inline (stroke="currentColor" hereda el color)
  subsecciones?: SubSeccion[];     // si se declara, la sección abre la vista de subsecciones
}

/* ============================================================
  SECCIÓN 2 · CONFIGURACIÓN GENERAL (EDITA AQUÍ)
============================================================ */

/** Sección que queda marcada cuando la URL no trae hash.
 *  Debe coincidir con la ruta de una opción de la SECCIÓN 4. */
const RUTA_POR_DEFECTO = '#/inicio';

/** Media query de tablet/móvil: debe coincidir con
 *  @media (max-width: 1024px) de layout.css. En estos anchos el
 *  menú funciona como carril de iconos o panel flotante, y las
 *  subsecciones se muestran dentro de él. */
const MQ_TABLET = '(max-width: 1024px)';

/** GRUPOS DE ROLES listos para usar en `roles` (secciones y
 *  subsecciones). Ajusta aquí quién entra en cada grupo, o escribe
 *  el grupo a la medida donde lo necesites: roles: ['admin', 'profesor']
 *  Van exportados: el router (Fase 3) podrá validar permisos con
 *  los mismos grupos. */
export const TODOS: Rol[] = ['admin', 'director', 'profesor', 'estudiante', 'padre'];
export const PERSONAL: Rol[] = ['admin', 'director', 'profesor'];
export const DIRECCION: Rol[] = ['admin', 'director'];
export const SOLO_ADMIN: Rol[] = ['admin'];

/* ============================================================
  SECCIÓN 3 · ESTADO INTERNO (NO EDITAR)
  Debe declararse ANTES de la SECCIÓN 4: los bloques
  agregarItemMenu(...) se ejecutan al cargar el archivo.
============================================================ */

/** Opciones registradas hasta el momento (llenadas por la SECCIÓN 4). */
const itemsMenu: ItemMenu[] = [];

/** <ul> del menú cuando ya está en pantalla (null antes de montar). */
let listaMontada: HTMLUListElement | null = null;

/** <nav> del sidebar cuando ya está en pantalla (null antes de montar). */
let navMontado: HTMLElement | null = null;

/** Vista de subsecciones (se crea al usarse por primera vez). */
let vistaSub: HTMLElement | null = null;

/** Ruta de la sección cuyas subsecciones están abiertas
 *  (null = se está viendo el menú normal). */
let seccionAbierta: string | null = null;

/* ============================================================
  SECCIÓN 4 · OPCIONES DEL MENÚ (EDITA AQUÍ)
  ------------------------------------------------------------
  Un bloque agregarItemMenu({ ... }) = una sección del menú.
  - titulo: texto visible.
  - ruta:   hash de navegación (#/...).
  - roles:  quiénes ven la sección. Usa los grupos de la SECCIÓN 2
            (TODOS, PERSONAL, DIRECCION, SOLO_ADMIN) o una lista a
            la medida: roles: ['admin', 'estudiante'].
  - icono:  SVG con fill="none" stroke="currentColor";
            líneas rectas → butt/miter · curvas → round/round.
  - subsecciones (OPCIONAL): lista { titulo, ruta, roles }. Si se
            declara, la sección abre la vista de subsecciones.

  ORDEN AUTOMÁTICO: da igual el orden en que se escriban los
  bloques. "Inicio" SIEMPRE queda arriba y las demás secciones
  se ordenan solas alfabéticamente (SECCIÓN 6). Las subsecciones
  de cada sección también salen en orden alfabético.

  Habilitadas por ahora: Inicio, Docentes y Estudiantes. Las
  demás secciones quedan COMENTADAS y se activan quitándoles
  el comentario conforme se construyan.
============================================================ */

agregarItemMenu({
  titulo: 'Inicio',
  ruta: '#/inicio',
  roles: TODOS,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="butt"
         stroke-linejoin="miter" aria-hidden="true">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9 21v-6h6v6" />
    </svg>`,
  // EDITA AQUÍ: subsecciones de ejemplo. Cada una lleva SU propio
  // `roles`: la sección se ve para todos, pero cada subsección solo
  // la ven los roles de su lista (prueba con "Ver como").
  subsecciones: [
    { titulo: 'Resumen del día', ruta: '#/inicio/resumen', roles: TODOS },
    { titulo: 'Accesos rápidos', ruta: '#/inicio/accesos', roles: PERSONAL },
    { titulo: 'Avisos y recordatorios', ruta: '#/inicio/avisos', roles: TODOS },
    { titulo: 'Calendario escolar', ruta: '#/inicio/calendario', roles: DIRECCION },
  ],
});

/* SECCIÓN HABILITADA — Docentes (solo admin y director). Aunque
   se escriba aquí arriba, en el menú sale DESPUÉS de Inicio y
   ANTES de Estudiantes: el orden alfabético es automático. */
agregarItemMenu({
  titulo: 'Docentes',
  ruta: '#/docentes',
  roles: DIRECCION, // mismo acceso que la vista: admin + director
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="butt"
         stroke-linejoin="miter" aria-hidden="true">
      <path d="M3 3.5h18" />
      <path d="M4.5 3.5V13a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V3.5" />
      <path d="M8.5 8.5h7" />
      <path d="M7 21l5-6 5 6" />
    </svg>`,
});

/* SECCIÓN HABILITADA — Estudiantes con sus subsecciones
   (Matricular, Nomina y Actualizar). Al hacer clic, el menú se
   sustituye por la vista de subsecciones (con la flecha atrás);
   cada subsección navega a su propia ruta. En la lista salen en
   orden alfabético: Actualizar, Matricular, Nomina. */
agregarItemMenu({
  titulo: 'Estudiantes',
  ruta: '#/estudiantes',
  roles: DIRECCION, // EDITA AQUÍ: quién ve la sección completa
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="butt"
         stroke-linejoin="miter" aria-hidden="true">
      <path d="M2.5 9.5L12 5l9.5 4.5L12 14z" />
      <path d="M6.5 11.8v3.9c0 1.2 2.5 2.4 5.5 2.4s5.5-1.2 5.5-2.4v-3.9" />
      <path d="M21.5 9.5v5.5" />
    </svg>`,
  subsecciones: [
    { titulo: 'Actualizar', ruta: '#/estudiantes/actualizar', roles: DIRECCION },
    { titulo: 'Matricular', ruta: '#/estudiantes/matricular', roles: DIRECCION },
    { titulo: 'Nomina', ruta: '#/estudiantes/nomina', roles: DIRECCION },
  ],
});

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Expediente del estudiante',
  ruta: '#/expediente',
  roles: TODOS,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <circle cx="8.5" cy="10.5" r="2" />
      <path d="M5.5 15.5c.5-1.5 1.7-2.3 3-2.3s2.5.8 3 2.3" />
      <path d="M14 9.5h4.5" />
      <path d="M14 12.5h4.5" />
      <path d="M14 15.5h3" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Admisiones y postulaciones',
  ruta: '#/admisiones',
  roles: DIRECCION,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="butt"
         stroke-linejoin="miter" aria-hidden="true">
      <path d="M6 2h9l5 5v15H6z" />
      <path d="M15 2v5h5" />
      <path d="M12 11v6" />
      <path d="M9 14h6" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Entrevistas de admisión',
  ruta: '#/entrevistas',
  roles: PERSONAL,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="butt"
         stroke-linejoin="miter" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16.5" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4" />
      <path d="M16 2.5v4" />
      <path d="M7.5 13.5h3" />
      <path d="M7.5 17h3" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Usuarios y roles',
  ruta: '#/usuarios',
  roles: DIRECCION,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.5-3.5 2.8-5.4 5.5-5.4s5 1.9 5.5 5.4" />
      <path d="M15.4 5.3a3.2 3.2 0 0 1 0 5.4" />
      <path d="M17.6 14.8c1.8.8 2.9 2.6 3.2 5.2" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Seguridad y sesiones',
  ruta: '#/seguridad',
  roles: SOLO_ADMIN,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <path d="M12 2.5l7.5 3v5.5c0 5-3.2 8.5-7.5 10.5-4.3-2-7.5-5.5-7.5-10.5V5.5z" />
      <circle cx="12" cy="10" r="2" />
      <path d="M12 12v3.5" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Mallas curriculares',
  ruta: '#/mallas',
  roles: PERSONAL,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Carga horaria',
  ruta: '#/carga-horaria',
  roles: PERSONAL,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Calificaciones',
  ruta: '#/calificaciones',
  roles: TODOS,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="butt"
         stroke-linejoin="miter" aria-hidden="true">
      <path d="M6 2h9l5 5v15H6z" />
      <path d="M15 2v5h5" />
      <path d="M9 14.5l2.3 2.3 4.2-4.8" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Boletines y actas',
  ruta: '#/boletines',
  roles: TODOS,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="9" r="5.5" />
      <path d="M9.2 13.6L7.5 21.5l4.5-2.3 4.5 2.3-1.7-7.9" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Planificación didáctica',
  ruta: '#/planificacion',
  roles: PERSONAL,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
      <path d="M15 5l4 4" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Tareas y rúbricas',
  ruta: '#/tareas',
  roles: TODOS,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="butt"
         stroke-linejoin="miter" aria-hidden="true">
      <rect x="4" y="3.5" width="16" height="17" />
      <path d="M8 9l1.7 1.7 3.3-3.7" />
      <path d="M8 15.5h8" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Nivelaciones',
  ruta: '#/nivelaciones',
  roles: PERSONAL,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="butt"
         stroke-linejoin="miter" aria-hidden="true">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Asistencia diaria',
  ruta: '#/asistencia',
  roles: TODOS,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <circle cx="10" cy="7.5" r="3.5" />
      <path d="M3.5 20.5c.6-3.7 3.1-5.7 6.5-5.7 1.3 0 2.4.3 3.4.9" />
      <path d="M14.5 17.7l2.2 2.2 4-4.4" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Justificaciones',
  ruta: '#/justificaciones',
  roles: TODOS,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="butt"
         stroke-linejoin="miter" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" />
      <path d="M3.5 6l8.5 7 8.5-7" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Convivencia y observador',
  ruta: '#/convivencia',
  roles: TODOS,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Psicopedagogía y NEE',
  ruta: '#/psicopedagogia',
  roles: DIRECCION,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <path d="M12 20.5S3.5 15.2 3.5 9C3.5 6 5.9 4 8.3 4c1.6 0 3 .8 3.7 2.1C12.7 4.8 14.1 4 15.7 4c2.4 0 4.8 2 4.8 5 0 6.2-8.5 11.5-8.5 11.5z" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Enfermería y salud',
  ruta: '#/enfermeria',
  roles: DIRECCION,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M12 8.5v7" />
      <path d="M8.5 12h7" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Talleres y deportes',
  ruta: '#/talleres',
  roles: PERSONAL,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <path d="M8 3.5h8V9a4 4 0 0 1-8 0z" />
      <path d="M8 5H4.5v1A3.5 3.5 0 0 0 8 9.5" />
      <path d="M16 5h3.5v1A3.5 3.5 0 0 1 16 9.5" />
      <path d="M12 13v3.5" />
      <path d="M8 20.5c0-2.2 1.8-4 4-4s4 1.8 4 4" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Facturación y cuentas',
  ruta: '#/facturacion',
  roles: TODOS,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <path d="M6 2.5h9l5 5v14H6z" />
      <path d="M15 2.5V7h5" />
      <path d="M12 8v8.5" />
      <path d="M14.3 9.5h-3.4a1.6 1.6 0 0 0 0 3.2h2.2a1.6 1.6 0 0 1 0 3.2H9.7" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Cobranzas y pagos',
  ruta: '#/cobranzas',
  roles: DIRECCION,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 9.5h19" />
      <path d="M6 15h4" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Cajas chicas y arqueos',
  ruta: '#/cajas',
  roles: DIRECCION,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <rect x="2.5" y="6.5" width="19" height="11" rx="1.5" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M5.8 10.5v3" />
      <path d="M18.2 10.5v3" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Becas y descuentos',
  ruta: '#/becas',
  roles: DIRECCION,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 15.5l7-7" />
      <circle cx="9.2" cy="9.2" r="1.3" />
      <circle cx="14.8" cy="14.8" r="1.3" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Nómina y cuentas por pagar',
  ruta: '#/nomina',
  roles: DIRECCION,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="butt"
         stroke-linejoin="miter" aria-hidden="true">
      <path d="M3 9.5L12 4l9 5.5" />
      <path d="M5 9.5V18" />
      <path d="M9.7 9.5V18" />
      <path d="M14.3 9.5V18" />
      <path d="M19 9.5V18" />
      <path d="M3 18h18" />
      <path d="M3 21h18" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Inventario de activos',
  ruta: '#/inventario',
  roles: PERSONAL,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="butt"
         stroke-linejoin="miter" aria-hidden="true">
      <path d="M12 2.5L21 7v10l-9 4.5L3 17V7z" />
      <path d="M3 7l9 4.5L21 7" />
      <path d="M12 11.5v10" />
      <path d="M7.5 4.75l9 4.5" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Biblioteca',
  ruta: '#/biblioteca',
  roles: TODOS,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <path d="M12 6.5C10 4.8 7.3 4 3.5 4v15c3.8 0 6.5.8 8.5 2.5 2-1.7 4.7-2.5 8.5-2.5V4c-3.8 0-6.5.8-8.5 2.5z" />
      <path d="M12 6.5v15" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Transporte escolar',
  ruta: '#/transporte',
  roles: TODOS,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <rect x="4" y="3.5" width="16" height="13.5" rx="2" />
      <path d="M4 10.5h16" />
      <path d="M8 3.5v7" />
      <path d="M8 14h.01" />
      <path d="M16 14h.01" />
      <path d="M7 17v2.5" />
      <path d="M17 17v2.5" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Cafetería y comedor',
  ruta: '#/cafeteria',
  roles: TODOS,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <path d="M4 8h13v5.5A4.5 4.5 0 0 1 12.5 18h-4A4.5 4.5 0 0 1 4 13.5z" />
      <path d="M17 9.5h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M8.5 2.5V5" />
      <path d="M12 2.5V5" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Mantenimiento',
  ruta: '#/mantenimiento',
  roles: PERSONAL,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Mensajería y comunicados',
  ruta: '#/mensajeria',
  roles: TODOS,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <path d="M21 11.5c0 4.7-4 8.5-9 8.5-1 0-2-.15-2.9-.44L4 21l1.3-3.9C4 15.8 3 13.8 3 11.5 3 6.8 7 3 12 3s9 3.8 9 8.5z" />
      <path d="M8.5 10h7" />
      <path d="M8.5 13h4.5" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
   SECCIÓN DESHABILITADA — quita este comentario para activarla
agregarItemMenu({
  titulo: 'Dashboards y auditoría',
  ruta: '#/dashboards',
  roles: TODOS,
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="butt"
         stroke-linejoin="miter" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" />
      <rect x="13.5" y="3.5" width="7" height="7" />
      <rect x="3.5" y="13.5" width="7" height="7" />
      <rect x="13.5" y="13.5" width="7" height="7" />
    </svg>`,
});
──────────────────────────────────────────────────────────── */

/* ============================================================
  SECCIÓN 5 · FILTRO POR ROL (NO EDITAR)
============================================================ */

/** Rol con el que se está navegando: la vista elegida por el admin
 *  ("Ver como") o el rol real de la sesión. Null si no hay sesión. */
function rolActivo(): Rol | null {
  return rolEfectivo();
}

/** true si el rol activo puede ver la sección COMPLETA. */
function puedeVer(item: ItemMenu): boolean {
  const rol = rolActivo();
  if (rol === null) return false;
  return item.roles.includes(rol);
}

/** Subsecciones de la sección que el rol activo SÍ puede ver,
 *  en orden ALFABÉTICO (Actualizar, Matricular, Nomina...), sin
 *  importar el orden en que estén escritas. */
function subsVisibles(item: ItemMenu): SubSeccion[] {
  const rol = rolActivo();
  if (rol === null) return [];
  return (item.subsecciones ?? [])
    .filter((sub) => sub.roles.includes(rol))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
}

/** true si a la sección le queda al menos una subsección visible.
 *  Si todas están bloqueadas para el rol, la sección navega directo. */
function tieneSubseccionesVisibles(item: ItemMenu): boolean {
  return subsVisibles(item).length > 0;
}

/* ============================================================
  SECCIÓN 6 · GESTIÓN DEL MENÚ (registrar opciones) (NO EDITAR)
============================================================ */

/** Ordena el menú: "Inicio" SIEMPRE primero (sección de entrada)
 *  y todas las demás por orden alfabético en español (A-Z).
 *  Así el orden NO depende del orden en que se escriban los
 *  bloques de la SECCIÓN 4. */
function ordenarMenu(): void {
  itemsMenu.sort((a, b) => {
    if (a.titulo === 'Inicio') return -1; // Inicio siempre arriba
    if (b.titulo === 'Inicio') return 1;
    return a.titulo.localeCompare(b.titulo, 'es');
  });
}

/**
 * Registra una opción del menú.
 * - Si la app aún no está en pantalla: solo se guarda (ordenada).
 * - Si ya está en pantalla: redibuja el menú COMPLETO para que la
 *   nueva sección quede en su sitio alfabético al instante.
 */
export function agregarItemMenu(item: ItemMenu): void {
  itemsMenu.push(item);
  ordenarMenu();

  // Menú ya montado → se repinta entero en el orden correcto
  if (listaMontada !== null) {
    listaMontada.textContent = '';
    for (const visible of itemsMenu) {
      if (!puedeVer(visible)) continue;
      listaMontada.appendChild(crearItemLista(visible));
    }
    seleccionarItem(rutaActual());
  }
}

/** Busca la opción registrada cuya ruta coincida con el enlace. */
function itemPorRuta(ruta: string): ItemMenu | undefined {
  return itemsMenu.find((item) => item.ruta === ruta);
}

/* ============================================================
  SECCIÓN 7 · SELECCIÓN DE LA SECCIÓN ACTIVA (NO EDITAR)
============================================================ */

/** Hash actual de la URL ('' cuando no hay). */
function rutaActual(): string {
  return window.location.hash;
}

/**
 * Marca como activa la opción cuya ruta coincida con el hash.
 * También activa la sección padre de una subsección:
 * con '#/inicio/avisos' queda activo 'Inicio' (#/inicio).
 * Sin hash en la URL se usa RUTA_POR_DEFECTO (SECCIÓN 2).
 */
function seleccionarItem(ruta: string): void {
  const rutaBuscada = ruta === '' ? RUTA_POR_DEFECTO : ruta;

  // Recorre los enlaces del menú y activa SOLO el que coincida
  const enlaces = listaMontada?.querySelectorAll('a.sidebar-item');
  enlaces?.forEach((enlace) => {
    const href = enlace.getAttribute('href') ?? '';
    const esActual =
      href === rutaBuscada || rutaBuscada.startsWith(href + '/');
    enlace.classList.toggle('activo', esActual);
  });

  // Y marca la subsección activa dentro de la vista (si está abierta)
  seleccionarSub(rutaBuscada);
}

/** Marca como activa la subsección que coincida con el hash. */
function seleccionarSub(ruta: string): void {
  const vista = vistaSub;
  if (vista === null) return;
  const enlaces = vista.querySelectorAll('a.sub-item');
  enlaces.forEach((enlace) => {
    enlace.classList.toggle('activo', enlace.getAttribute('href') === ruta);
  });
}

/* ============================================================
  SECCIÓN 8 · VISTA DE SUBSECCIONES (NO EDITAR)
  Sustituye al menú DENTRO del mismo sidebar: al abrir las
  subsecciones, el menú (marca + lista) se oculta completo y queda
  una vista con la flecha atrás, el nombre de la sección y la
  lista. Funciona en los 3 dispositivos (escritorio, panel flotante
  de tablet y drawer de móvil).
============================================================ */

/** true si la ventana actual es tablet o móvil (≤1024px). */
function esPantallaChica(): boolean {
  return window.matchMedia(MQ_TABLET).matches;
}

/** Crea (una sola vez) la vista de subsecciones y la deja dentro del
 *  nav, después de la lista del menú. El CSS la mantiene oculta
 *  hasta que el nav reciba la clase .con-sub. */
function obtenerVistaSub(nav: HTMLElement): HTMLElement {
  if (vistaSub !== null) return vistaSub;

  const vista = document.createElement('div');
  vista.className = 'sidebar-vista-sub';
  vista.setAttribute('aria-label', 'Subsecciones de la sección');

  // Cabecera: flecha atrás + nombre de la sección
  const cabecera = document.createElement('div');
  cabecera.className = 'sub-cabecera';

  const botonAtras = document.createElement('button');
  botonAtras.type = 'button';
  botonAtras.className = 'sub-atras';
  botonAtras.setAttribute('aria-label', 'Volver al menú');
  botonAtras.innerHTML = `
    <svg class="sub-atras-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="butt"
         stroke-linejoin="miter" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </svg>`;
  botonAtras.addEventListener('click', () => cerrarVistaSub());

  const titulo = document.createElement('span');
  titulo.className = 'sub-titulo';

  cabecera.appendChild(botonAtras);
  cabecera.appendChild(titulo);

  // Lista de subsecciones (se llena en abrirVistaSub)
  const lista = document.createElement('ul');
  lista.className = 'sub-lista';

  vista.appendChild(cabecera);
  vista.appendChild(lista);

  // Vive DENTRO del nav, después de la lista del menú
  nav.appendChild(vista);

  vistaSub = vista;
  return vista;
}

/** Sustituye el menú por la vista con las subsecciones VISIBLES de
 *  la sección indicada (las bloqueadas por rol no se dibujan). */
function abrirVistaSub(item: ItemMenu): void {
  const nav = navMontado;
  if (nav === null) return;
  const vista = obtenerVistaSub(nav);

  // Nombre de la sección en la cabecera
  const titulo = vista.querySelector('.sub-titulo');
  if (titulo !== null) titulo.textContent = item.titulo;

  const lista = vista.querySelector('.sub-lista');
  if (lista !== null) {
    lista.innerHTML = '';
    for (const sub of subsVisibles(item)) {
      const li = document.createElement('li');
      const enlace = document.createElement('a');
      enlace.className = 'sub-item';
      enlace.href = sub.ruta;
      enlace.textContent = sub.titulo;
      li.appendChild(enlace);
      lista.appendChild(li);
    }
  }

  // El menú completo se oculta y la vista entra en su lugar
  nav.classList.add('con-sub');
  seccionAbierta = item.ruta;
  seleccionarSub(rutaActual());
}

/** Cierra la vista de subsecciones y regresa el menú. */
function cerrarVistaSub(): void {
  navMontado?.classList.remove('con-sub');
  seccionAbierta = null;
}

/* ============================================================
  SECCIÓN 9 · RENDER (construcción del menú en el DOM)
============================================================ */

/** Construye el <li> con su enlace a partir de una opción.
 *  Las secciones con subsecciones VISIBLES llevan la flecha. */
function crearItemLista(item: ItemMenu): HTMLLIElement {
  const li = document.createElement('li');

  const enlace = document.createElement('a');
  enlace.className = 'sidebar-item';
  enlace.href = item.ruta;

  let flecha = '';
  if (tieneSubseccionesVisibles(item)) {
    flecha = `
      <svg class="sidebar-flecha" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="butt"
           stroke-linejoin="miter" aria-hidden="true">
        <path d="M9 5l7 7-7 7" />
      </svg>`;
  }

  // Icono + texto juntos; .sidebar-texto se oculta en modo mini
  enlace.innerHTML = `${item.icono}<span class="sidebar-texto">${item.titulo}</span>${flecha}`;

  li.appendChild(enlace);
  return li;
}

/** Construye el <nav> lateral completo y lo devuelve para que
 *  main.ts lo cuelgue del .app-body.
 *  Solo incluye las secciones que el rol activo puede ver. */
export function crearSidebar(): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'sidebar';
  nav.setAttribute('aria-label', 'Menú principal');

  // Etiqueta pequeña "MENÚ" (el CSS la oculta cuando está colapsado)
  const marca = document.createElement('div');
  marca.className = 'sidebar-marca';
  marca.textContent = 'Menú';
  nav.appendChild(marca);

  // Lista con SOLO las opciones permitidas para el rol activo
  // (itemsMenu ya viene ordenado: Inicio arriba, resto A-Z)
  const lista = document.createElement('ul');
  lista.className = 'sidebar-lista';
  for (const item of itemsMenu) {
    if (!puedeVer(item)) continue;
    lista.appendChild(crearItemLista(item));
  }
  nav.appendChild(lista);

  // Guarda la referencia para que agregarItemMenu() inserte en vivo
  listaMontada = lista;
  navMontado = nav;

  // --- Clic en una sección: subsecciones o navegación directa ---
  nav.addEventListener('click', (evento) => {
    const enlace = (evento.target as HTMLElement).closest('a.sidebar-item');
    if (enlace === null) return;

    const item = itemPorRuta(enlace.getAttribute('href') ?? '');
    if (item === undefined) return;

    if (tieneSubseccionesVisibles(item)) {
      // Segundo clic sobre la misma sección: regresar al menú
      if (seccionAbierta === item.ruta) {
        cerrarVistaSub();
        return;
      }
      // Asegurar que el sidebar tenga ancho para las subsecciones:
      // tablet/móvil → panel flotante; escritorio → salir del mini
      if (esPantallaChica()) {
        nav.classList.add('sidebar-open');
      } else {
        nav.classList.remove('sidebar-mini');
      }
      abrirVistaSub(item);
    } else if (seccionAbierta !== null) {
      // Sección sin subsecciones visibles: el menú regresa
      cerrarVistaSub();
    }
  });

  // Si el sidebar colapsa a mini o el panel flotante se cierra,
  // las subsecciones se cierran solas (el menú vuelve a su lugar)
  const observador = new MutationObserver(() => {
    if (seccionAbierta === null) return;
    const enMini = nav.classList.contains('sidebar-mini');
    const flotanteCerrado =
      esPantallaChica() && !nav.classList.contains('sidebar-open');
    if (enMini || flotanteCerrado) cerrarVistaSub();
  });
  observador.observe(nav, { attributes: true, attributeFilter: ['class'] });

  // La tecla ESC también cierra las subsecciones
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && seccionAbierta !== null) cerrarVistaSub();
  });

  // Al redimensionar, cierra las subsecciones si el sidebar quedó
  // en un estado donde no caben (carril de tablet o mini)
  window.addEventListener('resize', () => {
    if (seccionAbierta === null) return;
    if (esPantallaChica()) {
      if (!nav.classList.contains('sidebar-open')) cerrarVistaSub();
    } else if (nav.classList.contains('sidebar-mini')) {
      cerrarVistaSub();
    }
  });

  // Marca la sección activa según el hash con el que se entró
  seleccionarItem(rutaActual());

  // Y la actualiza cada vez que el hash cambie (clic o flechas).
  // Si quedaron las subsecciones de OTRA sección abiertas y la
  // navegación fue a una ruta ajena (p. ej. por las migas), el
  // menú regresa solo para mostrar la sección que corresponde.
  window.addEventListener('hashchange', () => {
    const ruta = rutaActual() || RUTA_POR_DEFECTO;
    if (seccionAbierta !== null) {
      const abierta = itemPorRuta(seccionAbierta);
      const sigueAbierta =
        abierta !== undefined &&
        (ruta === abierta.ruta || ruta.startsWith(abierta.ruta + '/'));
      if (!sigueAbierta) cerrarVistaSub();
    }
    seleccionarItem(ruta);
  });

  return nav;
}