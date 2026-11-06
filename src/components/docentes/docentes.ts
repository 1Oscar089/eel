/* ============================================================
  docentes.ts — Sección "Docentes": gestión del personal docente
  ------------------------------------------------------------
  GUÍA RÁPIDA DE EDICIÓN:
  - Proyecto de Firebase, colección y grados   → SECCIÓN 2 (EDITA AQUÍ).
  - Apariencia                                 → src/styles/layout.css.

  Qué hace:
  - Lista los documentos ACTIVOS de la colección ordenados por
    nombre; el docente administrador (rol2 = 'admin') SIEMPRE
    aparece de primero.
  - Botón "Agregar docente" en la zona de acciones, a la par del
    título. Abre un modal con todos los campos.
  - Cada docente tiene 4 acciones (iconos): ver (ficha completa),
    editar, archivar y eliminar (con confirmación). Los archivados
    quedan en un apartado COLAPSABLE y pueden desarchivarse.
  - A PRUEBA DE DATOS FALTANTES: si un campo no existe en el
    documento de Firebase se muestra EN BLANCO y el flujo nunca
    se corta (sin errores en pantalla).
  - Firebase es la única fuente de verdad: crear, editar, archivar
    y eliminar escriben en Firestore y luego se recarga la lista.

  Campos que ESTE módulo gestiona (los demás del documento, como
  rol y rol2, NO se tocan al editar):
  nombre · correo · dui · nip · fechaNacimiento · grados · archivado
============================================================ */

/* ============================================================
  SECCIÓN 1 · IMPORTS (NO EDITAR)
============================================================ */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  updateDoc,
} from 'firebase/firestore';
import { getFirebaseApp, type ProjectName } from '../../servicios/initFirebase';

/* ============================================================
  SECCIÓN 2 · CONFIGURACIÓN (EDITA AQUÍ)
============================================================ */
/** Proyecto de Firebase donde viven los docentes. */
const PROYECTO_FIREBASE: ProjectName = 'proyecto1';

/** Colección de Firestore con los docentes (la misma que usa el
 *  inicio de sesión para el personal). Cambia aquí si difiere. */
const COLECCION_DOCENTES = 'profesores';

/** Grados que se pueden asignar a cada docente (checkboxes del
 *  modal). Se guardan en Firebase como array de TEXTOS en el
 *  campo `grados`, p. ej. grados: ['Parvularia 4', '5° grado'].
 *  Agrega o quita líneas para ajustar la oferta de grados. */
const GRADOS: string[] = [
  'Parvularia 4',
  'Parvularia 5',
  'Parvularia 6',
  '1° grado',
  '2° grado',
  '3° grado',
  '4° grado',
  '5° grado',
  '6° grado',
  '7° grado',
  '8° grado',
  '9° grado',
];

const ROLES_DOCENTE = ['profesor', 'director', 'admin'];

/** DUI: solo dígitos (máximo 9) y el guion se coloca solo después
 *  del octavo. Como se re-formatea en cada tecla, el guion no se
 *  puede borrar. */
function formatearDUI(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 9);
  if (digitos.length < 8) return digitos;
  if (digitos.length === 8) return digitos + '-';
  return digitos.slice(0, 8) + '-' + digitos.slice(8);
}

/** Quita acentos, ñ y todo lo que no sea letra/número, en minúsculas. */
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

/** ¿Ya existe OTRO docente con rol admin? (solo puede haber uno) */
function hayOtroAdmin(idExcluido: string): boolean {
  return docentesCargados.some(
    (d) => d.rol === 'admin' && d.id !== idExcluido,
  );
}

/** Conexión a Firestore con el proyecto elegido arriba. */
const db = getFirestore(getFirebaseApp(PROYECTO_FIREBASE));
/** Lista de docentes leídos de Firebase (INCLUYE archivados: el
 *  NIP de un archivado sigue ocupado y un admin archivado sigue
 *  siéndolo hasta que alguien lo edite). */
const docentesCargados: Docente[] = [];

