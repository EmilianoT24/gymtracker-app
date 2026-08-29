import { ActiveExercise, Exercise, HistoryRecord, WorkoutCoachSuggestion } from '../types/workout.types';

// 1. REGLAS CONSTANTES DEL NEGOCIO (Techos de volumen)
const VOLUME_LIMITS = {
  session: {
    large_muscle: { max: 8 }, 
    small_muscle: { max: 6 }  
  },
  week: {
    large_muscle: { max: 20 }, // 18-20 series
    small_muscle: { max: 14 }  // 12-14 series
  }
};

// 2. MODULADOR NUTRICIONAL (Porcentaje de ajuste sobre el volumen máximo)
const NUTRITION_MODIFIERS = {
  deficit: 0.7,      // Reduce los topes al 70% (Ej: 20 -> 14 series)
  mantenimiento: 1.0, // Mantiene los topes al 100%
  superavit: 1.1      // Permite un poco más de volumen (110%)
};

export type NutritionPhase = 'deficit' | 'mantenimiento' | 'superavit';

const LARGE_MUSCLES = ['Pecho', 'Espalda', 'Piernas', 'Glúteos'];
// NUEVA FUNCIÓN: Sugerir configuración inicial al agregar un ejercicio
export const suggestExerciseSetup = (exercise: Exercise) => {
  if (exercise.exercise_type === 'compuesto') {
    return { sets: 3, reps: '6-8' }; // Rango para compuestos (Fuerza/Hipertrofia)
  } else {
    return { sets: 3, reps: '10-15' }; // Rango para aislamiento (Estrés metabólico)
  }
};

export const analyzeSessionVolume = (
  activeExercises: ActiveExercise[],
  database: Exercise[]
): WorkoutCoachSuggestion[] => {
  const suggestions: WorkoutCoachSuggestion[] = [];
  const muscleSetCount: Record<string, number> = {};

  activeExercises.forEach((activeEx) => {
    const dbExercise = database.find(ex => ex.id === activeEx.exerciseId);
    if (dbExercise) {
      const muscle = dbExercise.primary;
      const numSets = activeEx.sets.length;
      muscleSetCount[muscle] = (muscleSetCount[muscle] || 0) + numSets;
    }
  });

  Object.entries(muscleSetCount).forEach(([muscle, count]) => {
    const isLargeMuscle = LARGE_MUSCLES.includes(muscle);
    const limit = isLargeMuscle ? VOLUME_LIMITS.session.large_muscle.max : VOLUME_LIMITS.session.small_muscle.max;

    if (count > limit) {
      suggestions.push({
        id: `vol_warn_${muscle}_${Date.now()}`,
        type: 'volume_warning',
        message: `Llevas ${count} series de ${muscle}. El límite óptimo es ${limit}.`,
        actionLabel: `Reducir 1 serie`,
        // NUEVO: Enviamos el músculo exacto a la interfaz para que sepa qué borrar
        targetMuscle: muscle, 
      });
    }
  });

  return suggestions;
};

const FATIGUE_SCORE: Record<string, number> = {
  baja: 1,
  media: 2,
  alta: 3
};

export const suggestExerciseAlternatives = (
  targetExercise: Exercise, 
  database: Exercise[]
): Exercise[] => {
  
  // 1. Filtramos la base de datos completa
  const alternatives = database.filter((ex) => {
    // No sugerir el mismo ejercicio que ya queremos quitar
    if (ex.id === targetExercise.id) return false;
    
    // Regla: Mismo músculo principal y mismo patrón de movimiento
    const matchesTarget = 
      ex.primary === targetExercise.primary && 
      ex.movement_pattern === targetExercise.movement_pattern;
      
    return matchesTarget;
  });

  // 2. Ordenamos los resultados por fatiga (de menor a mayor)
  alternatives.sort((a, b) => {
    const scoreA = FATIGUE_SCORE[a.fatigue_tier] || 2; // Default a media si no se encuentra
    const scoreB = FATIGUE_SCORE[b.fatigue_tier] || 2;

    // Los números más pequeños (baja fatiga) irán hacia arriba en la lista
    return scoreA - scoreB;
  });

  return alternatives;
};

