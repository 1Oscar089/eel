/* ============================================================
  docentes.ts — Sección Docentes (solo admin y director)
  ------------------------------------------------------------
  - Lista de docentes desde Firebase, ordenada por nombre con
    el docente que sea admin SIEMPRE primero.
  - Columnas: Nombre, DUI, NIP, fecha de nacimiento + acciones
    (Ver, Editar, Eliminar, Archivar) por fila.
  - El botón "Agregar docente" queda justo después del título
    de la vista (primera fila de esta vista).
  - "Agregar docente" / "Editar" abren un modal con todos los
    datos: nombre, DUI (guion automático), NIP, fecha de
    nacimiento, rol (select, solo puede haber UN admin), correo
    (se forma solo como nombre[0].nombre[1].nombre[2] con el
    dominio fijo @clases.edu.sv) y grados por checkbox.
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

/* ============================================================
  SECCIÓN 2 · CONFIGURACIÓN (EDITA AQUÍ)
============================================================ */

/** Proyecto de Firebase donde vive la colección de docentes. */
const PROYECTO_FIREBASE = 'proyecto1';

/** Nombre de la colección de docentes en Firestore. */
const COLECCION_DOCENTES = 'profesores';

/** Clave bajo la que se guarda la sesión en sessionStorage. */
const CLAVE_SESION = 'eel-sesion';

/** Grados que se pueden asignar a un docente (checkboxes). */
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

/* ============================================================
  SECCIÓN 3 · TIPOS Y LECTURAS SEGURAS (NO EDITAR)
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
  gradosAsignados: unknown;
  archivado: unknown;
  rol: unknown;
}

/** Conexión a Firestore con el proyecto elegido arriba. */
const db = getFirestore(getFirebaseApp(PROYECTO_FIREBASE));

/** Caché de los docentes leídos (INCLUYE archivados: el NIP de
 *  un archivado sigue ocupado y un admin archivado sigue
 *  siéndolo hasta que alguien lo edite). */
const docentesCargados: Docente[] = [];

/** Contenedor de la vista montada (para recargar la lista). */
let contenedorVista: HTMLElement | null = null;

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

/** ¿Ya existe OTRO docente con rol admin? (solo puede haber uno) */
function hayOtroAdmin(idExcluido: string): boolean {
  return docentesCargados.some(
    (d) => textoSeguro(d.rol) === 'admin' && d.id !== idExcluido,
  );
}

/** Copia ordenada: admin primero, luego por nombre (A-Z). */
function ordenarDocentes(lista: Docente[]): Docente[] {
  return [...lista].sort((a, b) => {
    const adminA = textoSeguro(a.rol) === 'admin' ? 0 : 1;
    const adminB = textoSeguro(b.rol) === 'admin' ? 0 : 1;
    if (adminA !== adminB) return adminA - adminB;
    return textoSeguro(a.nombre).localeCompare(textoSeguro(b.nombre), 'es');
  });
}

/** ¿La sesión actual tiene acceso? (rol admin o director) */
function sesionAutorizada(): boolean {
  try {
    const cruda = sessionStorage.getItem(CLAVE_SESION);
    if (cruda === null) return false;
    const datos = JSON.parse(cruda) as { rol?: unknown };
    return ROLES_CON_ACCESO.includes(textoSeguro(datos.rol));
  } catch {
    return false;
  }
}

