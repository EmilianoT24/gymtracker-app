import { FontAwesome5 } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useGymStore } from '../../store/gymStore';

export default function ProgressScreen() {
  const exerciseHistory = useGymStore((state: any) => state.exerciseHistory);
  const routines = useGymStore((state: any) => state.routines);
  const biometrics = useGymStore((state: any) => state.biometrics);
  const updateBiometrics = useGymStore((state: any) => state.updateBiometrics);

  const nutritionTargets = useGymStore((state: any) => state.nutritionTargets) || { calories: 2000, protein: 150, carbs: 200, fats: 60 };
  const updateNutritionTargets = useGymStore((state: any) => state.updateNutritionTargets);
  const importData = useGymStore((state: any) => state.importData);
  
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  
  // Estados Modal Biometría
  const [isBioModalVisible, setIsBioModalVisible] = useState(false);
  const [tempWeight, setTempWeight] = useState(biometrics.weight);
  const [tempBodyFat, setTempBodyFat] = useState(biometrics.bodyFat);
  const [tempSteps, setTempSteps] = useState(biometrics.steps);

  // Estados Modal Nutrición
  const [isNutriModalVisible, setIsNutriModalVisible] = useState(false);
  const [tempCalories, setTempCalories] = useState(nutritionTargets.calories.toString());
  const [tempProtein, setTempProtein] = useState(nutritionTargets.protein.toString());
  const [tempCarbs, setTempCarbs] = useState(nutritionTargets.carbs.toString());
  const [tempFats, setTempFats] = useState(nutritionTargets.fats.toString());

  const openBioModal = () => {
    setTempWeight(biometrics.weight);
    setTempBodyFat(biometrics.bodyFat);
    setTempSteps(biometrics.steps);
    setIsBioModalVisible(true);
  };

  const handleSaveBio = () => {
    updateBiometrics({
      weight: tempWeight || '0',
      bodyFat: tempBodyFat || '0',
      steps: tempSteps || '0',
    });
    setIsBioModalVisible(false);
  };

  const openNutriModal = () => {
    setTempCalories(nutritionTargets.calories.toString());
    setTempProtein(nutritionTargets.protein.toString());
    setTempCarbs(nutritionTargets.carbs.toString());
    setTempFats(nutritionTargets.fats.toString());
    setIsNutriModalVisible(true);
  };

  const handleSaveNutri = () => {
    updateNutritionTargets({
      calories: Number(tempCalories) || 0,
      protein: Number(tempProtein) || 0,
      carbs: Number(tempCarbs) || 0,
      fats: Number(tempFats) || 0,
    });
    setIsNutriModalVisible(false);
  };

  const uniqueExerciseIds = Array.from(new Set(exerciseHistory.map((record: any) => record.exerciseId)));

  const getExerciseName = (exerciseId: string) => {
    for (const routine of routines as any[]) {
      for (const day in routine.days) {
        const found = routine.days[day].find((ex: any) => ex.exerciseId === exerciseId || ex.id === exerciseId || ex.uniqueId === exerciseId);
        if (found) return found.name;
      }
    }
    return 'Ejercicio Desconocido';
  };

  if (!selectedExerciseId && uniqueExerciseIds.length > 0) {
    setSelectedExerciseId(uniqueExerciseIds[0] as string);
  }

  const chartData = exerciseHistory
    .filter((record: any) => record.exerciseId === selectedExerciseId)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((record: any) => {
      const dateParts = record.date.split('-');
      const shortDate = `${dateParts[2]}/${dateParts[1]}`;
      
      return {
        value: Number(record.maxWeight),
        label: shortDate,
        dataPointText: `${record.maxWeight}`,
      };
    });

  const handleExportData = async () => {
    try {
      // Extraemos TODO el estado actual usando getState()
      const state = useGymStore.getState();
      
      // Filtramos solo los datos puros (excluyendo las funciones/acciones)
      const dataToExport = {
        routines: state.routines,
        exerciseHistory: state.exerciseHistory,
        lastCompletedRoutineId: state.lastCompletedRoutineId,
        unitSystem: state.unitSystem,
        biometrics: state.biometrics,
        nutritionTargets: state.nutritionTargets,
        frequentMeals: state.frequentMeals,
        dailyNutritionHistory: state.dailyNutritionHistory,
      };

      // Convertimos a texto JSON
      const jsonString = JSON.stringify(dataToExport, null, 2);
      // Creamos la ruta del archivo temporal
      const fileUri = FileSystem.cacheDirectory + 'GymTracker_Backup.json';

      // Guardamos y compartimos
      await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      
      if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Guardar respaldo de GymTracker' });
      } else {
        Alert.alert('Error', 'Tu dispositivo no permite compartir archivos.');
      }
    } catch (error) {
      console.log('Error exportando:', error);
      Alert.alert('Error', 'Hubo un problema al crear el archivo de respaldo.');
    }
  };

  // --- NUEVA LÓGICA: IMPORTAR ---
  const handleImportData = async () => {
    try {
      // Abrimos el selector de archivos del teléfono
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'], // Permitimos JSON
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        
        // Leemos el texto del archivo
        const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
        
        // Convertimos el texto de regreso a un objeto JavaScript
        const parsedData = JSON.parse(fileContent);

        // Verificamos de forma muy básica que sí sea un archivo de nuestra app
        if (parsedData.routines && parsedData.exerciseHistory) {
          Alert.alert(
            'Importar Datos',
            'Esto sobreescribirá tus datos actuales. ¿Estás seguro?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { 
                text: 'Sí, importar', 
                style: 'destructive',
                onPress: () => {
                  importData(parsedData);
                  Alert.alert('¡Éxito!', 'Tus datos han sido restaurados correctamente.');
                }
              }
            ]
          );
        } else {
          Alert.alert('Archivo Inválido', 'El archivo seleccionado no contiene datos válidos de GymTracker.');
        }
      }
    } catch (error) {
      console.log('Error importando:', error);
      Alert.alert('Error', 'Hubo un problema al leer el archivo de respaldo.');
    }
  };

  return (
    <View style={styles.container}>
      {/* NUEVO: Ocultar el header nativo de navegación */}
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tu Progreso</Text>
          <TouchableOpacity style={styles.updateButton} onPress={openBioModal}>
            <Text style={styles.updateButtonText}>Actualizar</Text>
            <FontAwesome5 name="edit" size={14} color="#1DB954" />
          </TouchableOpacity>
        </View>

        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="weight" size={16} color="#B3B3B3" />
            <Text style={styles.cardSubtitle}>Peso Actual</Text>
          </View>
          <View style={styles.mainValueContainer}>
            <Text style={styles.mainValue}>{biometrics.weight}</Text>
            <Text style={styles.unitText}> kg</Text>
          </View>
        </View>

        <View style={styles.gridContainer}>
          <View style={styles.gridCard}>
            <FontAwesome5 name="percentage" size={24} color="#1DB954" style={styles.gridIcon} />
            <Text style={styles.cardSubtitle}>Grasa Corporal</Text>
            <Text style={styles.gridValue}>{biometrics.bodyFat}%</Text>
          </View>
          <View style={styles.gridCard}>
            <FontAwesome5 name="shoe-prints" size={24} color="#1DB954" style={styles.gridIcon} />
            <Text style={styles.cardSubtitle}>Actividad Hoy</Text>
            <Text style={styles.gridValue}>{biometrics.steps}</Text>
            <Text style={styles.gridSubValue}>pasos</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.chartSectionTitle}>Metas de Nutrición</Text>
          <TouchableOpacity style={styles.updateButton} onPress={openNutriModal}>
            <Text style={styles.updateButtonText}>Editar</Text>
            <FontAwesome5 name="edit" size={14} color="#1DB954" />
          </TouchableOpacity>
        </View>

        <View style={styles.nutritionGrid}>
          <View style={styles.nutritionMacroCard}>
            <Text style={styles.macroCardTitle}>Calorías</Text>
            <Text style={styles.macroCardValue}>{nutritionTargets.calories}</Text>
            <Text style={styles.macroCardUnit}>kcal</Text>
          </View>
          <View style={styles.nutritionMacroCard}>
            <Text style={styles.macroCardTitle}>Carbs</Text>
            <Text style={styles.macroCardValue}>{nutritionTargets.carbs}</Text>
            <Text style={styles.macroCardUnit}>g</Text>
          </View>
          <View style={styles.nutritionMacroCard}>
            <Text style={styles.macroCardTitle}>Proteína</Text>
            <Text style={styles.macroCardValue}>{nutritionTargets.protein}</Text>
            <Text style={styles.macroCardUnit}>g</Text>
          </View>
          <View style={styles.nutritionMacroCard}>
            <Text style={styles.macroCardTitle}>Grasas</Text>
            <Text style={styles.macroCardValue}>{nutritionTargets.fats}</Text>
            <Text style={styles.macroCardUnit}>g</Text>
          </View>
        </View>

        <Text style={styles.chartSectionTitle}>Historial de Fuerza</Text>

        {uniqueExerciseIds.length === 0 ? (
          <View style={styles.chartPlaceholder}>
            <FontAwesome5 name="chart-line" size={48} color="#333333" />
            <Text style={styles.placeholderText}>Termina un entrenamiento para ver tus gráficas de progreso aquí.</Text>
          </View>
        ) : (
          <View style={styles.chartCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exerciseSelector}>
              {uniqueExerciseIds.map((id: any) => {
                const isSelected = id === selectedExerciseId;
                return (
                  <TouchableOpacity key={id} style={[styles.exerciseChip, isSelected && styles.exerciseChipActive]} onPress={() => setSelectedExerciseId(id)}>
                    <Text style={[styles.exerciseChipText, isSelected && styles.exerciseChipTextActive]}>{getExerciseName(id)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.chartWrapper}>
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
          </View>
        )}
            <Text style={[styles.chartSectionTitle, { marginTop: 20 }]}>Gestión de Datos</Text>
        <View style={styles.dataManagementCard}>
          <Text style={styles.dataDescription}>
            Crea una copia de seguridad de todas tus rutinas, historial, métricas de cuerpo y nutrición para no perder tu progreso.
          </Text>
          
          <View style={styles.dataButtonsRow}>
            <TouchableOpacity style={styles.exportButton} onPress={handleExportData}>
              <FontAwesome5 name="file-export" size={16} color="#000000" />
              <Text style={styles.exportButtonText}>Exportar (Backup)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.importButton} onPress={handleImportData}>
              <FontAwesome5 name="file-import" size={16} color="#B3B3B3" />
              <Text style={styles.importButtonText}>Importar Datos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* --- MODAL PARA ACTUALIZAR BIOMETRÍA --- */}
      <Modal visible={isBioModalVisible} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Actualizar Biometría</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Peso (kg)</Text>
                    <TextInput style={styles.input} value={tempWeight} onChangeText={setTempWeight} keyboardType="decimal-pad" keyboardAppearance="dark" placeholder="75.0" placeholderTextColor="#555" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Grasa Corporal (%)</Text>
                    <TextInput style={styles.input} value={tempBodyFat} onChangeText={setTempBodyFat} keyboardType="decimal-pad" keyboardAppearance="dark" placeholder="15.0" placeholderTextColor="#555" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Pasos</Text>
                    <TextInput style={styles.input} value={tempSteps} onChangeText={setTempSteps} keyboardType="number-pad" keyboardAppearance="dark" placeholder="10000" placeholderTextColor="#555" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setIsBioModalVisible(false)}><Text style={styles.cancelButtonText}>Cancelar</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveBio}><Text style={styles.saveButtonText}>Guardar</Text></TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- MODAL PARA ACTUALIZAR NUTRICIÓN --- */}
      <Modal visible={isNutriModalVisible} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Metas Diarias</Text>
                  
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <View style={[styles.inputGroup, { width: '48%' }]}>
                      <Text style={styles.inputLabel}>Calorías (kcal)</Text>
                      <TextInput style={styles.input} value={tempCalories} onChangeText={setTempCalories} keyboardType="numeric" keyboardAppearance="dark" placeholder="2000" placeholderTextColor="#555" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                    </View>
                    <View style={[styles.inputGroup, { width: '48%' }]}>
                      <Text style={styles.inputLabel}>Carbohidratos (g)</Text>
                      <TextInput style={styles.input} value={tempCarbs} onChangeText={setTempCarbs} keyboardType="numeric" keyboardAppearance="dark" placeholder="200" placeholderTextColor="#555" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                    </View>
                    <View style={[styles.inputGroup, { width: '48%' }]}>
                      <Text style={styles.inputLabel}>Proteínas (g)</Text>
                      <TextInput style={styles.input} value={tempProtein} onChangeText={setTempProtein} keyboardType="numeric" keyboardAppearance="dark" placeholder="150" placeholderTextColor="#555" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                    </View>
                    <View style={[styles.inputGroup, { width: '48%' }]}>
                      <Text style={styles.inputLabel}>Grasas (g)</Text>
                      <TextInput style={styles.input} value={tempFats} onChangeText={setTempFats} keyboardType="numeric" keyboardAppearance="dark" placeholder="60" placeholderTextColor="#555" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                    </View>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setIsNutriModalVisible(false)}><Text style={styles.cancelButtonText}>Cancelar</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveNutri}><Text style={styles.saveButtonText}>Guardar</Text></TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

