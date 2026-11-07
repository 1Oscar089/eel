/* ============================================================
  sincronizacionDocentes.ts — Puente Firebase ↔ Google Sheets
  ------------------------------------------------------------
  Este archivo concentra el puente con la hoja "DB Docentes" y
  la caché local (ENTRADAS 25, 26 y 27):

  1) CACHÉ EN localStorage: la lista de docentes se guarda en el
     navegador. Al abrir la sección se pinta desde aquí SIN
     gastar lecturas de Firestore.

  2) ESCUCHA EN TIEMPO REAL (onSnapshot): la app NO consulta al
     servidor a cada rato; Firestore avisa SOLO cuando un
     documento cambia (desde esta computadora o desde otro
     dispositivo) y entrega únicamente los documentos que
     cambiaron. Con eso se actualiza la fila y el modal sin
     recargar la vista.

  3) ENVÍO EN SILENCIO A LA HOJA (Apps Script): cada guardar,
     archivar/restaurar o eliminar se copia a la pestaña
     "Docentes" de la hoja "DB Docentes" en Google Drive SIN
     botones, SIN avisos y SIN bloquear nada. La MIGRACIÓN de
     los docentes que YA existen en Firebase también corre
     sola, UNA vez por navegador (migrarSiPendiente).

  DÓNDE VAN LA URL Y EL TOKEN (ENTRADAS 26 y 27 — ya NO se
  pegan aquí): este módulo ya NO lee las claves directamente;
  las pide al registro central servicios/sheets.ts, que
  soporta VARIAS hojas (cada una con su propio URL y TOKEN):
  · En tu computadora: archivo .env.local en la RAÍZ del
    proyecto:
      VITE_SHEET_DOCENTES_URL=https://script.google.com/macros/s/XXXX/exec
      VITE_SHEET_DOCENTES_TOKEN=MiTokenSecretoDeDocentes
  · En GitHub: Settings → Secrets and variables → Actions, con
    esos MISMOS nombres (el build los recibe con env en el
    workflow).
  · Si faltan, la app sigue funcionando normal con Firebase:
    solo no escribe en la hoja. Todo queda invisible.
  · Las claves viejas VITE_APPS_SCRIPT_URL/_TOKEN de la
    ENTRADA 26 también funcionan (compatibilidad en sheets.ts).

  DETALLE TÉCNICO: las llamadas se envían como text/plain para
  que el navegador NO haga la pregunta previa (preflight CORS),
  que Apps Script no contesta. Con eso el POST entra directo a
  la hoja.
============================================================ */

/* ============================================================
  SECCIÓN 1 · IMPORTS (NO EDITAR)
============================================================ */
import {
  collection,
  onSnapshot,
  getFirestore,
} from 'firebase/firestore';
import { getFirebaseApp } from './initFirebase';
import {
  configuracionHoja,
  hojaConfigurada,
} from './sheets';

/* ============================================================
  SECCIÓN 2 · CONFIGURACIÓN (SE LEE DE .env.local — NO EDITAR)
============================================================ */

/** Claves de ESTA hoja ("DOCENTES" en el registro central
 *  servicios/sheets.ts). NO se escriben aquí: viven en
 *  .env.local o en los GitHub Secrets. Si faltan, la hoja
 *  queda apagada y la app sigue solo con Firebase, sin avisos
 *  de ningún tipo. */
const HOJA = configuracionHoja('DOCENTES');

/** ¿La hoja de docentes está lista para usarse?
 *  (URL y TOKEN presentes en .env.local o GitHub Secrets). */
const HOJA_LISTA: boolean = hojaConfigurada('DOCENTES');

/** Proyecto de Firebase y colección de docentes (mismos valores
 *  que usa docentes.ts). */
const PROYECTO_FIREBASE = 'proyecto1';
const COLECCION_DOCENTES = 'profesores';

/** Clave del caché en localStorage. */
const CLAVE_CACHE = 'eel-docentes-cache-v1';

/** Clave que recuerda que la migración Firebase → hoja ya se
 *  hizo en ESTE navegador (corre UNA sola vez por dispositivo). */
const CLAVE_MIGRADO = 'eel-sheet-migrado-v1';

/* ============================================================
  SECCIÓN 3 · TIPOS (NO EDITAR)
============================================================ */

/** Docente "crudo" para la caché y la hoja: id + campos unknown
 *  (pueden faltar o venir en otro tipo; nunca rompe el flujo). */
export interface DocenteHoja {
  id: string;
  [campo: string]: unknown;
}

/** Un cambio recibido del servidor (SOLO lo que cambió). */
export interface CambioDocente {
  tipo: 'agregado' | 'modificado' | 'eliminado';
  id: string;
  /** Datos NUEVOS del documento (null cuando se eliminó). */
  datos: DocenteHoja | null;
}

/* ============================================================
  SECCIÓN 4 · CACHÉ EN localStorage (NO EDITAR)
============================================================ */

/** Lee la lista guardada en el navegador ([] si no hay nada o el
 *  dato está corrupto: nunca rompe el flujo). */
export function leerCache(): DocenteHoja[] {
  try {
    const cruda = localStorage.getItem(CLAVE_CACHE);
    if (cruda === null) return [];
    const datos = JSON.parse(cruda) as unknown;
    if (!Array.isArray(datos)) return [];
    return datos
      .filter(
        (elemento): elemento is Record<string, unknown> =>
          elemento !== null && typeof elemento === 'object',
      )
      .map((objeto) => {
        const id = typeof objeto.id === 'string' ? objeto.id : '';
        return { id, ...objeto } as DocenteHoja;
      })
      .filter((docente) => docente.id !== '');
  } catch {
    return [];
  }
}