/* ============================================================
  SECCIÓN 3 · TIPOS Y LECTURAS SEGURAS (NO EDITAR)
============================================================ */
/** Documento de docente tal como viene de Firebase: TODOS los
 *  campos son unknown porque pueden faltar o venir en otro tipo.
 *  Las funciones de abajo los leen sin romper el flujo. */
interface Docente {
  id: string;
  nombre: unknown;
  correo: unknown;
  dui: string;
  nip: unknown;
  fechaNacimiento: unknown;
  grados: unknown;
  archivado: unknown;
  rol: unknown;
  rol2: unknown;
}

/** Convierte cualquier valor en texto seguro: string → tal cual,
 *  número → texto, cualquier otra cosa o ausencia → '' (blanco). */
function texto(valor: unknown): string {
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  return '';
}

/** Lee el array de grados sin romperse: si falta o no es lista,
 *  devuelve []. Valores no textuales se descartan. */
function gradosDe(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.map((grado) => texto(grado)).filter((grado) => grado !== '');
}

/** El docente es administrador cuando su campo rol2 = 'admin'
 *  (misma convención que usa el inicio de sesión). */
function esAdmin(docente: Docente): boolean {
  return texto(docente.rol2).toLowerCase() === 'admin';
}

/** Archivado = oculto del listado principal (campo archivado). */
function estaArchivado(docente: Docente): boolean {
  return docente.archivado === true;
}

/** Fecha guardada como texto ISO (aaaa-mm-dd, el formato del
 *  <input type="date">) → se muestra dd/mm/aaaa. Si viene en otro
 *  formato se muestra tal cual; si falta, queda en blanco. */
function formatoFecha(valor: unknown): string {
  const crudo = texto(valor);
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(crudo);
  if (partes === null) return crudo;
  return `${partes[3]}/${partes[2]}/${partes[1]}`;
}

/* ============================================================
  SECCIÓN 4 · ESTADO INTERNO (NO EDITAR)
============================================================ */
/** #view-container mientras la vista Docentes está montada. */
let vista: HTMLElement | null = null;

/** Zona de botones junto al título (el botón "Agregar docente"). */
let zonaAcciones: HTMLElement | null = null;

/** Contador de cargas: descarta respuestas viejas si el usuario
 *  navegó y volvió mientras una lectura seguía en curso. */
let contadorCargas = 0;

/** Modal actualmente abierto (null = ninguno). */
let modalAbierto: HTMLElement | null = null;

/* ============================================================
  SECCIÓN 5 · ENTRADA DE LA VISTA (NO EDITAR)
  La llama el router de content.ts con los dos contenedores.
============================================================ */
export function renderDocentes(
  contenedor: HTMLElement,
  acciones: HTMLElement,
): void {
  vista = contenedor;
  zonaAcciones = acciones;

  // Botón "Agregar docente" junto al título
  zonaAcciones.appendChild(crearBotonAgregar());

  // Cuerpo inicial: aviso de carga (recargar() lo reemplaza)
  const raiz = document.createElement('div');
  raiz.className = 'docentes-vista';
  raiz.appendChild(crearAviso('Cargando docentes…'));
  vista.appendChild(raiz);

  void recargar();
}

/** Botón principal de la vista (zona de acciones del encabezado). */
function crearBotonAgregar(): HTMLButtonElement {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'boton-primario';
  boton.innerHTML = `${ICONO_AGREGAR}<span>Agregar docente</span>`;
  boton.addEventListener('click', () => abrirModalFormulario(null));
  return boton;
}

/* ============================================================
  SECCIÓN 6 · CARGA, ORDEN Y PINTADO (NO EDITAR)
============================================================ */
/** Lee la colección completa, separa activos de archivados, ordena
 *  (admin de primero, luego por nombre) y pinta. Si Firestore
 *  falla, muestra un aviso con botón Reintentar: nunca rompe. */
