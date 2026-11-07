/* ============================================================
  docentes.ts — Sección Docentes (solo admin y director)
  ------------------------------------------------------------
  Esta vista se genera COMPLETA aquí (content.ts solo la agrega):
  - Migas arriba ("Inicio / Docentes") con el formato
    sección/subsección: las partes anteriores (p. ej. "Inicio")
    SON enlaces clicables — pulsar Inicio navega a la sección
    Inicio y la sidebar la marca como activa — y la ÚLTIMA parte
    es el nombre de la ubicación actual: texto fijo SIN clic.
  - Debajo, el nombre del panel EN GRANDE ("Panel de Docentes")
    con los botones Actualizar y Agregar docente A LA PAR (y, si
    la sesión es admin, también "Probar conexión" y "Pasar
    Firebase al Sheet" para la HOJA DE CÁLCULO).
  - Debajo, un CUADRO BLANCO (.tarjeta-vista) que cubre el resto
    con el resumen (activos · archivados), los títulos de
    columna, el listado y los archivados.
  - ESTILO ESTÁNDAR DE VISTA: migas → panel-encabezado →
    tarjeta-vista. Las demás secciones deben copiar esta MISMA
    estructura (las clases genéricas ya viven en layout.css).
  - SINCRONIZACIÓN SIN GASTAR CUOTA (ENTRADA 25):
    · Al abrir la sección, la tabla se pinta desde el CACHÉ EN
      localStorage (cero consultas) o desde el estado en memoria.
    · Una ESCUCHA onSnapshot mantiene la vista al día: Firestore
      avisa SOLO cuando un documento cambia (en esta computadora
      o en otro dispositivo) y entrega únicamente los documentos
      que cambiaron; aquí se actualiza SOLO la fila tocada.
    · Si otro usuario edita un docente mientras su modal está
      abierto, el modal NO se cierra y NO se recarga: se llenan
      solo los campos que cambiaron (se respeta el campo que la
      persona está escribiendo en ese momento) y aparece un
      aviso dentro del formulario.
    · Cuando la escritura fue PROPIA (anti-eco), el snapshot de
      esa misma escritura no toca el formulario.
  - ESPEJO EN GOOGLE SHEETS (Apps Script): cada guardar,
    archivar/restaurar o eliminar se copia a la hoja "DB
    Docentes" de Drive (sincronizacionDocentes.ts). El admin
    además tiene "Probar conexión" y "Pasar Firebase al Sheet"
    para pasar los docentes que YA existen en Firebase.
  - ANIMACIÓN DE CARGA: toda operación que ESCRIBE en Firebase
    (guardar, eliminar, archivar, restaurar) muestra un spinner
    que tapa TODA la pantalla y BLOQUEA los clics hasta que
    termina. Los avisos de sincronización son toasts que NO
    bloquean nada.
  - ESQUELETO DE CARGA: si el navegador aún no tiene caché, el
    listado se pinta con filas grises animadas hasta que llega
    el primer aviso de Firestore.
  - CADA DOCUMENTO se guarda con rol Y rol2: rol2 = 'admin' solo
    cuando el docente es admin. rol2 es el campo que el inicio de
    sesión lee para reconocer admins (prevalece sobre rol); si el
    documento solo tuviera rol='admin', el auth NO lo vería.
  - CAMPOS DEL DOCENTE: nombre, dui, nip, fechaNacimiento, nivel
    (select 1 y 2), especialidad, telefono (solo números, sin
    guion), aniosServicio (solo números), correo, gradosAsignados,
    rol, rol2 y archivado. DUI, NIP, teléfono y años de servicio
    SOLO ACEPTAN NÚMEROS (las teclas se filtran al escribir). Si
    un campo aún no existe en Firebase se muestra EN BLANCO (en
    la tabla, en Ver y en Editar) y el flujo no se corta.
  - Listado ordenado por nombre con el docente que sea admin
    SIEMPRE primero. En la vista principal SOLO se ven 4 datos:
    Nombre, DUI, NIP y Teléfono (TODO lo demás —nacimiento,
    nivel, especialidad, años de servicio, correo, grados— se
    ve SOLO al abrir el modal Ver/Editar). Acciones con ICONOS
    que llevan el BORDE de color y el fondo SIN relleno (Ver
    azul, Editar ámbar, Eliminar rojo, Archivar violeta,
    Restaurar verde). Los títulos de columna comparten la MISMA
    rejilla de ancho fijo que las filas, así cada título queda
    EXACTO sobre su dato.
  - Fechas en formato de EL SALVADOR: dd-mm-aaaa (zona
    America/El_Salvador). La fecha de nacimiento se guarda como
    'AAAA-MM-DD' (el valor del input date) y se muestra
    'dd-mm-aaaa'; si un documento trae creadoEn (Timestamp), el
    modal Ver lo muestra con fecha Y hora de El Salvador.
  - MODAL VER: solo lectura, muestra TODOS los datos EXCEPTO el
    rol y el estado de archivado. MODAL EDITAR: sí muestra el rol
    para cambiarlo de ser necesario.
  - ARCHIVAR: guarda archivado=true (el docente queda con la
    ficha "Archivado" en el apartado plegable) y NO vuelve a
    aparecer en el listado ni en las selecciones futuras
    (listarDocentesActivos() devuelve solo los activos).
    ELIMINAR: borra el documento de Firebase PERMANENTEMENTE
    (siempre con confirmación previa).
  - "Agregar docente" / "Editar" abren un modal estructurado en
    grupos (Datos personales · Datos laborales · Acceso y
    permisos · Grados): nombre, DUI (guion automático), NIP,
    fecha de nacimiento, nivel (select 1 y 2), especialidad,
    teléfono, años de servicio, rol (select, solo puede haber UN
    admin), correo (se forma sola como nombre[0].nombre[1].nombre[2]
    con el dominio fijo @clases.edu.sv) y grados como fichas
    (checkbox).
  - El ID de cada documento en Firestore es el NIP.
  - A prueba de errores: los campos se leen como unknown con
    lecturas seguras; si un dato falta en Firebase, se muestra
    en blanco y el flujo NO se corta.
============================================================ */

/* ============================================================
  SECCIÓN 1 · IMPORTS (NO EDITAR)
============================================================ */
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getFirestore,
} from 'firebase/firestore';
import { getFirebaseApp } from '../../servicios/initFirebase';
import {
  suscribirseDocentes,
  leerCache,
  guardarCache,
  enviarDocenteAlSheet,
  enviarEliminacionAlSheet,
  migrarDocentesAlSheet,
  probarConexionSheet,
  sheetConfigurado,
  type DocenteHoja,
  type CambioDocente,
} from '../../servicios/sincronizacionDocentes';

/* ============================================================
  SECCIÓN 2 · CONFIGURACIÓN (EDITA AQUÍ)
============================================================ */

/** Proyecto de Firebase donde vive la colección de docentes. */
const PROYECTO_FIREBASE = 'proyecto1';

/** Nombre de la colección de docentes en Firestore. */
const COLECCION_DOCENTES = 'profesores';

/** Clave bajo la que se guarda la sesión en sessionStorage. */
const CLAVE_SESION = 'eel-sesion';

/** Grados que se pueden asignar a un docente (fichas). */
const GRADOS: string[] = [
  'Parvularia 4',
  'Parvularia 5',
  'Parvularia 6',
  '1°',
  '2°',
  '3°',
  '4°',
  '5°',
  '6°',
  '7°',
  '8°',
  '9°',
];

/** Roles que puede tener un docente. Solo puede haber UN admin. */
const ROLES_DOCENTE = ['profesor', 'director', 'admin'];

/** Roles con permiso para abrir esta sección. */
const ROLES_CON_ACCESO = ['admin', 'director'];

/** Dominio fijo del correo institucional (no editable). */
const DOMINIO_CORREO = '@clases.edu.sv';

/** Niveles que se pueden asignar al docente (select 1 y 2). */
const NIVELES_DOCENTE = ['1', '2'];

/** Tope de dígitos del teléfono (El Salvador: 8, sin guion) y
 *  de los años de servicio. Se ajustan aquí, en un solo lugar. */
const TELEFONO_MAX_DIGITOS = 8;
const ANIOS_MAX_DIGITOS = 2;

/** Zona horaria de El Salvador para TODAS las fechas y horas
 *  que se muestran (aunque el navegador esté en otra zona). */
const ZONA_HORARIA = 'America/El_Salvador';

/* ============================================================
  SECCIÓN 3 · TIPOS, ESTADO Y LECTURAS SEGURAS (NO EDITAR)
============================================================ */

/** Documento de docente tal como viene de Firebase. TODOS los
 *  campos son unknown porque pueden faltar o venir en otro tipo.
 *  Las funciones de abajo los leen sin romper el flujo. */
interface Docente {
  id: string;
  nombre: unknown;
  correo: unknown;
  dui: unknown;
  nip: unknown;
  fechaNacimiento: unknown;
  nivel: unknown;
  especialidad: unknown;
  telefono: unknown;
  aniosServicio: unknown;
  gradosAsignados: unknown;
  archivado: unknown;
  rol: unknown;
  rol2: unknown;
  creadoEn: unknown;
}

/** Conexión a Firestore con el proyecto elegido arriba. */
const db = getFirestore(getFirebaseApp(PROYECTO_FIREBASE));

/** Caché de los docentes leídos (INCLUYE archivados: el NIP de
 *  un archivado sigue ocupado y un admin archivado sigue
 *  siéndolo hasta que alguien lo edite). Se llena desde la
 *  caché del navegador y con los avisos del snapshot. */
const docentesCargados: Docente[] = [];

/** Contenedor de la vista montada (para recargar la lista). */
let contenedorVista: HTMLElement | null = null;

/* ----- Estado de la SINCRONIZACIÓN EN TIEMPO REAL ----- */

