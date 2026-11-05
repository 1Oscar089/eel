/* ============================================================
  login.ts — Proyecto 1 · Inicio de sesión
  ------------------------------------------------------------
  GUÍA RÁPIDA DE EDICIÓN:
  - Servicios Firebase (auth + db)         → SECCIÓN 1.
  - Dominio, colecciones y llave de sesión → SECCIÓN 2.
  - Textos visibles (títulos, mensajes)    → SECCIÓN 5.
  - Lógica de acceso (Google / padres)     → SECCIONES 6 y 7.
  - Apariencia                             → src/styles/login.css.

  Reglas de acceso:
  - Google (solo @clases.edu.sv): números antes del @ = estudiante;
    letras = personal (profesor/director; rol2 'admin' prevalece).
  - Correo y contraseña (cualquiera que entra por el formulario):
    SIEMPRE entra con rol 'padre' (padre de familia). Si existe el
    documento del estudiante (correo2) se usa el responsable como
    nombre; si no existe, entra igual con el correo como nombre.
  - Vista (solo admin): el admin puede navegar viendo el sistema
    como otro rol (SECCIÓN 8 · guardarVista); su rol real no cambia.
============================================================ */

/* ============================================================
  SECCIÓN 1 · IMPORTS Y SERVICIOS FIREBASE (NO EDITAR)
  Toma la app del proyecto 1 desde src/servicios/initFirebase.ts
  y deriva de ella auth (autenticación) y db (Firestore).
============================================================ */
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  getAuth,
} from 'firebase/auth';
import {
  collection,
  getDocs,
  query,
  where,
  getFirestore,
} from 'firebase/firestore';
import { getFirebaseApp } from '../../servicios/initFirebase';

const app = getFirebaseApp('proyecto1');

/** Autenticación (Google y correo/contraseña de padres). */
const auth = getAuth(app);

/** Firestore (colecciones estudiantes y profesores). */
const db = getFirestore(app);

/* ============================================================
  SECCIÓN 2 · CONFIGURACIÓN GENERAL (EDITA AQUÍ)
============================================================ */

/** Dominio institucional permitido para el acceso con Google. */
const DOMINIO_PERMITIDO = 'clases.edu.sv';

/** Colecciones de Firestore. */
const COLECCION_ESTUDIANTES = 'estudiantes';
const COLECCION_PROFESORES = 'profesores';

/** Llave de la sesión guardada en sessionStorage. */
export const CLAVE_SESION = 'eel-sesion';

/* ============================================================
  SECCIÓN 3 · TIPOS
============================================================ */

/** Roles del sistema. Admin = todos los permisos. */
export type Rol = 'estudiante' | 'profesor' | 'director' | 'admin' | 'padre';

/** Datos que quedan registrados al iniciar sesión. */
export interface Sesion {
  nombre: string;
  rol: Rol;
  /** Texto extra según el rol: grado (estudiante) o estudiante (padre). */
  detalle?: string;
  /** SOLO admin: rol con el que está navegando en este momento
   *  (la opción "Ver como" del menú de usuario). El rol real nunca
   *  cambia; si no está presente se usa el rol de la sesión. */
  vista?: Rol;
}

/** Campos que se leen de un documento de la colección estudiantes. */
interface DatosEstudiante {
  correo?: string;
  correo2?: string;   // NIE@gmail.com (acceso de padres)
  nombre?: string;
  grado?: string;
  responsable?: string;
}

/** Campos que se leen de un documento de la colección profesores. */
interface DatosPersonal {
  correo?: string;
  nombre?: string;
  rol?: string;       // 'profesor' | 'director'
  rol2?: string;      // 'admin' (solo administradores) — prevalece sobre rol
}

/* ============================================================
  SECCIÓN 4 · ESTADO INTERNO (NO EDITAR)
============================================================ */

/** <p> donde se muestran los mensajes (error / info / éxito). */
let mensaje: HTMLParagraphElement | null = null;

/** Tarjeta central (para cambiar entre formulario y sesión iniciada). */
let tarjeta: HTMLDivElement | null = null;

/* ============================================================
  SECCIÓN 5 · RENDER
============================================================ */

/** Crea un campo de formulario (etiqueta + entrada). */
function crearCampo(id: string, etiqueta: string, tipo: string, ejemplo: string): HTMLDivElement {
  const grupo = document.createElement('div');
  grupo.className = 'login-campo';

  const label = document.createElement('label');
  label.className = 'login-etiqueta';
  label.setAttribute('for', id);
  label.textContent = etiqueta;

  const input = document.createElement('input');
  input.className = 'login-entrada';
  input.id = id;
  input.type = tipo;
  input.required = true;
  input.placeholder = ejemplo;

  grupo.appendChild(label);
  grupo.appendChild(input);
  return grupo;
}

