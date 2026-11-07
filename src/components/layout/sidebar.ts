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
    navega directo (no abre el panel de subsecciones).

  COMPORTAMIENTO DE LAS SUBSECCIONES (en los 3 dispositivos):
  1. Clic en una sección CON subsecciones: NO navega y la vista
     actual NO se quita; se abre OTRA SIDEBAR A LA PAR (un panel
     pegado al costado del menú) con sus subsecciones.
  2. La X del panel, ESC, un segundo clic en la misma sección o
     un clic FUERA del sidebar cierran el panel a la par.
  3. Clic en una sección SIN subsecciones (p. ej. Inicio): navega
     directo y, si el panel estaba abierto, se cierra solo.
  4. Al ELEGIR una subsección SÍ cambia la vista: la subsección
     queda marcada y la sección padre activa. En tablet/móvil el
     panel flotante se cierra para dejar ver la vista elegida; en
     escritorio el panel a la par permanece mostrándola activa.
  - El panel a la par funciona en los 3 dispositivos: junto al
    menú expandido, junto al carril mini (72px), junto al panel
    flotante de tablet y sobre el drawer de móvil (allí lo cubre,
    porque a la par no cabe).

  Iconos: catálogo con +14,000 SVG listos para copiar en
  download/iconos-svg.txt y download/catalogo-iconos.html
============================================================ */

/* ============================================================
  SECCIÓN 1 · IMPORTS Y TIPOS (NO EDITAR)
============================================================ */
import { rolEfectivo, type Rol } from '../proyecto-1/login';

/** Subsección: opción de segundo nivel que se abre A LA PAR del
 *  sidebar. `roles` decide quién ve ESTA subsección (la sección
 *  puede verse igual aunque alguna subsección quede oculta). */
export interface SubSeccion {
  titulo: string;   // texto visible en el panel a la par
  ruta: string;     // hash de navegación, p. ej. '#/estudiantes/nomina'
  roles: Rol[];     // quiénes pueden ver esta subsección
}

/** Contrato de datos de una opción del menú.
 *  `roles` decide quién ve la sección COMPLETA. */
export interface ItemMenu {
  titulo: string;                  // texto visible
  ruta: string;                    // hash de navegación, p. ej. '#/inicio'
  roles: Rol[];                    // quiénes pueden ver esta sección
  icono: string;                   // SVG inline (stroke="currentColor" hereda el color)
  subsecciones?: SubSeccion[];     // si se declara, la sección abre el PANEL A LA PAR
}

/* ============================================================
  SECCIÓN 2 · CONFIGURACIÓN GENERAL (EDITA AQUÍ)
============================================================ */

/** Sección que queda marcada cuando la URL no trae hash.
 *  Debe coincidir con la ruta de una opción de la SECCIÓN 4. */
const RUTA_POR_DEFECTO = '#/inicio';

/** Media query de tablet/móvil: debe coincidir con
 *  @media (max-width: 1024px) de layout.css. En estos anchos el
 *  menú funciona como carril de iconos o panel flotante, y el
 *  panel de subsecciones se abre A LA PAR de cualquiera de los dos. */
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

/** Panel de subsecciones A LA PAR (se crea al usarse por primera
 *  vez; vive DENTRO del nav y el CSS lo ancla a su costado). */
let panelSub: HTMLElement | null = null;

/** Ruta de la sección cuyo panel de subsecciones está abierto
 *  (null = el panel está cerrado). */
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
            declara, el clic NO navega y NO cambia la vista: abre
            el PANEL A LA PAR; la vista cambia SOLO al ELEGIR una
            subsección.

  ORDEN AUTOMÁTICO: da igual el orden en que se escriban los
  bloques. "Inicio" SIEMPRE queda arriba y las demás secciones
  se ordenan solas alfabéticamente (SECCIÓN 6). Las subsecciones
  de cada sección también salen en orden alfabético.

  Habilitadas por ahora: Inicio (SIN subsecciones), Docentes,
  Estudiantes (CON subsecciones) y Fondos (CON subsecciones y
  SOLO para admin y director). Las demás secciones quedan
  COMENTADAS y se activan quitándoles el comentario conforme se
  construyan.
============================================================ */

/* SECCIÓN HABILITADA — Inicio. Es SOLO la sección de entrada:
   NO tiene subsecciones y su clic navega directo a la vista
   general (por ahora el estado general; el contenido por rol se
   construirá más adelante, según quién vea). */
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
   (Actualizar, Matricular y Nomina). Visible para admin, director
   y MAESTROS (profesor), y SUS SUBSECCIONES TAMBIÉN PARA LOS
   TRES (grupo PERSONAL). El clic NO cambia la vista: abre el
   panel a la par; la vista cambia solo al elegir una subsección.
   En la lista salen en orden alfabético: Actualizar, Matricular,
   Nomina. */