async function recargar(): Promise<void> {
  if (vista === null) return;
  const idCarga = ++contadorCargas;

  try {
    const instantanea = await getDocs(collection(db, COLECCION_DOCENTES));
    

    // Llegó una carga más nueva (o la vista ya no existe): se descarta
    if (idCarga !== contadorCargas || vista === null) return;

    const todos: Docente[] = instantanea.docs.map((documento) => ({
      id: documento.id,
      nombre: documento.get('nombre'),
      correo: documento.get('correo'),
      dui: documento.get('dui'),
      nip: documento.get('nip'),
      fechaNacimiento: documento.get('fechaNacimiento'),
      grados: documento.get('grados'),
      archivado: documento.get('archivado'),
      rol: documento.get('rol'),
      rol2: documento.get('rol2'),
    }));

    const activos = todos.filter((docente) => !estaArchivado(docente));
    const archivados = todos.filter(estaArchivado);
    ordenarDocentes(activos);
    ordenarDocentes(archivados);

    pintar(activos, archivados);
  } catch {
    if (idCarga !== contadorCargas || vista === null) return;
    pintarError();
  }
}

/** Orden en pantalla: administrador de primero y, entre el resto,
 *  alfabético por nombre (español, sin distinguir mayúsculas). */
function ordenarDocentes(lista: Docente[]): void {
  lista.sort((a, b) => {
    const adminA = esAdmin(a) ? 0 : 1;
    const adminB = esAdmin(b) ? 0 : 1;
    if (adminA !== adminB) return adminA - adminB;
    return texto(a.nombre).localeCompare(texto(b.nombre), 'es', {
      sensitivity: 'base',
    });
  });
}

/** Pinta la vista completa: tabla de activos + apartado archivados. */
function pintar(activos: Docente[], archivados: Docente[]): void {
  if (vista === null) return;

  const raiz = document.createElement('div');
  raiz.className = 'docentes-vista';

  if (activos.length === 0) {
    raiz.appendChild(
      crearAviso(
        'No hay docentes registrados todavía. Usa «Agregar docente» para crear el primero.',
      ),
    );
  } else {
    raiz.appendChild(crearTabla(activos, false));
  }

  raiz.appendChild(crearApartadoArchivados(archivados));
  vista.replaceChildren(raiz);
}

/** Aviso de error de carga con botón Reintentar. */
function pintarError(): void {
  if (vista === null) return;

  const raiz = document.createElement('div');
  raiz.className = 'docentes-vista';

  const aviso = document.createElement('div');
  aviso.className = 'docentes-aviso docentes-aviso--error';

  const mensaje = document.createElement('p');
  mensaje.textContent =
    'No se pudieron cargar los docentes. Revisa tu conexión e intenta de nuevo.';

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'boton-secundario';
  boton.textContent = 'Reintentar';
  boton.addEventListener('click', () => void recargar());

  aviso.append(mensaje, boton);
  raiz.appendChild(aviso);
  vista.replaceChildren(raiz);
}

/** Párrafo de aviso neutral (carga / lista vacía). */
function crearAviso(mensaje: string): HTMLParagraphElement {
  const aviso = document.createElement('p');
  aviso.className = 'docentes-aviso';
  aviso.textContent = mensaje;
  return aviso;
}

/* ============================================================
  SECCIÓN 7 · TABLA Y FILAS (NO EDITAR)
============================================================ */
/** Tabla de docentes. Columnas: Nombre, DUI, NIP, Fecha de
 *  nacimiento y Acciones. `sonArchivados` cambia la acción de
 *  archivar ⇄ desarchivar. */
function crearTabla(lista: Docente[], sonArchivados: boolean): HTMLElement {
  const envoltorio = document.createElement('div');
  envoltorio.className = 'docentes-tabla-envoltorio';

  const tabla = document.createElement('table');
  tabla.className = 'docentes-tabla';

  const encabezado = document.createElement('thead');
  const filaCabecera = document.createElement('tr');
  for (const titulo of ['Nombre', 'DUI', 'NIP', 'Fecha de nacimiento', 'Acciones']) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = titulo;
    filaCabecera.appendChild(th);
  }
  encabezado.appendChild(filaCabecera);
  tabla.appendChild(encabezado);

  const cuerpo = document.createElement('tbody');
  for (const docente of lista) {
    cuerpo.appendChild(crearFila(docente, sonArchivados));
  }
  tabla.appendChild(cuerpo);

  envoltorio.appendChild(tabla);
  return envoltorio;
}

