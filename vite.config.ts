/* ============================================================
  vite.config.ts — Configuración de Vite (ENTRADA 28)
  ------------------------------------------------------------
  Divide el build en archivos separados para que NINGUNO pase
  de 500 kB y desaparezca el aviso del chunk grande.

  El SDK de Firebase (Firestore + Auth) pesa ~560 kB: si va
  junto con el código de la app en un solo archivo, Vite lo
  avisa. Con codeSplitting (la API de Rolldown en Vite 8, que
  reemplaza al manualChunks de antes) Firebase vive en sus
  PROPIOS chunks. Beneficio extra: Firebase casi nunca cambia,
  así que el navegador lo reutiliza y solo vuelve a descargar
  el código de la app cuando publicas cambios.
============================================================ */

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              // Firestore: el módulo más pesado del SDK.
              name: 'fb-firestore',
              test: /[\\/]node_modules[\\/]@firebase[\\/](firestore|firestore-)/,
              priority: 2,
            },
            {
              // El resto del SDK de Firebase (Auth, utilidades...).
              name: 'fb-auth',
              test: /[\\/]node_modules[\\/]@firebase[\\/]/,
              priority: 1,
            },
            {
              // El paquete "firebase" (envoltorio que reexporta).
              name: 'firebase',
              test: /[\\/]node_modules[\\/](@firebase|firebase)[\\/]/,
              priority: 0,
            },
          ],
        },
      },
    },
  },
});