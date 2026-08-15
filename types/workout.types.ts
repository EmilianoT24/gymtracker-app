export interface Routine {
  id: string;
  name: string;
  exercises: Exercise[];
}

export interface Exercise {
  id: string;
  name: string;
  mainMuscle: string[]; // Ej. ['Chest']
  subMuscle: string[];  // Ej. ['Triceps', 'Front Delt']
  sets: Set[];
}

export interface Set {
  id: string;
  numReps: number;
  baseWeight: number;
  restTime: number; // En segundos
}

export interface ActiveWorkout {
  id: string;
  name: string; // El nombre de la rutina (ej. "Día de Pecho")
  startTime: Date; // ¡Aquí está la solución a tu error principal!
  exercises: ActiveExercise[];
}

export interface activeSet {
  id: string; // Mismo ID del molde
  reps: number; // Lo que realmente hizo
  weight: number; // Lo que realmente levantó
  isCompleted: boolean; // Para pintar de verde y disparar el timer
}

export interface ActiveExercise {
  exerciseId: string;
  name: string;
  sets: activeSet[]; // ¡Aquí le decimos a TypeScript que use activeSet!
}

export interface HistoryRecord {
  id: string;          // ID único de este registro histórico
  exerciseId: string;  // El eslabón que lo conecta con el "Press de Banca"
  date: string;        // Tu eje X en la gráfica (ej. "2026-07-07")
  maxWeight: number;   // Tu eje Y en la gráfica
  maxReps: number;
}