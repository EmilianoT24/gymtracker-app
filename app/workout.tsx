import { FontAwesome5 } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, PanResponder, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { LineChart } from 'react-native-gifted-charts';
import { useGymStore } from '../store/gymStore';
import { WorkoutCoachSuggestion } from '../types/workout.types';
import { analyzeMuscleBalance, analyzeSessionVolume, analyzeWeeklyVolume, calculateProgressiveOverload, suggestExerciseAlternatives } from '../utils/coachEngine';

const allCategories = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Piernas', 'Glúteos', 'Pantorrillas', 'Core', 'Antebrazos'];
const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, 
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

export default function WorkoutScreen() {
  const router = useRouter();
  
  const activeWorkout = useGymStore((state) => state.activeWorkout);
  const unitSystem = useGymStore((state) => state.unitSystem);
  const toggleUnitSystem = useGymStore((state) => state.toggleUnitSystem);
  const updateActiveWorkoutExercises = useGymStore((state) => state.updateActiveWorkoutExercises);
  const finishWorkout = useGymStore((state) => state.finishWorkout);
  const cancelWorkout = useGymStore((state) => state.cancelWorkout);
  const exerciseDB = useGymStore((state) => state.exerciseDB);
  const exerciseHistory = useGymStore((state) => state.exerciseHistory);
  const nutritionPhase = useGymStore((state: any) => state.nutritionPhase) || 'mantenimiento';
  
  // NUEVO: Traemos funciones para actualizar la rutina base si hay cambios
  const routines = useGymStore((state) => state.routines);
  const updateRoutine = useGymStore((state) => state.updateRoutine);

  const [isChartModalVisible, setIsChartModalVisible] = useState(false);
  const [selectedChartExerciseId, setSelectedChartExerciseId] = useState<string | null>(null);
  const [selectedChartExerciseName, setSelectedChartExerciseName] = useState<string | null>(null);
  const [expandedExercises, setExpandedExercises] = useState<string[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);

  const [isTimerVisible, setIsTimerVisible] = useState(false);
  const [timeInSeconds, setTimeInSeconds] = useState(60); 
  const [isRunning, setIsRunning] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [modalAction, setModalAction] = useState<'add' | 'swap'>('add');
  const [targetExerciseId, setTargetExerciseId] = useState<string | null>(null);

  const [coachSuggestions, setCoachSuggestions] = useState<WorkoutCoachSuggestion[]>([]);

  const panY = useRef(new Animated.Value(0)).current;
  const closeModal = () => {
    Animated.timing(panY, { toValue: 1000, duration: 250, useNativeDriver: true }).start(() => {
      setIsModalVisible(false); 
      setTimeout(() => panY.setValue(0), 500);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true, onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true, onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderMove: (_, gestureState) => { if (gestureState.dy > 0) panY.setValue(gestureState.dy); },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120) closeModal();
        else Animated.spring(panY, { toValue: 0, useNativeDriver: true, bounciness: 2 }).start();
      }
    })
  ).current;

  const toggleFilter = (category: string) => {
    setActiveFilters(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
  };

  let filteredExercises = exerciseDB?.filter(exercise => {
    if (activeFilters.length === 0) return true;
    const musclesWorked = [exercise.primary, ...(exercise.secondary || [])];
    return activeFilters.every(filter => musclesWorked.includes(filter));
  }) || [];

  // NUEVA LÓGICA: Ordenamiento Inteligente
  if (activeFilters.length === 1) {
    const filtroActivo = activeFilters[0];
    
    filteredExercises.sort((a, b) => {
      const aEsPrincipal = a.primary === filtroActivo;
      const bEsPrincipal = b.primary === filtroActivo;

      // Si 'a' es principal y 'b' no, movemos 'a' arriba
      if (aEsPrincipal && !bEsPrincipal) return -1;
      // Si 'b' es principal y 'a' no, movemos 'b' arriba
      if (!aEsPrincipal && bEsPrincipal) return 1;
      // Si ambos son iguales, se quedan donde estaban
      return 0; 
    });
  }

  let recommendedExerciseIds: string[] = [];
  
  if (modalAction === 'swap' && targetExerciseId && activeWorkout) {
    // 1. Encontramos el ejercicio dentro de tu rutina activa actual (usando el ID temporal)
    const activeEx = activeWorkout.exercises.find(ex => ex.exerciseId === targetExerciseId);
    
    if (activeEx && exerciseDB) {
      // 2. Buscamos el ejercicio original en la base de datos usando su NOMBRE
      const targetExercise = exerciseDB.find(ex => ex.name === activeEx.name);
      
      if (targetExercise) {
        // 3. ¡Ahora sí le pedimos al coach las alternativas!
        const alternatives = suggestExerciseAlternatives(targetExercise, exerciseDB);
        recommendedExerciseIds = alternatives.map(ex => ex.id);
      }
    }
  }
  const openAddModal = () => {
    setModalAction('add');
    setIsModalVisible(true);
  };

  const openSwapModal = (exerciseId: string) => {
    setModalAction('swap');
    setTargetExerciseId(exerciseId);
    setIsModalVisible(true);
  };

  const handleSelectExercise = (exercise: any) => {
    if (!activeWorkout) return;

    // 1. Le pedimos al Smart Coach el cálculo matemático completo
    const suggestion = calculateProgressiveOverload(exercise, exerciseHistory);

    if (modalAction === 'add') {
      // 2. Generamos las series inyectando los pesos y reps recomendados
      const generatedSets = Array.from({ length: suggestion.sets }).map((_, index) => ({
        id: Math.random().toString(),
        setNumber: index + 1,
        weight: '',
        reps: '',
        placeholderWeight: suggestion.weight,
        placeholderReps: suggestion.reps,    
        isCompleted: false
      }));

      const newEx = {
        exerciseId: exercise.id, // CORRECCIÓN 1: Usamos el ID real de la BD
        name: exercise.name,
        sets: generatedSets
      };
      
      updateActiveWorkoutExercises([...activeWorkout.exercises, newEx] as any[]);
      setExpandedExercises(prev => [...prev, newEx.exerciseId]); 

    } else if (modalAction === 'swap' && targetExerciseId) {
      const updatedExercises = activeWorkout.exercises.map(ex => {
        if (ex.exerciseId === targetExerciseId) {
          const newExerciseId = exercise.id; // CORRECCIÓN 2: Usamos el ID real de la BD
          
          if (expandedExercises.includes(targetExerciseId)) {
            setExpandedExercises(prev => [...prev.filter(id => id !== targetExerciseId), newExerciseId]);
          }
          
          const generatedSets = Array.from({ length: suggestion.sets }).map((_, index) => ({
            id: Math.random().toString(),
            setNumber: index + 1,
            weight: '',
            reps: '',
            placeholderWeight: suggestion.weight,
            placeholderReps: suggestion.reps,   
            isCompleted: false
          }));

          return {
            ...ex,
            exerciseId: newExerciseId,
            name: exercise.name,
            sets: generatedSets
          };
        }
        return ex;
      });
      updateActiveWorkoutExercises(updatedExercises as any[]);
    }
    closeModal();
  };

  // NUEVO: Función para agregar un set extra al instante
  const handleAddSet = (exerciseId: string) => {
    if (!activeWorkout) return;
    const updatedExercises = activeWorkout.exercises.map(ex => {
      if (ex.exerciseId === exerciseId) {
        // SOLUCIÓN: Agregamos "as any" aquí para que TypeScript acepte los placeholders
        const lastSet = ex.sets[ex.sets.length - 1] as any;
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: Math.random().toString(),
              setNumber: ex.sets.length + 1,
              weight: '',
              reps: '',
              placeholderWeight: lastSet?.placeholderWeight || '0',
              placeholderReps: lastSet?.placeholderReps || '10',
              isCompleted: false
            }
          ]
        };
      }
      return ex;
    });
    updateActiveWorkoutExercises(updatedExercises as any[]);
  };

  useEffect(() => {
    if (activeWorkout && activeWorkout.exercises.length > 0 && expandedExercises.length === 0) {
      setExpandedExercises([activeWorkout.exercises[0].exerciseId]);
    }
  }, [activeWorkout]);

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permisos de notificación no otorgados');
      }
    };
    requestPermissions();
  }, []);

  const targetTimeRef = useRef<number | null>(null);
  const notificationIdRef = useRef<string | null>(null);

  // 4. El motor del reloj actualizado
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const manageTimer = async () => {
      if (isRunning) {
        // Fijamos la hora de término
        targetTimeRef.current = Date.now() + timeInSeconds * 1000;

        // Programamos la notificación en el sistema del celular
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: '¡Descanso terminado!',
            body: 'Es hora de volver a tu siguiente serie. ¡Con todo!',
            sound: true,
          },
          trigger: { 
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: timeInSeconds 
          },
        });
        notificationIdRef.current = id;

        interval = setInterval(() => {
          if (targetTimeRef.current) {
            const remaining = Math.round((targetTimeRef.current - Date.now()) / 1000);

            if (remaining <= 0) {
              setTimeInSeconds(0);
              setIsRunning(false);
              setIsTimerVisible(false);
              targetTimeRef.current = null;
              notificationIdRef.current = null;
            } else {
              setTimeInSeconds(remaining);
            }
          }
        }, 1000);
        
      } else {
        // Si el usuario pone pausa, cancelamos la alerta que estaba pendiente
        if (notificationIdRef.current) {
          await Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
          notificationIdRef.current = null;
        }
      }
    };

    manageTimer();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  useEffect(() => {
    if (activeWorkout && exerciseDB) {
      // 1. Análisis de Sesión (Micro-ciclo)
      const sessionWarnings = analyzeSessionVolume(activeWorkout.exercises, exerciseDB);
      
      // 2. Análisis Semanal (Macro-ciclo + Nutrición)
      const weeklyWarnings = analyzeWeeklyVolume(activeWorkout.exercises, exerciseHistory, exerciseDB, nutritionPhase);
      
      // 3. NUEVO: Análisis de Equilibrio Muscular (Push vs Pull)
      const balanceWarnings = analyzeMuscleBalance(activeWorkout.exercises, exerciseHistory, exerciseDB);
      
      // Juntamos todas las advertencias en la pantalla
      setCoachSuggestions([...sessionWarnings, ...weeklyWarnings, ...balanceWarnings]);
    }
  }, [activeWorkout?.exercises, nutritionPhase]);

  // 2. La función que ejecuta el coach al darle "Aceptar"
  const handleAcceptVolumeWarning = (targetMuscle: string, suggestionId: string) => {
    if (!activeWorkout) return;

    // Buscamos de atrás hacia adelante el último ejercicio que trabaje ese músculo
    let exerciseIndexToTrim = -1;
    for (let i = activeWorkout.exercises.length - 1; i >= 0; i--) {
      const exDb = exerciseDB.find((dbEx: any) => dbEx.id === activeWorkout.exercises[i].exerciseId);
      if (exDb && exDb.primary === targetMuscle) {
        exerciseIndexToTrim = i;
        break;
      }
    }

    if (exerciseIndexToTrim !== -1) {
      // Le quitamos el último set a ese ejercicio
      const updatedExercises = [...activeWorkout.exercises];
      const targetExercise = updatedExercises[exerciseIndexToTrim];
      
      if (targetExercise.sets.length > 1) {
        // Quitamos el último elemento del arreglo de sets
        targetExercise.sets = targetExercise.sets.slice(0, -1);
        updateActiveWorkoutExercises(updatedExercises as any[]);
      } else {
        // Si solo tenía 1 set, mejor borramos el ejercicio completo
        const filteredExercises = updatedExercises.filter((_, index) => index !== exerciseIndexToTrim);
        updateActiveWorkoutExercises(filteredExercises as any[]);
      }
    }
    
    // Ocultamos la sugerencia de la pantalla
    setCoachSuggestions(prev => prev.filter(sug => sug.id !== suggestionId));
  };


  if (!activeWorkout) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: '#FFFFFF', fontSize: 18 }}>No hay entrenamiento activo.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#1DB954', fontSize: 16 }}>Regresar al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const toggleDuration = () => {
    if (!isRunning) setTimeInSeconds(prev => (prev === 60 ? 180 : 60));
  };

  const toggleSet = (exerciseId: string, setId: string) => {
    if (!activeWorkout) return;
    
    // Actualizamos el estado global directamente
    const updatedExercises = activeWorkout.exercises.map(exercise => {
      if (exercise.exerciseId === exerciseId) {
        const updatedSets = exercise.sets.map(set => {
          if (set.id === setId) {
            const newlyCompleted = !set.isCompleted;
            
            // Si el usuario acaba de marcar el set como completado, iniciamos el timer
            if (newlyCompleted) {
              setIsTimerVisible(true);
              setTimeInSeconds(60); 
              setIsRunning(false);  
            }
            
            return { ...set, isCompleted: newlyCompleted };
          }
          return set;
        });
        return { ...exercise, sets: updatedSets };
      }
      return exercise;
    });
    
    updateActiveWorkoutExercises(updatedExercises as any[]);
  };

  const toggleExerciseAccordion = (exerciseId: string) => {
    setExpandedExercises(prev => 
      prev.includes(exerciseId) ? prev.filter(id => id !== exerciseId) : [...prev, exerciseId]
    );
  };

  const updateSetValue = (exerciseId: string, setId: string, field: 'weight' | 'reps', value: string) => {
    const updatedExercises = activeWorkout.exercises.map(exercise => {
      if (exercise.exerciseId === exerciseId) {
        const updatedSets = exercise.sets.map(set => set.id === setId ? { ...set, [field]: value } : set);
        return { ...exercise, sets: updatedSets };
      }
      return exercise;
    });
    updateActiveWorkoutExercises(updatedExercises as any[]);
  };

  const isExerciseCompleted = (exercise: any) => {
    return exercise.sets.length > 0 && exercise.sets.every((set: any) => set.isCompleted);
  };

  const deleteExercise = (exerciseId: string) => {
    const updatedExercises = activeWorkout.exercises.filter(ex => ex.exerciseId !== exerciseId);
    updateActiveWorkoutExercises(updatedExercises as any[]);
  };

  const removeSet = (exerciseId: string, setId: string) => {
    Alert.alert(
      'Eliminar Serie',
      '¿Estás seguro de que deseas eliminar este set de tu entrenamiento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí, eliminar', 
          style: 'destructive',
          onPress: () => {
            if (!activeWorkout) return;
            
            const updatedExercises = activeWorkout.exercises.map((ex: any) => {
              if (ex.exerciseId === exerciseId) {
                // 1. Filtramos y eliminamos el set seleccionado
                const filteredSets = ex.sets.filter((s: any) => s.id !== setId);
                
                // 2. Re-enumeramos los sets restantes (1, 2, 3...)
                const renumberedSets = filteredSets.map((s: any, index: number) => ({
                  ...s,
                  setNumber: index + 1
                }));
                
                return { ...ex, sets: renumberedSets };
              }
              return ex;
            });
            
            updateActiveWorkoutExercises(updatedExercises as any[]);
          }
        }
      ]
    );
  };

  const renderLeftActions = (exerciseId: string) => {
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={() => deleteExercise(exerciseId)}>
        <FontAwesome5 name="trash" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    );
  };

  // NUEVO: Finalizar entrenamiento verificando cambios
  const handleFinishWorkout = () => {
    const finalExercises = activeWorkout.exercises;

    const activeRoutine: any = routines.find((r: any) => r.isActive);
    const todayName = DAYS_OF_WEEK[new Date().getDay()];

    if (activeRoutine) {
      const originalExercises = activeRoutine.days[todayName] || [];
      const hasChanged = originalExercises.length !== finalExercises.length || 
        !originalExercises.every((origEx: any, index: number) => 
          finalExercises[index] && (finalExercises[index].name === origEx.name)
        );
        
      if (hasChanged) {
        Alert.alert(
          'Rutina Modificada',
          'Detectamos que agregaste o cambiaste ejercicios hoy. ¿Deseas actualizar tu rutina base para que se quede guardada así la próxima vez?',
          [
            { text: 'No, solo por hoy', style: 'cancel', onPress: () => closeAndNavigate() },
            { 
              text: 'Sí, guardar', 
              onPress: () => {
                 // SOLUCIÓN: Agregamos "(fe: any)" para que reconozca los placeholders
                 const updatedRoutineDay = finalExercises.map((fe: any) => ({
                   uniqueId: fe.exerciseId,
                   id: fe.exerciseId,
                   name: fe.name,
                   sets: fe.sets.length,
                   reps: parseInt(fe.sets[0]?.reps || fe.sets[0]?.placeholderReps || '10')
                 }));
                 updateRoutine({
                   ...activeRoutine,
                   days: { ...activeRoutine.days, [todayName]: updatedRoutineDay }
                 });
                 closeAndNavigate();
              } 
            }
          ]
        );
        return; 
      }
    }
    closeAndNavigate();
  };

  const closeAndNavigate = () => {
    finishWorkout(); 
    Alert.alert('¡Entrenamiento Terminado!', 'Tus registros se han guardado con éxito.');
    router.back();
  };

  const handleCancelWorkout = () => {
    Alert.alert(
      '¿Pausar o Cancelar?',
      '¿Deseas pausar tu entrenamiento para continuarlo después, o cancelarlo y borrar el progreso?',
      [
        { 
          text: 'Pausar (Guardar progreso)', 
          style: 'default', 
          // Si elige pausar, solo lo regresamos a la pantalla anterior sin borrar datos
          onPress: () => router.back() 
        },
        { 
          text: 'Cancelar rutina', 
          style: 'destructive', 
          // Si elige cancelar, destruimos el estado global y luego lo regresamos
          onPress: () => {
            cancelWorkout();
            router.back();
          } 
        },
        { 
          text: 'Seguir entrenando', 
          style: 'cancel' 
          // No hace nada, solo cierra el menú
        }
      ]
    );
  };

  const openChartModal = (exerciseId: string, exerciseName: string) => {
    setSelectedChartExerciseId(exerciseId);
    setSelectedChartExerciseName(exerciseName);
    setIsChartModalVisible(true);
  };

  const chartData = exerciseHistory
    .filter(record => {
      // Buscamos el ejercicio original en la base de datos usando el nombre
      const baseExercise = exerciseDB?.find(ex => ex.name === selectedChartExerciseName);
      // Retornamos los registros que coincidan con cualquiera de los dos IDs
      return record.exerciseId === selectedChartExerciseId || (baseExercise && record.exerciseId === baseExercise.id);
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(record => {
      const dateParts = record.date.split('-');
      const shortDate = `${dateParts[2]}/${dateParts[1]}`;
      return {
        value: Number(record.maxWeight),
        label: shortDate,
        dataPointText: `${record.maxWeight}`,
      };
    });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancelWorkout} style={styles.backButton}>
          <FontAwesome5 name="times" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{activeWorkout.name}</Text>
        <View style={styles.placeholderSpace} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {coachSuggestions.length > 0 && (
          <View style={{ backgroundColor: '#1DB95415', borderWidth: 1, borderColor: '#1DB954', borderRadius: 12, padding: 15, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
              <FontAwesome5 name="robot" size={16} color="#1DB954" />
              <Text style={{ color: '#1DB954', fontWeight: 'bold', fontSize: 16 }}>Smart Coach</Text>
            </View>
            
            {coachSuggestions.map(suggestion => (
              <View key={suggestion.id} style={{ marginBottom: 10 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 14, marginBottom: 8 }}>{suggestion.message}</Text>
                <TouchableOpacity 
                  style={{ backgroundColor: '#1DB954', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' }}
                  onPress={() => handleAcceptVolumeWarning(suggestion.targetMuscle!, suggestion.id)}
                >
                  <Text style={{ color: '#000000', fontWeight: 'bold' }}>{suggestion.actionLabel}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {activeWorkout.exercises.map((exercise) => {
          const isCompleted = isExerciseCompleted(exercise);
          const isExpanded = expandedExercises.includes(exercise.exerciseId);
          
          if (isCompleted && !showCompleted) return null;

          return (
            <View key={exercise.exerciseId} style={styles.swipeableContainer}>
              <ReanimatedSwipeable renderLeftActions={() => renderLeftActions(exercise.exerciseId)} overshootLeft={false}>
                <View style={[styles.exerciseCard, isCompleted && styles.exerciseCardCompleted]}>
                  <TouchableOpacity 
                    style={styles.exerciseHeader} 
                    onPress={() => toggleExerciseAccordion(exercise.exerciseId)}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseSubtitle}>{exercise.sets.length} sets</Text>
                    </View>
                    
                    {/* NUEVO: Contenedor para el icono de gráfica y la flecha */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                      <TouchableOpacity onPress={(e) => {
                          e.stopPropagation(); // Evita que se abra/cierre el acordeón al tocar la gráfica
                          openChartModal(exercise.exerciseId, exercise.name);
                        }}
                      >
                        <FontAwesome5 name="chart-line" size={18} color="#1DB954" />
                      </TouchableOpacity>
                      <FontAwesome5 name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#B3B3B3" />
                    </View>
                  </TouchableOpacity>
                  
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <View style={styles.setRowHeader}>
                        <Text style={styles.columnTitle}>Set</Text>
                        
                        <TouchableOpacity 
                          style={[styles.columnTitle, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]} 
                          onPress={toggleUnitSystem}
                        >
                          <Text style={{ color: '#1DB954', fontSize: 12, fontWeight: 'bold' }}>
                            {unitSystem.toUpperCase()} <FontAwesome5 name="exchange-alt" size={10} color="#1DB954" />
                          </Text>
                        </TouchableOpacity>

                        <Text style={[styles.columnTitle, styles.centerColumn]}>Reps</Text>
                        <Text style={[styles.columnTitle, styles.rightColumn]}>Listo</Text>
                      </View>

                      {exercise.sets.map((set: any) => {
                        const isSetCompleted = set.isCompleted;
                        
                        return (
                          <TouchableOpacity 
                            key={set.id} 
                            style={[styles.setRow, isSetCompleted && styles.setRowCompleted]}
                            activeOpacity={0.9} // Mantiene la fila casi sólida al tocarla
                            onLongPress={() => removeSet(exercise.exerciseId, set.id)}
                            delayLongPress={500} // Medio segundo de presión
                          >
                            <Text style={styles.setText}>{set.setNumber}</Text>
                            
                            <TextInput
                              style={styles.valueInput}
                              value={set.weight}
                              onChangeText={(text) => updateSetValue(exercise.exerciseId, set.id, 'weight', text)}
                              keyboardType="decimal-pad"
                              keyboardAppearance="dark"
                              returnKeyType="done"
                              selectTextOnFocus
                              placeholder={set.placeholderWeight || '0'}
                              placeholderTextColor="#666666"
                            />
                            
                            <TextInput
                              style={styles.valueInput}
                              value={set.reps}
                              onChangeText={(text) => updateSetValue(exercise.exerciseId, set.id, 'reps', text)}
                              keyboardType="number-pad"
                              keyboardAppearance="dark"
                              returnKeyType="done"
                              selectTextOnFocus
                              placeholder={set.placeholderReps || '10'}
                              placeholderTextColor="#666666"
                            />
                            
                            <TouchableOpacity 
                              style={[styles.checkButton, isSetCompleted && styles.checkButtonActive]}
                              onPress={() => toggleSet(exercise.exerciseId, set.id)}
                            >
                              {isSetCompleted && <FontAwesome5 name="check" size={12} color="#000000" />}
                            </TouchableOpacity>
                          </TouchableOpacity>
                        );
                      })}

                      {/* NUEVO: Botón para añadir una serie rápida */}
                      <TouchableOpacity 
                        style={styles.addSetButton} 
                        onPress={() => handleAddSet(exercise.exerciseId)}
                      >
                        <Text style={styles.addSetButtonText}>+ Agregar Set</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.swapButton} onPress={() => openSwapModal(exercise.exerciseId)}>
                        <FontAwesome5 name="exchange-alt" size={12} color="#B3B3B3" />
                        <Text style={styles.swapButtonText}>Cambiar Ejercicio</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ReanimatedSwipeable>
            </View>
          );
        })}

        <TouchableOpacity style={styles.addExerciseButton} onPress={openAddModal}>
          <FontAwesome5 name="plus" size={16} color="#1DB954" />
          <Text style={styles.addExerciseText}>Agregar Ejercicio Extra</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.showAllButton} onPress={() => setShowCompleted(!showCompleted)}>
          <Text style={styles.showAllText}>{showCompleted ? "Ocultar completados" : "Mostrar completados"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.finishWorkoutButton} onPress={handleFinishWorkout}>
          <Text style={styles.finishWorkoutText}>Terminar Rutina</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal animationType="fade" transparent={true} visible={isModalVisible} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeModal}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
          <Animated.View style={[styles.modalContent, { transform: [{ translateY: panY }] }]}>
            <View style={styles.dragArea} {...panResponder.panHandlers}>
              <View style={styles.dragHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {modalAction === 'swap' ? 'Seleccionar Reemplazo' : 'Agregar Ejercicio Extra'}
                </Text>
              </View>
            </View>

            <View style={styles.bubblesContainer}>
              {allCategories.map((category) => {
                const isActive = activeFilters.includes(category);
                return (
                  <TouchableOpacity key={category} style={[styles.bubble, isActive && styles.bubbleActive]} onPress={() => toggleFilter(category)}>
                    <Text style={[styles.bubbleText, isActive && styles.bubbleTextActive]}>{category}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.resultsText}>{`${filteredExercises.length} ${filteredExercises.length === 1 ? 'resultado' : 'resultados'}`}</Text>

            {filteredExercises.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <FontAwesome5 name="search-minus" size={40} color="#333333" />
                <Text style={styles.emptyStateText}>Ajusta tus filtros, no encontramos coincidencias.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredExercises.map((exercise: any) => (
                  <TouchableOpacity key={exercise.id} style={styles.exerciseResultCard} onPress={() => handleSelectExercise(exercise)}>
                    <View style={styles.cardTextContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                        <Text style={styles.resultName}>{exercise.name}</Text>
                        
                        {/* NUEVO: Badge del Smart Coach */}
                        {recommendedExerciseIds.includes(exercise.id) && (
                          <View style={{ backgroundColor: '#1DB954', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: '#000000', fontSize: 10, fontWeight: 'bold' }}>Sugerido</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.tagsContainer}>
                        <View style={styles.primaryTag}><Text style={styles.primaryTagText}>{exercise.primary}</Text></View>
                        {exercise.secondary?.map((sec: string, idx: number) => (
                          <View key={idx} style={styles.secondaryTag}><Text style={styles.secondaryTagText}>{sec}</Text></View>
                        ))}
                      </View>
                    </View>
                    <View style={styles.addIconContainer}>
                      <FontAwesome5 name={modalAction === 'swap' ? 'exchange-alt' : 'plus'} size={12} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={isChartModalVisible} onRequestClose={() => setIsChartModalVisible(false)}>
        <View style={styles.chartModalOverlay}>
          <View style={styles.chartModalContent}>
            <View style={styles.chartModalHeader}>
              <Text style={styles.chartModalTitle}>Historial de Fuerza</Text>
              <TouchableOpacity onPress={() => setIsChartModalVisible(false)} style={{ padding: 5 }}>
                <FontAwesome5 name="times" size={20} color="#B3B3B3" />
              </TouchableOpacity>
            </View>

            {chartData.length === 0 ? (
              <View style={styles.emptyChartContainer}>
                <FontAwesome5 name="info-circle" size={30} color="#333333" />
                <Text style={styles.emptyChartText}>No hay registros anteriores para este ejercicio. ¡Establece tu primera marca hoy!</Text>
              </View>
            ) : (
              <View style={styles.popupChartWrapper}>
                <LineChart
                  data={chartData}
                  color="#1DB954"
                  thickness={3}
                  dataPointsColor="#1DB954"
                  textColor="#B3B3B3"
                  textFontSize={10}
                  yAxisTextStyle={{ color: '#B3B3B3', fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: '#B3B3B3', fontSize: 10 }}
                  hideRules
                  yAxisColor="#333333"
                  xAxisColor="#333333"
                  initialSpacing={20}
                  spacing={60}
                  textColor1="#FFFFFF"
                  textShiftY={-10}
                  textShiftX={-5}
                  isAnimated
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {isTimerVisible && (
        <View style={styles.floatingTimerContainer}>
          <View style={styles.timerBubble}>
            <TouchableOpacity style={styles.closeTimerButton} onPress={() => setIsTimerVisible(false)}>
              <FontAwesome5 name="times" size={10} color="#B3B3B3" />
            </TouchableOpacity>

            <FontAwesome5 name="stopwatch" size={20} color="#1DB954" />
            <TouchableOpacity onPress={toggleDuration}>
              <Text style={styles.timerText}>{formatTime(timeInSeconds)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.playPauseButton} onPress={() => setIsRunning(!isRunning)}>
               <FontAwesome5 name={isRunning ? "pause" : "play"} size={12} color="#000000" style={!isRunning ? { marginLeft: 2 } : {}} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  backButton: { padding: 10, marginLeft: -10 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  placeholderSpace: { width: 44 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 150 },
  exerciseCard: { backgroundColor: '#181818', borderRadius: 16, overflow: 'hidden' },
  exerciseCardCompleted: { opacity: 0.6 }, 
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  exerciseName: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  exerciseSubtitle: { color: '#B3B3B3', fontSize: 14, marginTop: 4 },
  expandedContent: { paddingHorizontal: 20, paddingBottom: 20 },
  setRowHeader: { flexDirection: 'row', marginBottom: 10, paddingHorizontal: 10 },
  columnTitle: { color: '#B3B3B3', fontSize: 12, fontWeight: 'bold', flex: 1 },
  centerColumn: { textAlign: 'center' },
  rightColumn: { textAlign: 'right' },
  setRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#282828', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 8 },
  setRowCompleted: { backgroundColor: '#1DB95420' }, 
  setText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', flex: 1 },
  valueInput: { flex: 1, backgroundColor: '#333333', color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center', paddingVertical: 6, borderRadius: 6, marginHorizontal: 4 },
  checkButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#333333', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end', marginLeft: 'auto' },
  checkButtonActive: { backgroundColor: '#1DB954' },
  
  // Estilos del nuevo botón Add Set
  addSetButton: { alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  addSetButtonText: { color: '#1DB954', fontSize: 14, fontWeight: 'bold' },

  swapButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 5, paddingVertical: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#333333' },
  swapButtonText: { color: '#B3B3B3', fontSize: 14, fontWeight: '600' },
  addExerciseButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#181818', borderWidth: 1, borderColor: '#333333', borderStyle: 'dashed', paddingVertical: 18, borderRadius: 16, marginBottom: 15, gap: 10 },
  addExerciseText: { color: '#1DB954', fontSize: 16, fontWeight: 'bold' },
  showAllButton: { alignSelf: 'center', paddingVertical: 15, marginTop: 10 },
  showAllText: { color: '#B3B3B3', fontSize: 14, fontWeight: 'bold', textDecorationLine: 'underline' },
  finishWorkoutButton: { backgroundColor: '#1DB954', paddingVertical: 18, borderRadius: 30, alignItems: 'center', marginTop: 30, marginBottom: 20, marginHorizontal: 10 },
  finishWorkoutText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  floatingTimerContainer: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  timerBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#282828', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 30, gap: 15, elevation: 8, position: 'relative' },
  timerText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  playPauseButton: { backgroundColor: '#1DB954', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  closeTimerButton: { position: 'absolute', top: -5, left: 0, backgroundColor: '#181818', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333333' },
  deleteAction: { backgroundColor: '#E91429', justifyContent: 'center', alignItems: 'center', width: 80, height: '100%', borderRadius: 16 },
  swipeableContainer: { marginBottom: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#121212', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, height: '75%' },
  dragArea: { paddingTop: 15, paddingBottom: 15, alignItems: 'center', width: '100%' },
  dragHandle: { width: 45, height: 6, backgroundColor: '#333333', borderRadius: 3, marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%' },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  bubblesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  bubble: { backgroundColor: '#282828', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#333333' },
  bubbleActive: { backgroundColor: '#1DB954', borderColor: '#1DB954' },
  bubbleText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  bubbleTextActive: { color: '#000000' },
  resultsText: { color: '#B3B3B3', fontSize: 14, marginBottom: 15, fontWeight: '600' },
  exerciseResultCard: { backgroundColor: '#181818', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTextContent: { flex: 1, marginRight: 10 },
  resultName: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primaryTag: { backgroundColor: '#1DB95420', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: '#1DB95450' },
  primaryTagText: { color: '#1DB954', fontSize: 12, fontWeight: 'bold' },
  secondaryTag: { backgroundColor: '#282828', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  secondaryTagText: { color: '#B3B3B3', fontSize: 12, fontWeight: '600' },
  addIconContainer: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#333333', justifyContent: 'center', alignItems: 'center' },
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyStateText: { color: '#B3B3B3', fontSize: 16, textAlign: 'center', marginTop: 15, lineHeight: 22 },
  chartModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  chartModalContent: { backgroundColor: '#181818', borderRadius: 20, padding: 20, width: '100%', borderWidth: 1, borderColor: '#333333' },
  chartModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  chartModalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  popupChartWrapper: { alignItems: 'center', paddingRight: 20 },
  emptyChartContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyChartText: { color: '#B3B3B3', fontSize: 14, textAlign: 'center', marginTop: 15, lineHeight: 20 },
});