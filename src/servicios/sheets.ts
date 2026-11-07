/* ============================================================
  sheets.ts — REGISTRO CENTRAL DE HOJAS DE GOOGLE SHEETS
  ------------------------------------------------------------
  (ENTRADA 27) En el proyecto habrá VARIAS hojas de Google
  Sheets (una para Docentes, después otras para Estudiantes,
  Notas, etc.). Cada hoja tiene SU PROPIA Aplicación web de
  Apps Script y por tanto SU PROPIO par de claves:

        URL /exec  +  TOKEN secreto

  Esas claves NO viven en el código: viven en .env.local (en
  tu computadora) o en los GitHub Secrets (al compilar en
  GitHub), con este formato:

        VITE_SHEET_<NOMBRE>_URL=https://script.google.com/.../exec
        VITE_SHEET_<NOMBRE>_TOKEN=SuTokenSecreto

  Este archivo es el ÚNICO punto donde la app sabe qué hojas
  existen. Para conectar una hoja NUEVA solo hay que:
    1) Agregar sus 2 líneas en .env.local.
    2) Escribir su nombre en la lista NOMBRES_HOJAS (abajo).
  Cualquier módulo de la app la usa con:
    configuracionHoja('ESTUDIANTES')  →  { url, token }
    hojaConfigurada('ESTUDIANTES')    →  true / false

  Si a una hoja le faltan sus claves, esa hoja simplemente
  queda apagada y la app sigue funcionando normal con
  Firebase, SIN errores y SIN avisos en pantalla.
============================================================ */

/* ============================================================
  SECCIÓN 1 · NOMBRES DE LAS HOJAS DEL PROYECTO (EDITA AQUÍ)
------------------------------------------------------------
  Cada vez que crees una hoja nueva de Google Sheets (con su
  Apps Script y su URL /exec), agrega su nombre aquí EN
  MAYÚSCULAS Y SIN ESPACIOS. Debe coincidir con lo que pusiste
  en .env.local después de VITE_SHEET_.

  Ejemplo: si en .env.local pusiste
      VITE_SHEET_ESTUDIANTES_URL=...
      VITE_SHEET_ESTUDIANTES_TOKEN=...
  entonces aquí agregas la línea  'ESTUDIANTES',
============================================================ */

export const NOMBRES_HOJAS = [
  'DOCENTES', // ← Hoja "DB Docentes" (ya creada, ENTRADA 25).
  // 'ESTUDIANTES', // ← Descomenta cuando crees esa hoja.
  // 'NOTAS',       // ← Descomenta cuando crees esa hoja.
] as const;

/** Nombre válido de hoja (TypeScript solo acepta los de la
 *  lista de arriba: si escribes uno mal, tsc te avisa). */
export type NombreHoja = (typeof NOMBRES_HOJAS)[number];

/* ============================================================
  SECCIÓN 2 · LECTURA DE CLAVES (NO EDITAR)
============================================================ */

/** Interfaz mínima de una hoja configurada. */
export interface ConfigHoja {
  /** URL /exec de la Aplicación web del Apps Script ('' si no
   *  está configurada). */
  url: string;
  /** TOKEN secreto de esa hoja ('' si no está configurada). */
  token: string;
}

/** Lee UNA variable de .env.local por su nombre exacto.
 *  Se usa porque los nombres de las hojas se arman dinámicamente
 *  (VITE_SHEET_DOCENTES_URL, VITE_SHEET_NOTAS_URL, ...) y así
 *  TypeScript no se queja con los nombres futuros. Devuelve ''
 *  si la clave no existe. */
function leerEnv(clave: string): string {
  const entorno = import.meta.env as unknown as Record<
    string,
    string | undefined
  >;
  const valor = entorno[clave];
  return typeof valor === 'string' ? valor.trim() : '';
}

/* ============================================================
  SECCIÓN 3 · API PARA TODO EL PROYECTO (NO EDITAR)
============================================================ */

/** Devuelve la { url, token } de UNA hoja por su nombre.
 *  Si la hoja no tiene claves en .env.local, devuelve las dos
 *  cadenas vacías (hoja apagada; la app sigue con Firebase). */
export function configuracionHoja(nombre: NombreHoja): ConfigHoja {
  let url = leerEnv('VITE_SHEET_' + nombre + '_URL');
  let token = leerEnv('VITE_SHEET_' + nombre + '_TOKEN');

  // COMPATIBILIDAD con la ENTRADA 26: si DOCENTES todavía tiene
  // las claves viejas (VITE_APPS_SCRIPT_URL / _TOKEN) y aún no
  // renombraste a VITE_SHEET_DOCENTES_..., funcionan igual.
  // Cuando renombres, este bloque queda sin efecto.
  if (nombre === 'DOCENTES' && url === '' && token === '') {
    url = leerEnv('VITE_APPS_SCRIPT_URL');
    token = leerEnv('VITE_APPS_SCRIPT_TOKEN');
  }

  return { url, token };
}

/** ¿Esa hoja ya tiene URL y TOKEN en .env.local (o en los
 *  GitHub Secrets del build)? true = puede hablarse con ella. */
export function hojaConfigurada(nombre: NombreHoja): boolean {
  const config = configuracionHoja(nombre);
  return config.url !== '' && config.token !== '';
}