/** Suscripción viva a Firestore (null = desuscripto). Se cierra
 *  al salir de la sección Docentes para no dejar la escucha
 *  abierta de vano. */
let desuscripcionSnapshot: (() => void) | null = null;

/** true SOLO en la primera emisión del snapshot: repinta TODO el
 *  listado una vez; después solo se tocan las filas cambiadas. */
let primeraEmision = true;

/** Última escritura PROPIA (anti-eco): el snapshot que llega por
 *  guardar/eliminar/archivar ESTA sesión no debe tocar el
 *  formulario del modal ni avisar como si fuera otro usuario.
 *  Ventana de 4 segundos (el aviso llega en milisegundos). */
const ecoPropio = { id: '', fecha: 0 };

/** Docente abierto en el modal de edición (null = modal cerrado
 *  o modal de Agregar). Se actualiza con cada snapshot para que
 *  "Guardar" use los datos más frescos. */
let docenteEnModal: Docente | null = null;

/** Controles del modal abierto, por clave: cuando otro usuario
 *  cambia el docente, se llenan SOLO los campos que cambiaron y
 *  se respeta el que la persona está escribiendo. */
let controlesModal: Record<
  string,
  HTMLInputElement | HTMLSelectElement
> | null = null;

/** Formulario del modal abierto (para el aviso de sincronización
 *  y las fichas de grados). */
let formularioModal: HTMLFormElement | null = null;

/** Lee un campo unknown como texto (si no es string, ''). */
function textoSeguro(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

/** Lee un campo unknown como booleano (solo true cuenta). */
function booleanoSeguro(valor: unknown): boolean {
  return valor === true;
}

/** Lee un campo unknown como lista de textos (si no es lista, []). */
function listaSegura(valor: unknown): string[] {
  return Array.isArray(valor)
    ? valor.filter((elemento): elemento is string => typeof elemento === 'string')
    : [];
}

/* ============================================================
  SECCIÓN 4 · REGLAS: DUI, CORREO, ROL, ORDEN Y PERMISO (NO EDITAR)
============================================================ */

/** DUI: solo dígitos (máximo 9) y el guion se coloca solo
 *  después del octavo. Como se re-formatea en cada tecla, el
 *  guion no se puede borrar. */
function formatearDUI(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 9);
  if (digitos.length < 8) return digitos;
  if (digitos.length === 8) return digitos + '-';
  return digitos.slice(0, 8) + '-' + digitos.slice(8);
}

/** Deja SOLO los dígitos de lo escrito (para NIP, teléfono y
 *  años de servicio). Con tope, recorta a esa cantidad de
 *  dígitos; sin tope, deja todos los que vengan. */
function soloDigitos(valor: string, tope: number | null = null): string {
  const digitos = valor.replace(/\D/g, '');
  return tope === null ? digitos : digitos.slice(0, tope);
}

/** Quita acentos, ñ y todo lo que no sea letra/número. */
function limpiarParaCorreo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Parte local del correo: nombre[0].nombre[1].nombre[2] */
function generarCorreoLocal(nombre: string): string {
  const partes = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((parte) => limpiarParaCorreo(parte))
    .filter((parte) => parte !== '');
  return partes.join('.');
}

/* ----- Fechas en formato de El Salvador (dd-mm-aaaa) ----- */

/** Convierte un valor unknown en Date: acepta Date y el
 *  Timestamp de Firestore (que trae toDate()). Devuelve null
 *  cuando el dato falta o no se puede leer (no rompe nada). */
function fechaDeValor(valor: unknown): Date | null {
  if (valor instanceof Date) {
    return isNaN(valor.getTime()) ? null : valor;
  }
  if (valor !== null && typeof valor === 'object') {
    const posible = valor as { toDate?: () => Date; seconds?: unknown };
    if (typeof posible.toDate === 'function') {
      const fecha = posible.toDate();
      return isNaN(fecha.getTime()) ? null : fecha;
    }
    if (typeof posible.seconds === 'number') {
      return new Date(posible.seconds * 1000);
    }
  }
  return null;
}

/** Fecha en formato dd-mm-aaaa (El Salvador). Acepta el valor
 *  del input de fecha ('AAAA-MM-DD', se reordena directo, sin
 *  correr un día) y también Date o Timestamp de Firestore (se
 *  convierten con la zona America/El_Salvador). Si el dato
 *  falta o es ilegible devuelve '' (la celda queda en blanco). */
function formatearFecha(valor: unknown): string {
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [anio, mes, dia] = valor.split('-');
    return dia + '-' + mes + '-' + anio;
  }
  const fecha = fechaDeValor(valor);
  if (fecha === null) return '';
  const aaaaMmDd = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha); // 'AAAA-MM-DD' (en-CA) — se reordena abajo
  const [anio, mes, dia] = aaaaMmDd.split('-');
  return dia + '-' + mes + '-' + anio;
}

/** Fecha Y HORA en formato de El Salvador: 'dd-mm-aaaa, h:mm
 *  a. m./p. m.' (zona America/El_Salvador). Para campos de
 *  registro con hora, como creadoEn (Timestamp de Firestore). */
