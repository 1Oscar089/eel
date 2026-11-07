/* ============================================================
  sincronizacionDocentes.ts — Puente Firebase ↔ Google Sheets
  ------------------------------------------------------------
  Este archivo concentra TODO lo nuevo de la ENTRADA 25:

  1) CACHÉ EN localStorage: la lista de docentes se guarda en el
     navegador. Al abrir la sección se pinta desde aquí SIN
     gastar lecturas de Firestore.

  2) ESCUCHA EN TIEMPO REAL (onSnapshot): la app NO consulta al
     servidor a cada rato; Firestore avisa SOLO cuando un
     documento cambia (desde esta computadora o desde otro
     dispositivo) y entrega únicamente los documentos que
     cambiaron. Con eso se actualiza la fila y el modal sin
     recargar la vista.

  3) ENVÍO A LA HOJA DE CÁLCULO (Apps Script): cada guardar,
     archivar/restaurar o eliminar se copia a la pestaña
     "Docentes" de la hoja "DB Docentes" en Google Drive. También
     hay función de MIGRACIÓN para pasar los docentes que YA
     existen en Firebase, y una prueba de conexión.

  CÓMO SE CONECTA (pasos numerados de la entrega):
  - En Drive: Mi unidad / Expediente en Línea / Base de datos /
    DB Docentes (hoja de cálculo con el Apps Script adjunto).
  - Se publica como Aplicación web y se copia la URL /exec.
  - Pega la URL y el TOKEN abajo, en SECCIÓN 2 · EDITA AQUÍ.
    Si quedan vacíos, la app sigue funcionando normal con
    Firebase: solo no escribe en la hoja.
  - Las llamadas se envían como text/plain para que el navegador
    NO haga la pregunta previa (preflight CORS), que Apps Script
    no contesta. Con eso el POST entra directo a la hoja.
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

/* ============================================================
  SECCIÓN 2 · CONFIGURACIÓN (EDITA AQUÍ)
============================================================ */

/** URL de la Aplicación web del Apps Script (termina en /exec).
 *  Se copia al desplegar (PASO 3 de la entrega). Si queda vacía
 *  la hoja queda apagada y la app sigue solo con Firebase. */
export const URL_WEB_APP = 'https://script.google.com/macros/s/AKfycbyN0R-SEUcOEpWVUFANsth13Uf8RMRDoKIhm1I3gOF6-FEtJc7ov_jzyMiFaVTUeS8Ucw/exec';

/** TOKEN secreto: el MISMO texto que quedó en la constante TOKEN
 *  del Codigo.gs. Es la llave que evita que cualquiera escriba
 *  en tu hoja. */
export const TOKEN_WEB_APP = 'EEL-DB-DOCENTES-2026';

/** Proyecto de Firebase y colección de docentes (mismos valores
 *  que usa docentes.ts). */
const PROYECTO_FIREBASE = 'proyecto1';
const COLECCION_DOCENTES = 'profesores';

/** Clave del caché en localStorage. */
const CLAVE_CACHE = 'eel-docentes-cache-v1';

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
  SECCIÓN 6 · ENVÍO A LA HOJA DE CÁLCULO (NO EDITAR)
============================================================ */

/** ¿La hoja ya está configurada? (URL y token pegados arriba) */
export function sheetConfigurado(): boolean {
  return URL_WEB_APP.trim() !== '';
}

/** POST al Apps Script como text/plain (evita el preflight CORS
 *  que Apps Script no contesta). Devuelve true si la hoja dijo
 *  ok:true. */
async function llamarHoja(cuerpo: Record<string, unknown>): Promise<boolean> {
  if (!sheetConfigurado()) return false;
  try {
    const respuesta = await fetch(URL_WEB_APP, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(cuerpo),
    });
    const datos = (await respuesta.json()) as { ok?: unknown };
    return datos.ok === true;
  } catch {
    return false;
  }
}

/** Crea o actualiza la fila del docente (guardar / editar /
 *  archivar / restaurar). El Apps Script actualiza SOLO las
 *  columnas que llegan: sirve tanto para un docente completo
 *  (al guardar) como para un cambio parcial (solo archivado). */
export function enviarDocenteAlSheet(docente: DocenteHoja): Promise<boolean> {
  return llamarHoja({ token: TOKEN_WEB_APP, accion: 'upsert', docente });
}

/** Borra la fila del docente eliminado en Firebase. */
export function enviarEliminacionAlSheet(id: string): Promise<boolean> {
  return llamarHoja({ token: TOKEN_WEB_APP, accion: 'eliminar', id });
}

/** MIGRACIÓN: pasa TODOS los docentes de Firebase a la hoja
 *  (reemplaza las filas de la pestaña Docentes). Es el botón
 *  "Pasar Firebase al Sheet" que solo ve el admin. */
export function migrarDocentesAlSheet(
  docentes: DocenteHoja[],
): Promise<boolean> {
  return llamarHoja({ token: TOKEN_WEB_APP, accion: 'migrar', docentes });
}

/** Prueba de conexión (GET con token). Devuelve true si la hoja
 *  respondió ok:true. Es el botón "Probar conexión" del admin. */
export async function probarConexionSheet(): Promise<boolean> {
  if (!sheetConfigurado()) return false;
  try {
    const respuesta = await fetch(
      URL_WEB_APP + '?token=' + encodeURIComponent(TOKEN_WEB_APP),
    );
    const datos = (await respuesta.json()) as { ok?: unknown };
    return datos.ok === true;
  } catch {
    return false;
  }
}