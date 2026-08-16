import AppleHealthKit, { HealthInputOptions, HealthKitPermissions } from 'react-native-health';

// 1. Definimos exactamente qué datos queremos leer del teléfono
const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.BodyFatPercentage,
      AppleHealthKit.Constants.Permissions.Steps,
    ],
    write: [], // Por ahora no escribiremos datos, solo leeremos
  },
};

// 2. Función para inicializar y pedir permisos al usuario
export const initializeHealthKit = (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          // Si el código no está firmado por una cuenta de pago, entrará aquí de forma segura
          console.log('[HealthKit] Acceso denegado o sin firma válida de Entitlements:', error);
          resolve(false); 
          return;
        }
        resolve(true); // Éxito (Si en el futuro usas una cuenta de Apple Developer)
      });
    } catch (e) {
      console.log('[HealthKit] Error de ejecución nativa capturado:', e);
      resolve(false); // Retorna falso para que tu HomeScreen no colapse
    }
  });
};

// 3. NUEVA FUNCIÓN: Extraer los pasos del día de hoy
export const getTodaySteps = (): Promise<number> => {
  return new Promise((resolve) => {
    
    // AQUÍ USAMOS HealthInputOptions
    // Le decimos a Apple Health exactamente qué rango de datos queremos
    const options: HealthInputOptions = {
      date: new Date().toISOString(), // La fecha de hoy
      includeManuallyAdded: true,     // Incluir pasos que hayas agregado manualmente a tu iPhone
    };

    // Ejecutamos la consulta a la base de datos de salud
    AppleHealthKit.getStepCount(options, (error: string, results: any) => {
      if (error) {
        console.log('[ERROR] No se pudieron leer los pasos:', error);
        resolve(0); // Si hay un error, regresamos 0 pasos para que la app no falle
        return;
      }
      
      // Si la lectura es exitosa, regresamos la cantidad de pasos
      resolve(results.value);
    });
  });
};

// 4. NUEVA FUNCIÓN: Extraer el último peso registrado
export const getLatestWeight = (): Promise<string> => {
  return new Promise((resolve) => {
    // Pedimos el último dato registrado (limit: 1) ordenado del más nuevo al más viejo
    const options: HealthInputOptions = {
      unit: 'kilogram' as any,
      ascending: false,
      limit: 1,
    };

    AppleHealthKit.getLatestWeight(options, (error: string, results: any) => {
      if (error || !results || results.length === 0) {
        console.log('[ERROR] No se pudo leer el peso:', error);
        resolve('0');
        return;
      }
      
      // Convertimos el número a texto con un decimal (ej. "75.2")
      const weightString = results[0].value.toFixed(1);
      resolve(weightString);
    });
  });
};

// 5. NUEVA FUNCIÓN: Extraer el último porcentaje de grasa corporal
export const getLatestBodyFat = (): Promise<string> => {
  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      ascending: false,
      limit: 1,
    };

    AppleHealthKit.getLatestBmi(options, (error: string, results: any) => {
      // Nota: getLatestBmi en react-native-health a veces se usa como fallback para grasa 
      // dependiendo de la versión, pero la constante correcta para grasa corporal es getLatestBodyFatPercentage
      // Usaremos el método oficial de la librería si está disponible
    });

    AppleHealthKit.getLatestBodyFatPercentage(options, (error: string, results: any) => {
      if (error || !results || results.length === 0) {
        console.log('[ERROR] No se pudo leer la grasa corporal:', error);
        resolve('0');
        return;
      }
      
      const bodyFatString = results[0].value.toFixed(1);
      resolve(bodyFatString);
    });
  });
};