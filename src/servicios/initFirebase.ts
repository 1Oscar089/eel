import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
// Importa aquí los servicios que necesites usar (ej. getAuth, getFirestore, etc.)
// import { getAuth } from 'firebase/auth';

// Definimos los nombres de tus 6 proyectos (puedes cambiar las claves o nombres a tu gusto)
export type ProjectName = 'proyecto1' | 'proyecto2' | 'proyecto3' | 'proyecto4' | 'proyecto5' | 'proyecto6';

// Caché para no reinicializar la app varias veces si se solicita el mismo proyecto
const initializedApps: Record<string, FirebaseApp> = {};

export function getFirebaseApp(projectName: ProjectName): FirebaseApp {
  if (initializedApps[projectName]) {
    return initializedApps[projectName];
  }

  let config;

  // Asignamos las credenciales según el proyecto seleccionado mediante variables de entorno
  switch (projectName) {
    case 'proyecto1':
      config = {
        apiKey: import.meta.env.VITE_P1_API_KEY,
        authDomain: import.meta.env.VITE_P1_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_P1_PROJECT_ID,
        storageBucket: import.meta.env.VITE_P1_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_P1_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_P1_APP_ID,
      };
      break;

    case 'proyecto2':
      config = {
        apiKey: import.meta.env.VITE_P2_API_KEY,
        authDomain: import.meta.env.VITE_P2_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_P2_PROJECT_ID,
        storageBucket: import.meta.env.VITE_P2_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_P2_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_P2_APP_ID,
      };
      break;

    case 'proyecto3':
      config = {
        apiKey: import.meta.env.VITE_P3_API_KEY,
        authDomain: import.meta.env.VITE_P3_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_P3_PROJECT_ID,
        storageBucket: import.meta.env.VITE_P3_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_P3_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_P3_APP_ID,
      };
      break;

    case 'proyecto4':
      config = {
        apiKey: import.meta.env.VITE_P4_API_KEY,
        authDomain: import.meta.env.VITE_P4_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_P4_PROJECT_ID,
        storageBucket: import.meta.env.VITE_P4_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_P4_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_P4_APP_ID,
      };
      break;

    case 'proyecto5':
      config = {
        apiKey: import.meta.env.VITE_P5_API_KEY,
        authDomain: import.meta.env.VITE_P5_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_P5_PROJECT_ID,
        storageBucket: import.meta.env.VITE_P5_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_P5_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_P5_APP_ID,
      };
      break;

    case 'proyecto6':
      config = {
        apiKey: import.meta.env.VITE_P6_API_KEY,
        authDomain: import.meta.env.VITE_P6_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_P6_PROJECT_ID,
        storageBucket: import.meta.env.VITE_P6_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_P6_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_P6_APP_ID,
      };
      break;

    default:
      throw new Error(`Proyecto de Firebase desconocido: ${projectName}`);
  }

  // Verificamos si la app con un nombre único ya fue inicializada en Firebase para evitar colisiones
  const appName = `app-${projectName}`;
  const existingApps = getApps();
  const existingApp = existingApps.find(app => app.name === appName);

  if (existingApp) {
    initializedApps[projectName] = existingApp;
    return existingApp;
  }

  // Inicializamos y guardamos en caché
  const newApp = initializeApp(config, appName);
  initializedApps[projectName] = newApp;
  return newApp;
}