function formatearFechaHora(valor: unknown): string {
  const fecha = fechaDeValor(valor);
  if (fecha === null) return '';
  const parteHora = new Intl.DateTimeFormat('es-SV', {
    timeZone: ZONA_HORARIA,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(fecha)
    .replace(/[\u202f\u00a0]/g, ' ')
    .toLowerCase();
  return formatearFecha(fecha) + ', ' + parteHora;
}

/** Rol EFECTIVO del docente: rol2 'admin' prevalece sobre rol.
 *  Es el MISMO criterio del inicio de sesión, que solo reconoce
 *  como admin al documento con rol2 = 'admin'. */
function rolDocente(docente: Docente): string {
  if (textoSeguro(docente.rol2) === 'admin') return 'admin';
  return textoSeguro(docente.rol);
}

/** Rol de la SESIÓN actual (texto plano: admin, director…). */
function rolSesionActual(): string {
  try {
    const cruda = sessionStorage.getItem(CLAVE_SESION);
    if (cruda === null) return '';
    const datos = JSON.parse(cruda) as { rol?: unknown };
    return textoSeguro(datos.rol);
  } catch {
    return '';
  }
}

/** ¿La sesión actual tiene acceso? (rol admin o director) */
function sesionAutorizada(): boolean {
  return ROLES_CON_ACCESO.includes(rolSesionActual());
}

/** ¿Ya existe OTRO docente con rol admin? (solo puede haber uno) */
function hayOtroAdmin(idExcluido: string): boolean {
  return docentesCargados.some(
    (d) => rolDocente(d) === 'admin' && d.id !== idExcluido,
  );
}

/** Copia ordenada: admin primero, luego por nombre (A-Z). */
function ordenarDocentes(lista: Docente[]): Docente[] {
  return [...lista].sort((a, b) => {
    const adminA = rolDocente(a) === 'admin' ? 0 : 1;
    const adminB = rolDocente(b) === 'admin' ? 0 : 1;
    if (adminA !== adminB) return adminA - adminB;
    return textoSeguro(a.nombre).localeCompare(textoSeguro(b.nombre), 'es');
  });
}

/* ============================================================
  SECCIÓN 5 · MIGAS DE PAN (NO EDITAR)
============================================================ */

/** Migas de pan con el formato sección/subsección:
 *  - Las partes que traen ruta SON clicables: pulsar "Inicio"
 *    navega a la sección Inicio y la sidebar la marca como
 *    activa (el hash cambia y todo el sistema reacciona).
 *  - La ÚLTIMA parte es el nombre de la ubicación actual (p. ej.
 *    "Docentes"): texto fijo SIN clic, marcada con aria-current.
 *  Los pasos intermedios que traigan ruta también son clicables.
 *  Ejemplo: Inicio (clicable) / Docentes (actual, sin clic). */
function crearMigas(
  elementos: { texto: string; ruta?: string }[],
): HTMLElement {
  const migas = document.createElement('nav');
  migas.className = 'migas';
  migas.setAttribute('aria-label', 'Ruta de navegación');
  elementos.forEach((elemento, indice) => {
    if (indice > 0) {
      const separador = document.createElement('span');
      separador.className = 'migas-separador';
      separador.textContent = '/';
      separador.setAttribute('aria-hidden', 'true');
      migas.appendChild(separador);
    }
    const esActual = indice === elementos.length - 1;
    if (esActual || elemento.ruta === undefined) {
      // Ubicación actual (o paso sin ruta): texto plano, SIN clic.
      const parte = document.createElement('span');
      parte.className = 'migas-parte';
      parte.textContent = elemento.texto;
      if (esActual) parte.setAttribute('aria-current', 'page');
      migas.appendChild(parte);
    } else {
      // Antecesora con ruta: ENLACE clicable (navega y la sidebar
      // marca esa sección como activa sola, por el hashchange).
      const enlace = document.createElement('a');
      enlace.className = 'migas-enlace';
      enlace.href = elemento.ruta;
      enlace.textContent = elemento.texto;
      migas.appendChild(enlace);
    }
  });
  return migas;
}

/* ============================================================
  SECCIÓN 6 · ICONOS DE LAS ACCIONES (NO EDITAR)
============================================================ */

/** Iconos SVG de las acciones (trazo uniforme, heredan el color
 *  del botón con currentColor). innerHTML se usa SOLO para SVG,
 *  como manda la convención del proyecto. */
const ICONOS = {
  ver: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>`,
  editar: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <path d="M17.3 3.7a2.4 2.4 0 0 1 3.4 3.4L8 19.8 3 21l1.2-5z" />
    </svg>`,
  eliminar: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter"
         aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M6.5 7l0.8 12h9.4l0.8-12" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>`,
  archivar: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>`,
  restaurar: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>`,
  agregar: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter"
         aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>`,
  actualizar: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>`,
  /* Hoja de cálculo (Pasar Firebase al Sheet) */
  hoja: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
    </svg>`,
  /* Nube con palomita (Probar conexión con la hoja) */
  nube: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true">
      <path d="M20 17.6A5 5 0 0 0 18 8h-1.3A8 8 0 1 0 4 16.2" />
      <path d="M9 14.5l2.4 2.4L15.5 13" />
    </svg>`,
} as const;

/* ============================================================
  SECCIÓN 7 · MODAL GENÉRICO, CARGA Y TOASTS (NO EDITAR)
============================================================ */

/** Fondo oscuro del modal abierto (null = cerrado). */
let modalFondo: HTMLDivElement | null = null;

/** Abre el modal: fondo + tarjeta con título y contenido. */
function abrirModal(titulo: string, contenido: HTMLElement[]): void {
  cerrarModal();
  modalFondo = document.createElement('div');
  modalFondo.className = 'modal-fondo';

  const tarjeta = document.createElement('div');
  tarjeta.className = 'modal-tarjeta';

  const cabecera = document.createElement('div');
  cabecera.className = 'modal-cabecera';
  const rotulo = document.createElement('h3');
  rotulo.className = 'modal-titulo';
  rotulo.textContent = titulo;
  const botonCerrar = document.createElement('button');
  botonCerrar.type = 'button';
  botonCerrar.className = 'modal-cerrar';
  botonCerrar.textContent = '×';
  botonCerrar.setAttribute('aria-label', 'Cerrar');
  botonCerrar.addEventListener('click', () => {
    cerrarModal();
  });
  cabecera.append(rotulo, botonCerrar);

  const cuerpo = document.createElement('div');
  cuerpo.className = 'modal-cuerpo';
  contenido.forEach((elemento) => {
    cuerpo.appendChild(elemento);
  });

  tarjeta.append(cabecera, cuerpo);
  modalFondo.appendChild(tarjeta);
  modalFondo.addEventListener('click', (evento) => {
    if (evento.target === modalFondo) cerrarModal();
  });
  document.body.appendChild(modalFondo);
}

/** Cierra el modal y limpia su contenido Y las referencias del
 *  formulario abierto (el modal sincronizado ya no existe). */
function cerrarModal(): void {
  if (modalFondo !== null) {
    modalFondo.remove();
    modalFondo = null;
  }
  docenteEnModal = null;
  controlesModal = null;
  formularioModal = null;
}

/** Botón para el pie de un modal. */
function crearBotonPie(
  clase: string,
  texto: string,
  accion: () => void,
): HTMLButtonElement {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = clase;
  boton.textContent = texto;
  boton.addEventListener('click', accion);
  return boton;
}

/** Línea roja de mensaje de error (vacía hasta que haya error). */
function crearLineaError(): HTMLElement {
  const linea = document.createElement('p');
  linea.className = 'form-error';
  linea.setAttribute('role', 'alert');
  return linea;
}

/** Modal pequeño de aviso con un solo botón Aceptar. */
function mostrarAviso(titulo: string, texto: string): void {
  const parrafo = document.createElement('p');
  parrafo.className = 'confirmar-aviso';
  parrafo.textContent = texto;
  const pie = document.createElement('div');
  pie.className = 'modal-pie';
  pie.appendChild(crearBotonPie('boton-primario', 'Aceptar', cerrarModal));
  abrirModal(titulo, [parrafo, pie]);
}

/** Aviso PEQUEÑO dentro del modal de edición cuando otro usuario
 *  cambió el docente: NO cierra el modal, NO recarga nada, solo
 *  informa que los campos libres se llenaron con los cambios. */
function avisarSincroModal(texto: string): void {
  if (formularioModal === null) return;
  let aviso = formularioModal.querySelector('.form-aviso-sincro');
  if (aviso === null) {
    aviso = document.createElement('p');
    aviso.className = 'form-aviso-sincro';
    const lineaError = formularioModal.querySelector('.form-error');
    if (lineaError !== null) {
      formularioModal.insertBefore(aviso, lineaError);
    } else {
      formularioModal.appendChild(aviso);
    }
  }
  aviso.textContent = texto;
}

/* ----- TOASTS de sincronización (NO bloquean nada) -----
   Mensajitos flotantes abajo a la derecha: guardado en la hoja,
   la hoja no respondió, otro usuario actualizó el docente…
   Cada toast se quita solo a los ~4 segundos. */
function mostrarToast(texto: string, esError: boolean = false): void {
  let contenedor = document.querySelector('.sincro-contenedor');
  if (contenedor === null) {
    contenedor = document.createElement('div');
    contenedor.className = 'sincro-contenedor';
    document.body.appendChild(contenedor);
  }
  const toast = document.createElement('div');
  toast.className = 'sincro-toast' + (esError ? ' sincro-toast-error' : '');
  toast.textContent = texto;
  contenedor.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add('sincro-toast-salida');
  }, 3400);
  window.setTimeout(() => {
    toast.remove();
  }, 3900);
}

/* ----- ANIMACIÓN DE CARGA que BLOQUEA la pantalla -----
   Se usa en las operaciones que ESCRIBEN en Firebase (guardar,
   eliminar, archivar/restaurar) y en las acciones de la hoja:
   mientras dura la operación, un spinner tapa TODA la
   aplicación (por encima incluso del modal) y NINGÚN clic llega
   a la vista. El contador permite llamadas anidadas sin que la
   primera cierre la animación de la segunda. */
let cargandoFondo: HTMLDivElement | null = null;
let cargandoPendientes = 0; // operaciones en curso

/** Muestra el spinner con el mensaje indicado y bloquea los
 *  clics hasta que se llame a ocultarCargando(). */
function mostrarCargando(mensaje: string): void {
  cargandoPendientes += 1;
  if (cargandoFondo === null) {
    cargandoFondo = document.createElement('div');
    cargandoFondo.className = 'cargando-fondo';
    cargandoFondo.setAttribute('role', 'alert');
    cargandoFondo.setAttribute('aria-live', 'assertive');

    const tarjeta = document.createElement('div');
    tarjeta.className = 'cargando-tarjeta';
    const spinner = document.createElement('div');
    spinner.className = 'cargando-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    const texto = document.createElement('p');
    texto.className = 'cargando-texto';
    tarjeta.append(spinner, texto);
    cargandoFondo.appendChild(tarjeta);
    document.body.appendChild(cargandoFondo);
  }
  const texto = cargandoFondo.querySelector('.cargando-texto');
  if (texto !== null) texto.textContent = mensaje;
}

/** Cierra la animación de carga cuando ya NO queda ninguna
 *  operación pendiente (desbloquea los clics). */
function ocultarCargando(): void {
  if (cargandoPendientes > 0) cargandoPendientes -= 1;
  if (cargandoPendientes === 0 && cargandoFondo !== null) {
    cargandoFondo.remove();
    cargandoFondo = null;
  }
}

/* ============================================================
  SECCIÓN 8 · SINCRONIZACIÓN, PINTADO Y ACCIONES (NO EDITAR)
============================================================ */

/* ----- ESQUELETO DE CARGA del listado -----
   Solo se usa la PRIMERA vez en un navegador (sin caché): el
   listado se llena con filas grises animadas (misma rejilla que
   las filas reales) hasta que llega el primer aviso de
   Firestore. Con caché, la tabla entra AL INSTANTE. */
function pintarEsqueleto(lista: HTMLElement): void {
  lista.textContent = '';
  for (let fila = 0; fila < 6; fila += 1) {
    const esqueleto = document.createElement('div');
    esqueleto.className = 'esqueleto-fila';
    // 5 líneas = Nombre, DUI, NIP, Teléfono y Acciones.
    for (let columna = 0; columna < 5; columna += 1) {
      const linea = document.createElement('span');
      linea.className = 'esqueleto-linea';
      esqueleto.appendChild(linea);
    }
    lista.appendChild(esqueleto);
  }
}

/** Texto del resumen bajo el encabezado (activos · archivados). */
function pintarResumen(
  cantidadActivos: number | null = null,
  cantidadArchivados: number | null = null,
): void {
  if (contenedorVista === null) return;
  const resumen = contenedorVista.querySelector('#docentes-resumen');
  if (resumen === null) return;
  const activos =
    cantidadActivos ??
    docentesCargados.filter((d) => !booleanoSeguro(d.archivado)).length;
  const archivados =
    cantidadArchivados ??
    docentesCargados.filter((d) => booleanoSeguro(d.archivado)).length;
  resumen.textContent =
    activos +
    (activos === 1 ? ' docente' : ' docentes') +
    ' · ' +
    archivados +
    (archivados === 1 ? ' archivado' : ' archivados');
}

/** Repinta resumen, listado y archivados desde docentesCargados
 *  SIN leer nada del servidor (cero consultas). Es el pintado
 *  inicial (caché/estado) y el de la lectura manual. */
function pintarDesdeEstado(): void {
  if (contenedorVista === null) return;

  const lista = contenedorVista.querySelector<HTMLElement>('#docentes-lista');
  const cuerpoArchivados = contenedorVista.querySelector<HTMLElement>(
    '#docentes-archivados-cuerpo',
  );
  if (lista === null || cuerpoArchivados === null) return;

  const activos = ordenarDocentes(
    docentesCargados.filter((d) => !booleanoSeguro(d.archivado)),
  );
  const archivados = ordenarDocentes(
    docentesCargados.filter((d) => booleanoSeguro(d.archivado)),
  );
  pintarResumen(activos.length, archivados.length);

  lista.textContent = '';
  if (activos.length === 0) {
    const vacio = document.createElement('p');
    vacio.className = 'docentes-vacio';
    vacio.textContent = 'No hay docentes registrados.';
    lista.appendChild(vacio);
  } else {
    for (const docente of activos) {
      lista.appendChild(crearFilaDocente(docente, false));
    }
  }

  cuerpoArchivados.textContent = '';
  if (archivados.length === 0) {
    const vacio = document.createElement('p');
    vacio.className = 'docentes-vacio';
    vacio.textContent = 'No hay docentes archivados.';
    cuerpoArchivados.appendChild(vacio);
  } else {
    for (const docente of archivados) {
      cuerpoArchivados.appendChild(crearFilaDocente(docente, true));
    }
  }
}