/** Guarda la lista completa en el navegador (se llama en cada
 *  aviso del snapshot, así la caché SIEMPRE está al día). */
export function guardarCache(lista: DocenteHoja[]): void {
  try {
    localStorage.setItem(CLAVE_CACHE, JSON.stringify(lista));
  } catch {
    // Si el navegador bloquea localStorage, la app sigue normal.
  }
}

/* ============================================================
  SECCIÓN 5 · ESCUCHA EN TIEMPO REAL (NO EDITAR)
============================================================ */

/** Se SUSCRIBE a la colección de docentes. Firestore entrega la
 *  lista completa SOLO la primera vez y después avisa únicamente
 *  de los documentos que cambian (aquí o en otro dispositivo).
 *  Cada aviso llega con la lista completa (para el estado y la
 *  caché) y con la lista de CAMBIOS (para tocar solo esas filas).
 *  Devuelve la función para dejar de escuchar (se llama al salir
 *  de la sección Docentes). */
export function suscribirseDocentes(
  alCambiar: (lista: DocenteHoja[], cambios: CambioDocente[]) => void,
  alFallar?: (error: unknown) => void,
): () => void {
  const db = getFirestore(getFirebaseApp(PROYECTO_FIREBASE));
  return onSnapshot(
    collection(db, COLECCION_DOCENTES),
    (snapshot) => {
      const lista: DocenteHoja[] = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));
      const cambios: CambioDocente[] = snapshot
        .docChanges()
        .map((cambio) => ({
          tipo:
            cambio.type === 'added'
              ? 'agregado'
              : cambio.type === 'modified'
                ? 'modificado'
                : 'eliminado',
          id: cambio.doc.id,
          datos:
            cambio.type === 'removed'
              ? null
              : ({ id: cambio.doc.id, ...cambio.doc.data() } as DocenteHoja),
        }));
      guardarCache(lista);
      alCambiar(lista, cambios);
    },
    (error) => {
      if (alFallar !== undefined) alFallar(error);
      else console.error(error);
    },
  );
}

/* ============================================================
  SECCIÓN 6 · ENVÍO EN SILENCIO A LA HOJA (NO EDITAR)
============================================================ */

/** ¿La hoja ya está configurada? (URL y token en .env.local,
 *  GitHub Secrets o las claves viejas de la ENTRADA 26). */
export function sheetConfigurado(): boolean {
  return HOJA_LISTA;
}

/** POST al Apps Script como text/plain (evita el preflight CORS
 *  que Apps Script no contesta). Devuelve true si la hoja dijo
 *  ok:true. TODO falla EN SILENCIO: solo una línea en consola
 *  para poder depurar; la interfaz jamás se entera. */
async function llamarHoja(cuerpo: Record<string, unknown>): Promise<boolean> {
  if (!HOJA_LISTA) return false;
  try {
    const respuesta = await fetch(HOJA.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(cuerpo),
    });
    const datos = (await respuesta.json()) as { ok?: unknown };
    return datos.ok === true;
  } catch (fallo) {
    console.warn('[Hoja] No respondió (Firebase sigue normal):', fallo);
    return false;
  }
}

/** Crea o actualiza la fila del docente (guardar / editar /
 *  archivar / restaurar). El Apps Script actualiza SOLO las
 *  columnas que llegan: sirve tanto para un docente completo
 *  (al guardar) como para un cambio parcial (solo archivado). */
export function enviarDocenteAlSheet(docente: DocenteHoja): Promise<boolean> {
  return llamarHoja({ token: HOJA.token, accion: 'upsert', docente });
}

/** Borra la fila del docente eliminado en Firebase. */
export function enviarEliminacionAlSheet(id: string): Promise<boolean> {
  return llamarHoja({ token: HOJA.token, accion: 'eliminar', id });
}

/** MIGRACIÓN completa: reemplaza las filas de la pestaña
 *  "Docentes" con TODOS los docentes que llegan (los que ya
 *  existían en Firebase). La llama migrarSiPendiente(); ya no
 *  tiene botón. */
export function migrarDocentesAlSheet(
  docentes: DocenteHoja[],
): Promise<boolean> {
  return llamarHoja({ token: HOJA.token, accion: 'migrar', docentes });
}

/** MIGRACIÓN INTERNA (invisible): pasa TODOS los docentes que ya
 *  existen en Firebase a la hoja. Se llama con la primera lista
 *  que llega de Firestore y corre UNA sola vez por navegador
 *  (la marca queda en localStorage). Sin botones, sin spinner y
 *  sin notificaciones: si la hoja no está configurada o la
 *  migración falla, la app sigue igual y se volverá a intentar
 *  la próxima vez que se abra Docentes. */
export function migrarSiPendiente(lista: DocenteHoja[]): void {
  if (!sheetConfigurado()) return;
  if (lista.length === 0) return;
  try {
    if (localStorage.getItem(CLAVE_MIGRADO) === '1') return;
  } catch {
    return;
  }
  void migrarDocentesAlSheet(lista).then((ok) => {
    if (!ok) return;
    try {
      localStorage.setItem(CLAVE_MIGRADO, '1');
    } catch {
      // Sin localStorage la app sigue normal (migrará otra vez).
    }
  });
}