/** Construye la vista completa de acceso y la devuelve. */
export function crearLogin(): HTMLElement {
  const vista = document.createElement('section');
  vista.className = 'login-vista';

  tarjeta = document.createElement('div');
  tarjeta.className = 'login-tarjeta';

  // Encabezado institucional
  const marca = document.createElement('div');
  marca.className = 'login-marca';
  const titulo = document.createElement('h1');
  titulo.className = 'login-titulo';
  titulo.textContent = 'Expediente en Línea';
  const subtitulo = document.createElement('p');
  subtitulo.className = 'login-subtitulo';
  subtitulo.textContent = 'Panel de acceso — dominio @' + DOMINIO_PERMITIDO;
  marca.appendChild(titulo);
  marca.appendChild(subtitulo);

  // ACCESO 1 · Google (profesores, director, admin y estudiantes)
  const botonGoogle = document.createElement('button');
  botonGoogle.className = 'login-google';
  botonGoogle.type = 'button';
  botonGoogle.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 .75C9.06.75 6.46 1.78 4.46 3.63l3.68 2.86C9.14 5.54 10.49 4.93 12 4.93c2.12 0 3.99.87 5.35 2.28l3.03-3.03C18.46 2.26 15.44.75 12 .75z"/>
      <path fill="#4285F4" d="M23.25 12.27c0-.79-.07-1.55-.21-2.27H12v4.51h6.47c-.28 1.48-1.12 2.73-2.39 3.58l3.68 2.85c2.15-1.99 3.49-4.92 3.49-8.67z"/>
      <path fill="#FBBC05" d="M5.62 14.2c-.25-.74-.39-1.53-.39-2.34s.14-1.6.39-2.34L1.96 6.68C1.16 8.31.7 10.1.7 11.99s.46 3.68 1.26 5.31l3.66-2.84z"/>
      <path fill="#34A853" d="M12 23.25c3.44 0 6.33-1.14 8.44-3.09l-3.68-2.85c-1.02.69-2.36 1.1-4.76 1.1-2.49 0-4.63-1.66-5.39-3.95l-3.66 2.84c2 3.85 6.01 5.95 9.05 5.95z"/>
    </svg>
    <span>Iniciar sesión con Google</span>`;
  botonGoogle.addEventListener('click', () => { void iniciarSesionGoogle(); });

  // Divisor "o"
  const divisor = document.createElement('div');
  divisor.className = 'login-divisor';
  const divisorTexto = document.createElement('span');
  divisorTexto.textContent = 'o';
  divisor.appendChild(divisorTexto);

  // ACCESO 2 · Padres (correo2 + contraseña)
  const rotuloPadres = document.createElement('p');
  rotuloPadres.className = 'login-rotulo';
  rotuloPadres.textContent = 'Padres de familia';

  const formulario = document.createElement('form');
  formulario.className = 'login-formulario';
  formulario.appendChild(crearCampo('login-correo2', 'Correo', 'email', 'NIE@gmail.com'));
  formulario.appendChild(crearCampo('login-nie', 'Contraseña', 'password', 'Número NIE'));

  const botonEntrar = document.createElement('button');
  botonEntrar.className = 'login-entrar';
  botonEntrar.type = 'submit';
  botonEntrar.textContent = 'Entrar';
  formulario.appendChild(botonEntrar);
  formulario.addEventListener('submit', (evento) => { void iniciarSesionPadres(evento); });

  // Mensajes de error / confirmación
  mensaje = document.createElement('p');
  mensaje.className = 'login-mensaje';
  mensaje.setAttribute('role', 'alert');

  // Armado de la tarjeta
  tarjeta.appendChild(marca);
  tarjeta.appendChild(botonGoogle);
  tarjeta.appendChild(divisor);
  tarjeta.appendChild(rotuloPadres);
  tarjeta.appendChild(formulario);
  tarjeta.appendChild(mensaje);
  vista.appendChild(tarjeta);

  // Si se abre con sesión ya guardada, se muestra el panel directamente
  const guardada = sessionStorage.getItem(CLAVE_SESION);
  if (guardada !== null) {
    pintarSesion(JSON.parse(guardada) as Sesion);
  }

  return vista;
}

/* ============================================================
  SECCIÓN 6 · EVENTOS DE ACCESO
============================================================ */

/** ACCESO 1 · Google: valida dominio, decide rol y busca en Firestore. */
async function iniciarSesionGoogle(): Promise<void> {
  mostrarMensaje('Verificando con Google…', 'info');
  try {
    const proveedor = new GoogleAuthProvider();
    const credencial = await signInWithPopup(auth, proveedor);
    const correo = credencial.user.email ?? '';

    // Solo correos del dominio institucional
    if (!correo.endsWith('@' + DOMINIO_PERMITIDO)) {
      await cerrarSesionFirebase();
      mostrarMensaje('Solo se permite el dominio @' + DOMINIO_PERMITIDO + '.', 'error');
      return;
    }

    // Números antes del @ = estudiante · letras = personal
    const parteLocal = correo.split('@')[0] ?? '';
    if (/^\d+$/.test(parteLocal)) {
      await entrarComoEstudiante(correo);
    } else {
      await entrarComoPersonal(correo);
    }
  } catch (error) {
    mostrarMensaje(textoErrorGoogle(error), 'error');
  }
}

/** ACCESO 2 · Padres: correo2 (NIE@gmail.com) + contraseña (NIE). */
async function iniciarSesionPadres(evento: Event): Promise<void> {
  evento.preventDefault();
  const formulario = evento.currentTarget as HTMLFormElement;
  const correo = (formulario.querySelector('#login-correo2') as HTMLInputElement).value.trim();
  const clave = (formulario.querySelector('#login-nie') as HTMLInputElement).value.trim();

  mostrarMensaje('Verificando…', 'info');
  try {
    await signInWithEmailAndPassword(auth, correo, clave);
    await entrarComoPadre(correo);
  } catch (error) {
    mostrarMensaje(textoErrorPadres(error), 'error');
  }
}

/* ============================================================
  SECCIÓN 7 · LÓGICA FIRESTORE (búsquedas y roles)
============================================================ */

/** Estudiante: busca por correo y extrae nombre y grado. */
async function entrarComoEstudiante(correo: string): Promise<void> {
  const consulta = query(collection(db, COLECCION_ESTUDIANTES), where('correo', '==', correo));
  const instantanea = await getDocs(consulta);

  if (instantanea.empty) {
    await cerrarSesionFirebase();
    mostrarMensaje('No hay registros.', 'error');
    return;
  }

  const datos = instantanea.docs[0].data() as DatosEstudiante;
  await guardarYMostrarSesion({
    nombre: datos.nombre ?? '',
    rol: 'estudiante',
    detalle: datos.grado ?? '',
  });
}

/** Personal: busca por correo; rol2 'admin' prevalece sobre rol. */
async function entrarComoPersonal(correo: string): Promise<void> {
  const consulta = query(collection(db, COLECCION_PROFESORES), where('correo', '==', correo));
  const instantanea = await getDocs(consulta);

  if (instantanea.empty) {
    await cerrarSesionFirebase();
    mostrarMensaje('No hay registros.', 'error');
    return;
  }

  const datos = instantanea.docs[0].data() as DatosPersonal;
  const rol: Rol = datos.rol2 === 'admin'
    ? 'admin'
    : (datos.rol === 'director' ? 'director' : 'profesor');

  await guardarYMostrarSesion({ nombre: datos.nombre ?? '', rol: rol });
}

/** Padre: quien entra con correo y contraseña SIEMPRE tiene el rol
 *  'padre'. Si existe el documento del estudiante (correo2) se toma
 *  el responsable como nombre y el estudiante como detalle; si no
 *  existe (o Firestore falla), entra igual usando el correo. */
async function entrarComoPadre(correo: string): Promise<void> {
  let nombre = correo.split('@')[0] ?? correo;
  let detalle = '';

  try {
    const consulta = query(collection(db, COLECCION_ESTUDIANTES), where('correo2', '==', correo));
    const instantanea = await getDocs(consulta);
    if (!instantanea.empty) {
      const datos = instantanea.docs[0].data() as DatosEstudiante;
      if (datos.responsable !== undefined && datos.responsable !== '') {
        nombre = datos.responsable;
      }
      detalle = datos.nombre ?? '';
    }
  } catch {
    // Sin documento o sin conexión: entra igual con rol 'padre'
  }

  await guardarYMostrarSesion({
    nombre: nombre,
    rol: 'padre',
    detalle: detalle === '' ? undefined : detalle,
  });
}

/** Guarda la sesión y muestra el panel con los datos extraídos. */
async function guardarYMostrarSesion(sesion: Sesion): Promise<void> {
  sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  pintarSesion(sesion);
}

/** Cierra la sesión de Firebase (sin errores si no había). */
async function cerrarSesionFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // sin sesión activa: nada que hacer
  }
}

/** Cierra la sesión por completo: borra la sesión guardada y
 *  desautentica en Firebase. La usa también la userbar. */
export async function cerrarSesion(): Promise<void> {
  sessionStorage.removeItem(CLAVE_SESION);
  await cerrarSesionFirebase();
}

/* ============================================================
  SECCIÓN 8 · UTILIDADES (mensajes y panel de sesión)
============================================================ */

/** Muestra un mensaje bajo la tarjeta. */
function mostrarMensaje(texto: string, tipo: 'error' | 'info' | 'exito'): void {
  if (mensaje === null) return;
  mensaje.textContent = texto;
  mensaje.className = 'login-mensaje login-mensaje-' + tipo;
}

/** Reemplaza la tarjeta por el panel de sesión iniciada. */
function pintarSesion(sesion: Sesion): void {
  if (tarjeta === null) return;
  tarjeta.replaceChildren();

  const titulo = document.createElement('h2');
  titulo.className = 'login-titulo-sesion';
  titulo.textContent = 'Sesión iniciada';

  const lista = document.createElement('dl');
  lista.className = 'login-datos';
  agregarDato(lista, 'Nombre', sesion.nombre);
  agregarDato(lista, 'Rol', sesion.rol);
  if (sesion.detalle !== undefined && sesion.detalle !== '') {
    agregarDato(lista, sesion.rol === 'estudiante' ? 'Grado' : 'Estudiante', sesion.detalle);
  }

  const botonContinuar = document.createElement('button');
  botonContinuar.className = 'login-continuar';
  botonContinuar.type = 'button';
  botonContinuar.textContent = 'Entrar al sistema';
  botonContinuar.addEventListener('click', () => location.reload());

  const botonSalir = document.createElement('button');
  botonSalir.className = 'login-salir';
  botonSalir.type = 'button';
  botonSalir.textContent = 'Cerrar sesión';
  botonSalir.addEventListener('click', () => {
    void cerrarSesion().then(() => location.reload());
  });

  tarjeta.appendChild(titulo);
  tarjeta.appendChild(lista);
  tarjeta.appendChild(botonContinuar);
  tarjeta.appendChild(botonSalir);
}

/** Agrega un par etiqueta–valor al panel de sesión. */
function agregarDato(lista: HTMLDListElement, etiqueta: string, valor: string): void {
  const dt = document.createElement('dt');
  dt.textContent = etiqueta;
  const dd = document.createElement('dd');
  dd.textContent = valor;
  lista.appendChild(dt);
  lista.appendChild(dd);
}

/** Traduce errores comunes de Google a mensajes claros. */
function textoErrorGoogle(error: unknown): string {
  const codigo = (error as { code?: string }).code ?? '';
  if (codigo === 'auth/popup-closed-by-user') return 'Ventana de Google cerrada.';
  if (codigo === 'auth/unauthorized-domain') return 'Dominio no autorizado en Firebase.';
  return 'No se pudo iniciar sesión con Google.';
}

/** Traduce errores comunes del acceso de padres. */
function textoErrorPadres(error: unknown): string {
  const codigo = (error as { code?: string }).code ?? '';
  if (codigo === 'auth/invalid-credential') return 'Correo o contraseña incorrectos.';
  if (codigo === 'auth/too-many-requests') return 'Demasiados intentos. Espera un momento.';
  return 'No se pudo iniciar sesión.';
}

/** Lee la sesión guardada (o null si no existe / está corrupta).
 *  La userbar y el sidebar la usan para conocer el rol activo. */
export function leerSesion(): Sesion | null {
  const guardada = sessionStorage.getItem(CLAVE_SESION);
  if (guardada === null) return null;
  try {
    return JSON.parse(guardada) as Sesion;
  } catch {
    return null;
  }
}

/** Rol con el que se está navegando AHORA: la vista elegida por el
 *  admin ("Ver como") o, si no hay vista guardada, el rol real.
 *  El sidebar filtra el menú con este rol, no con el real. */
export function rolEfectivo(): Rol | null {
  const sesion = leerSesion();
  if (sesion === null) return null;
  return sesion.vista ?? sesion.rol;
}

/** Guarda la vista elegida por el admin ("Ver como" del menú de
 *  usuario). SOLO surte efecto si el rol real es admin: cualquier
 *  otra cuenta lo intenta y no cambia nada. Tras guardar, la
 *  userbar recarga la página para reconstruir el menú lateral. */
export function guardarVista(vista: Rol): void {
  const sesion = leerSesion();
  if (sesion === null || sesion.rol !== 'admin') return;
  sesion.vista = vista;
  sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
}