/* ----- CAMBIOS GRANULARES: se toca SOLO la fila cambiada ----- */

/** Inserta una fila en su lugar correcto (admin primero, luego
 *  A-Z por nombre). Si la zona tenía el mensaje de vacío, lo
 *  quita para dejar entrar los datos. */
function insertarFilaOrdenada(contenedor: HTMLElement, fila: HTMLElement): void {
  const mensajeVacio = contenedor.querySelector('.docentes-vacio');
  if (mensajeVacio !== null) mensajeVacio.remove();

  const esAdminNuevo = fila.dataset.admin === '1';
  const nombreNuevo = fila.dataset.nombre ?? '';
  const filas: HTMLElement[] = Array.from(contenedor.children).filter(
    (elemento): elemento is HTMLElement =>
      elemento instanceof HTMLElement &&
      elemento.classList.contains('docentes-fila'),
  );
  for (const existente of filas) {
    const esAdminExistente = existente.dataset.admin === '1';
    if (esAdminNuevo && !esAdminExistente) {
      contenedor.insertBefore(fila, existente);
      return;
    }
    if (
      esAdminNuevo === esAdminExistente &&
      (existente.dataset.nombre ?? '').localeCompare(nombreNuevo, 'es') > 0
    ) {
      contenedor.insertBefore(fila, existente);
      return;
    }
  }
  contenedor.appendChild(fila);
}

/** Mensaje de vacío si una zona se quedó sin filas. */
function asegurarMensajeVacio(contenedor: HTMLElement | null): void {
  if (contenedor === null) return;
  if (contenedor.querySelector('.docentes-fila') !== null) return;
  const vacio = document.createElement('p');
  vacio.className = 'docentes-vacio';
  vacio.textContent =
    contenedor.id === 'docentes-lista'
      ? 'No hay docentes registrados.'
      : 'No hay docentes archivados.';
  contenedor.textContent = '';
  contenedor.appendChild(vacio);
}

/** Busca la fila del docente (en activos o en archivados). */
function buscarFila(id: string): HTMLElement | null {
  if (contenedorVista === null) return null;
  const selector =
    '#docentes-lista [data-id="' +
    CSS.escape(id) +
    '"], #docentes-archivados-cuerpo [data-id="' +
    CSS.escape(id) +
    '"]';
  const fila = contenedorVista.querySelector(selector);
  return fila instanceof HTMLElement ? fila : null;
}

/** Quita la fila del docente eliminado y deja el mensaje de
 *  vacío si su zona se quedó sin filas. */
function quitarFilaDelListado(id: string): void {
  const fila = buscarFila(id);
  if (fila === null) return;
  const contenedor = fila.parentElement;
  fila.remove();
  asegurarMensajeVacio(contenedor);
}

/** Refresca SOLO la fila del docente que cambió: si sigue en la
 *  misma zona se reemplaza en su lugar; si pasó de activo a
 *  archivado (o al revés) se quita de la vieja y se inserta
 *  ordenada en la nueva. Si no existía, se agrega. */
function actualizarFilaEnListado(docenteNuevo: Docente): void {
  if (contenedorVista === null) return;
  const lista = contenedorVista.querySelector<HTMLElement>('#docentes-lista');
  const cuerpoArchivados = contenedorVista.querySelector<HTMLElement>(
    '#docentes-archivados-cuerpo',
  );
  if (lista === null || cuerpoArchivados === null) return;

  const activo = !booleanoSeguro(docenteNuevo.archivado);
  const destino = activo ? lista : cuerpoArchivados;
  const filaVieja = buscarFila(docenteNuevo.id);
  const filaNueva = crearFilaDocente(docenteNuevo, !activo);

  if (filaVieja === null) {
    insertarFilaOrdenada(destino, filaNueva);
    return;
  }
  const estabaActiva = filaVieja.closest('#docentes-lista') !== null;
  if (estabaActiva === activo) {
    filaVieja.replaceWith(filaNueva);
  } else {
    filaVieja.remove();
    insertarFilaOrdenada(destino, filaNueva);
    asegurarMensajeVacio(estabaActiva ? lista : cuerpoArchivados);
  }
}

/* ----- SINCRONIZACIÓN EN VIVO DEL MODAL ABIERTO -----
   Otro usuario editó el docente que está abierto en el modal:
   el modal NO se cierra y NO se recarga. Se llenan SOLO los
   campos que cambiaron y se respeta el campo que la persona
   está escribiendo en ese momento (no se pisa lo tecleado). */
function sincronizarModalCon(docenteNuevo: Docente): void {
  if (controlesModal === null || formularioModal === null) return;
  const activo = document.activeElement;

  const textos: [string, string][] = [
    ['nombre', textoSeguro(docenteNuevo.nombre)],
    ['dui', formatearDUI(textoSeguro(docenteNuevo.dui))],
    ['nip', textoSeguro(docenteNuevo.nip) || docenteNuevo.id],
    ['fecha', textoSeguro(docenteNuevo.fechaNacimiento)],
    ['especialidad', textoSeguro(docenteNuevo.especialidad)],
    ['telefono', textoSeguro(docenteNuevo.telefono)],
    ['anios', textoSeguro(docenteNuevo.aniosServicio)],
    [
      'correo',
      textoSeguro(docenteNuevo.correo).replace(/@clases\.edu\.sv$/i, ''),
    ],
  ];
  for (const [clave, valor] of textos) {
    const control = controlesModal[clave];
    if (!(control instanceof HTMLInputElement)) continue;
    if (control === activo) continue; // el usuario está escribiendo aquí
    if (control.value !== valor) control.value = valor;
  }

  const listas: [string, string][] = [
    ['nivel', textoSeguro(docenteNuevo.nivel)],
    ['rol', rolDocente(docenteNuevo)],
  ];
  for (const [clave, valor] of listas) {
    const control = controlesModal[clave];
    if (!(control instanceof HTMLSelectElement)) continue;
    if (control === activo) continue;
    if (control.value !== valor) control.value = valor;
  }

  // Grados: quedan marcados EXACTAMENTE los que trae el servidor.
  const marcados = listaSegura(docenteNuevo.gradosAsignados);
  const casillas = formularioModal.querySelectorAll('input[name="grados"]');
  casillas.forEach((casilla) => {
    if (casilla instanceof HTMLInputElement) {
      casilla.checked = marcados.includes(casilla.value);
    }
  });

  avisarSincroModal(
    'Este docente se actualizó en otro equipo: los campos libres se ' +
      'llenaron con los cambios guardados (no se cerró el modal).',
  );
}

/** Llega un aviso de Firestore: se actualiza el estado y la
 *  caché y se toca SOLO lo que cambió (filas y, si está abierto,
 *  el modal del docente). Sin recargar la vista. */
function aplicarSnapshot(lista: DocenteHoja[], cambios: CambioDocente[]): void {
  docentesCargados.length = 0;
  for (const elemento of lista) {
    docentesCargados.push(elemento as unknown as Docente);
  }
  guardarCache(lista);

  // Primera emisión: pinta TODO (por si la caché estaba vieja).
  if (primeraEmision) {
    primeraEmision = false;
    pintarDesdeEstado();
    return;
  }
  if (cambios.length === 0) return;

  for (const cambio of cambios) {
    if (cambio.tipo === 'eliminado') {
      const esEcoPropio =
        cambio.id === ecoPropio.id && Date.now() - ecoPropio.fecha < 4000;
      quitarFilaDelListado(cambio.id);
      // Si el docente eliminado estaba abierto en el modal, aquí
      // SÍ se cierra (el docente ya no existe) con un aviso.
      if (
        docenteEnModal !== null &&
        docenteEnModal.id === cambio.id &&
        !esEcoPropio
      ) {
        cerrarModal();
        mostrarToast('Este docente fue eliminado por otro usuario', true);
      }
    } else if (cambio.datos !== null) {
      const docenteNuevo = cambio.datos as unknown as Docente;
      actualizarFilaEnListado(docenteNuevo);
      if (docenteEnModal !== null && docenteEnModal.id === cambio.id) {
        const esEcoPropio =
          cambio.id === ecoPropio.id && Date.now() - ecoPropio.fecha < 4000;
        // El modal queda con los datos más frescos para "Guardar".
        docenteEnModal = docenteNuevo;
        if (!esEcoPropio) {
          sincronizarModalCon(docenteNuevo);
        }
      }
    }
  }
  pintarResumen();
}

/** Al salir de Docentes (el hash deja de ser #/docentes) se
 *  corta la escucha para no mantenerla abierta de vano. */
function salirDeDocentes(): void {
  if (window.location.hash === '#/docentes') return;
  if (desuscripcionSnapshot !== null) {
    desuscripcionSnapshot();
    desuscripcionSnapshot = null;
  }
  window.removeEventListener('hashchange', salirDeDocentes);
}

/** Lectura MANUAL completa (botón "Actualizar"). La vista normal
 *  ya NO la necesita (caché + snapshot la reemplazan), pero
 *  queda para forzar una recarga a mano. */
