import { getFirebaseApp, ProjectName } from './servicios/initFirebase';

/**
 * Función para probar la inicialización de un proyecto de Firebase.
 */
export function testSingleProject(projectName: ProjectName) {
  try {
    const app = getFirebaseApp(projectName);
    const options = app.options;

    // Verificar si las credenciales cargaron de las variables de entorno
    if (!options.apiKey || options.apiKey.includes('undefined')) {
      console.error(`❌ [${projectName}] ERROR: Faltan las variables de entorno (API Key no encontrada).`);
      return false;
    }

    console.log(`✅ [${projectName}] Inicializado con éxito:`);
    console.log(`   - App Name: ${app.name}`);
    console.log(`   - Project ID: ${options.projectId}`);
    return true;
  } catch (error) {
    console.error(`❌ [${projectName}] Falló la inicialización:`, error);
    return false;
  }
}

/**
 * Función para probar los 6 proyectos a la vez.
 */
export function testAllFirebaseProjects() {
  console.log('🚀 Iniciando prueba de configuración de Firebase...\n---------------------------------------------');
  
  const projects: ProjectName[] = [
    'proyecto1',
    'proyecto2',
    'proyecto3',
    'proyecto4',
    'proyecto5',
    'proyecto6'
  ];

  let successCount = 0;

  projects.forEach((proj) => {
    const success = testSingleProject(proj);
    if (success) successCount++;
  });

  console.log('---------------------------------------------');
  console.log(`📊 Resultado: ${successCount}/${projects.length} proyectos configurados correctamente.`);
}