/* ============================================================
  SECCIÓN 5 · MODAL GENÉRICO (NO EDITAR)
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

/** Cierra el modal y limpia su contenido. */
function cerrarModal(): void {
  if (modalFondo !== null) {
    modalFondo.remove();
    modalFondo = null;
  }
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

/* ============================================================
  SECCIÓN 6 · ACCIONES DE FIREBASE (NO EDITAR)
============================================================ */

/** Recarga la caché y vuelve a pintar listado y archivados. */
async function cargarDocentes(): Promise<void> {
  if (contenedorVista === null) return;

  const lista = contenedorVista.querySelector('#docentes-lista');
  const cuerpoArchivados = contenedorVista.querySelector(
    '#docentes-archivados-cuerpo',
  );
  if (lista === null || cuerpoArchivados === null) return;

  lista.textContent = 'Cargando docentes…';
  cuerpoArchivados.textContent = '';

  try {
    const snapshot = await getDocs(collection(db, COLECCION_DOCENTES));

    // Caché COMPLETA (incluye archivados) para las validaciones.
    docentesCargados.length = 0;
    for (const documento of snapshot.docs) {
      docentesCargados.push({
        id: documento.id,
        ...documento.data(),
      } as Docente);
    }
  } catch (fallo) {
    console.error(fallo);
    lista.textContent =
      'No se pudieron cargar los docentes. Revisa tu conexión e intenta de nuevo.';
    return;
  }

  const activos = ordenarDocentes(
    docentesCargados.filter((d) => !booleanoSeguro(d.archivado)),
  );
  const archivados = ordenarDocentes(
    docentesCargados.filter((d) => booleanoSeguro(d.archivado)),
  );

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
  const correoLocal = formulario.querySelector(
    '#docente-correo',
  ) as HTMLInputElement | null;

  if (
    nombre === null ||
    dui === null ||
    nip === null ||
    fecha === null ||
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

  const rolFinal = seleccionRol.value;
  if (rolFinal === 'admin' && hayOtroAdmin(docente?.id ?? '')) {
    lineaError.textContent =
      'Ya existe un docente con rol Admin. Solo puede haber uno.';
    return;
  }

  const parteLocal = correoLocal.value.trim();
  const correoFinal =
    parteLocal === '' ? '' : parteLocal + DOMINIO_CORREO;

  // Grados marcados en los checkboxes.
  const gradosMarcados: string[] = [];
  const casillas = formulario.querySelectorAll('input[name="grados"]:checked');
  casillas.forEach((casilla) => {
    if (casilla instanceof HTMLInputElement) gradosMarcados.push(casilla.value);
  });

  const datos = {
    nombre: nombreFinal,
    dui: duiFinal,
    nip: nipFinal,
    fechaNacimiento: fecha.value,
    gradosAsignados: gradosMarcados,
    archivado: docente !== null ? booleanoSeguro(docente.archivado) : false,
    rol: rolFinal,
    correo: correoFinal,
  };

  boton.disabled = true;
  try {
    const idDocumento = docente !== null ? docente.id : nipFinal;
    await setDoc(doc(db, COLECCION_DOCENTES, idDocumento), datos);
    cerrarModal();
    await cargarDocentes();
  } catch (fallo) {
    lineaError.textContent =
      'No se pudo guardar. Revisa tu conexión e intenta de nuevo.';
    console.error(fallo);
  } finally {
    boton.disabled = false;
  }
}

/** Borra el documento de Firebase tras confirmar en un modal. */
function eliminarDocente(docente: Docente): void {
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
  formulario.className = 'modal-formulario';
  formulario.append(lineaError, pie);
  abrirModal('Eliminar docente', [aviso, formulario]);
}

async function confirmarEliminar(
  docente: Docente,
  lineaError: HTMLElement,
): Promise<void> {
  lineaError.textContent = '';
  try {
    await deleteDoc(doc(db, COLECCION_DOCENTES, docente.id));
    cerrarModal();
    await cargarDocentes();
  } catch (fallo) {
    lineaError.textContent = 'No se pudo eliminar. Intenta de nuevo.';
    console.error(fallo);
  }
}

/** Archiva o restaura (merge: no toca los demás campos). */
async function archivarDocente(
  docente: Docente,
  archivado: boolean,
): Promise<void> {
  try {
    await setDoc(
      doc(db, COLECCION_DOCENTES, docente.id),
      { archivado },
      { merge: true },
    );
    await cargarDocentes();
  } catch (fallo) {
    console.error(fallo);
    mostrarAviso(
      'Error',
      archivado
        ? 'No se pudo archivar al docente. Intenta de nuevo.'
        : 'No se pudo restaurar al docente. Intenta de nuevo.',
    );
  }
}

/* ============================================================
  SECCIÓN 7 · FORMULARIO DEL MODAL (NO EDITAR)
============================================================ */

/** Abre el modal con el formulario. Si docente es null, es
 *  "Agregar docente"; si no, es "Editar docente". */
function abrirModalFormulario(docente: Docente | null): void {
  const esEdicion = docente !== null;
  const marcados = listaSegura(docente?.gradosAsignados);

  const formulario = document.createElement('form');
  formulario.className = 'modal-formulario';

  // --- Nombre ---
  const grupoNombre = document.createElement('div');
  grupoNombre.className = 'docentes-campo';
  const rotuloNombre = document.createElement('label');
  rotuloNombre.className = 'docentes-rotulo';
  rotuloNombre.htmlFor = 'docente-nombre';
  rotuloNombre.textContent = 'Nombre';
  const nombre = document.createElement('input');
  nombre.className = 'docentes-entrada';
  nombre.id = 'docente-nombre';
  nombre.type = 'text';
  nombre.value = textoSeguro(docente?.nombre);
  grupoNombre.append(rotuloNombre, nombre);

  // --- DUI (guion automático, no se puede borrar) ---
  const grupoDui = document.createElement('div');
  grupoDui.className = 'docentes-campo';
  const rotuloDui = document.createElement('label');
  rotuloDui.className = 'docentes-rotulo';
  rotuloDui.htmlFor = 'docente-dui';
  rotuloDui.textContent = 'DUI';
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
  grupoDui.append(rotuloDui, dui);

  // --- NIP (es el ID del documento: no editable al editar) ---
  const grupoNip = document.createElement('div');
  grupoNip.className = 'docentes-campo';
  const rotuloNip = document.createElement('label');
  rotuloNip.className = 'docentes-rotulo';
  rotuloNip.htmlFor = 'docente-nip';
  rotuloNip.textContent = 'NIP';
  const nip = document.createElement('input');
  nip.className = 'docentes-entrada';
  nip.id = 'docente-nip';
  nip.type = 'text';
  nip.inputMode = 'numeric';
  nip.placeholder = 'Solo dígitos';
  nip.value = textoSeguro(docente?.nip) || docente?.id || '';
  if (esEdicion) nip.disabled = true;
  grupoNip.append(rotuloNip, nip);

  // --- Fecha de nacimiento ---
  const grupoFecha = document.createElement('div');
  grupoFecha.className = 'docentes-campo';
  const rotuloFecha = document.createElement('label');
  rotuloFecha.className = 'docentes-rotulo';
  rotuloFecha.htmlFor = 'docente-fecha';
  rotuloFecha.textContent = 'Fecha de nacimiento';
  const fecha = document.createElement('input');
  fecha.className = 'docentes-entrada';
  fecha.id = 'docente-fecha';
  fecha.type = 'date';
  fecha.value = textoSeguro(docente?.fechaNacimiento);
  grupoFecha.append(rotuloFecha, fecha);

  // --- Rol (select; solo puede haber UN admin) ---
  const grupoRol = document.createElement('div');
  grupoRol.className = 'docentes-campo';
  const rotuloRol = document.createElement('label');
  rotuloRol.className = 'docentes-rotulo';
  rotuloRol.htmlFor = 'docente-rol';
  rotuloRol.textContent = 'Rol';
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
  seleccionRol.value = textoSeguro(docente?.rol) || 'profesor';
  grupoRol.append(rotuloRol, seleccionRol);

  // --- Correo (parte editable + dominio fijo no editable) ---
  const grupoCorreo = document.createElement('div');
  grupoCorreo.className = 'docentes-campo';
  const rotuloCorreo = document.createElement('label');
  rotuloCorreo.className = 'docentes-rotulo';
  rotuloCorreo.htmlFor = 'docente-correo';
  rotuloCorreo.textContent = 'Correo';
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
  grupoCorreo.append(rotuloCorreo, campoCorreo);

  // Valor inicial: correo guardado (sin dominio) o generado.
  correoLocal.value =
    textoSeguro(docente?.correo).replace(/@clases\.edu\.sv$/i, '') ||
    generarCorreoLocal(textoSeguro(docente?.nombre));

  // Al escribir el nombre, la parte local se vuelve a formar sola.
  nombre.addEventListener('input', () => {
    correoLocal.value = generarCorreoLocal(nombre.value);
  });

  // --- Grados asignados (checkboxes) ---
  const grupoGrados = document.createElement('div');
  grupoGrados.className = 'docentes-campo';
  const rotuloGrados = document.createElement('p');
  rotuloGrados.className = 'docentes-rotulo';
  rotuloGrados.textContent = 'Grados asignados';
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
  grupoGrados.append(rotuloGrados, casillas);

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

  formulario.append(
    grupoNombre,
    grupoDui,
    grupoNip,
    grupoFecha,
    grupoRol,
    grupoCorreo,
    grupoGrados,
    lineaError,
    pie,
  );

  // El botón Guardar y la tecla Enter pasan por aquí.
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    void guardarDocente(formulario, docente, lineaError, botonGuardar);
  });

  abrirModal(
    esEdicion ? 'Editar docente' : 'Agregar docente',
    [formulario],
  );
}