async function cargarDocentes(): Promise<void> {
  if (contenedorVista === null) return;

  const lista = contenedorVista.querySelector<HTMLElement>('#docentes-lista');
  const cuerpoArchivados = contenedorVista.querySelector<HTMLElement>(
    '#docentes-archivados-cuerpo',
  );
  if (lista === null || cuerpoArchivados === null) return;

  // Esqueleto animado mientras Firebase responde.
  if (lista instanceof HTMLElement) pintarEsqueleto(lista);
  cuerpoArchivados.textContent = '';

  try {
    const snapshot = await getDocs(collection(db, COLECCION_DOCENTES));

    // Caché COMPLETA (incluye archivados) para las validaciones.
    docentesCargados.length = 0;
    for (const documento of snapshot.docs) {
      // El id va AL FINAL para que nunca lo pise un campo 'id'
      // que pudiera venir dentro del documento.
      docentesCargados.push({
        ...documento.data(),
        id: documento.id,
      } as unknown as Docente);
    }
    guardarCache(
      docentesCargados.map((d) => ({ ...d, id: d.id }) as DocenteHoja),
    );
  } catch (fallo) {
    console.error(fallo);
    lista.textContent =
      'No se pudieron cargar los docentes. Revisa tu conexión e intenta de nuevo.';
    return;
  }

  pintarDesdeEstado();
}

/* ----- ESPEJO EN LA HOJA DE CÁLCULO (botones del admin) ----- */

/** Botón "Probar conexión": comprueba que el Apps Script
 *  responde con la URL y el token configurados. */
async function probarConexion(): Promise<void> {
  if (!sheetConfigurado()) {
    mostrarAviso(
      'Conexión pendiente',
      'Pega la URL y el token del Apps Script en ' +
        'src/servicios/sincronizacionDocentes.ts (SECCIÓN 2 · EDITA AQUÍ).',
    );
    return;
  }
  mostrarCargando('Probando conexión con la hoja…');
  const ok = await probarConexionSheet();
  ocultarCargando();
  mostrarAviso(
    ok ? 'Conexión correcta' : 'Sin respuesta',
    ok
      ? 'El Apps Script respondió bien: la hoja "DB Docentes" está lista para guardar.'
      : 'La hoja no respondió. Revisa la URL (/exec), el token y que el despliegue de la Aplicación web esté vigente.',
  );
}

/** Botón "Pasar Firebase al Sheet": copia TODOS los docentes que
 *  ya existen en Firebase a la pestaña Docentes de la hoja
 *  (reemplaza las filas de la pestaña). */
async function pasarAlSheet(): Promise<void> {
  if (!sheetConfigurado()) {
    mostrarAviso(
      'Conexión pendiente',
      'Pega la URL y el token del Apps Script en ' +
        'src/servicios/sincronizacionDocentes.ts (SECCIÓN 2 · EDITA AQUÍ).',
    );
    return;
  }
  if (docentesCargados.length === 0) {
    mostrarAviso(
      'Nada que pasar',
      'Aún no hay docentes cargados en esta sesión. Pulsa "Actualizar" e intenta de nuevo.',
    );
    return;
  }
  mostrarCargando('Pasando docentes a la hoja…');
  const lista = docentesCargados.map((d) => ({ ...d, id: d.id }) as DocenteHoja);
  const ok = await migrarDocentesAlSheet(lista);
  ocultarCargando();
  mostrarAviso(
    ok ? 'Listo' : 'Sin respuesta',
    ok
      ? 'Los ' +
        docentesCargados.length +
        ' docentes se copiaron a la pestaña "Docentes" de la hoja.'
      : 'La hoja no respondió. Revisa la URL (/exec), el token y el despliegue de la Aplicación web.',
  );
}

/* ============================================================
  SECCIÓN 9 · GUARDAR, ELIMINAR Y ARCHIVAR (NO EDITAR)
  Cada escritura: 1) anti-eco, 2) Firestore, 3) copia a la hoja.
  La tabla se actualiza SOLA con el snapshot: ya no se recarga.
============================================================ */

/** Guarda (crea o edita) validando nombre, DUI, NIP, rol y correo.
 *  El ID del documento es el NIP (en edición se respeta el ID
 *  original del documento). */
async function guardarDocente(
  formulario: HTMLFormElement,
  docente: Docente | null,
  lineaError: HTMLElement,
  boton: HTMLButtonElement,
): Promise<void> {
  lineaError.textContent = '';

  const nombre = formulario.querySelector(
    '#docente-nombre',
  ) as HTMLInputElement | null;
  const dui = formulario.querySelector(
    '#docente-dui',
  ) as HTMLInputElement | null;
  const nip = formulario.querySelector(
    '#docente-nip',
  ) as HTMLInputElement | null;
  const fecha = formulario.querySelector(
    '#docente-fecha',
  ) as HTMLInputElement | null;
  const seleccionRol = formulario.querySelector(
    '#docente-rol',
  ) as HTMLSelectElement | null;
  const seleccionNivel = formulario.querySelector(
    '#docente-nivel',
  ) as HTMLSelectElement | null;
  const especialidad = formulario.querySelector(
    '#docente-especialidad',
  ) as HTMLInputElement | null;
  const telefono = formulario.querySelector(
    '#docente-telefono',
  ) as HTMLInputElement | null;
  const anios = formulario.querySelector(
    '#docente-anios',
  ) as HTMLInputElement | null;
  const correoLocal = formulario.querySelector(
    '#docente-correo',
  ) as HTMLInputElement | null;

  if (
    nombre === null ||
    dui === null ||
    nip === null ||
    fecha === null ||
    seleccionNivel === null ||
    especialidad === null ||
    telefono === null ||
    anios === null ||
    seleccionRol === null ||
    correoLocal === null
  ) {
    lineaError.textContent = 'No se pudieron leer todos los campos.';
    return;
  }

  const nombreFinal = nombre.value.trim();
  if (nombreFinal === '') {
    lineaError.textContent = 'Escribe el nombre del docente.';
    return;
  }

  const duiFinal = dui.value;
  if (!/^\d{8}-\d$/.test(duiFinal)) {
    lineaError.textContent =
      'El DUI debe tener 8 dígitos, el guion y el dígito verificador.';
    return;
  }

  const nipFinal = nip.value.trim();
  if (!/^\d+$/.test(nipFinal)) {
    lineaError.textContent = 'El NIP solo puede contener dígitos.';
    return;
  }
  const nipOcupado = docentesCargados.some(
    (d) =>
      (d.id === nipFinal || textoSeguro(d.nip) === nipFinal) &&
      d.id !== (docente?.id ?? ''),
  );
  if (nipOcupado) {
    lineaError.textContent = 'Ese NIP ya pertenece a otro docente.';
    return;
  }

  // Nivel: SIEMPRE debe quedar elegido (1 o 2).
  const nivelFinal = seleccionNivel.value;
  if (nivelFinal !== '1' && nivelFinal !== '2') {
    lineaError.textContent = 'Selecciona el nivel (1 o 2).';
    return;
  }

  // Los demás campos pueden quedar vacíos: si no existen en
  // Firebase, la vista los muestra en blanco.
  const especialidadFinal = especialidad.value.trim();
  const telefonoFinal = telefono.value; // ya llega solo con dígitos
  const aniosFinal = anios.value; // ya llega solo con dígitos

  const rolFinal = seleccionRol.value;
  if (rolFinal === 'admin' && hayOtroAdmin(docente?.id ?? '')) {
    lineaError.textContent =
      'Ya existe un docente con rol Admin. Solo puede haber uno.';
    return;
  }

  const parteLocal = correoLocal.value.trim();
  const correoFinal =
    parteLocal === '' ? '' : parteLocal + DOMINIO_CORREO;

  // Grados marcados en las fichas (checkbox).
  const gradosMarcados: string[] = [];
  const marcados = formulario.querySelectorAll('input[name="grados"]:checked');
  marcados.forEach((casilla) => {
    if (casilla instanceof HTMLInputElement) gradosMarcados.push(casilla.value);
  });

  const datos = {
    nombre: nombreFinal,
    dui: duiFinal,
    nip: nipFinal,
    fechaNacimiento: fecha.value,
    nivel: nivelFinal,
    especialidad: especialidadFinal,
    telefono: telefonoFinal,
    aniosServicio: aniosFinal,
    gradosAsignados: gradosMarcados,
    archivado: docente !== null ? booleanoSeguro(docente.archivado) : false,
    rol: rolFinal,
    // rol2 es el campo que el inicio de sesión lee para reconocer
    // al admin: SIEMPRE se escribe ('admin' solo si lo es, '' si
    // no) para que el auth nunca pierda el rol admin.
    rol2: rolFinal === 'admin' ? 'admin' : '',
    correo: correoFinal,
  };

  boton.disabled = true;
  mostrarCargando('Guardando cambios…');
  try {
    const idDocumento = docente !== null ? docente.id : nipFinal;
    // Anti-eco: el snapshot de ESTA escritura propia no debe
    // tocar el formulario ni avisar como si fuera otro usuario.
    ecoPropio.id = idDocumento;
    ecoPropio.fecha = Date.now();
    await setDoc(doc(db, COLECCION_DOCENTES, idDocumento), datos);
    cerrarModal();
    // La tabla se actualiza SOLA con el snapshot (sin recargar).
    // Copia del docente a la HOJA DE CÁLCULO (Apps Script).
    void enviarDocenteAlSheet({ id: idDocumento, ...datos }).then(
      (guardadoEnHoja) => {
        if (guardadoEnHoja) {
          mostrarToast('Docente guardado también en la hoja de cálculo');
        } else if (sheetConfigurado()) {
          mostrarToast(
            'La hoja de cálculo no respondió (Firebase sí guardó el docente)',
            true,
          );
        }
      },
    );
  } catch (fallo) {
    lineaError.textContent =
      'No se pudo guardar. Revisa tu conexión e intenta de nuevo.';
    console.error(fallo);
  } finally {
    ocultarCargando();
    boton.disabled = false;
  }
}