export const calculateProgressiveOverload = (
  exercise: Exercise,
  history: HistoryRecord[]
) => {
  // 1. Obtenemos el rango base recomendado (ej. { sets: 3, reps: '6-8' })
  const baseSetup = suggestExerciseSetup(exercise);
  
  // 2. Buscamos si el usuario ya ha registrado este ejercicio antes
  const pastRecords = history.filter(record => record.exerciseId === exercise.id);
  
  // Si no hay historial, devolvemos la sugerencia base con peso 0
  if (pastRecords.length === 0) {
    return {
      sets: baseSetup.sets,
      reps: baseSetup.reps, // Devuelve el texto "6-8" o "10-15"
      weight: '0'
    };
  }

  // 3. Ordenamos por fecha para obtener la sesión más reciente
  pastRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const lastSession = pastRecords[0];

  // 4. Analizamos el rango de repeticiones (convertimos "6-8" a números reales)
  const [minRepsStr, maxRepsStr] = baseSetup.reps.split('-');
  const maxRepsTarget = parseInt(maxRepsStr || '10', 10);
  const minRepsTarget = parseInt(minRepsStr || '8', 10);

  let suggestedWeight = lastSession.maxWeight;
  let suggestedReps = lastSession.maxReps;

  // 5. Aplicamos la regla estricta de Sobrecarga
  if (lastSession.maxReps >= maxRepsTarget) {
    // Topaste el rango: Aumentamos peso y reiniciamos repeticiones al mínimo
    suggestedWeight += 2.5; 
    suggestedReps = minRepsTarget;
  } else {
    // Aún no llegas al tope: Mismo peso, pero exigimos 1 repetición extra
    suggestedReps += 1;
  }

  return {
    sets: baseSetup.sets,
    reps: suggestedReps.toString(), // Lo convertimos a texto para el TextInput
    weight: suggestedWeight.toString()
  };
};

export const checkMissedDaysAndSuggest = (
  activeRoutine: any,
  exerciseHistory: any[],
  todayIndex: number // 0 = Lunes, 1 = Martes, ..., 5 = Sábado, 6 = Domingo
) => {
  if (!activeRoutine) return null;

  // REGLA ESTRICTA: Si es Lunes (0) empieza la semana limpia. Si es Domingo (6) es descanso sagrado.
  if (todayIndex === 0 || todayIndex === 6) return null;

  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  
  // Calculamos qué día fue ayer (ahora es seguro simplemente restar 1 porque filtramos el Lunes)
  const yesterdayIndex = todayIndex - 1;
  const yesterdayName = DAYS[yesterdayIndex];

  // Revisamos si ayer tocaba entrenar en la rutina base
  const yesterdayExercises = activeRoutine.days[yesterdayName] || [];
  
  if (yesterdayExercises.length > 0) {
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yYear = yesterdayDate.getFullYear();
    const yMonth = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
    const yDay = String(yesterdayDate.getDate()).padStart(2, '0');
    const yesterdayString = `${yYear}-${yMonth}-${yDay}`;

    const trainedYesterday = exerciseHistory.some((record: any) => record.date === yesterdayString);

    if (!trainedYesterday) {
      return {
        id: `missed_${yesterdayString}`,
        message: `Parece que tomaste un descanso ayer (${yesterdayName}). ¿Quieres recorrer tu calendario para no perder tu progreso? (Los cambios solo aplican hasta el Sábado).`,
        actionLabel: 'Recorrer Semana',
        missedDay: yesterdayName
      };
    }
  }

  return null;
};

const getMondayOfCurrentWeek = () => {
  const today = new Date();
  const day = today.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para que el Lunes sea el inicio
  const monday = new Date(today.setDate(diff));
  
  const yYear = monday.getFullYear();
  const yMonth = String(monday.getMonth() + 1).padStart(2, '0');
  const yDay = String(monday.getDate()).padStart(2, '0');
  
  return `${yYear}-${yMonth}-${yDay}`;
};

/**
 * GUARDIÁN DE VOLUMEN (Semana Completa)
 * Analiza el historial de la semana + sesión actual y aplica el modificador nutricional.
 */
export const analyzeWeeklyVolume = (
  activeExercises: ActiveExercise[],
  history: HistoryRecord[],
  database: Exercise[],
  currentPhase: 'deficit' | 'mantenimiento' | 'superavit'
): WorkoutCoachSuggestion[] => {
  const suggestions: WorkoutCoachSuggestion[] = [];
  const muscleSetCount: Record<string, number> = {};
  
  const mondayString = getMondayOfCurrentWeek();
  const mondayTime = new Date(mondayString).getTime();

  // 1. Sumar lo que ya hicimos en la semana (desde el lunes)
  history.forEach(record => {
    const recordTime = new Date(record.date).getTime();
    if (recordTime >= mondayTime) {
      const dbExercise = database.find(ex => ex.id === record.exerciseId);
      if (dbExercise) {
        const muscle = dbExercise.primary;
        // Sumamos las series reales guardadas (o 1 por defecto para historiales viejos)
        muscleSetCount[muscle] = (muscleSetCount[muscle] || 0) + (record.totalSets || 1); 
      }
    }
  });

  // 2. Sumar lo que planeamos hacer hoy
  activeExercises.forEach((activeEx) => {
    const dbExercise = database.find(ex => ex.id === activeEx.exerciseId);
    if (dbExercise) {
      const muscle = dbExercise.primary;
      const numSets = activeEx.sets.length;
      muscleSetCount[muscle] = (muscleSetCount[muscle] || 0) + numSets;
    }
  });

  // 3. Evaluar contra los límites semanales modificados por la dieta
  const modifier = NUTRITION_MODIFIERS[currentPhase];

  Object.entries(muscleSetCount).forEach(([muscle, count]) => {
    const isLargeMuscle = LARGE_MUSCLES.includes(muscle);
    const baseLimit = isLargeMuscle ? VOLUME_LIMITS.week.large_muscle.max : VOLUME_LIMITS.week.small_muscle.max;
    
    // Calculamos el límite real (Ej: 20 * 0.7 = 14)
    const actualLimit = Math.round(baseLimit * modifier);

    if (count > actualLimit) {
      suggestions.push({
        id: `week_warn_${muscle}_${Date.now()}`,
        type: 'volume_warning',
        message: `Llevas ${count} series semanales de ${muscle}. Tu límite en fase de ${currentPhase} es ${actualLimit}. Podrías sobreentrenar.`,
        actionLabel: `Reducir 1 serie`,
        targetMuscle: muscle,
      });
    }
  });

  return suggestions;
};