/** Modal de solo lectura con TODA la información del docente. */
function verDocente(docente: Docente): void {
  const filas: [string, string][] = [
    ['Nombre', textoSeguro(docente.nombre)],
    ['DUI', textoSeguro(docente.dui)],
    ['NIP', textoSeguro(docente.nip)],
    ['Fecha de nacimiento', textoSeguro(docente.fechaNacimiento)],
    ['Correo', textoSeguro(docente.correo)],
    ['Rol', textoSeguro(docente.rol)],
    ['Grados asignados', listaSegura(docente.gradosAsignados).join(', ')],
    ['Archivado', booleanoSeguro(docente.archivado) ? 'Sí' : 'No'],
  ];

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
  SECCIÓN 8 · LISTADO Y VISTA (NO EDITAR)
============================================================ */

/** Botón pequeño de acción dentro de una fila. */
function crearBotonAccion(texto: string, accion: () => void): HTMLButtonElement {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'docentes-accion';
  boton.textContent = texto;
  boton.addEventListener('click', accion);
  return boton;
}

/** Fila del listado (4 datos + acciones). Archivadas solo
 *  muestran Ver y Restaurar. */
function crearFilaDocente(docente: Docente, archivado: boolean): HTMLElement {
  const fila = document.createElement('div');
  fila.className = 'docentes-fila';

  const celdas: [string, boolean][] = [
    [textoSeguro(docente.nombre), true],
    [textoSeguro(docente.dui), false],
    [textoSeguro(docente.nip), false],
    [textoSeguro(docente.fechaNacimiento), false],
  ];
  for (const [valor, esNombre] of celdas) {
    const celda = document.createElement('span');
    celda.className =
      'docentes-celda' + (esNombre ? ' docentes-celda-nombre' : '');
    celda.textContent = valor; // en blanco si no existe el dato
    fila.appendChild(celda);
  }

  const acciones = document.createElement('div');
  acciones.className = 'docentes-acciones';
  if (archivado) {
    acciones.appendChild(
      crearBotonAccion('Ver', () => {
        verDocente(docente);
      }),
    );
    acciones.appendChild(
      crearBotonAccion('Restaurar', () => {
        void archivarDocente(docente, false);
      }),
    );
  } else {
    acciones.appendChild(
      crearBotonAccion('Ver', () => {
        verDocente(docente);
      }),
    );
    acciones.appendChild(
      crearBotonAccion('Editar', () => {
        abrirModalFormulario(docente);
      }),
    );
    acciones.appendChild(
      crearBotonAccion('Eliminar', () => {
        eliminarDocente(docente);
      }),
    );
    acciones.appendChild(
      crearBotonAccion('Archivar', () => {
        void archivarDocente(docente, true);
      }),
    );
  }
  fila.appendChild(acciones);
  return fila;
}

/** Construye la vista completa de Docentes y la devuelve para
 *  que content.ts la cuelgue del contenedor de vistas. */
export function crearVistaDocentes(): HTMLElement {
  const vista = document.createElement('div');
  vista.className = 'vista-docentes';

  // Permisos: la sección es solo para admin y director.
  if (!sesionAutorizada()) {
    const aviso = document.createElement('p');
    aviso.className = 'docentes-vacio';
    aviso.textContent = 'No tienes permiso para ver esta sección.';
    vista.appendChild(aviso);
    contenedorVista = null;
    return vista;
  }

  // --- Botonera (queda a la par del título de la vista) ---
  const botonera = document.createElement('div');
  botonera.className = 'docentes-botonera';
  const botonAgregar = document.createElement('button');
  botonAgregar.type = 'button';
  botonAgregar.className = 'boton-primario';
  botonAgregar.textContent = 'Agregar docente';
  botonAgregar.addEventListener('click', () => {
    abrirModalFormulario(null);
  });
  botonera.appendChild(botonAgregar);

  // --- Listado principal ---
  const lista = document.createElement('div');
  lista.id = 'docentes-lista';
  lista.className = 'docentes-lista';

  // --- Apartado de archivados (colapsado por defecto) ---
  const archivados = document.createElement('details');
  archivados.id = 'docentes-archivados';
  archivados.className = 'docentes-archivados';
  const resumen = document.createElement('summary');
  resumen.textContent = 'Archivados';
  const cuerpoArchivados = document.createElement('div');
  cuerpoArchivados.id = 'docentes-archivados-cuerpo';
  archivados.append(resumen, cuerpoArchivados);

  vista.append(botonera, lista, archivados);
  contenedorVista = vista;
  void cargarDocentes();
  return vista;
}

/** Compatibilidad: si tu content.ts monta la vista con
 *  montarDocentes(contenedor), sigue funcionando igual. */
export function montarDocentes(contenedor: HTMLElement): void {
  contenedor.appendChild(crearVistaDocentes());
}