/** Borra el documento de Firebase tras confirmar en un modal. */
function eliminarDocente(docente: Docente): void {
  const icono = document.createElement('div');
  icono.className = 'confirmar-icono';
  icono.innerHTML = ICONOS.eliminar; // SOLO SVG

  const aviso = document.createElement('p');
  aviso.className = 'confirmar-aviso';
  aviso.textContent =
    '¿Eliminar a ' +
    (textoSeguro(docente.nombre) || 'este docente') +
    '? Esta acción borra el documento de Firebase y no se puede deshacer.';

  const lineaError = crearLineaError();
  const pie = document.createElement('div');
  pie.className = 'modal-pie';
  pie.append(
    crearBotonPie('boton-secundario', 'Cancelar', cerrarModal),
    crearBotonPie('boton-peligro', 'Eliminar', () => {
      void confirmarEliminar(docente, lineaError);
    }),
  );

  const formulario = document.createElement('form');
  formulario.className = 'modal-formulario modal-confirmar';
  formulario.append(icono, aviso, lineaError, pie);
  abrirModal('Eliminar docente', [formulario]);
}

async function confirmarEliminar(
  docente: Docente,
  lineaError: HTMLElement,
): Promise<void> {
  lineaError.textContent = '';
  // Animación de carga: bloquea los clics mientras se borra.
  mostrarCargando('Eliminando docente…');
  try {
    // Anti-eco antes de borrar.
    ecoPropio.id = docente.id;
    ecoPropio.fecha = Date.now();
    await deleteDoc(doc(db, COLECCION_DOCENTES, docente.id));
    cerrarModal();
    // La fila sale SOLA con el snapshot (sin recargar).
    // La fila del docente también se borra de la HOJA.
    void enviarEliminacionAlSheet(docente.id).then((borradoEnHoja) => {
      if (borradoEnHoja) {
        mostrarToast('Fila borrada también de la hoja de cálculo');
      } else if (sheetConfigurado()) {
        mostrarToast(
          'La hoja de cálculo no respondió (Firebase sí eliminó el docente)',
          true,
        );
      }
    });
  } catch (fallo) {
    lineaError.textContent = 'No se pudo eliminar. Intenta de nuevo.';
    console.error(fallo);
  } finally {
    ocultarCargando();
  }
}

/** Archiva o restaura (merge: no toca los demás campos). La
 *  animación de carga bloquea los clics mientras Firebase
 *  responde, así no se archiva dos veces por doble clic. */
async function archivarDocente(
  docente: Docente,
  archivado: boolean,
): Promise<void> {
  mostrarCargando(
    archivado ? 'Archivando docente…' : 'Restaurando docente…',
  );
  try {
    // Anti-eco antes de escribir.
    ecoPropio.id = docente.id;
    ecoPropio.fecha = Date.now();
    await setDoc(
      doc(db, COLECCION_DOCENTES, docente.id),
      { archivado },
      { merge: true },
    );
    // La fila se mueve SOLA de zona con el snapshot.
    // La hoja recibe SOLO el cambio parcial (columna Archivado).
    void enviarDocenteAlSheet({ id: docente.id, archivado }).then(
      (guardadoEnHoja) => {
        if (guardadoEnHoja) {
          mostrarToast('Estado actualizado también en la hoja de cálculo');
        } else if (sheetConfigurado()) {
          mostrarToast(
            'La hoja de cálculo no respondió (Firebase sí actualizó el docente)',
            true,
          );
        }
      },
    );
  } catch (fallo) {
    console.error(fallo);
    mostrarAviso(
      'Error',
      archivado
        ? 'No se pudo archivar al docente. Intenta de nuevo.'
        : 'No se pudo restaurar al docente. Intenta de nuevo.',
    );
  } finally {
    ocultarCargando();
  }
}

/* ============================================================
  SECCIÓN 10 · FORMULARIO DEL MODAL (NO EDITAR)
============================================================ */

/** Campo del formulario: etiqueta + control. anchoCompleto hace
 *  que el campo ocupe las dos columnas de la rejilla. */
function crearCampo(
  textoRotulo: string,
  idControl: string,
  control: HTMLElement,
  anchoCompleto: boolean = false,
): HTMLElement {
  const campo = document.createElement('div');
  campo.className =
    'docentes-campo' + (anchoCompleto ? ' campo-completo' : '');
  const rotulo = document.createElement('label');
  rotulo.className = 'docentes-rotulo';
  rotulo.htmlFor = idControl;
  rotulo.textContent = textoRotulo;
  campo.append(rotulo, control);
  return campo;
}

/** Abre el modal con el formulario, estructurado en cuatro grupos:
 *  Datos personales · Datos laborales · Acceso y permisos ·
 *  Grados asignados. Si docente es null es "Agregar docente";
 *  si no, "Editar". El modal queda REGISTRADO para la
 *  sincronización en vivo: si otro usuario cambia este docente,
 *  se llenan solo los campos que cambiaron sin cerrar el modal. */