/** Apartado COLAPSABLE de archivados (details cerrado por defecto,
 *  aunque no haya archivados: muestra el conteo en el resumen). */
function crearApartadoArchivados(archivados: Docente[]): HTMLElement {
  const detalles = document.createElement('details');
  detalles.className = 'docentes-archivados';

  const resumen = document.createElement('summary');
  resumen.className = 'docentes-archivados-resumen';
  resumen.innerHTML = ICONO_FLECHA;
  const textoResumen = document.createElement('span');
  textoResumen.textContent = `Archivados (${archivados.length})`;
  resumen.appendChild(textoResumen);
  detalles.appendChild(resumen);

  const cuerpo = document.createElement('div');
  cuerpo.className = 'docentes-archivados-cuerpo';
  if (archivados.length === 0) {
    const vacio = document.createElement('p');
    vacio.className = 'docentes-vacio';
    vacio.textContent = 'No hay docentes archivados.';
    cuerpo.appendChild(vacio);
  } else {
    cuerpo.appendChild(crearTabla(archivados, true));
  }
  detalles.appendChild(cuerpo);
  return detalles;
}

/** Una fila de la tabla. Los campos que falten en Firebase quedan
 *  en blanco (celdas vacías), sin cortar el flujo. */
function crearFila(docente: Docente, sonArchivados: boolean): HTMLTableRowElement {
  const fila = document.createElement('tr');

  // Nombre (con chapita "Admin" cuando rol2 = 'admin')
  const celdaNombre = document.createElement('td');
  celdaNombre.className = 'docentes-celda-nombre';
  celdaNombre.textContent = texto(docente.nombre);
  if (esAdmin(docente)) {
    const chapita = document.createElement('span');
    chapita.className = 'docentes-chapita-admin';
    chapita.textContent = 'Admin';
    celdaNombre.appendChild(chapita);
  }
  fila.appendChild(celdaNombre);

  fila.appendChild(crearCelda(texto(docente.dui)));
  fila.appendChild(crearCelda(texto(docente.nip)));
  fila.appendChild(crearCelda(formatoFecha(docente.fechaNacimiento)));

  // Acciones: ver · editar · archivar o desarchivar · eliminar
  const celdaAcciones = document.createElement('td');
  celdaAcciones.className = 'docentes-celda-acciones';
  const grupo = document.createElement('div');
  grupo.className = 'docentes-acciones';

  grupo.appendChild(
    crearBotonAccion(ICONO_VER, 'Ver información', () =>
      abrirModalVer(docente),
    ),
  );
  grupo.appendChild(
    crearBotonAccion(ICONO_EDITAR, 'Editar', () => abrirModalFormulario(docente)),
  );
  if (sonArchivados) {
    grupo.appendChild(
      crearBotonAccion(ICONO_RESTAURAR, 'Desarchivar (volver al listado)', () =>
        cambiarArchivado(docente, false),
      ),
    );
  } else {
    grupo.appendChild(
      crearBotonAccion(ICONO_ARCHIVAR, 'Archivar', () =>
        cambiarArchivado(docente, true),
      ),
    );
  }
  grupo.appendChild(
    crearBotonAccion(
      ICONO_ELIMINAR,
      'Eliminar',
      () => abrirModalEliminar(docente),
      'docentes-accion--peligro',
    ),
  );

  celdaAcciones.appendChild(grupo);
  fila.appendChild(celdaAcciones);
  return fila;
}

/** Celda simple con texto (puede quedar vacía). */
function crearCelda(valor: string): HTMLTableCellElement {
  const celda = document.createElement('td');
  celda.className = 'docentes-celda';
  celda.textContent = valor;
  return celda;
}

/** Botón-icono de las acciones de fila. */
function crearBotonAccion(
  icono: string,
  etiqueta: string,
  accion: () => void,
  claseExtra: string = '',
): HTMLButtonElement {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'docentes-accion' + (claseExtra === '' ? '' : ` ${claseExtra}`);
  boton.title = etiqueta;
  boton.setAttribute('aria-label', etiqueta);
  boton.innerHTML = icono;
  boton.addEventListener('click', accion);
  return boton;
}

