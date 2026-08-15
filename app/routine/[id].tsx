import { FontAwesome5 } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Animated, Modal, PanResponder, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGymStore } from '../../store/gymStore';

const allCategories = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Piernas', 'Glúteos', 'Pantorrillas', 'Core', 'Antebrazos'];
const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const exerciseDB = useGymStore((state) => state.exerciseDB);
  
  const routines = useGymStore((state) => state.routines);
  const updateRoutine = useGymStore((state) => state.updateRoutine);
  const deleteRoutine = useGymStore((state) => state.deleteRoutine);

  const currentRoutine: any = routines.find((r: any) => r.id === id);

  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Lunes'); 
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // SOLUCIÓN: Movimos toda la lógica de los Hooks de animación ANTES del "if (!currentRoutine)"
  const panY = useRef(new Animated.Value(0)).current;
  
  const closeModal = () => {
    Animated.timing(panY, { toValue: 1000, duration: 250, useNativeDriver: true }).start(() => {
      setIsModalVisible(false); setTimeout(() => panY.setValue(0), 500); 
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
    setActiveFilters(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const filteredExercises = exerciseDB.filter(exercise => {
    if (activeFilters.length === 0) return true;
    const musclesWorked = [exercise.primary, ...exercise.secondary];
    return activeFilters.every(filter => musclesWorked.includes(filter));
  });

  // A partir de aquí ya es seguro hacer el "return" anticipado
  if (!currentRoutine) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><FontAwesome5 name="arrow-left" size={20} color="#FFFFFF" /></TouchableOpacity></View>
        <Text style={styles.placeholderText}>Rutina no encontrada.</Text>
      </SafeAreaView>
    );
  }

  const currentDayExercises = currentRoutine.days[selectedDay] || [];
  const currentDayFocus = currentRoutine.dayFocus[selectedDay] || '';

  const handleUpdateName = (text: string) => updateRoutine({ ...currentRoutine, name: text });
  const handleUpdateFocus = (text: string) => updateRoutine({ ...currentRoutine, dayFocus: { ...currentRoutine.dayFocus, [selectedDay]: text } });

  const handleAddExerciseToRoutine = (exercise: any) => {
    const isDuplicate = currentDayExercises.some((ex: any) => ex.id === exercise.id);
    if (isDuplicate) {
      Alert.alert('Ejercicio Duplicado', `Ya agregaste "${exercise.name}" al día ${selectedDay}.`);
      return;
    }

    const newExercise = { ...exercise, uniqueId: Math.random().toString(), sets: 3, reps: 10 };
    updateRoutine({ ...currentRoutine, days: { ...currentRoutine.days, [selectedDay]: [...currentDayExercises, newExercise] } });
    closeModal();
  };

  const updateExerciseConfig = (uniqueId: string, field: 'sets' | 'reps', increment: number) => {
    const updatedExercises = currentDayExercises.map((ex: any) => {
      if (ex.uniqueId === uniqueId) return { ...ex, [field]: Math.max(1, ex[field] + increment) };
      return ex;
    });
    updateRoutine({ ...currentRoutine, days: { ...currentRoutine.days, [selectedDay]: updatedExercises } });
  };

  const removeExercise = (uniqueId: string) => {
    const updatedExercises = currentDayExercises.filter((ex: any) => ex.uniqueId !== uniqueId);
    updateRoutine({ ...currentRoutine, days: { ...currentRoutine.days, [selectedDay]: updatedExercises } });
  };

  const handleDeleteRoutine = () => {
    Alert.alert('Eliminar Programa', `¿Estás seguro de que deseas eliminar permanentemente "${currentRoutine.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { deleteRoutine(currentRoutine.id); router.back(); } }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
          <FontAwesome5 name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        
        {isEditingName ? (
          <TextInput style={styles.headerTitleInput} value={currentRoutine.name} onChangeText={handleUpdateName} onBlur={() => setIsEditingName(false)} autoFocus selectTextOnFocus returnKeyType="done" />
        ) : (
          <TouchableOpacity style={styles.titleContainer} onPress={() => setIsEditingName(true)}>
            <Text style={styles.headerTitle} numberOfLines={1}>{currentRoutine.name}</Text>
            <FontAwesome5 name="pen" size={12} color="#B3B3B3" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleDeleteRoutine} style={styles.headerIconBtn}>
          <FontAwesome5 name="trash" size={18} color="#FF453A" />
        </TouchableOpacity>
      </View>

      <View style={styles.daySelectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelectorScroll}>
          {DAYS_OF_WEEK.map(day => (
            <TouchableOpacity key={day} style={[styles.dayTab, selectedDay === day && styles.dayTabActive]} onPress={() => setSelectedDay(day)}>
              <Text style={[styles.dayTabText, selectedDay === day && styles.dayTabTextActive]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.focusContainer}>
        <Text style={styles.focusLabel}>Enfoque de este día:</Text>
        <TextInput style={styles.focusInput} placeholder="Ej. Pecho, Pierna, Descanso..." placeholderTextColor="#666666" value={currentDayFocus} onChangeText={handleUpdateFocus} returnKeyType="done" />
      </View>

      <View style={styles.mainContent}>
        {currentDayExercises.length === 0 ? (
          <View style={styles.emptyRoutineContainer}>
            <FontAwesome5 name="calendar-day" size={40} color="#333333" />
            <Text style={styles.placeholderText}>{`Tu ${selectedDay} está libre de entrenamiento.`}</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.routineList}>
            {currentDayExercises.map((exercise: any, index: number) => (
              <View key={exercise.uniqueId} style={styles.savedExerciseCard}>
                <View style={styles.savedExerciseHeader}>
                  <Text style={styles.savedExerciseNumber}>{index + 1}</Text>
                  <Text style={styles.savedExerciseName}>{exercise.name}</Text>
                  <TouchableOpacity onPress={() => removeExercise(exercise.uniqueId)}><FontAwesome5 name="times" size={16} color="#333333" /></TouchableOpacity>
                </View>
                <View style={styles.configRow}>
                  <View style={styles.configControl}>
                    <Text style={styles.configLabel}>Sets</Text>
                    <View style={styles.configButtons}>
                      <TouchableOpacity onPress={() => updateExerciseConfig(exercise.uniqueId, 'sets', -1)} style={styles.circleBtn}><FontAwesome5 name="minus" size={10} color="#FFFFFF" /></TouchableOpacity>
                      <Text style={styles.configValue}>{exercise.sets}</Text>
                      <TouchableOpacity onPress={() => updateExerciseConfig(exercise.uniqueId, 'sets', 1)} style={styles.circleBtn}><FontAwesome5 name="plus" size={10} color="#FFFFFF" /></TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.configControl}>
                    <Text style={styles.configLabel}>Reps</Text>
                    <View style={styles.configButtons}>
                      <TouchableOpacity onPress={() => updateExerciseConfig(exercise.uniqueId, 'reps', -1)} style={styles.circleBtn}><FontAwesome5 name="minus" size={10} color="#FFFFFF" /></TouchableOpacity>
                      <Text style={styles.configValue}>{exercise.reps}</Text>
                      <TouchableOpacity onPress={() => updateExerciseConfig(exercise.uniqueId, 'reps', 1)} style={styles.circleBtn}><FontAwesome5 name="plus" size={10} color="#FFFFFF" /></TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity style={styles.addExerciseButton} onPress={() => setIsModalVisible(true)}>
          <FontAwesome5 name="plus" size={16} color="#1DB954" />
          <Text style={styles.addExerciseText}>Agregar a {selectedDay}</Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="fade" transparent={true} visible={isModalVisible} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeModal}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>
          <Animated.View style={[styles.modalContent, { transform: [{ translateY: panY }] }]}>
            <View style={styles.dragArea} {...panResponder.panHandlers}>
              <View style={styles.dragHandle} /><View style={styles.modalHeader}><Text style={styles.modalTitle}>Filtrar por Músculo</Text></View>
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
                <Text style={styles.emptyStateText}>No existe ningún ejercicio que trabaje todos estos músculos.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredExercises.map((exercise: any) => (
                  <TouchableOpacity key={exercise.id} style={styles.exerciseResultCard} onPress={() => handleAddExerciseToRoutine(exercise)}>
                    <View style={styles.cardTextContent}>
                      <Text style={styles.resultName}>{exercise.name}</Text>
                      <View style={styles.tagsContainer}>
                        <View style={styles.primaryTag}><Text style={styles.primaryTagText}>{exercise.primary}</Text></View>
                        {exercise.secondary.map((sec: string, idx: number) => (
                          <View key={idx} style={styles.secondaryTag}><Text style={styles.secondaryTagText}>{sec}</Text></View>
                        ))}
                      </View>
                    </View>
                    <View style={styles.addIconContainer}><FontAwesome5 name="plus" size={12} color="#FFFFFF" /></View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- ESTILOS ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconBtn: { padding: 5, width: 35, alignItems: 'center' },
  titleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', maxWidth: '80%', textAlign: 'center' },
  headerTitleInput: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', flex: 1, textAlign: 'center', backgroundColor: '#181818', borderRadius: 8, paddingVertical: 4 },
  daySelectorContainer: { borderBottomWidth: 1, borderBottomColor: '#181818', paddingBottom: 10 },
  daySelectorScroll: { paddingHorizontal: 20, gap: 10 },
  dayTab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#121212', borderWidth: 1, borderColor: '#333333' },
  dayTabActive: { backgroundColor: '#1DB954', borderColor: '#1DB954' },
  dayTabText: { color: '#B3B3B3', fontWeight: '600' },
  dayTabTextActive: { color: '#000000', fontWeight: 'bold' },
  focusContainer: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 5 },
  focusLabel: { color: '#B3B3B3', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 5 },
  focusInput: { backgroundColor: '#181818', color: '#FFFFFF', fontSize: 16, fontWeight: '600', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#282828' },
  mainContent: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  emptyRoutineContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#B3B3B3', textAlign: 'center', marginTop: 15, fontSize: 16, lineHeight: 22 },
  routineList: { paddingBottom: 20, paddingTop: 10 },
  savedExerciseCard: { backgroundColor: '#181818', borderRadius: 16, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#282828' },
  savedExerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  savedExerciseNumber: { color: '#1DB954', fontSize: 16, fontWeight: 'bold', marginRight: 10, width: 20 },
  savedExerciseName: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', flex: 1 },
  configRow: { flexDirection: 'row', gap: 20, paddingLeft: 30 },
  configControl: { flex: 1, backgroundColor: '#121212', borderRadius: 12, padding: 10, alignItems: 'center' },
  configLabel: { color: '#B3B3B3', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  configButtons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  circleBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#282828', justifyContent: 'center', alignItems: 'center' },
  configValue: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  addExerciseButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#181818', borderWidth: 1, borderColor: '#333333', borderStyle: 'dashed', paddingVertical: 18, borderRadius: 16, gap: 10, marginTop: 10 },
  addExerciseText: { color: '#1DB954', fontSize: 16, fontWeight: 'bold' },
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
  emptyStateText: { color: '#B3B3B3', fontSize: 16, textAlign: 'center', marginTop: 15, lineHeight: 22 }
});