function abrirModalFormulario(docente: Docente | null): void {
  const esEdicion = docente !== null;
  const marcados = listaSegura(docente?.gradosAsignados);

  // --- Controles sueltos (ids que usa guardarDocente) ---

  const nombre = document.createElement('input');
  nombre.className = 'docentes-entrada';
  nombre.id = 'docente-nombre';
  nombre.type = 'text';
  nombre.placeholder = 'Nombre completo';
  nombre.value = textoSeguro(docente?.nombre);

  const dui = document.createElement('input');
  dui.className = 'docentes-entrada';
  dui.id = 'docente-dui';
  dui.type = 'text';
  dui.maxLength = 10;
  dui.inputMode = 'numeric';
  dui.placeholder = '00000000-0';
  dui.value = formatearDUI(textoSeguro(docente?.dui));
  dui.addEventListener('input', () => {
    dui.value = formatearDUI(dui.value);
  });

  const nip = document.createElement('input');
  nip.className = 'docentes-entrada';
  nip.id = 'docente-nip';
  nip.type = 'text';
  nip.inputMode = 'numeric';
  nip.placeholder = 'Solo números';
  nip.value = textoSeguro(docente?.nip) || docente?.id || '';
  // SOLO NÚMEROS: cada tecla se filtra.
  nip.addEventListener('input', () => {
    nip.value = soloDigitos(nip.value);
  });
  if (esEdicion) nip.disabled = true;

  const fecha = document.createElement('input');
  fecha.className = 'docentes-entrada';
  fecha.id = 'docente-fecha';
  fecha.type = 'date';
  fecha.value = textoSeguro(docente?.fechaNacimiento);

  // Nivel: select con 1 y 2. Si el documento aún no guarda nivel
  // queda vacío (en blanco) hasta que se elija.
  const seleccionNivel = document.createElement('select');
  seleccionNivel.className = 'docentes-entrada';
  seleccionNivel.id = 'docente-nivel';
  const opcionVacia = document.createElement('option');
  opcionVacia.value = '';
  opcionVacia.textContent = 'Selecciona un nivel…';
  seleccionNivel.appendChild(opcionVacia);
  for (const nivel of NIVELES_DOCENTE) {
    const opcionNivel = document.createElement('option');
    opcionNivel.value = nivel;
    opcionNivel.textContent = 'Nivel ' + nivel;
    seleccionNivel.appendChild(opcionNivel);
  }
  seleccionNivel.value = textoSeguro(docente?.nivel);

  const especialidad = document.createElement('input');
  especialidad.className = 'docentes-entrada';
  especialidad.id = 'docente-especialidad';
  especialidad.type = 'text';
  especialidad.maxLength = 60;
  especialidad.placeholder = 'Ej. Matemática, Lenguaje…';
  especialidad.value = textoSeguro(docente?.especialidad);

  const telefono = document.createElement('input');
  telefono.className = 'docentes-entrada';
  telefono.id = 'docente-telefono';
  telefono.type = 'text';
  telefono.inputMode = 'numeric';
  telefono.maxLength = TELEFONO_MAX_DIGITOS;
  telefono.placeholder = 'Solo números, sin guion';
  telefono.value = textoSeguro(docente?.telefono);
  // SOLO NÚMEROS y SIN GUION: cada tecla se filtra.
  telefono.addEventListener('input', () => {
    telefono.value = soloDigitos(telefono.value, TELEFONO_MAX_DIGITOS);
  });

  const aniosServicio = document.createElement('input');
  aniosServicio.className = 'docentes-entrada';
  aniosServicio.id = 'docente-anios';
  aniosServicio.type = 'text';
  aniosServicio.inputMode = 'numeric';
  aniosServicio.maxLength = ANIOS_MAX_DIGITOS;
  aniosServicio.placeholder = 'Solo números';
  aniosServicio.value = textoSeguro(docente?.aniosServicio);
  // SOLO NÚMEROS: cada tecla se filtra.
  aniosServicio.addEventListener('input', () => {
    aniosServicio.value = soloDigitos(aniosServicio.value, ANIOS_MAX_DIGITOS);
  });

  const seleccionRol = document.createElement('select');
  seleccionRol.className = 'docentes-entrada';
  seleccionRol.id = 'docente-rol';
  seleccionRol.name = 'rol';
  for (const rol of ROLES_DOCENTE) {
    const opcionRol = document.createElement('option');
    opcionRol.value = rol;
    opcionRol.textContent =
      rol.charAt(0).toUpperCase() + rol.slice(1);
    // Si ya existe otro admin, la opción Admin se deshabilita
    // (al editar al propio admin sigue disponible).
    if (rol === 'admin' && hayOtroAdmin(docente?.id ?? '')) {
      opcionRol.disabled = true;
      opcionRol.textContent = 'Admin (ya existe)';
    }
    seleccionRol.appendChild(opcionRol);
  }
  // Valor inicial: rol EFECTIVO (rol2 'admin' prevalece sobre rol).
  seleccionRol.value = docente !== null ? rolDocente(docente) : 'profesor';

  const campoCorreo = document.createElement('div');
  campoCorreo.className = 'campo-correo';
  const correoLocal = document.createElement('input');
  correoLocal.className = 'campo-correo-entrada';
  correoLocal.id = 'docente-correo';
  correoLocal.name = 'correoLocal';
  correoLocal.type = 'text';
  correoLocal.placeholder = 'nombre.apellido';
  correoLocal.autocomplete = 'off';
  correoLocal.spellcheck = false;
  const dominioCorreo = document.createElement('span');
  dominioCorreo.className = 'campo-correo-dominio';
  dominioCorreo.textContent = DOMINIO_CORREO;
  campoCorreo.append(correoLocal, dominioCorreo);

  // Valor inicial: correo guardado (sin dominio) o generado.
  correoLocal.value =
    textoSeguro(docente?.correo).replace(/@clases\.edu\.sv$/i, '') ||
    generarCorreoLocal(textoSeguro(docente?.nombre));

  // Al escribir el nombre, la parte local se vuelve a formar sola.
  nombre.addEventListener('input', () => {
    correoLocal.value = generarCorreoLocal(nombre.value);
  });

  // --- Grupo 1: Datos personales ---
  const grupoDatos = document.createElement('div');
  grupoDatos.className = 'form-grupo';
  const tituloDatos = document.createElement('p');
  tituloDatos.className = 'form-grupo-titulo';
  tituloDatos.textContent = 'Datos personales';
  const rejillaDatos = document.createElement('div');
  rejillaDatos.className = 'form-rejilla';
  rejillaDatos.append(
    crearCampo('Nombre', 'docente-nombre', nombre, true),
    crearCampo('DUI', 'docente-dui', dui),
    crearCampo('NIP', 'docente-nip', nip),
    crearCampo('Fecha de nacimiento', 'docente-fecha', fecha),
    crearCampo('Nivel', 'docente-nivel', seleccionNivel),
    crearCampo('Especialidad', 'docente-especialidad', especialidad, true),
  );
  grupoDatos.append(tituloDatos, rejillaDatos);

  // --- Grupo 2: Datos laborales ---
  const grupoLaboral = document.createElement('div');
  grupoLaboral.className = 'form-grupo';
  const tituloLaboral = document.createElement('p');
  tituloLaboral.className = 'form-grupo-titulo';
  tituloLaboral.textContent = 'Datos laborales';
  const rejillaLaboral = document.createElement('div');
  rejillaLaboral.className = 'form-rejilla';
  rejillaLaboral.append(
    crearCampo('Teléfono', 'docente-telefono', telefono),
    crearCampo('Años de servicio', 'docente-anios', aniosServicio),
  );
  grupoLaboral.append(tituloLaboral, rejillaLaboral);

  // --- Grupo 3: Acceso y permisos ---
  const grupoAcceso = document.createElement('div');
  grupoAcceso.className = 'form-grupo';
  const tituloAcceso = document.createElement('p');
  tituloAcceso.className = 'form-grupo-titulo';
  tituloAcceso.textContent = 'Acceso y permisos';
  const rejillaAcceso = document.createElement('div');
  rejillaAcceso.className = 'form-rejilla';
  rejillaAcceso.append(
    crearCampo('Rol', 'docente-rol', seleccionRol),
    crearCampo('Correo', 'docente-correo', campoCorreo, true),
  );
  grupoAcceso.append(tituloAcceso, rejillaAcceso);

  // --- Grupo 4: Grados asignados (fichas con checkbox) ---
  const grupoGrados = document.createElement('div');
  grupoGrados.className = 'form-grupo';
  const tituloGrados = document.createElement('p');
  tituloGrados.className = 'form-grupo-titulo';
  tituloGrados.textContent = 'Grados asignados';
  const casillas = document.createElement('div');
  casillas.className = 'docentes-grados';
  for (const etiqueta of GRADOS) {
    const opcion = document.createElement('label');
    opcion.className = 'docentes-opcion';
    const casilla = document.createElement('input');
    casilla.type = 'checkbox';
    casilla.name = 'grados';
    casilla.value = etiqueta;
    casilla.checked = marcados.includes(etiqueta);
    const rotulo = document.createElement('span');
    rotulo.textContent = etiqueta;
    opcion.append(casilla, rotulo);
    casillas.appendChild(opcion);
  }
  grupoGrados.append(tituloGrados, casillas);

  // --- Pie: error + Cancelar + Guardar ---
  const lineaError = crearLineaError();
  const pie = document.createElement('div');
  pie.className = 'modal-pie';
  pie.appendChild(
    crearBotonPie('boton-secundario', 'Cancelar', cerrarModal),
  );
  // Botón Guardar SOLAMENTE dispara el submit del formulario
  // (nunca un click propio), así el guardado no se ejecuta dos veces.
  const botonGuardar = document.createElement('button');
  botonGuardar.type = 'submit';
  botonGuardar.className = 'boton-primario';
  botonGuardar.textContent = 'Guardar';
  pie.appendChild(botonGuardar);

  const formulario = document.createElement('form');
  formulario.className = 'modal-formulario';
  formulario.append(
    grupoDatos,
    grupoLaboral,
    grupoAcceso,
    grupoGrados,
    lineaError,
    pie,
  );

  // El botón Guardar y la tecla Enter pasan por aquí.
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    void guardarDocente(formulario, docente, lineaError, botonGuardar);
  });

  // --- Registro del modal para la SINCRONIZACIÓN EN VIVO ---
  docenteEnModal = docente; // null en "Agregar" (no sincroniza)
  controlesModal = {
    nombre,
    dui,
    nip,
    fecha,
    nivel: seleccionNivel,
    especialidad,
    telefono,
    anios: aniosServicio,
    rol: seleccionRol,
    correo: correoLocal,
  };
  formularioModal = formulario;

  abrirModal(
    esEdicion ? 'Editar docente' : 'Agregar docente',
    [formulario],
  );
}

/** Modal de solo lectura con los datos del docente (sin el rol
 *  ni el estado de archivado). */
function verDocente(docente: Docente): void {
  // NOTA: el modal de VER no muestra el rol ni si está archivado
  // (eso se gestiona desde Editar). Los campos que el documento
  // aún no tenga quedan EN BLANCO.
  const filas: [string, string][] = [
    ['Nombre', textoSeguro(docente.nombre)],
    ['DUI', textoSeguro(docente.dui)],
    ['NIP', textoSeguro(docente.nip)],
    ['Fecha de nacimiento', formatearFecha(docente.fechaNacimiento)],
    ['Nivel', textoSeguro(docente.nivel)],
    ['Especialidad', textoSeguro(docente.especialidad)],
    ['Teléfono', textoSeguro(docente.telefono)],
    ['Años de servicio', textoSeguro(docente.aniosServicio)],
    ['Correo', textoSeguro(docente.correo)],
    ['Grados asignados', listaSegura(docente.gradosAsignados).join(', ')],
  ];

  // Si el documento guarda fecha de creación (creadoEn), se
  // muestra con fecha y hora de El Salvador (si no existe, la
  // fila no aparece).
  const registrado = formatearFechaHora(docente.creadoEn);
  if (registrado !== '') filas.push(['Registrado', registrado]);

  const detalles = document.createElement('div');
  detalles.className = 'modal-detalles';
  for (const [rotulo, valor] of filas) {
    const renglon = document.createElement('div');
    renglon.className = 'modal-detalle-fila';
    const clave = document.createElement('span');
    clave.className = 'modal-detalle-clave';
    clave.textContent = rotulo;
    const dato = document.createElement('span');
    dato.className = 'modal-detalle-valor';
    dato.textContent = valor; // en blanco si no existe el dato
    renglon.append(clave, dato);
    detalles.appendChild(renglon);
  }
  abrirModal('Información del docente', [detalles]);
}

/* ============================================================
  SECCIÓN 11 · LISTADO Y VISTA (NO EDITAR)
============================================================ */

/** Botón de acción con ICONO para las filas: title y aria-label
 *  llevan el nombre (accesibilidad); el color lo pone la clase. */
function crearBotonAccion(
  icono: string,
  texto: string,
  clase: string,
  accion: () => void,
): HTMLButtonElement {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'docentes-accion ' + clase;
  boton.title = texto;
  boton.setAttribute('aria-label', texto);
  boton.innerHTML = icono; // SOLO SVG
  boton.addEventListener('click', accion);
  return boton;
}

/** Fila del listado. En la vista principal SOLO se muestran
 *  Nombre, DUI, NIP y Teléfono; lo demás se ve al abrir el
 *  modal Ver/Editar. Archivadas muestran la ficha "Archivado"
 *  y solo dejan Ver, Restaurar y Eliminar. Si un dato falta,
 *  la celda queda en blanco. La fila lleva data-id / data-nombre
 *  / data-admin para que la sincronización en vivo la encuentre
 *  y la inserte en el orden correcto (admin primero, A-Z). */