/* ============================================================
  SECCIÓN 8 · ACCIONES DE FIRESTORE (NO EDITAR)
============================================================ */
/** Archiva o desarchiva un docente (campo `archivado` en Firebase)
 *  y recarga la lista. Si falla, avisa en un modal: no rompe. */
async function cambiarArchivado(docente: Docente, archivar: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, COLECCION_DOCENTES, docente.id), {
      archivado: archivar,
    });
    await recargar();
  } catch {
    abrirModalAviso(
      'No se pudo actualizar el docente. Revisa tu conexión e intenta de nuevo.',
    );
  }
}

/** Modal de confirmación para eliminar definitivamente. */
function abrirModalEliminar(docente: Docente): void {
  const nombre = texto(docente.nombre);

  const parrafo = document.createElement('p');
  parrafo.className = 'modal-texto';
  parrafo.textContent =
    nombre === ''
      ? '¿Eliminar este docente? Sus datos se borrarán de Firebase y no se podrán recuperar.'
      : `¿Eliminar a ${nombre}? Sus datos se borrarán de Firebase y no se podrán recuperar.`;

  const error = crearLineaError();

  const botonCancelar = crearBotonPie('boton-secundario', 'Cancelar', cerrarModal);

  const botonEliminar = crearBotonPie('boton-peligroso', 'Sí, eliminar', () => {
    void eliminarDocente(docente, error, botonEliminar);
  });

  abrirModal('Eliminar docente', [parrafo, error], [botonCancelar, botonEliminar]);
}

/** Borra el documento de Firebase y recarga. Si falla, el error
 *  se muestra DENTRO del modal y este sigue abierto. */
async function eliminarDocente(
  docente: Docente,
  lineaError: HTMLElement,
  boton: HTMLButtonElement,
): Promise<void> {
  boton.disabled = true;
  boton.textContent = 'Eliminando…';
  try {
    await deleteDoc(doc(db, COLECCION_DOCENTES, docente.id));
    cerrarModal();
    await recargar();
  } catch {
    boton.disabled = false;
    boton.textContent = 'Sí, eliminar';
    lineaError.hidden = false;
  }
}

/** Guarda el formulario: crea (addDoc) o actualiza (updateDoc).
 *  Solo escribe los campos gestionados; rol, rol2 y demás campos
 *  del documento quedan intactos al editar. */
async function guardarDocente(
  formulario: HTMLFormElement,
  docente: Docente | null,
  lineaError: HTMLElement,
  boton: HTMLButtonElement,
): Promise<void> {
  const valor = (selector: string): string =>
    (formulario.querySelector(selector) as HTMLInputElement | null)?.value.trim() ??
    '';
  const grados = Array.from(
    formulario.querySelectorAll<HTMLInputElement>('input[name="grados"]:checked'),
  ).map((casilla) => casilla.value);

  const datos = {
    nombre: valor('#docentes-campo-nombre'),
    correo: valor('#docentes-campo-correo'),
    dui: valor('#docentes-campo-dui'),
    nip: valor('#docentes-campo-nip'),
    fechaNacimiento: valor('#docentes-campo-fecha'),
    grados: grados,
  };

  boton.disabled = true;
  boton.textContent = 'Guardando…';
  try {
    if (docente === null) {
      await addDoc(collection(db, COLECCION_DOCENTES), {
        ...datos,
        archivado: false,
      });
    } else {
      await updateDoc(doc(db, COLECCION_DOCENTES, docente.id), datos);
    }
    cerrarModal();
    await recargar();
  } catch {
    boton.disabled = false;
    boton.textContent = 'Guardar';
    lineaError.hidden = false;
  }
}

