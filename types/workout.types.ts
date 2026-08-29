// --- METADATOS DEL SMART COACH ---

// Nivel de fatiga del sistema nervioso y muscular
export type FatigueTier = 'alta' | 'media' | 'baja';

// Clasificación del ejercicio
export type ExerciseType = 'compuesto' | 'aislamiento';

// Patrones de movimiento biomecánicos
export type MovementPattern = 
  | 'push_horizontal' 
  | 'push_vertical'   
  | 'pull_horizontal' 
  | 'pull_vertical'   
  | 'squat'           
  | 'hinge'           
  | 'lunge'           
  | 'isolation';      

// --- INTERFACES BASE ---

export interface Routine {
  id: string;
  name: string;
  exercises: Exercise[];
}

export interface Exercise {
  id: string;
  name: string;
  primary: string;       // Cambiado de mainMuscle para coincidir con gymStore
  secondary: string[];   // Cambiado de subMuscle para coincidir con gymStore
  
  // Nuevos metadatos obligatorios para el Coach Engine
  fatigue_tier: FatigueTier;
  exercise_type: ExerciseType;
  movement_pattern: MovementPattern;
  
  sets: Set[];
}

export interface Set {
  id: string;
  numReps: number;
  baseWeight: number;
  restTime: number; // En segundos
}

// --- INTERFACES DE ENTRENAMIENTO EN VIVO ---

export interface ActiveWorkout {
  id: string;
  name: string; 
  startTime: Date; 
  exercises: ActiveExercise[];
}

export interface ActiveExercise {
  exerciseId: string;
  name: string;
  sets: activeSet[]; 
}

export interface activeSet {
  id: string; 
  reps: number; 
  weight: number; 
  isCompleted: boolean; 
}

// --- INTERFACES DE HISTORIAL ---

export interface HistoryRecord {
  id: string;          
  exerciseId: string;  
  date: string;        
  maxWeight: number;   
  maxReps: number;
  totalSets: number;
}

export interface WorkoutCoachSuggestion {
  id: string;
  type: 'volume_warning' | 'exercise_alternative' | 'muscle_balance';
  message: string; 
  actionLabel: string; 
  targetMuscle?: string; // <-- NUEVO: Le decimos a TypeScript que esta propiedad existe
  onAcceptAction?: () => void; 
}