function crearFilaDocente(docente: Docente, archivado: boolean): HTMLElement {
  const fila = document.createElement('div');
  fila.className = 'docentes-fila';
  fila.dataset.id = docente.id;
  fila.dataset.nombre = textoSeguro(docente.nombre);
  fila.dataset.admin = rolDocente(docente) === 'admin' ? '1' : '0';

  // SOLO 4 DATOS en la vista principal: lo demás vive en el
  // modal (Ver/Editar). Si un dato falta, la celda queda en blanco.
  const celdas: [string, boolean][] = [
    [textoSeguro(docente.nombre), true],
    [textoSeguro(docente.dui), false],
    [textoSeguro(docente.nip), false],
    [textoSeguro(docente.telefono), false],
  ];
  for (const [valor, esNombre] of celdas) {
    const celda = document.createElement('span');
    celda.className =
      'docentes-celda' + (esNombre ? ' docentes-celda-nombre' : '');
    celda.textContent = valor; // en blanco si no existe el dato
    if (esNombre && archivado) {
      // El docente archivado se MARCA para distinguirlo solo.
      const ficha = document.createElement('span');
      ficha.className = 'docentes-chip-archivado';
      ficha.textContent = 'Archivado';
      celda.appendChild(ficha);
    }
    fila.appendChild(celda);
  }

  const acciones = document.createElement('div');
  acciones.className = 'docentes-acciones';
  if (archivado) {
    acciones.appendChild(
      crearBotonAccion(ICONOS.ver, 'Ver', 'accion-ver', () => {
        verDocente(docente);
      }),
    );
    acciones.appendChild(
      crearBotonAccion(ICONOS.restaurar, 'Restaurar', 'accion-restaurar', () => {
        void archivarDocente(docente, false);
      }),
    );
    acciones.appendChild(
      crearBotonAccion(ICONOS.eliminar, 'Eliminar', 'accion-eliminar', () => {
        eliminarDocente(docente);
      }),
    );
  } else {
    acciones.appendChild(
      crearBotonAccion(ICONOS.ver, 'Ver', 'accion-ver', () => {
        verDocente(docente);
      }),
    );
    acciones.appendChild(
      crearBotonAccion(ICONOS.editar, 'Editar', 'accion-editar', () => {
        abrirModalFormulario(docente);
      }),
    );
    acciones.appendChild(
      crearBotonAccion(ICONOS.eliminar, 'Eliminar', 'accion-eliminar', () => {
        eliminarDocente(docente);
      }),
    );
    acciones.appendChild(
      crearBotonAccion(ICONOS.archivar, 'Archivar', 'accion-archivar', () => {
        void archivarDocente(docente, true);
      }),
    );
  }
  fila.appendChild(acciones);
  return fila;
}

/** Construye la vista COMPLETA de Docentes —migas, título del
 *  panel con los botones a la par y cuadro blanco que cubre el
 *  espacio restante (resumen, listado y archivados)— y la devuelve
 *  para que content.ts la agregue al contenedor de vistas.
 *  ARRANQUE SIN GASTAR CONSULTAS: pinta desde el estado o la
 *  caché del navegador y DEJA UNA ESCUCHA viva para recibir solo
 *  los cambios (aquí o de otro dispositivo). */
export function crearVistaDocentes(): HTMLElement {
  const vista = document.createElement('div');
  vista.className = 'vista-docentes';

  // Si quedó una escucha de un montaje anterior, se cierra antes.
  if (desuscripcionSnapshot !== null) {
    desuscripcionSnapshot();
    desuscripcionSnapshot = null;
  }

  // --- Migas arriba: "Inicio / Docentes". "Inicio" es un ENLACE
  //     clicable: navega a la sección Inicio y la sidebar la
  //     marca como activa sola. "Docentes" es la ubicación
  //     actual: texto fijo SIN clic. ---
  const migas = crearMigas([
    { texto: 'Inicio', ruta: '#/inicio' }, // antecesora: clicable
    { texto: 'Docentes' }, // ubicación actual: SIN clic
  ]);

  // --- Nombre del panel EN GRANDE + botones a la par ---
  const encabezado = document.createElement('header');
  encabezado.className = 'panel-encabezado';
  const tituloPanel = document.createElement('h4');
  tituloPanel.className = 'panel-titulo';
  tituloPanel.textContent = 'Panel de Docentes';
  const botones = document.createElement('div');
  botones.className = 'panel-botones';
  encabezado.append(tituloPanel, botones);

  // --- Cuadro blanco: cubre TODO el espacio restante.
  //     .tarjeta-vista es GENÉRICA: las demás vistas la reutilizan. ---
  const tarjeta = document.createElement('section');
  tarjeta.className = 'tarjeta-vista';

  // Permisos: la sección es solo para admin y director.
  if (!sesionAutorizada()) {
    const aviso = document.createElement('p');
    aviso.className = 'docentes-vacio';
    aviso.textContent = 'No tienes permiso para ver esta sección.';
    tarjeta.appendChild(aviso);
    vista.append(migas, encabezado, tarjeta);
    contenedorVista = null;
    return vista;
  }

  // Botón Actualizar: fuerza una recarga manual completa (la
  // vista normal ya no la necesita: caché + snapshot).
  const botonActualizar = document.createElement('button');
  botonActualizar.type = 'button';
  botonActualizar.className = 'boton-secundario boton-con-icono';
  botonActualizar.innerHTML = ICONOS.actualizar + '<span>Actualizar</span>';
  botonActualizar.addEventListener('click', () => {
    void cargarDocentes();
  });

  // Botón Agregar docente: abre el modal vacío.
  const botonAgregar = document.createElement('button');
  botonAgregar.type = 'button';
  botonAgregar.className = 'boton-primario boton-con-icono';
  botonAgregar.innerHTML = ICONOS.agregar + '<span>Agregar docente</span>';
  botonAgregar.addEventListener('click', () => {
    abrirModalFormulario(null);
  });
  botones.append(botonActualizar, botonAgregar);

  // Botones de la HOJA DE CÁLCULO: SOLO el admin los ve.
  if (rolSesionActual() === 'admin') {
    const botonProbar = document.createElement('button');
    botonProbar.type = 'button';
    botonProbar.className = 'boton-secundario boton-con-icono';
    botonProbar.title = 'Comprueba que la hoja de cálculo responde';
    botonProbar.innerHTML = ICONOS.nube + '<span>Probar conexión</span>';
    botonProbar.addEventListener('click', () => {
      void probarConexion();
    });

    const botonPasar = document.createElement('button');
    botonPasar.type = 'button';
    botonPasar.className = 'boton-secundario boton-con-icono';
    botonPasar.title = 'Copia TODOS los docentes de Firebase a la hoja';
    botonPasar.innerHTML = ICONOS.hoja + '<span>Pasar Firebase al Sheet</span>';
    botonPasar.addEventListener('click', () => {
      void pasarAlSheet();
    });

    botones.append(botonProbar, botonPasar);
  }

  // --- Resumen (se llena al terminar la carga) ---
  const resumen = document.createElement('p');
  resumen.id = 'docentes-resumen';
  resumen.className = 'docentes-resumen';

  // --- Títulos de columna del listado ---
  const cabecera = document.createElement('div');
  cabecera.className = 'docentes-cabecera';
  // Títulos de la vista principal: SOLO los 4 datos que se ven
  // (Nombre, DUI, NIP, Teléfono) + Acciones.
  for (const titulo of [
    'Nombre',
    'DUI',
    'NIP',
    'Teléfono',
    'Acciones',
  ]) {
    const columna = document.createElement('span');
    columna.textContent = titulo;
    cabecera.appendChild(columna);
  }

  // --- Listado principal ---
  const lista = document.createElement('div');
  lista.id = 'docentes-lista';
  lista.className = 'docentes-lista';

  // --- Apartado de archivados (colapsado por defecto) ---
  const archivados = document.createElement('details');
  archivados.id = 'docentes-archivados';
  archivados.className = 'docentes-archivados';
  const resumenArchivados = document.createElement('summary');
  resumenArchivados.textContent = 'Archivados';
  const cuerpoArchivados = document.createElement('div');
  cuerpoArchivados.id = 'docentes-archivados-cuerpo';
  archivados.append(resumenArchivados, cuerpoArchivados);

  tarjeta.append(resumen, cabecera, lista, archivados);
  vista.append(migas, encabezado, tarjeta);
  contenedorVista = vista;

  /* ----- ARRANQUE SIN GASTAR CONSULTAS -----
     1) Estado en memoria (misma sesión) o caché del navegador:
        la tabla pinta AL INSTANTE con cero lecturas.
     2) Sin caché: esqueleto hasta el primer aviso de Firestore.
     3) La ESCUCHA queda viva y avisa solo cuando algo cambia
        (en esta computadora o en otro dispositivo). */
  if (docentesCargados.length > 0) {
    pintarDesdeEstado();
  } else {
    const cache = leerCache();
    if (cache.length > 0) {
      for (const elemento of cache) {
        docentesCargados.push(elemento as unknown as Docente);
      }
      pintarDesdeEstado();
    } else {
      if (lista instanceof HTMLElement) pintarEsqueleto(lista);
    }
  }

  primeraEmision = true;
  desuscripcionSnapshot = suscribirseDocentes(aplicarSnapshot, (fallo) => {
    console.error(fallo);
    const listaViva = contenedorVista?.querySelector('#docentes-lista');
    if (
      listaViva instanceof HTMLElement &&
      listaViva.querySelector('.docentes-fila') === null
    ) {
      listaViva.textContent =
        'No se pudieron cargar los docentes. Revisa tu conexión e intenta de nuevo.';
    }
  });

  // Al navegar a otra sección se corta la escucha (limpieza).
  window.addEventListener('hashchange', salirDeDocentes);

  return vista;
}

/** Docentes ACTIVOS (los archivados NO aparecen), ordenados con
 *  el admin primero. Es la lista que deben usar las selecciones
 *  futuras de otras vistas (asignar docentes a grados, etc.):
 *  un docente archivado no se vuelve a elegir. */
export function listarDocentesActivos(): Docente[] {
  return ordenarDocentes(
    docentesCargados.filter((d) => !booleanoSeguro(d.archivado)),
  );
}

/** Compatibilidad: si algún código monta la vista con
 *  montarDocentes(contenedor), sigue funcionando igual. */
export function montarDocentes(contenedor: HTMLElement): void {
  contenedor.appendChild(crearVistaDocentes());
}