/* ============================================================
  userbar.ts — Barra superior de la aplicación
  ------------------------------------------------------------
  GUÍA RÁPIDA DE EDICIÓN:
  - Media query y etiquetas de rol → SECCIÓN 2 (EDITA AQUÍ).
  - Zona de usuario (avatar + menú) → SECCIÓN 4.
  - Bloque "Ver como" (solo admin)  → SECCIÓN 4.
  - Apariencia                      → layout.css (sección 13).

  Responsabilidades:
  1. Hamburguesa + logo + zona de usuario (crearUserbar).
  2. La hamburguesa SÍ controla el sidebar:
     - Escritorio (>1024px): alterna .sidebar-mini (colapsa a 72px).
     - Tablet/Móvil (≤1024px): alterna .sidebar-open (menú flotante).
  3. Mantener aria-expanded actualizado (accesibilidad).
  4. El admin puede cambiar la vista (Ver como) desde su menú:
     cambia con qué rol se construye el menú lateral, pero su rol
     real NUNCA cambia.
============================================================ */

/* ============================================================
  SECCIÓN 1 · IMPORTS (NO EDITAR)
============================================================ */
import { cerrarSesion, guardarVista, leerSesion, type Rol } from '../proyecto-1/login';

/* ============================================================
  SECCIÓN 2 · CONFIGURACIÓN (EDITA AQUÍ)
============================================================ */

/** Media query que agrupa tablet y móvil.
 *  Debe coincidir con @media (max-width: 1024px) de layout.css. */
const MQ_TABLET = '(max-width: 1024px)';

/** Texto visible de cada rol dentro del menú de usuario. */
const ETIQUETAS_ROL: Record<Rol, string> = {
  estudiante: 'Estudiante',
  profesor: 'Profesor',
  director: 'Director',
  admin: 'Administrador',
  padre: 'Padre de familia',
};

/* ============================================================
  SECCIÓN 3 · LÓGICA DEL SIDEBAR (NO EDITAR)
  La hamburguesa llama a alternarSidebar() (ver SECCIÓN 5).
============================================================ */

/** true si la ventana actual es tablet o móvil (≤1024px). */
function esPantallaChica(): boolean {
  return window.matchMedia(MQ_TABLET).matches;
}

/** Indica si el menú se está mostrando al usuario.
 *  - Tablet/Móvil: abierto = tiene la clase .sidebar-open.
 *  - Escritorio:   abierto = NO está colapsado (.sidebar-mini). */
export function sidebarEstaAbierto(): boolean {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return false;
  return esPantallaChica()
    ? sidebar.classList.contains('sidebar-open')
    : !sidebar.classList.contains('sidebar-mini');
}

/** Abre/cierra el sidebar (clic de la hamburguesa).
 *  El CSS interpreta la clase según el breakpoint:
 *  - .sidebar-open → panel flotante en tablet / drawer en móvil.
 *  - .sidebar-mini → versión de 72px en escritorio. */
export function alternarSidebar(): void {
  const sidebar = document.querySelector('.sidebar');
  const boton = document.querySelector('.hamburguesa');
  if (!sidebar || !boton) return;

  if (esPantallaChica()) {
    sidebar.classList.toggle('sidebar-open');   // tablet/móvil
  } else {
    sidebar.classList.toggle('sidebar-mini');   // escritorio
  }

  // Sincroniza el estado para lectores de pantalla
  boton.setAttribute('aria-expanded', String(sidebarEstaAbierto()));
}

/** Cierra el menú flotante/drawer. Lo usa el overlay al hacer clic
 *  fuera del sidebar (ver main.ts). En escritorio no tiene efecto. */
export function cerrarSidebar(): void {
  const sidebar = document.querySelector('.sidebar');
  const boton = document.querySelector('.hamburguesa');
  sidebar?.classList.remove('sidebar-open');
  boton?.setAttribute('aria-expanded', 'false');
}

/** Se ejecuta en cada resize: elimina clases "huérfanas" del ancho
 *  anterior para dejar el estado coherente:
 *  - Al pasar a ≤1024px sobra .sidebar-mini (allí manda el CSS).
 *  - Al pasar a >1024px sobra .sidebar-open (no hay drawer). */
export function limpiarEstadoSegunAncho(): void {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  if (esPantallaChica()) {
    sidebar.classList.remove('sidebar-mini');
  } else {
    sidebar.classList.remove('sidebar-open');
  }
}

/* ============================================================
  SECCIÓN 4 · ZONA DE USUARIO (avatar + menú desplegable)
============================================================ */

/** Bloque "Ver como" del menú de usuario (SOLO se muestra al admin):
 *  cuatro botones (admin, profesor, estudiante, padre de familia).
 *  La vista activa va resaltada; al elegir otra se guarda en la
 *  sesión y la página se recarga para reconstruir el menú lateral
 *  con ese rol. El rol real de la cuenta NUNCA cambia. */
