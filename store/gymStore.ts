import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
// CORRECCIÓN: Agregamos ActiveExercise a la importación
import { ActiveExercise, ActiveWorkout, Exercise, HistoryRecord, Routine } from '../types/workout.types';

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface FrequentMeal {
  id: string;
  name: string;
  macros: Macros;
}

export interface DailyNutrition {
  date: string; // Guardaremos la fecha en formato YYYY-MM-DD
  consumed: Macros;
}

// --- EL PLANO (Interfaces) ---
export interface GymStore {
  // VARIABLES (El Estado)
  routines: Routine[];
  activeWorkout: ActiveWorkout | null;
  exerciseHistory: HistoryRecord[];
  lastCompletedRoutineId: string | null;
  unitSystem: 'kg' | 'lbs';
  exerciseDB: any[];
  biometrics: { weight: string; bodyFat: string; steps: string };
  nutritionTargets: Macros;
  frequentMeals: FrequentMeal[];
  dailyNutritionHistory: DailyNutrition[];
  
  // Acción para actualizarlas
  updateBiometrics: (newBiometrics: { weight: string; bodyFat: string; steps: string }) => void;
  toggleUnitSystem: () => void;

  // ACCIONES (Los Verbos)
  addRoutine: (routine: Routine) => void;
  startWorkout: (workoutName: string, exercisesForToday: any[]) => void;
  finishWorkout: () => void;
  updateRoutineExercises: (routineId: string, newExercises: Exercise[]) => void;
  deleteRoutine: (routineId: string) => void;
  cancelWorkout: () => void;
  updateActiveWorkoutExercises: (newExercises: ActiveExercise[]) => void;
  
  // NUEVAS ACCIONES PARA LA ARQUITECTURA MULTI-DÍA
  setActiveRoutine: (routineId: string) => void;
  updateRoutine: (updatedRoutine: Routine) => void;
  injectMockData: () => void;
  clearHistory: () => void;

  // --- ACCIONES DE NUTRICIÓN ---
  updateNutritionTargets: (newTargets: Macros) => void;
  addDailyNutrition: (date: string, macrosToAdd: Macros) => void;
  addFrequentMeal: (meal: FrequentMeal) => void;
}

