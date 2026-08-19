import { FontAwesome5 } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useGymStore } from '../../store/gymStore';

export default function RoutinesScreen() {
  const router = useRouter(); 
  
  const routines = useGymStore((state) => state.routines);
  const setActiveRoutine = useGymStore((state) => state.setActiveRoutine);
  const addRoutine = useGymStore((state) => state.addRoutine);

  const handleSetActiveRoutine = (idToActivate: string) => {
    Alert.alert(
      "Cambiar Plan Actual",
      "¿Estás seguro de que quieres cambiar tu rutina activa? Esto actualizará tu calendario.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, cambiar", 
          onPress: () => setActiveRoutine(idToActivate) 
        }
      ]
    );
  };

const handleCreateNewRoutine = () => {
    const newRoutineId = Date.now().toString(); 
    
    // Construimos la estructura de la rutina nueva
    const newRoutine = {
      id: newRoutineId,
      name: 'Nueva Rutina',
      frequency: '0 días por semana',
      isActive: false,
      dayFocus: { 'Lunes': '', 'Martes': '', 'Miércoles': '', 'Jueves': '', 'Viernes': '', 'Sábado': '', 'Domingo': '' },
      days: { 'Lunes': [], 'Martes': [], 'Miércoles': [], 'Jueves': [], 'Viernes': [], 'Sábado': [], 'Domingo': [] },
      
      // SOLUCIÓN: Agregamos el arreglo vacío para satisfacer a TypeScript
      exercises: [] 
    };

    // Guardamos la rutina en el estado global
    addRoutine(newRoutine);

    // Navegamos directamente a la pantalla de edición
    router.push(`/routine/${newRoutineId}` as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Programas</Text>
      </View>

      <View style={styles.mainContent}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* CORRECCIÓN: Agregamos ": any" para decirle a TypeScript que ignore el error de tipado aquí */}
          {routines.map((routine: any) => {
            const isActive = routine.isActive;
            const totalExercises = Number(Object.values(routine.days).reduce((acc: any, dayArray: any) => acc + dayArray.length, 0));
            
            // SOLUCIÓN: Calculamos los días activos dinámicamente filtrando los días que tienen al menos 1 ejercicio
            const activeDaysCount = Object.values(routine.days).filter((dayArray: any) => dayArray.length > 0).length;

            return (
              <TouchableOpacity 
                key={routine.id} 
                style={[styles.routineCard, isActive && styles.activeRoutineCard]}
                onPress={() => router.push(`/routine/${routine.id}` as any)}
              >
                
                {isActive && (
                  <View style={styles.activeBadge}>
                    <FontAwesome5 name="check-circle" size={12} color="#000000" />
                    <Text style={styles.activeBadgeText}>Plan Actual</Text>
                  </View>
                )}

                <View style={styles.routineInfoRow}>
                  <View style={styles.routineInfo}>
                    <Text style={styles.routineName}>{routine.name}</Text>
                    {/* SOLUCIÓN: Usamos la nueva variable y una condición para mostrar "día" o "días" correctamente */}
                    <Text style={styles.routineDetails}>
                      {activeDaysCount} {activeDaysCount === 1 ? 'día' : 'días'} por semana • {totalExercises} ejercicios
                    </Text>
                  </View>
                  <View style={styles.chevronContainer}>
                    <FontAwesome5 name="chevron-right" size={14} color="#333333" />
                  </View>
                </View>

                {!isActive && (
                  <TouchableOpacity 
                    style={styles.checkboxContainer}
                    onPress={(e) => {
                      e.stopPropagation(); 
                      handleSetActiveRoutine(routine.id);
                    }}
                  >
                    <FontAwesome5 name="circle" size={18} color="#B3B3B3" />
                    <Text style={styles.checkboxText}>Establecer como Plan Actual</Text>
                  </TouchableOpacity>
                )}

              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.addRoutineButton} onPress={handleCreateNewRoutine}>
            <FontAwesome5 name="plus" size={16} color="#1DB954" />
            <Text style={styles.addRoutineText}>Crear Nuevo Programa</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { paddingTop: 40, paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold' },
  mainContent: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  routineCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#282828' },
  activeRoutineCard: { borderColor: '#1DB954', backgroundColor: '#18241b' },
  activeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1DB954', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 12, gap: 6 },
  activeBadgeText: { color: '#000000', fontSize: 12, fontWeight: 'bold' },
  routineInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routineInfo: { flex: 1 },
  routineName: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  routineDetails: { color: '#B3B3B3', fontSize: 14, fontWeight: '500' },
  chevronContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#282828', justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 18, gap: 10 },
  checkboxText: { color: '#B3B3B3', fontWeight: '600', fontSize: 14 },
  addRoutineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#181818', borderWidth: 1, borderColor: '#333333', borderStyle: 'dashed', paddingVertical: 18, borderRadius: 16, gap: 10, marginTop: 10 },
  addRoutineText: { color: '#1DB954', fontSize: 16, fontWeight: 'bold' },
});