agregarItemMenu({
  titulo: 'Estudiantes',
  ruta: '#/estudiantes',
  roles: PERSONAL, // admin + director + maestros (profesor)
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="butt"
         stroke-linejoin="miter" aria-hidden="true">
      <path d="M2.5 9.5L12 5l9.5 4.5L12 14z" />
      <path d="M6.5 11.8v3.9c0 1.2 2.5 2.4 5.5 2.4s5.5-1.2 5.5-2.4v-3.9" />
      <path d="M21.5 9.5v5.5" />
    </svg>`,
  subsecciones: [
    { titulo: 'Actualizar', ruta: '#/estudiantes/actualizar', roles: PERSONAL },
    { titulo: 'Matricular', ruta: '#/estudiantes/matricular', roles: PERSONAL },
    { titulo: 'Nomina', ruta: '#/estudiantes/nomina', roles: PERSONAL },
  ],
});

/* SECCIÓN HABILITADA — Fondos con sus 4 subsecciones (Fondos,
   Ingresos-Gastos, Compras y Liquidaciones), SOLO para admin y
   director (grupo DIRECCION de la SECCIÓN 2): profesor,
   estudiante y padre de familia no ven NI la sección NI su
   panel a la par. El clic en la sección NO cambia la vista:
   abre el panel a la par; la vista cambia SOLO al elegir una
   subsección. En el panel salen en orden alfabético automático:
   Compras, Fondos, Ingresos-Gastos, Liquidaciones.
   Cada subsección apunta a su propia ruta #/fondos/... (el slug
   SIEMPRE va debajo de la ruta de su sección, igual que en
   Estudiantes); por ahora esas vistas están SIN construir, así
   que muestran el estado "Vista en construcción" de content.ts
   hasta que se construya cada módulo en próximas entradas. */
agregarItemMenu({
  titulo: 'Fondos',
  ruta: '#/fondos',
  roles: DIRECCION, // SOLO admin + director (petición ENTRADA 32)
  icono: `
    <svg class="sidebar-icono" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="6.5" width="18" height="12" rx="1.5" />
      <path d="M14.5 10.5h6v4h-6a2 2 0 0 1 0-4z" />
      <path d="M17.5 12.5h.01" />
    </svg>`,
  subsecciones: [
    { titulo: 'Fondos', ruta: '#/fondos/fondos', roles: DIRECCION },
    { titulo: 'Ingresos-Gastos', ruta: '#/fondos/ingresos-gastos', roles: DIRECCION },
    { titulo: 'Compras', ruta: '#/fondos/compras', roles: DIRECCION },
    { titulo: 'Liquidaciones', ruta: '#/fondos/liquidaciones', roles: DIRECCION },
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
 * con '#/estudiantes/nomina' queda activo 'Estudiantes'
 * (#/estudiantes). Sin hash en la URL se usa RUTA_POR_DEFECTO
 * (SECCIÓN 2).
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

  // Y marca la subsección activa dentro del panel (si está abierto)
  seleccionarSub(rutaBuscada);
}

/** Marca como activa la subsección que coincida con el hash
 *  dentro del panel a la par (si está en pantalla). */
function seleccionarSub(ruta: string): void {
  const panel = panelSub;
  if (panel === null) return;
  const enlaces = panel.querySelectorAll('a.sub-item');
  enlaces.forEach((enlace) => {
    enlace.classList.toggle('activo', enlace.getAttribute('href') === ruta);
  });
}

/* ============================================================
  SECCIÓN 8 · PANEL DE SUBSECCIONES A LA PAR (NO EDITAR)
  Al abrir las subsecciones de una sección NO se sustituye el
  menú y la vista actual NO se quita: se muestra OTRA SIDEBAR a
  la par — un panel hijo del <nav> anclado a su costado (left:
  100%) con el nombre de la sección, la lista de subsecciones y
  una X para cerrar. Como es hijo del nav, se mueve con él en los
  3 dispositivos: junto al menú expandido, junto al carril mini
  (72px), junto al panel flotante de tablet y sobre el drawer de
  móvil (allí lo cubre, porque a la par no cabe).
============================================================ */

/** true si la ventana actual es tablet o móvil (≤1024px). */
function esPantallaChica(): boolean {
  return window.matchMedia(MQ_TABLET).matches;
}

/** Crea (una sola vez) el panel a la par y lo deja DENTRO del nav
 *  (el CSS lo ancla a left: 100%). Oculto hasta recibir .abierto. */
function obtenerPanelSub(nav: HTMLElement): HTMLElement {
  if (panelSub !== null) return panelSub;

  const panel = document.createElement('div');
  panel.className = 'panel-sub';
  panel.setAttribute('aria-label', 'Subsecciones de la sección');

  // Cabecera: nombre de la sección + botón X para cerrar
  const cabecera = document.createElement('div');
  cabecera.className = 'panel-sub-cabecera';

  const titulo = document.createElement('span');
  titulo.className = 'panel-sub-titulo';

  const botonCerrar = document.createElement('button');
  botonCerrar.type = 'button';
  botonCerrar.className = 'panel-sub-cerrar';
  botonCerrar.setAttribute('aria-label', 'Cerrar subsecciones');
  botonCerrar.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter"
         aria-hidden="true">
      <path d="M5 5l14 14" />
      <path d="M19 5L5 19" />
    </svg>`;
  botonCerrar.addEventListener('click', () => cerrarPanelSub());

  cabecera.append(titulo, botonCerrar);

  // Lista de subsecciones (se llena en abrirPanelSub)
  const lista = document.createElement('ul');
  lista.className = 'sub-lista';

  panel.append(cabecera, lista);

  // Vive DENTRO del nav: el CSS lo pega a la par (left: 100%)
  nav.appendChild(panel);

  panelSub = panel;
  return panel;
}

/** Abre el panel a la par con las subsecciones VISIBLES de la
 *  sección indicada (las bloqueadas por rol no se dibujan). NO
 *  navega: la vista actual sigue en pantalla hasta que se elija
 *  una subsección. */
function abrirPanelSub(item: ItemMenu): void {
  const nav = navMontado;
  if (nav === null) return;
  const panel = obtenerPanelSub(nav);

  // Nombre de la sección en la cabecera
  const titulo = panel.querySelector('.panel-sub-titulo');
  if (titulo !== null) titulo.textContent = item.titulo;

  const lista = panel.querySelector('.sub-lista');
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

  panel.classList.add('abierto');
  seccionAbierta = item.ruta;
  // Si la vista ya era una subsección de esta sección, queda
  // marcada al instante (p. ej. recargar en #/estudiantes/nomina).
  seleccionarSub(rutaActual());
}

/** Cierra el panel a la par (X, ESC, segundo clic en la sección,
 *  clic fuera del sidebar o navegación a una sección ajena). */
function cerrarPanelSub(): void {
  panelSub?.classList.remove('abierto');
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

  // --- Clic dentro del sidebar ---
  nav.addEventListener('click', (evento) => {
    // a) Elegir una SUBSECCIÓN SÍ navega (el enlace actúa solo).
    //    En tablet/móvil el panel flotante se cierra para dejar
    //    ver la vista elegida; en escritorio el panel a la par
    //    permanece abierto mostrando la subsección activa.
    const subElegida = (evento.target as HTMLElement).closest(
      'a.sub-item',
    );
    if (subElegida !== null) {
      if (esPantallaChica()) {
        nav.classList.remove('sidebar-open');
        cerrarPanelSub();
      }
      return;
    }

    // b) Clic en una SECCIÓN del menú
    const enlace = (evento.target as HTMLElement).closest(
      'a.sidebar-item',
    );
    if (enlace === null) return;

    const item = itemPorRuta(enlace.getAttribute('href') ?? '');
    if (item === undefined) return;

    if (tieneSubseccionesVisibles(item)) {
      // CLAVE: la vista actual NO se quita. El clic NO navega
      // (se cancela el enlace): solo abre/cierra el panel a la
      // par. La vista cambia SOLO al elegir una subsección.
      evento.preventDefault();
      if (seccionAbierta === item.ruta) {
        cerrarPanelSub(); // segundo clic en la misma sección: cerrar
      } else {
        abrirPanelSub(item);
      }
    } else if (seccionAbierta !== null) {
      // Sección SIN subsecciones (p. ej. Inicio): navega y el
      // panel a la par se cierra solo.
      cerrarPanelSub();
    }
  });

  // Un clic FUERA del sidebar también cierra el panel a la par
  document.addEventListener('click', (evento) => {
    if (seccionAbierta === null) return;
    if (navMontado?.contains(evento.target as Node)) return;
    cerrarPanelSub();
  });

  // La tecla ESC también cierra el panel a la par
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && seccionAbierta !== null) cerrarPanelSub();
  });

  // Marca la sección activa según el hash con el que se entró
  seleccionarItem(rutaActual());

  // Y la actualiza cada vez que el hash cambie (clic o flechas).
  // Si el panel a la par quedó abierto de una sección y la
  // navegación fue a una ruta ajena (p. ej. por las migas), se
  // cierra solo; si fue a una subsección de ESA sección, queda
  // abierto mostrándola activa.
  window.addEventListener('hashchange', () => {
    const ruta = rutaActual() || RUTA_POR_DEFECTO;
    if (seccionAbierta !== null) {
      const abierta = itemPorRuta(seccionAbierta);
      const sigueAbierta =
        abierta !== undefined &&
        (ruta === abierta.ruta || ruta.startsWith(abierta.ruta + '/'));
      if (!sigueAbierta) cerrarPanelSub();
    }
    seleccionarItem(ruta);
  });

  return nav;
}