/* ============================================================
  SECCIÓN 9 · MODALES (NO EDITAR)
  Un solo modal a la vez. Se cierra con la X, con ESC, con el
  botón Cancelar/Aceptar o haciendo clic fuera de la caja.
============================================================ */
/** Modal con el formulario completo (crear con null / editar). */
function abrirModalFormulario(docente: Docente | null): void {
  const marcados = docente === null ? [] : gradosDe(docente.grados);
  const esEdicion = docente !== null;

  const formulario = document.createElement('form');
  formulario.className = 'docentes-formulario';

  // --- Campos de texto ---
  formulario.appendChild(
    crearCampoFormulario(
      'Nombre completo',
      'docentes-campo-nombre',
      'text',
      docente === null ? '' : texto(docente.nombre),
      'Nombre y apellidos',
      true,
      true,
    ),
  );
  formulario.appendChild(
    crearCampoFormulario(
      'Correo institucional',
      'docentes-campo-correo',
      'email',
      docente === null ? '' : texto(docente.correo),
      'docente@clases.edu.sv',
      false,
      true,
    ),
  );
  formulario.appendChild(
    crearCampoFormulario(
      'DUI',
      'docentes-campo-dui',
      'text',
      docente === null ? '' : texto(docente.dui),
      '00000000-0',
      false,
      false,
    ),
  );
  formulario.appendChild(
    crearCampoFormulario(
      'NIP',
      'docentes-campo-nip',
      'text',
      docente === null ? '' : texto(docente.nip),
      'Número de identificación personal',
      false,
      false,
    ),
  );
  formulario.appendChild(
    crearCampoFormulario(
      'Fecha de nacimiento',
      'docentes-campo-fecha',
      'date',
      docente === null ? '' : soloFechaISO(docente.fechaNacimiento),
      '',
      false,
      false,
    ),
  );

const dui = document.createElement('input');
  dui.type = 'text';
  dui.id = 'docente-dui';
  dui.maxLength = 10;
  dui.inputMode = 'numeric';
  dui.placeholder = '00000000-0';
  dui.value = formatearDUI(docente?.dui ?? '');
  dui.addEventListener('input', () => {
    dui.value = formatearDUI(dui.value);
  });
  // --- Grados asignados (checkboxes, se guardan como array) ---
  const grupoGrados = document.createElement('div');
  grupoGrados.className = 'docentes-campo docentes-campo--ancho';

  const rotuloGrados = document.createElement('span');
  rotuloGrados.className = 'docentes-etiqueta';
  rotuloGrados.textContent = 'Grados asignados';

  const casillas = document.createElement('div');
  casillas.className = 'docentes-grados';
  for (const etiqueta of GRADOS) {   // ← NO: esto es pseudocódigo, usa la línea de abajo
    const opcion = document.createElement('label');
    opcion.className = 'docentes-grado-opcion';

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
  grupoGrados.append(rotuloGrados, casillas);
  formulario.appendChild(grupoGrados);

  // --- Pie del formulario: Cancelar + Guardar ---
  const error = crearLineaError();
  formulario.appendChild(error);

  const pie = document.createElement('div');
  pie.className = 'modal-pie';
  pie.appendChild(
    crearBotonPie('boton-secundario', 'Cancelar', cerrarModal),
  );
  // Botón Guardar SOLO dispara el submit del formulario (nunca un
  // click propio): así el guardado no se ejecuta dos veces.
  const botonGuardar = document.createElement('button');
  botonGuardar.type = 'submit';
  botonGuardar.className = 'boton-primario';
  botonGuardar.textContent = 'Guardar';
  pie.appendChild(botonGuardar);
  formulario.appendChild(pie);

  // El botón Guardar y la tecla Enter pasan por aquí
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    void guardarDocente(formulario, docente, error, botonGuardar);
  });

  abrirModal(
    esEdicion ? 'Editar docente' : 'Agregar docente',
    [formulario],
    [],
  );
  
}

/** Crea un campo (etiqueta + entrada) del formulario del modal. */
function crearCampoFormulario(
  etiqueta: string,
  id: string,
  tipo: string,
  valorInicial: string,
  placeholder: string,
  requerido: boolean,
  ancho: boolean,
): HTMLDivElement {
  const grupo = document.createElement('div');
  grupo.className =
    'docentes-campo' + (ancho ? ' docentes-campo--ancho' : '');

  const label = document.createElement('label');
  label.className = 'docentes-etiqueta';
  label.htmlFor = id;
  label.textContent = etiqueta + (requerido ? ' *' : '');

  const entrada = document.createElement('input');
  entrada.className = 'docentes-entrada';
  entrada.id = id;
  entrada.type = tipo;
  entrada.value = valorInicial;
  entrada.required = requerido;
  if (placeholder !== '') entrada.placeholder = placeholder;

  grupo.append(label, entrada);
  return grupo;
}

