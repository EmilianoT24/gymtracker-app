import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MuscleMap, { FatigueLevel, Muscle } from '../../components/musclemap';
import { useGymStore } from '../../store/gymStore';
import { getLatestBodyFat, getLatestWeight, getTodaySteps, initializeHealthKit } from '../../utils/healthKit';

const FULL_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SHORT_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const mapFocusToMuscles = (focus: string): Muscle[] => {
  if (!focus) return [];
  const f = focus.toLowerCase();
  const keys: Muscle[] = [];
  
  if (f.includes('pecho')) keys.push('pecho');
  if (f.includes('espalda')) keys.push('espalda');
  if (f.includes('brazo') || f.includes('trícep') || f.includes('bícep') || f.includes('antebrazo')) keys.push('brazos');
  if (f.includes('pierna') || f.includes('glúteo') || f.includes('pantorrilla')) keys.push('piernas');
  if (f.includes('hombro')) keys.push('hombros');
  
  return keys;
};

const WeeklyCalendar = ({ activeDayIndex, onDayPress, weekData }: any) => {
  return (
    <View style={styles.calendarContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {weekData.map((item: any, index: number) => {
          const isActive = index === activeDayIndex;
          
          return (
            <TouchableOpacity 
              key={index} 
              onPress={() => onDayPress(index)}
              style={[styles.dayCard, isActive && styles.activeDayCard, isActive && styles.dayCardExpanded]}
            >
              <View style={styles.dayDateContainer}>
                <Text style={[styles.dayText, isActive && styles.activeText]}>{item.day}</Text>
                <Text style={[styles.dateText, isActive && styles.activeText]}>{item.date}</Text>
              </View>
              
              {isActive && (
                <View style={styles.targetContainer}>
                  <Text style={styles.targetText} numberOfLines={1} ellipsizeMode="tail" adjustsFontSizeToFit={true}>
                    {item.target}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// --- COMPONENTE DE LA TARJETA DE ENTRENAMIENTO ACTUALIZADO ---
// NUEVO: Recibe isToday y hasCompletedToday como propiedades
const WorkoutCard = ({ activeDayData, exerciseCount, isToday, hasCompletedToday }: any) => {
  const router = useRouter();
  const startWorkout = useGymStore((state) => state.startWorkout);
  
  // SOLUCIÓN 3: Ya no ocultamos el botón si hay 0 ejercicios. Solo si es Descanso.
  const isRestDay = activeDayData.target === 'Rest' || activeDayData.target === 'Descanso';

  const handlePlayPress = () => {
    const workoutName = `Día de ${activeDayData.target}`;
    startWorkout(workoutName, activeDayData.rawExercises);
    router.push('/workout');
  };

  return (
    <View style={styles.workoutCardContainer}>
      <View style={styles.workoutInfo}>
        <Text style={styles.workoutSubtitle}>Rutina del Día</Text>
        <Text style={styles.workoutTitle}>
          {isRestDay ? 'Descanso' : `Día de ${activeDayData.target}`}
        </Text>
        <Text style={styles.workoutDetails}>
          {isRestDay ? 'Recuperación activa' : `${exerciseCount} Ejercicios programados`}
        </Text>
      </View>
      
      {!isRestDay && (
        <View>
          {!isToday ? (
            <View style={styles.lockedContainer}>
              <FontAwesome5 name="lock" size={20} color="#333333" />
            </View>
          ) : hasCompletedToday ? (
            <View style={styles.completedBadge}>
              <FontAwesome5 name="check" size={20} color="#000000" />
              <Text style={styles.completedBadgeText}>¡Listo!</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.playButton} onPress={handlePlayPress}>
              <FontAwesome5 name="play" size={28} color="#000000" style={styles.playIcon} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const QuickActions = ({ activeRoutine, todayName, isPastDay, setSpontaneousOverride }: any) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);

  const muscles = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Piernas', 'Glúteos', 'Pantorrillas', 'Core', 'Antebrazos', 'Cuerpo Completo'];

  if (isPastDay) return null;

  const handleSetRestDay = () => {
    // En lugar de guardar en la base de datos, guardamos en la memoria temporal de la pantalla
    setSpontaneousOverride({ target: 'Descanso', rawExercises: [] });
  };

  const toggleMuscle = (muscle: string) => {
    setSelectedMuscles(prev => prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]);
  };

  const handleSaveMuscles = () => {
    if (!activeRoutine) return;
    
    const newFocus = selectedMuscles.length > 0 ? selectedMuscles.join(', ') : 'Descanso';
    let newExercises = activeRoutine.days[todayName] || []; 

    if (newFocus === 'Descanso') {
       newExercises = [];
    } else {
       const matchingDayName = Object.keys(activeRoutine.dayFocus).find(
          day => activeRoutine.dayFocus[day] === newFocus && day !== todayName
       );

       if (matchingDayName) {
          newExercises = activeRoutine.days[matchingDayName].map((ex: any) => ({
             ...ex,
             uniqueId: Math.random().toString(),
             exerciseId: Math.random().toString(),
          }));
       } else {
          newExercises = [];
       }
    }
    
    // Aplicamos el cambio espontáneo
    setSpontaneousOverride({ target: newFocus, rawExercises: newExercises });
    setIsModalVisible(false);
    setSelectedMuscles([]); 
  };

  return (
    <View>
      {/* FILA 1: Botones Reales de tu App (¡Restaurados y seguros!) */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsModalVisible(true)}>
          <Text style={styles.secondaryButtonText}>Cambiar Día</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSetRestDay}>
          <Text style={styles.secondaryButtonText}>Descanso</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL PARA CAMBIAR DÍA */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.quickModalOverlay}>
          <View style={styles.quickModalContent}>
            <Text style={styles.quickModalTitle}>¿Qué entrenarás hoy?</Text>
            
            <View style={styles.quickBubblesContainer}>
              {muscles.map((muscle) => {
                const isActive = selectedMuscles.includes(muscle);
                return (
                  <TouchableOpacity 
                    key={muscle} 
                    style={[styles.quickBubble, isActive && styles.quickBubbleActive]} 
                    onPress={() => toggleMuscle(muscle)}
                  >
                    <Text style={[styles.quickBubbleText, isActive && styles.quickBubbleTextActive]}>{muscle}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveMuscles}>
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const ProgressSection = ({ fatigueData }: { fatigueData: Record<Muscle, FatigueLevel> }) => {
  // NUEVO: Leemos la biometría directamente desde nuestro almacén global
  const biometrics = useGymStore((state) => state.biometrics);

  return (
    <View style={styles.progressContainer}>
      <Text style={styles.sectionTitle}>Fatiga y Recuperación</Text>
      
      <View style={styles.progressGrid}>
        <View style={styles.muscleMapPlaceholder}>
          <MuscleMap fatigueData={fatigueData} />
          <Text style={styles.placeholderText}>Estado Muscular</Text>
        </View>

        <View style={styles.biometricsPanel}>
          <View style={styles.metricCard}>
            <FontAwesome5 name="weight" size={14} color="#1DB954" />
            <Text style={styles.metricLabel}>Grasa Corporal</Text>
            {/* NUEVO: Valor dinámico de grasa corporal */}
            <Text style={styles.metricValue}>{biometrics.bodyFat}%</Text>
          </View>
          <View style={styles.metricCard}>
            <FontAwesome5 name="fire-alt" size={14} color="#1DB954" />
            <Text style={styles.metricLabel}>Actividad</Text>
            {/* NUEVO: Valor dinámico de pasos */}
            <Text style={styles.metricValue}>{biometrics.steps} pasos</Text>
          </View>
          <View style={styles.metricCard}>
            <FontAwesome5 name="heartbeat" size={14} color="#1DB954" />
            <Text style={styles.metricLabel}>Recuperación</Text>
            <Text style={styles.metricValue}>Óptima</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const routines = useGymStore((state) => state.routines);
  const exerciseHistory = useGymStore((state) => state.exerciseHistory);
  const activeWorkout = useGymStore((state) => state.activeWorkout);
  const biometrics = useGymStore((state) => state.biometrics);
  const updateBiometrics = useGymStore((state) => state.updateBiometrics);
  
  const activeRoutine: any = routines.find((r: any) => r.isActive);

    useEffect(() => {
    const syncHealthData = async () => {
      try {
        // 1. Inicializamos y pedimos permisos
        const hasPermissions = await initializeHealthKit();
        
        if (hasPermissions) {
          // 2. Extraemos los datos de forma paralela/secuencial
          const steps = await getTodaySteps();
          const weight = await getLatestWeight();
          const bodyFat = await getLatestBodyFat();

          // 3. Actualizamos Zustand. Validamos que no sea '0' para no borrar tus datos si falla la lectura
          updateBiometrics({
            weight: weight !== '0' ? weight : biometrics.weight,
            bodyFat: bodyFat !== '0' ? bodyFat : biometrics.bodyFat,
            steps: steps > 0 ? steps.toString() : biometrics.steps,
          });
        }
      } catch (error) {
        console.log('Error en la sincronización de salud:', error);
      }
    };

    syncHealthData();
  }, []);

  const todayDate = new Date();
  const dayOfWeek = todayDate.getDay(); 
  const currentDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const [activeDayIndex, setActiveDayIndex] = useState(currentDayIndex); 

  const [spontaneousOverride, setSpontaneousOverride] = useState<{ target: string, rawExercises: any[] } | null>(null);

  const todayString = todayDate.toISOString().split('T')[0];
  const hasCompletedToday = exerciseHistory.some((record: any) => record.date === todayString);

  const dynamicWeekData = FULL_DAYS.map((fullDay, index) => {
    let focus = activeRoutine?.dayFocus[fullDay] || '';
    let exercises = activeRoutine?.days[fullDay] || [];
    
    // LÓGICA CLAVE: Si es hoy y el usuario hizo un cambio espontáneo, mostramos ese cambio
    if (index === currentDayIndex && spontaneousOverride) {
      focus = spontaneousOverride.target;
      exercises = spontaneousOverride.rawExercises;
    }

    const target = focus || 'Rest';
    const iterDate = new Date(todayDate);
    iterDate.setDate(todayDate.getDate() - currentDayIndex + index);

    return {
      day: SHORT_DAYS[index],
      date: iterDate.getDate().toString(),
      target: target,
      mapKeys: mapFocusToMuscles(target),
      fullDayName: fullDay, 
      rawExercises: exercises
    };
  });

  const currentDayData = dynamicWeekData[activeDayIndex];
  const exerciseCount = activeRoutine?.days[currentDayData.fullDayName]?.length || 0;

  const calculateFatigue = (currentIndex: number): Record<Muscle, FatigueLevel> => {
    const muscles: Muscle[] = ['pecho', 'espalda', 'brazos', 'piernas', 'hombros'];
    const fatigue: Record<Muscle, FatigueLevel> = { pecho: 'none', espalda: 'none', brazos: 'none', piernas: 'none', hombros: 'none' };

    muscles.forEach(muscle => {
      for (let i = 0; i < 3; i++) {
        const lookBackIndex = (currentIndex - i + 7) % 7;
        if (dynamicWeekData[lookBackIndex].mapKeys.includes(muscle)) {
          if (i === 0 || i === 1) fatigue[muscle] = 'strong'; 
          else if (i === 2) fatigue[muscle] = 'light'; 
          break; 
        }
      }
    });
    return fatigue;
  };

  const currentFatigue = calculateFatigue(activeDayIndex);

  // NUEVO: Necesitamos el enrutador para el botón de continuar
  const router = useRouter();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <WeeklyCalendar activeDayIndex={activeDayIndex} onDayPress={setActiveDayIndex} weekData={dynamicWeekData} />
      
      <View style={styles.mainContent}>
        
        {/* NUEVO: TARJETA CONDICIONAL DE AUTOGUARDADO */}
        {activeWorkout && (
          <TouchableOpacity 
            style={styles.continueCard} 
            onPress={() => router.push('/workout')}
          >
            <View style={styles.continueInfo}>
              <View style={styles.continuePulse}>
                <View style={styles.pulseDot} />
                <Text style={styles.continueSubtitle}>Entrenamiento en Pausa</Text>
              </View>
              <Text style={styles.continueTitle}>{activeWorkout.name}</Text>
            </View>
            <View style={styles.continuePlayBtn}>
              <FontAwesome5 name="play" size={16} color="#000000" style={{ marginLeft: 3 }} />
            </View>
          </TouchableOpacity>
        )}

        <WorkoutCard 
          activeDayData={currentDayData} 
          exerciseCount={exerciseCount} 
          isToday={activeDayIndex === currentDayIndex}
          hasCompletedToday={hasCompletedToday}
        />
        <QuickActions 
          activeRoutine={activeRoutine} 
          todayName={FULL_DAYS[currentDayIndex]} 
          isPastDay={activeDayIndex < currentDayIndex} 
          setSpontaneousOverride={setSpontaneousOverride} // <-- NUEVO
        />
        <ProgressSection fatigueData={currentFatigue} />
      </View>
    </ScrollView>
  );
}
// --- ESTILOS ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', paddingTop: 80 },
  calendarContainer: { marginBottom: 50 },
  scrollContent: { paddingHorizontal: 15, gap: 10 },
  dayCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#282828', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  activeDayCard: { backgroundColor: '#1DB954' },
  dayCardExpanded: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  dayDateContainer: { alignItems: 'center' },
  dayText: { color: '#B3B3B3', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  dateText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  activeText: { color: '#000000' },
  targetContainer: { marginLeft: 12, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: 'rgba(0,0,0,0.2)', maxWidth: 120 },
  targetText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  mainContent: { paddingHorizontal: 15 },
  workoutCardContainer: { backgroundColor: '#181818', borderRadius: 20, padding: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  workoutInfo: { flex: 1 },
  workoutSubtitle: { color: '#B3B3B3', fontSize: 14, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  workoutTitle: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', marginBottom: 8 }, 
  workoutDetails: { color: '#B3B3B3', fontSize: 15 },
  playButton: { backgroundColor: '#1DB954', width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#1DB954', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 },
  playIcon: { marginLeft: 6 },
  
  // NUEVOS ESTILOS PARA ESTADOS DE LA RUTINA
  lockedContainer: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#282828', justifyContent: 'center', alignItems: 'center' },
  completedBadge: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#1DB954', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  completedBadgeText: { color: '#000000', fontSize: 12, fontWeight: 'bold', marginTop: 4 },

  actionsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  secondaryButton: { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#333333', paddingVertical: 16, borderRadius: 24, alignItems: 'center' },
  secondaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  progressContainer: { marginTop: 30, marginBottom: 40 },
  sectionTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  progressGrid: { flexDirection: 'row', gap: 15 },
  muscleMapPlaceholder: { flex: 1, backgroundColor: '#121212', borderWidth: 1, borderColor: '#333333', borderStyle: 'dashed', borderRadius: 16, justifyContent: 'center', alignItems: 'center', minHeight: 220 },
  placeholderText: { color: '#B3B3B3', fontSize: 12, marginTop: 10, fontWeight: '600' },
  biometricsPanel: { flex: 1, justifyContent: 'space-between' },
  metricCard: { backgroundColor: '#181818', borderRadius: 12, padding: 12, marginBottom: 10 },
  metricLabel: { color: '#B3B3B3', fontSize: 12, marginTop: 4, marginBottom: 2 },
  metricValue: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  continueCard: { backgroundColor: '#1DB95415', borderWidth: 1, borderColor: '#1DB95450', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  continueInfo: { flex: 1 },
  continuePulse: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1DB954', marginRight: 8 },
  continueSubtitle: { color: '#1DB954', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  continueTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  continuePlayBtn: { backgroundColor: '#1DB954', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  quickModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  quickModalContent: { backgroundColor: '#181818', borderRadius: 20, padding: 25, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#333333' },
  quickModalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  quickBubblesContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 20 },
  quickBubble: { backgroundColor: '#282828', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#333333' },
  quickBubbleText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  cancelButton: { marginTop: 10, paddingVertical: 10, paddingHorizontal: 20 },
  cancelButtonText: { color: '#FF453A', fontSize: 16, fontWeight: 'bold' }, 
  quickBubbleActive: { backgroundColor: '#1DB954', borderColor: '#1DB954' },
  quickBubbleTextActive: { color: '#000000', fontWeight: 'bold' },
  saveButton: { backgroundColor: '#1DB954', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 20, marginTop: 15, width: '100%', alignItems: 'center' },
  saveButtonText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
});