function crearBloqueVista(menu: HTMLElement, vistaActiva: Rol): void {
  const rotulo = document.createElement('p');
  rotulo.className = 'userbar-menu-vista-titulo';
  rotulo.textContent = 'Ver como';

  const grilla = document.createElement('div');
  grilla.className = 'userbar-menu-vista';

  const roles: Rol[] = ['admin', 'profesor', 'estudiante', 'padre'];
  for (const rol of roles) {
    const opcion = document.createElement('button');
    opcion.type = 'button';
    opcion.className = 'userbar-menu-opcion' + (rol === vistaActiva ? ' activo' : '');
    opcion.textContent = ETIQUETAS_ROL[rol];
    if (rol !== vistaActiva) {
      opcion.addEventListener('click', () => {
        guardarVista(rol);
        location.reload(); // reconstruye userbar + sidebar con la vista
      });
    }
    grilla.appendChild(opcion);
  }

  menu.appendChild(rotulo);
  menu.appendChild(grilla);
}

/** Construye la zona derecha de la userbar: un botón circular con
 *  la inicial del nombre (nombre[0]); al hacer clic despliega el
 *  nombre completo, el rol y el botón "Cerrar sesión".
 *  El menú se cierra con clic fuera o con la tecla ESC.
 *  Devuelve null si no hay sesión guardada (no se muestra nada). */
function crearZonaUsuario(): HTMLElement | null {
  const sesion = leerSesion();
  if (sesion === null) return null;

  const inicial = (sesion.nombre.trim()[0] ?? 'U').toUpperCase();

  // Contenedor ancla del menú desplegable (el CSS lo empuja a la derecha)
  const zona = document.createElement('div');
  zona.className = 'userbar-usuario';

  // Avatar: botón circular con la inicial
  const avatar = document.createElement('button');
  avatar.type = 'button';
  avatar.className = 'userbar-avatar';
  avatar.textContent = inicial;
  avatar.setAttribute('aria-label', 'Menú de usuario');
  avatar.setAttribute('aria-haspopup', 'true');
  avatar.setAttribute('aria-expanded', 'false');

  // Panel desplegable (oculto hasta que reciba la clase .abierto)
  const menu = document.createElement('div');
  menu.className = 'userbar-menu';

  const nombre = document.createElement('p');
  nombre.className = 'userbar-menu-nombre';
  nombre.textContent = sesion.nombre;

  const rol = document.createElement('p');
  rol.className = 'userbar-menu-rol';
  rol.textContent = ETIQUETAS_ROL[sesion.rol] ?? sesion.rol;

  const salir = document.createElement('button');
  salir.type = 'button';
  salir.className = 'userbar-menu-salir';
  salir.textContent = 'Cerrar sesión';
  salir.addEventListener('click', () => {
    void cerrarSesion().then(() => location.reload());
  });

  menu.appendChild(nombre);
  menu.appendChild(rol);

  // SOLO el admin ve el bloque "Ver como" (cambiar la vista)
  if (sesion.rol === 'admin') {
    crearBloqueVista(menu, sesion.vista ?? sesion.rol);
  }

  menu.appendChild(salir);

  const marcarCerrado = (): void => {
    menu.classList.remove('abierto');
    avatar.setAttribute('aria-expanded', 'false');
  };

  avatar.addEventListener('click', () => {
    const abierto = menu.classList.toggle('abierto');
    avatar.setAttribute('aria-expanded', String(abierto));
  });

  // Clic fuera de la zona de usuario cierra el menú
  document.addEventListener('click', (evento) => {
    if (!zona.contains(evento.target as Node)) marcarCerrado();
  });

  // Tecla ESC cierra el menú
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') marcarCerrado();
  });

  zona.appendChild(avatar);
  zona.appendChild(menu);
  return zona;
}

/* ============================================================
  SECCIÓN 5 · RENDER DE LA USERBAR (NO EDITAR)
============================================================ */

/** Construye el <header> superior: hamburguesa + logo + usuario.
 *  Lo llama main.ts al montar el esqueleto. */
export function crearUserbar(): HTMLElement {
  const header = document.createElement('header');
  header.className = 'userbar';

  // --- Botón hamburguesa: 3 <span> que el CSS convierte en barras ---
  // Su clic alterna el sidebar (SECCIÓN 3 · alternarSidebar).
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'hamburguesa';
  boton.setAttribute('aria-label', 'Abrir o cerrar el menú lateral');
  boton.setAttribute('aria-expanded', 'false');
  boton.addEventListener('click', alternarSidebar);

  for (let i = 0; i < 3; i++) {
    const barra = document.createElement('span');
    barra.className = 'hamburguesa-barra';
    boton.appendChild(barra);
  }

  // --- Logo: icono de documento (SVG) + nombre del sistema ---
    // --- Logo: SOLO texto, sin SVG ---
  // Dos <span>: el CSS decide cuál mostrar según el dispositivo
  // (@media 768px). Computadora y tablet → "Expediente en Línea".
  // Teléfono → "EEL".
  const logo = document.createElement('div');
  logo.className = 'userbar-logo';
  logo.innerHTML = `
    <span class="logo-texto">Expediente en Línea</span>
    <span class="logo-corto">EEL</span>`;
  header.appendChild(boton);
  header.appendChild(logo);

  // --- Zona derecha: avatar con la inicial + menú de usuario ---
  const zonaUsuario = crearZonaUsuario();
  if (zonaUsuario !== null) header.appendChild(zonaUsuario);

  return header;
}