// --- ESTILOS ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 25 },
  headerTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold' },
  updateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1DB95420', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  updateButtonText: { color: '#1DB954', fontSize: 14, fontWeight: 'bold' },

  mainCard: { backgroundColor: '#181818', borderRadius: 20, padding: 24, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardSubtitle: { color: '#B3B3B3', fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  mainValueContainer: { flexDirection: 'row', alignItems: 'baseline' },
  mainValue: { color: '#FFFFFF', fontSize: 48, fontWeight: 'bold' },
  unitText: { color: '#B3B3B3', fontSize: 20, fontWeight: '600', marginLeft: 5 },

  gridContainer: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  gridCard: { flex: 1, backgroundColor: '#181818', borderRadius: 20, padding: 20, alignItems: 'flex-start' },
  gridIcon: { marginBottom: 15 },
  gridValue: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginTop: 8 },
  gridSubValue: { color: '#B3B3B3', fontSize: 14, marginTop: -2 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  nutritionGrid: { flexDirection: 'row', gap: 10, marginBottom: 35 },
  nutritionMacroCard: { flex: 1, backgroundColor: '#181818', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#282828' },
  macroCardTitle: { color: '#B3B3B3', fontSize: 11, fontWeight: '600', marginBottom: 5 },
  macroCardValue: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  macroCardUnit: { color: '#B3B3B3', fontSize: 10, marginTop: 2 },

  chartSectionTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  chartCard: { backgroundColor: '#121212', borderRadius: 20, paddingVertical: 20, marginBottom: 40, borderWidth: 1, borderColor: '#282828' },
  exerciseSelector: { paddingHorizontal: 20, marginBottom: 25 },
  exerciseChip: { backgroundColor: '#282828', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 10 },
  exerciseChipActive: { backgroundColor: '#1DB954' },
  exerciseChipText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  exerciseChipTextActive: { color: '#000000', fontWeight: 'bold' },
  chartWrapper: { paddingRight: 20, paddingLeft: 10, alignItems: 'center' },
  chartPlaceholder: { backgroundColor: '#121212', borderWidth: 1, borderColor: '#333333', borderStyle: 'dashed', borderRadius: 20, padding: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  placeholderText: { color: '#B3B3B3', fontSize: 14, textAlign: 'center', marginTop: 15, marginBottom: 20 },

  // ACTUALIZADO: Estilos del Modal centrados
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: '#181818', borderRadius: 24, padding: 25, borderWidth: 1, borderColor: '#333333' },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  inputGroup: { marginBottom: 15 },
  inputLabel: { color: '#B3B3B3', fontSize: 14, marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: '#282828', color: '#FFFFFF', fontSize: 16, borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#333333', textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelButton: { flex: 1, padding: 15, alignItems: 'center', marginRight: 10, borderRadius: 12, backgroundColor: '#282828' },
  cancelButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  saveButton: { flex: 1, padding: 15, alignItems: 'center', marginLeft: 10, borderRadius: 12, backgroundColor: '#1DB954' },
  saveButtonText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  dataManagementCard: { backgroundColor: '#181818', borderRadius: 20, padding: 20, marginBottom: 40, borderWidth: 1, borderColor: '#282828' },
  dataDescription: { color: '#B3B3B3', fontSize: 14, lineHeight: 20, marginBottom: 20, textAlign: 'center' },
  dataButtonsRow: { flexDirection: 'column', gap: 12 },
  exportButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1DB954', paddingVertical: 16, borderRadius: 16, gap: 10 },
  exportButtonText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  importButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', paddingVertical: 16, borderRadius: 16, gap: 10, borderWidth: 1, borderColor: '#333333' },
  importButtonText: { color: '#B3B3B3', fontSize: 16, fontWeight: 'bold' },
});