/** Deja el valor usable por <input type="date">: solo si el texto
 *  empieza con aaaa-mm-dd; si no, cadena vacía. */
function soloFechaISO(valor: unknown): string {
  const crudo = texto(valor);
  const partes = /^(\d{4}-\d{2}-\d{2})/.exec(crudo);
  return partes === null ? '' : partes[1];
}

/** Modal de solo lectura con TODA la información del docente. */
function abrirModalVer(docente: Docente): void {
  const ficha = document.createElement('dl');
  ficha.className = 'docentes-ficha';

  // Campos simples (en blanco si no existen en Firebase)
  agregarFilaFicha(ficha, 'Nombre', texto(docente.nombre));
  agregarFilaFicha(ficha, 'Correo', texto(docente.correo));
  agregarFilaFicha(ficha, 'DUI', texto(docente.dui));
  agregarFilaFicha(ficha, 'NIP', texto(docente.nip));
  agregarFilaFicha(
    ficha,
    'Fecha de nacimiento',
    formatoFecha(docente.fechaNacimiento),
  );

  // Grados como chips (vacío si no tiene ninguno)
  const dtGrados = document.createElement('dt');
  dtGrados.textContent = 'Grados asignados';
  const ddGrados = document.createElement('dd');
  const etiquetas = gradosDe(docente.grados);
  if (etiquetas.length > 0) {
    const chips = document.createElement('div');
    chips.className = 'docentes-chips';
    for (const etiqueta of etiquetas) {
      const chip = document.createElement('span');
      chip.className = 'docentes-chip';
      chip.textContent = etiqueta;
      chips.appendChild(chip);
    }
    ddGrados.appendChild(chips);
  }
  ficha.append(dtGrados, ddGrados);

  const botonCerrar = crearBotonPie('boton-primario', 'Cerrar', cerrarModal);
  abrirModal('Información del docente', [ficha], [botonCerrar]);
}

/** Agrega un par etiqueta–valor a la ficha (valor puede ser ''). */
function agregarFilaFicha(
  ficha: HTMLDListElement,
  etiqueta: string,
  valor: string,
): void {
  const dt = document.createElement('dt');
  dt.textContent = etiqueta;
  const dd = document.createElement('dd');
  dd.textContent = valor;
  ficha.append(dt, dd);
}

/** Modal simple de aviso (errores de escritura en Firestore). */
function abrirModalAviso(mensaje: string): void {
  const parrafo = document.createElement('p');
  parrafo.className = 'modal-texto';
  parrafo.textContent = mensaje;
  const botonAceptar = crearBotonPie('boton-primario', 'Aceptar', cerrarModal);
  abrirModal('Aviso', [parrafo], [botonAceptar]);
}

/** Base de todos los modales: fondo + caja + cabecera + cuerpo
 *  + pie opcional de botones. */
function abrirModal(
  titulo: string,
  piezas: HTMLElement[],
  botones: HTMLButtonElement[],
): void {
  cerrarModal(); // solo un modal a la vez

  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';

  const caja = document.createElement('div');
  caja.className = 'modal-caja';
  caja.setAttribute('role', 'dialog');
  caja.setAttribute('aria-modal', 'true');
  caja.setAttribute('aria-label', titulo);

  const cabecera = document.createElement('div');
  cabecera.className = 'modal-cabecera';

  const tituloElemento = document.createElement('h5');
  tituloElemento.className = 'modal-titulo';
  tituloElemento.textContent = titulo;

  const botonCerrar = document.createElement('button');
  botonCerrar.type = 'button';
  botonCerrar.className = 'modal-cerrar';
  botonCerrar.setAttribute('aria-label', 'Cerrar ventana');
  botonCerrar.innerHTML = ICONO_CERRAR;
  botonCerrar.addEventListener('click', cerrarModal);

  cabecera.append(tituloElemento, botonCerrar);

  const cuerpo = document.createElement('div');
  cuerpo.className = 'modal-cuerpo';
  for (const pieza of piezas) cuerpo.appendChild(pieza);

  caja.appendChild(cabecera);
  caja.appendChild(cuerpo);

  // Pie con botones SOLO cuando la vista del modal no trae el suyo
  if (botones.length > 0) {
    const pie = document.createElement('div');
    pie.className = 'modal-pie';
    for (const boton of botones) pie.appendChild(boton);
    caja.appendChild(pie);
  }

  fondo.appendChild(caja);

  // Clic fuera de la caja cierra (pero clic dentro no)
  fondo.addEventListener('click', (evento) => {
    if (evento.target === fondo) cerrarModal();
  });

  document.addEventListener('keydown', cerrarConEsc);
  document.body.appendChild(fondo);
  modalAbierto = fondo;
}