// --- LA CONSTRUCCIÓN (El Almacén de Zustand) ---
export const useGymStore = create<GymStore>()(
  persist(
    (set, get) => ({
      // --- 1. ESTADO INICIAL LIMPIO ---
      routines: [], 
      activeWorkout: null, 
      exerciseHistory: [], 
      lastCompletedRoutineId: null,
      unitSystem: 'kg',
      exerciseDB: [
        // PECHO
  { id: '1', name: 'Press de Banca Plano', primary: 'Pecho', secondary: ['Tríceps', 'Hombros'] },
  { id: '2', name: 'Press Inclinado', primary: 'Pecho', secondary: ['Tríceps', 'Hombros'] },
  { id: '3', name: 'Press Declinado', primary: 'Pecho', secondary: ['Tríceps'] },
  { id: '4', name: 'Aperturas (Cristos)', primary: 'Pecho', secondary: ['Hombros'] },
  { id: '5', name: 'Cruce de Poleas (Flyes)', primary: 'Pecho', secondary: [] },
  { id: '6', name: 'Fondos en Paralelas (Dips)', primary: 'Pecho', secondary: ['Tríceps', 'Hombros'] },
  { id: '7', name: 'Pullover', primary: 'Pecho', secondary: ['Espalda', 'Tríceps'] },
  { id: '8', name: 'Flexiones (Push-Ups)', primary: 'Pecho', secondary: ['Tríceps', 'Core'] },
  { id: '9', name: 'Press Squeeze (Hex Press)', primary: 'Pecho', secondary: ['Tríceps'] },
  { id: '80', name: 'Press Pecho en Máquina (Chest Press)', primary: 'Pecho', secondary: ['Tríceps', 'Hombros'] },

  // ESPALDA
  { id: '10', name: 'Dominadas', primary: 'Espalda', secondary: ['Bíceps', 'Core'] },
  { id: '11', name: 'Jalón al Pecho', primary: 'Espalda', secondary: ['Bíceps'] },
  { id: '12', name: 'Jalón Agarre Estrecho / Neutro', primary: 'Espalda', secondary: ['Bíceps'] },
  { id: '13', name: 'Remo con Barra', primary: 'Espalda', secondary: ['Bíceps', 'Core'] },
  { id: '14', name: 'Remo Unilateral (Un brazo)', primary: 'Espalda', secondary: ['Bíceps'] },
  { id: '15', name: 'Remo Gironda (Sentado)', primary: 'Espalda', secondary: ['Bíceps'] },
  { id: '16', name: 'Remo T', primary: 'Espalda', secondary: ['Bíceps', 'Core'] },
  { id: '17', name: 'Remo Pendlay', primary: 'Espalda', secondary: ['Bíceps', 'Core'] },
  { id: '18', name: 'Jalón con Brazos Rectos', primary: 'Espalda', secondary: ['Tríceps'] },
  { id: '19', name: 'Peso Muerto Convencional', primary: 'Espalda', secondary: ['Piernas', 'Glúteos', 'Core'] },
  { id: '20', name: 'Hiperextensiones Lumbales', primary: 'Espalda', secondary: ['Glúteos'] },
  { id: '21', name: 'Encogimientos de Hombros (Shrugs)', primary: 'Espalda', secondary: ['Hombros'] },

  // HOMBROS
  { id: '22', name: 'Press Militar / Press de Hombros', primary: 'Hombros', secondary: ['Tríceps', 'Core'] },
  { id: '23', name: 'Press Arnold', primary: 'Hombros', secondary: ['Tríceps'] },
  { id: '24', name: 'Elevaciones Laterales', primary: 'Hombros', secondary: [] },
  { id: '25', name: 'Elevaciones Frontales', primary: 'Hombros', secondary: [] },
  { id: '26', name: 'Pájaro (Elevaciones Posteriores)', primary: 'Hombros', secondary: ['Espalda'] },
  { id: '27', name: 'Face Pull', primary: 'Hombros', secondary: ['Espalda'] },
  { id: '28', name: 'Remo al Mentón', primary: 'Hombros', secondary: ['Espalda', 'Bíceps'] },
  { id: '29', name: 'Landmine Press', primary: 'Hombros', secondary: ['Pecho', 'Core'] },

  // BÍCEPS
  { id: '30', name: 'Curl de Bíceps Convencional', primary: 'Bíceps', secondary: ['Antebrazos'] },
  { id: '31', name: 'Curl Martillo', primary: 'Bíceps', secondary: ['Antebrazos'] },
  { id: '32', name: 'Curl Inclinado', primary: 'Bíceps', secondary: [] },
  { id: '33', name: 'Curl Predicador (Banco Scott)', primary: 'Bíceps', secondary: [] },
  { id: '34', name: 'Curl Concentrado', primary: 'Bíceps', secondary: [] },
  { id: '35', name: 'Curl 21', primary: 'Bíceps', secondary: ['Antebrazos'] },
  { id: '36', name: 'Curl Zottman', primary: 'Bíceps', secondary: ['Antebrazos'] },
  { id: '37', name: 'Curl Araña (Spider Curl)', primary: 'Bíceps', secondary: [] },
  { id: '38', name: 'Curl Invertido', primary: 'Bíceps', secondary: ['Antebrazos'] },

  // TRÍCEPS
  { id: '39', name: 'Tricep Pulldown / Extensión en Polea', primary: 'Tríceps', secondary: [] },
  { id: '40', name: 'Press Francés / Rompecabezas (Skullcrushers)', primary: 'Tríceps', secondary: [] },
  { id: '41', name: 'Copa Tríceps (Extensión Trasnuca)', primary: 'Tríceps', secondary: [] },
  { id: '42', name: 'Patada de Tríceps (Kickbacks)', primary: 'Tríceps', secondary: [] },
  { id: '43', name: 'Press Cerrado', primary: 'Tríceps', secondary: ['Pecho', 'Hombros'] },
  { id: '44', name: 'Fondos entre Bancos', primary: 'Tríceps', secondary: ['Pecho', 'Hombros'] },
  { id: '45', name: 'Extensión JM Press', primary: 'Tríceps', secondary: ['Pecho'] },

  // PIERNAS (CUÁDRICEPS E ISQUIOTIBIALES)
  { id: '46', name: 'Sentadilla Libre / Trasera', primary: 'Piernas', secondary: ['Glúteos', 'Core'] },
  { id: '47', name: 'Sentadilla Frontal', primary: 'Piernas', secondary: ['Glúteos', 'Core'] },
  { id: '48', name: 'Sentadilla Búlgaras', primary: 'Piernas', secondary: ['Glúteos', 'Core'] },
  { id: '49', name: 'Sentadilla Hack', primary: 'Piernas', secondary: ['Glúteos'] },
  { id: '50', name: 'Sentadilla Sissy', primary: 'Piernas', secondary: [] },
  { id: '51', name: 'Prensa en Máquina', primary: 'Piernas', secondary: ['Glúteos'] },
  { id: '52', name: 'Extensiones de Cuádriceps', primary: 'Piernas', secondary: [] },
  { id: '53', name: 'Desplantes / Zancadas (Lunges)', primary: 'Piernas', secondary: ['Glúteos', 'Core'] },
  { id: '54', name: 'Peso Muerto Rumano / Piernas Rígidas', primary: 'Piernas', secondary: ['Glúteos', 'Espalda'] },
  { id: '55', name: 'Curl de Isquiotibiales (Tumbado / Sentado)', primary: 'Piernas', secondary: [] },
  { id: '56', name: 'Curl Nórdico', primary: 'Piernas', secondary: ['Glúteos'] },
  { id: '57', name: 'Good Mornings (Buenos Días)', primary: 'Piernas', secondary: ['Glúteos', 'Espalda'] },

  // GLÚTEOS Y CADERA
  { id: '58', name: 'Hip Thrust', primary: 'Glúteos', secondary: ['Piernas', 'Core'] },
  { id: '59', name: 'Puente de Glúteo (Glute Bridge)', primary: 'Glúteos', secondary: ['Piernas'] },
  { id: '60', name: 'Patada de Glúteo', primary: 'Glúteos', secondary: [] },
  { id: '61', name: 'Abducción de Cadera', primary: 'Glúteos', secondary: [] },
  { id: '62', name: 'Aducción de Cadera', primary: 'Piernas', secondary: [] },
  { id: '63', name: 'Step-Ups (Subidas al Banco)', primary: 'Glúteos', secondary: ['Piernas'] },

  // PANTORRILLAS
  { id: '64', name: 'Elevación de Talones de Pie', primary: 'Pantorrillas', secondary: [] },
  { id: '65', name: 'Elevación de Talones Sentado', primary: 'Pantorrillas', secondary: [] },
  { id: '66', name: 'Elevación de Talones en Prensa', primary: 'Pantorrillas', secondary: [] },

  // CORE / ABDOMINALES
  { id: '67', name: 'Plancha (Plank)', primary: 'Core', secondary: ['Hombros'] },
  { id: '68', name: 'Plancha Lateral', primary: 'Core', secondary: [] },
  { id: '69', name: 'Crunch Abdominal', primary: 'Core', secondary: [] },
  { id: '70', name: 'Crunch en Polea', primary: 'Core', secondary: [] },
  { id: '71', name: 'Elevación de Piernas (Colgado / Banco)', primary: 'Core', secondary: [] },
  { id: '72', name: 'Rueda Abdominal (Ab Wheel Rollout)', primary: 'Core', secondary: ['Espalda', 'Hombros'] },
  { id: '73', name: 'Twist Ruso (Russian Twists)', primary: 'Core', secondary: [] },
  { id: '74', name: 'Woodchoppers (Leñador)', primary: 'Core', secondary: ['Hombros'] },
  { id: '75', name: 'Dead Bug', primary: 'Core', secondary: [] },
  { id: '76', name: 'Passeo del Granjero (Farmer Carry)', primary: 'Core', secondary: ['Antebrazos', 'Hombros'] },

  // ANTEBRAZOS / AGARRE
  { id: '77', name: 'Curl de Muñeca Supino', primary: 'Antebrazos', secondary: [] },
  { id: '78', name: 'Curl de Muñeca Prono', primary: 'Antebrazos', secondary: [] },
  { id: '79', name: 'Sostén de Disco / Cuelgue de Agarre', primary: 'Antebrazos', secondary: [] }
],

      biometrics: { weight: '75.0', bodyFat: '15.0', steps: '0' },

      nutritionTargets: { calories: 2000, protein: 150, carbs: 200, fats: 60 }, // Metas por defecto
      frequentMeals: [],
      dailyNutritionHistory: [],

      // ... tus otras funciones (addRoutine, startWorkout, etc.) ...

      // --- LÓGICA DE LAS ACCIONES ---
      updateBiometrics: (newBiometrics) => {
        set({ biometrics: newBiometrics });
      },

      // --- LÓGICA DE LAS ACCIONES ---
      // Agrega esta nueva función para cambiar las unidades
      toggleUnitSystem: () => {
        set((state) => ({
          unitSystem: state.unitSystem === 'kg' ? 'lbs' : 'kg'
        }));
      },

      // --- LÓGICA DE NUTRICIÓN ---

      updateNutritionTargets: (newTargets) => {
        set({ nutritionTargets: newTargets });
      },

      addFrequentMeal: (meal) => {
        set((state) => ({
          frequentMeals: [...state.frequentMeals, meal]
        }));
      },

      addDailyNutrition: (date, macrosToAdd) => {
        set((state) => {
          // Buscamos si ya existe un registro para la fecha de hoy
          const existingDayIndex = state.dailyNutritionHistory.findIndex(day => day.date === date);

          if (existingDayIndex >= 0) {
            // Si el día ya existe, sumamos los nuevos macros a los actuales matemáticamente
            const updatedHistory = [...state.dailyNutritionHistory];
            const currentMacros = updatedHistory[existingDayIndex].consumed;

            updatedHistory[existingDayIndex] = {
              ...updatedHistory[existingDayIndex],
              consumed: {
                calories: currentMacros.calories + macrosToAdd.calories,
                protein: currentMacros.protein + macrosToAdd.protein,
                carbs: currentMacros.carbs + macrosToAdd.carbs,
                fats: currentMacros.fats + macrosToAdd.fats,
              }
            };
            return { dailyNutritionHistory: updatedHistory };
          } else {
            // Si es la primera comida del día, creamos un registro completamente nuevo
            return {
              dailyNutritionHistory: [
                ...state.dailyNutritionHistory,
                { date: date, consumed: macrosToAdd }
              ]
            };
          }
        });
      },

      // --- 2. LÓGICA DE LAS ACCIONES ---
      
      addRoutine: (routine) => {
        set((state) => ({
          routines: [...state.routines, routine]
        }));
      },

      // NUEVO: Marcar una rutina como el plan actual (y apagar las demás)
      setActiveRoutine: (routineId) => {
        set((state) => ({
          routines: state.routines.map((routine) => ({
            ...routine,
            isActive: routine.id === routineId
          }))
        }));
      },

      // NUEVO: Actualizar una rutina completa (nombre, días, enfoque, etc.)
      updateRoutine: (updatedRoutine) => {
        set((state) => ({
          routines: state.routines.map((routine) => 
            routine.id === updatedRoutine.id ? updatedRoutine : routine
          )
        }));
      },

      injectMockData: () => {
        set({
          exerciseHistory: [
            { id: 'test1', exerciseId: '1', date: '2026-07-01', maxWeight: 50, maxReps: 10 },
            { id: 'test2', exerciseId: '1', date: '2026-07-15', maxWeight: 55, maxReps: 8 },
            { id: 'test3', exerciseId: '1', date: '2026-08-01', maxWeight: 60, maxReps: 6 },
          ]
        });
      },

      clearHistory: () => {
        set({
          exerciseHistory: [],
          lastCompletedRoutineId: null
        });
      },

      startWorkout: (workoutName, exercisesForToday) => {
        // Obtenemos el estado actual para leer el historial
        const state = get();
        const history = state.exerciseHistory;

        const newActiveWorkout: ActiveWorkout = {
          id: Date.now().toString(), 
          name: workoutName, 
          startTime: new Date(), 
          
          exercises: exercisesForToday.map((ex: any) => {
            // 1. Buscamos si ya hemos hecho este ejercicio antes
            const pastRecords = history.filter(h => h.exerciseId === (ex.uniqueId || ex.id));
            let lastWeight = '';
            let lastReps = ex.reps?.toString() || '10';
            // NUEVO: Variable para almacenar la lista de sets anteriores
            let pastSets: any[] = []; 
            
            // Si hay historial, ordenamos para tomar el más reciente
            if (pastRecords.length > 0) {
              pastRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              lastWeight = pastRecords[0].maxWeight.toString();
              lastReps = pastRecords[0].maxReps.toString();
              // NUEVO: Extraemos el historial detallado de los sets (si existe)
              pastSets = (pastRecords[0] as any).pastSets || []; 
            }

            return {
              exerciseId: ex.uniqueId || ex.id || Math.random().toString(), 
              name: ex.name, 
              sets: Array.from({ length: ex.sets || 3 }).map((_, i) => {
                // NUEVO: Buscamos el set exacto en el historial usando el índice 'i'
                const historicalSet = pastSets[i];

                return {
                  id: Math.random().toString(), 
                  setNumber: i + 1, 
                  weight: '', 
                  reps: '', 
                  // NUEVO: Asignamos el peso/rep exacto de ese set, o caemos al máximo/default si no existe
                  placeholderWeight: historicalSet?.weight || lastWeight || '0',
                  placeholderReps: historicalSet?.reps || lastReps || '10',
                  isCompleted: false 
                };
              })
            };
          }) as any[]
        };

        set({ activeWorkout: newActiveWorkout });
      },

      finishWorkout: () => {
        const state = get();
        const currentWorkout = state.activeWorkout;

        if (!currentWorkout) return;

        const newHistoryRecords: HistoryRecord[] = [];
        const todayDate = new Date().toISOString().split('T')[0];

        currentWorkout.exercises.forEach((exercise) => {
          const completedSets = exercise.sets.filter((set) => set.isCompleted);

          if (completedSets.length > 0) {
            let maxWeight = 0;
            let maxReps = 0;

            completedSets.forEach((set) => {
              if (set.weight > maxWeight) maxWeight = set.weight;
              if (set.reps > maxReps) maxReps = set.reps;
            });

            newHistoryRecords.push({
              id: Date.now().toString() + Math.random().toString(36).substring(7),
              exerciseId: exercise.exerciseId,
              date: todayDate,
              maxWeight: maxWeight,
              maxReps: maxReps,
              // NUEVO: Guardamos el detalle exacto de cada set completado
              pastSets: completedSets.map((s) => ({ weight: s.weight, reps: s.reps }))
            } as any);
          }
        });

        set({
          exerciseHistory: [...state.exerciseHistory, ...newHistoryRecords],
          activeWorkout: null,
          lastCompletedRoutineId: currentWorkout.id 
        });
      },

      updateRoutineExercises: (routineId, newExercises) => {
        // Mantenemos tu función antigua por si la ocupas, aunque `updateRoutine` es más completa
        set((state) => ({
          routines: state.routines.map((routine) => {
            if (routine.id === routineId) {
              return { ...routine, exercises: newExercises }; // Ojo, esto chocará con la estructura de "days"
            }
            return routine;
          }),
        }));
      },

      deleteRoutine: (routineId) => {
        set((state) => ({
          routines: state.routines.filter((routine) => routine.id !== routineId)
        }));
      },

      cancelWorkout: () => {
        set({ activeWorkout: null });
      },

      updateActiveWorkoutExercises: (newExercises) => {
        set((state) => {
          if (!state.activeWorkout) return state; 
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: newExercises
            }
          };
        });
      },
    }),
    {
      name: 'gym-tracker-storage', 
      storage: createJSONStorage(() => AsyncStorage), 
    }
  )
);