export const analyzeMuscleBalance = (
  activeExercises: ActiveExercise[],
  history: HistoryRecord[],
  database: Exercise[]
): WorkoutCoachSuggestion[] => {
  const suggestions: WorkoutCoachSuggestion[] = [];
  
  // Contadores Tren Superior
  let pushCount = 0;
  let pullCount = 0;
  
  // Contadores Tren Inferior
  let squatCount = 0;
  let hingeCount = 0;

  const mondayString = getMondayOfCurrentWeek();
  const mondayTime = new Date(mondayString).getTime();

  // Función auxiliar para clasificar un ejercicio por su patrón
  const classifyAndCount = (exerciseId: string, setsCount: number) => {
    const dbEx = database.find(ex => ex.id === exerciseId);
    if (dbEx) {
      if (dbEx.movement_pattern === 'push_horizontal' || dbEx.movement_pattern === 'push_vertical') {
        pushCount += setsCount;
      } else if (dbEx.movement_pattern === 'pull_horizontal' || dbEx.movement_pattern === 'pull_vertical') {
        pullCount += setsCount;
      } else if (dbEx.movement_pattern === 'squat' || dbEx.movement_pattern === 'lunge') {
        squatCount += setsCount;
      } else if (dbEx.movement_pattern === 'hinge') {
        hingeCount += setsCount;
      }
    }
  };

  // 1. Contar el historial de la semana
  history.forEach(record => {
    if (new Date(record.date).getTime() >= mondayTime) {
      classifyAndCount(record.exerciseId, record.totalSets || 1);
    }
  });

  // 2. Contar la sesión actual
  activeExercises.forEach(activeEx => {
    classifyAndCount(activeEx.exerciseId, activeEx.sets.length);
  });

  // 3. Evaluar la proporción matemática (Tren Superior)
  const totalUpperBodySets = pushCount + pullCount;
  if (totalUpperBodySets > 10) {
    const pushPercentage = pushCount / totalUpperBodySets;
    const pullPercentage = pullCount / totalUpperBodySets;

    if (pushPercentage > 0.65) {
      suggestions.push({
        id: `balance_push_${Date.now()}`,
        type: 'muscle_balance',
        message: `Tren superior desbalanceado: ${pushCount} series de Empuje frente a ${pullCount} de Jalón. Agrega más ejercicios de espalda para prevenir lesiones de hombro.`,
        actionLabel: 'Entendido',
      });
    } else if (pullPercentage > 0.65) {
      suggestions.push({
        id: `balance_pull_${Date.now()}`,
        type: 'muscle_balance',
        message: `Exceso de Jalón detectado (${pullCount} series) frente a Empuje (${pushCount} series). Cuida el balance de tu torso.`,
        actionLabel: 'Entendido',
      });
    }
  }

  // 4. Evaluar la proporción matemática (Tren Inferior)
  const totalLowerBodySets = squatCount + hingeCount;
  if (totalLowerBodySets > 8) {
    const squatPercentage = squatCount / totalLowerBodySets;
    const hingePercentage = hingeCount / totalLowerBodySets;

    if (squatPercentage > 0.65) {
      suggestions.push({
        id: `balance_squat_${Date.now()}`,
        type: 'muscle_balance',
        message: `Tren inferior desbalanceado: Mucho trabajo dominante de rodilla (${squatCount} series). Fortalece tu cadena posterior (isquiotibiales/glúteos) con más movimientos de bisagra.`,
        actionLabel: 'Entendido',
      });
    } else if (hingePercentage > 0.65) {
      suggestions.push({
        id: `balance_hinge_${Date.now()}`,
        type: 'muscle_balance',
        message: `Mucho trabajo de cadera/bisagra (${hingeCount} series). Asegúrate de incluir suficientes sentadillas o prensa para desarrollar los cuádriceps.`,
        actionLabel: 'Entendido',
      });
    }
  }

  return suggestions;
};