/** Cierra el modal abierto (si lo hay) y su listener de ESC. */
function cerrarModal(): void {
  if (modalAbierto === null) return;
  document.removeEventListener('keydown', cerrarConEsc);
  modalAbierto.remove();
  modalAbierto = null;
}

/** Cierra con la tecla ESC. */
function cerrarConEsc(evento: KeyboardEvent): void {
  if (evento.key === 'Escape') cerrarModal();
}

/** Línea de error oculta dentro de los formularios del modal. */
function crearLineaError(): HTMLParagraphElement {
  const error = document.createElement('p');
  error.className = 'modal-error';
  error.hidden = true;
  error.textContent =
    'No se pudo guardar. Revisa tu conexión e intenta de nuevo.';
  return error;
}

/** Botón reutilizable del pie de los modales. */
function crearBotonPie(
  clase: string,
  etiqueta: string,
  accion: () => void,
): HTMLButtonElement {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = clase;
  boton.textContent = etiqueta;
  boton.addEventListener('click', accion);
  return boton;
}

/* ============================================================
  SECCIÓN 10 · ICONOS SVG (NO EDITAR)
  Mismo estilo que el sidebar: fill="none" stroke="currentColor".
  Líneas rectas → butt/miter · curvas → round/round.
============================================================ */
const ICONO_AGREGAR = `
  <svg class="icono-boton" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="butt"
       stroke-linejoin="miter" aria-hidden="true">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>`;

const ICONO_VER = `
  <svg class="icono-boton" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round"
       stroke-linejoin="round" aria-hidden="true">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>`;

const ICONO_EDITAR = `
  <svg class="icono-boton" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round"
       stroke-linejoin="round" aria-hidden="true">
    <path d="M4 20l1.2-4.2L16.8 4.2a2.1 2.1 0 013 3L8.2 18.8 4 20z" />
    <path d="M14.5 6.5l3 3" />
  </svg>`;

const ICONO_ARCHIVAR = `
  <svg class="icono-boton" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="butt"
       stroke-linejoin="miter" aria-hidden="true">
    <rect x="3" y="4" width="18" height="4" />
    <path d="M5 8v12h14V8" />
    <path d="M10 12h4" />
  </svg>`;

const ICONO_RESTAURAR = `
  <svg class="icono-boton" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round"
       stroke-linejoin="round" aria-hidden="true">
    <path d="M4 9h10a5 5 0 015 5 5 5 0 01-5 5h-4" />
    <path d="M8 5L4 9l4 4" />
  </svg>`;

const ICONO_ELIMINAR = `
  <svg class="icono-boton" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="butt"
       stroke-linejoin="miter" aria-hidden="true">
    <path d="M4 7h16" />
    <path d="M9.5 7V4h5v3" />
    <path d="M6 7l1 13h10l1-13" />
    <path d="M10 11v5" />
    <path d="M14 11v5" />
  </svg>`;

const ICONO_CERRAR = `
  <svg class="icono-boton" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="butt"
       stroke-linejoin="miter" aria-hidden="true">
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </svg>`;

const ICONO_FLECHA = `
  <svg class="docentes-archivados-flecha" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="butt"
       stroke-linejoin="miter" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>`;