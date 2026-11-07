/// <reference types="vite/client" />

/* ============================================================
  env.d.ts — Claves de entorno tipadas (ENTRADAS 26 y 27)
  ------------------------------------------------------------
  Declara las claves que la app lee de .env.local (en tu
  computadora) o de los GitHub Secrets (al compilar en GitHub).
  Así TypeScript reconoce import.meta.env.VITE_... y valida el
  nombre exacto de cada clave.

  ENTRADA 27: ahora el proyecto soporta VARIAS hojas de Google
  Sheets, cada una con su par URL + TOKEN (formato
  VITE_SHEET_<NOMBRE>_URL / _TOKEN). Las claves de las hojas se
  leen por su nombre dinámicamente desde servicios/sheets.ts,
  así que las hojas NUEVAS no necesitan declararse aquí; basta
  con agregarlas a .env.local y a la lista NOMBRES_HOJAS de
  sheets.ts. (Si quieres autocompletado para una hoja nueva,
  agrega sus dos claves aquí igual que las de DOCENTES.)

  Las claves VITE_P1_... a VITE_P6_... de Firebase NO se
  declaran aquí: vite/client ya las reconoce.
============================================================ */

interface ImportMetaEnv {
  /* ---- Hoja "DB Docentes" (registro central: sheets.ts) ---- */
  /** URL /exec de la Aplicación web del Apps Script de DOCENTES. */
  readonly VITE_SHEET_DOCENTES_URL: string | undefined;
  /** TOKEN secreto de la hoja DOCENTES (el MISMO texto de la
   *  constante TOKEN de SU Codigo.gs). */
  readonly VITE_SHEET_DOCENTES_TOKEN: string | undefined;

  /* ---- Claves ANTIGUAS de la ENTRADA 26 (compatibilidad) ----
     Solo se usan si aún no renombraste a VITE_SHEET_DOCENTES_... */
  readonly VITE_APPS_SCRIPT_URL: string | undefined;
  readonly VITE_APPS_SCRIPT_TOKEN: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}