import { FontAwesome5 } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useGymStore } from '../../store/gymStore';

// --- SUB-COMPONENTE: Barra de Progreso Individual ---
const MacroProgressBar = ({ label, consumed, target, unit }: { label: string, consumed: number, target: number, unit: string }) => {
  const percentage = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const isOverTarget = consumed > target;
  const fillColor = isOverTarget ? '#FF453A' : '#1DB954';

  return (
    <View style={styles.macroContainer}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValues}>{consumed} / {target} {unit}</Text>
      </View>
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  );
};

const MEALS = [
  { id: 'desayuno', title: 'Desayuno', icon: 'coffee' },
  { id: 'almuerzo', title: 'Almuerzo', icon: 'utensils' },
  { id: 'cena', title: 'Cena', icon: 'leaf' },
  { id: 'snacks', title: 'Snacks', icon: 'apple-alt' },
];

// --- SUB-COMPONENTE: Calendario de Hábitos ---
const NutritionCalendar = () => {
  const dailyNutritionHistory = useGymStore((state: any) => state.dailyNutritionHistory) || [];
  const targets = useGymStore((state: any) => state.nutritionTargets) || { calories: 2000, protein: 150, carbs: 200, fats: 60 };

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); 
  
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayIndex }, (_, i) => i);
  const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  const getDayStatus = (dayNumber: number) => {
    const dateString = new Date(currentYear, currentMonth, dayNumber).toISOString().split('T')[0];
    const record = dailyNutritionHistory.find((d: any) => d.date === dateString);
    
    if (!record) return 'none';
    
    let metCount = 0;
    if (targets.calories > 0 && record.consumed.calories >= targets.calories) metCount++;
    if (targets.protein > 0 && record.consumed.protein >= targets.protein) metCount++;
    if (targets.carbs > 0 && record.consumed.carbs >= targets.carbs) metCount++;
    if (targets.fats > 0 && record.consumed.fats >= targets.fats) metCount++;

    if (metCount >= 2) return 'green';
    if (metCount === 1) return 'yellow';
    return 'none';
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <View style={styles.calendarCard}>
      <Text style={styles.calendarMonthTitle}>{monthNames[currentMonth]} {currentYear}</Text>
      
      <View style={styles.calendarHeaderRow}>
        {weekDays.map((day, index) => (
          <Text key={index} style={styles.calendarDayText}>{day}</Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {blanksArray.map((_, index) => (
          <View key={`blank-${index}`} style={styles.calendarCell} />
        ))}
        
        {daysArray.map((day) => {
          const status = getDayStatus(day);
          const isToday = day === today.getDate();
          
          return (
            <View key={day} style={styles.calendarCell}>
              <View style={[
                styles.dayBubble,
                status === 'green' && styles.dayBubbleGreen,
                status === 'yellow' && styles.dayBubbleYellow,
                isToday && status === 'none' && styles.dayBubbleToday
              ]}>
                <Text style={[
                  styles.dayNumberText,
                  (status === 'green' || status === 'yellow') && styles.dayNumberTextActive
                ]}>
                  {day}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default function NutritionScreen() {
  const nutritionTargets = useGymStore((state: any) => state.nutritionTargets) || { calories: 2000, protein: 150, carbs: 200, fats: 60 };
  const dailyNutritionHistory = useGymStore((state: any) => state.dailyNutritionHistory) || [];
  const frequentMeals = useGymStore((state: any) => state.frequentMeals) || [];
  
  const addDailyNutrition = useGymStore((state: any) => state.addDailyNutrition);
  const addFrequentMeal = useGymStore((state: any) => state.addFrequentMeal);

  const todayString = new Date().toISOString().split('T')[0];
  const todayRecord = dailyNutritionHistory.find((day: any) => day.date === todayString);
  const consumedToday = todayRecord ? todayRecord.consumed : { calories: 0, protein: 0, carbs: 0, fats: 0 };

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeMealTitle, setActiveMealTitle] = useState('');
  
  const [tempMacros, setTempMacros] = useState({ calories: '', carbs: '', protein: '', fats: '' });
  
  const [isSavingFrequent, setIsSavingFrequent] = useState(false);
  const [frequentMealName, setFrequentMealName] = useState('');

  const handleOpenModal = (mealTitle: string) => {
    setActiveMealTitle(mealTitle);
    setTempMacros({ calories: '', carbs: '', protein: '', fats: '' });
    setIsSavingFrequent(false);
    setFrequentMealName('');
    setIsModalVisible(true);
  };

  const handleLoadFrequentMeal = (meal: any) => {
    setTempMacros({
      calories: meal.macros.calories.toString(),
      carbs: meal.macros.carbs.toString(),
      protein: meal.macros.protein.toString(),
      fats: meal.macros.fats.toString(),
    });
  };

  const handleSaveMeal = () => {
    const macrosToSave = {
      calories: Number(tempMacros.calories) || 0,
      carbs: Number(tempMacros.carbs) || 0,
      protein: Number(tempMacros.protein) || 0,
      fats: Number(tempMacros.fats) || 0,
    };

    addDailyNutrition(todayString, macrosToSave);

    if (isSavingFrequent && frequentMealName.trim() !== '') {
      addFrequentMeal({
        id: Date.now().toString(),
        name: frequentMealName,
        macros: macrosToSave
      });
    }

    setIsModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* NUEVO: Ocultar el header nativo de navegación */}
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ingesta de nutrientes</Text>
        </View>

        <View style={styles.nutritionCard}>
          <MacroProgressBar label="Calorías" consumed={consumedToday.calories} target={nutritionTargets.calories} unit="kcal" />
          <MacroProgressBar label="Carbohidratos" consumed={consumedToday.carbs} target={nutritionTargets.carbs} unit="g" />
          <MacroProgressBar label="Proteínas" consumed={consumedToday.protein} target={nutritionTargets.protein} unit="g" />
          <MacroProgressBar label="Grasas" consumed={consumedToday.fats} target={nutritionTargets.fats} unit="g" />
        </View>

        <View style={styles.mealsContainer}>
          <View style={styles.mealsHeader}>
            <Text style={styles.mealsSectionTitle}>Alimentación</Text>
          </View>

          <View style={styles.mealsCard}>
            {MEALS.map((meal, index) => (
              <TouchableOpacity 
                key={meal.id} 
                style={[styles.mealRow, index !== MEALS.length - 1 && styles.mealRowBorder]} 
                onPress={() => handleOpenModal(meal.title)}
              >
                <View style={styles.mealIconContainer}>
                  <FontAwesome5 name={meal.icon} size={18} color="#000000" />
                </View>
                
                <View style={styles.mealInfo}>
                  <Text style={styles.mealTitle}>
                    {meal.title} <FontAwesome5 name="arrow-right" size={10} color="#FFFFFF" />
                  </Text>
                  <Text style={styles.mealCalories}>Registrar entrada</Text> 
                </View>
                
                <View style={styles.addButton}>
                  <FontAwesome5 name="plus" size={16} color="#000000" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <NutritionCalendar />

      </ScrollView>

      {/* --- MODAL DE REGISTRO RÁPIDO ACTUALIZADO --- */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsModalVisible(false)}>
        {/* NUEVO: Touchable para cerrar al hacer clic fuera */}
        <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
              {/* NUEVO: Touchable para prevenir que el clic se propague y cierre el modal si tocas dentro */}
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Agregar a {activeMealTitle}</Text>
                  
                  {frequentMeals.length > 0 && (
                    <View style={styles.frequentSection}>
                      <Text style={styles.frequentTitle}>Comidas Frecuentes</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {frequentMeals.map((fm: any) => (
                          <TouchableOpacity key={fm.id} style={styles.frequentChip} onPress={() => handleLoadFrequentMeal(fm)}>
                            <Text style={styles.frequentChipText}>{fm.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <View style={styles.inputGrid}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Calorías (kcal)</Text>
                      <TextInput style={styles.input} value={tempMacros.calories} onChangeText={(text) => setTempMacros({...tempMacros, calories: text})} keyboardType="numeric" keyboardAppearance="dark" placeholder="0" placeholderTextColor="#666" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Carbohidratos (g)</Text>
                      <TextInput style={styles.input} value={tempMacros.carbs} onChangeText={(text) => setTempMacros({...tempMacros, carbs: text})} keyboardType="numeric" keyboardAppearance="dark" placeholder="0" placeholderTextColor="#666" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Proteínas (g)</Text>
                      <TextInput style={styles.input} value={tempMacros.protein} onChangeText={(text) => setTempMacros({...tempMacros, protein: text})} keyboardType="numeric" keyboardAppearance="dark" placeholder="0" placeholderTextColor="#666" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Grasas (g)</Text>
                      <TextInput style={styles.input} value={tempMacros.fats} onChangeText={(text) => setTempMacros({...tempMacros, fats: text})} keyboardType="numeric" keyboardAppearance="dark" placeholder="0" placeholderTextColor="#666" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                    </View>
                  </View>

                  <View style={styles.toggleContainer}>
                    <Text style={styles.toggleLabel}>Guardar en mis comidas frecuentes</Text>
                    <Switch 
                      value={isSavingFrequent} 
                      onValueChange={setIsSavingFrequent}
                      trackColor={{ false: "#333", true: "#1DB954" }}
                      thumbColor={"#FFF"}
                    />
                  </View>

                  {isSavingFrequent && (
                    <TextInput 
                      style={styles.nameInput} 
                      value={frequentMealName} 
                      onChangeText={setFrequentMealName} 
                      placeholder="Ej. Hamburguesa Titi Burguer" 
                      placeholderTextColor="#666"
                      keyboardAppearance="dark"
                      returnKeyType="done" 
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  )}

                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setIsModalVisible(false)}>
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveMeal}>
                      <Text style={styles.saveButtonText}>Guardar</Text>
                    </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 }, // Aumentamos paddingBottom para que nada quede oculto
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 25 }, // Agregamos paddingTop para separar el título del reloj
  headerTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold' },
  nutritionCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#282828', marginBottom: 30 },
  macroContainer: { marginBottom: 20 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  macroLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  macroValues: { color: '#B3B3B3', fontSize: 14, fontWeight: '600' },
  progressBarBackground: { height: 8, backgroundColor: '#333333', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  mealsContainer: { flex: 1 },
  mealsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  mealsSectionTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' },
  mealsCard: { backgroundColor: '#181818', borderRadius: 16, borderWidth: 1, borderColor: '#282828', overflow: 'hidden' },
  mealRow: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  mealRowBorder: { borderBottomWidth: 1, borderBottomColor: '#282828' },
  mealIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1DB954', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  mealInfo: { flex: 1, justifyContent: 'center' },
  mealTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  mealCalories: { color: '#B3B3B3', fontSize: 14, fontWeight: '500' },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  
  // Estilos del Calendario
  calendarCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#282828', marginTop: 30 },
  calendarMonthTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, textTransform: 'capitalize' },
  calendarHeaderRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  calendarDayText: { color: '#B3B3B3', fontSize: 12, fontWeight: 'bold', width: 30, textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  calendarCell: { width: '14.28%', alignItems: 'center', paddingVertical: 5 },
  dayBubble: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#282828', justifyContent: 'center', alignItems: 'center' },
  dayBubbleToday: { borderWidth: 1, borderColor: '#1DB954' },
  dayBubbleGreen: { backgroundColor: '#1DB954' },
  dayBubbleYellow: { backgroundColor: '#FFD60A' },
  dayNumberText: { color: '#B3B3B3', fontSize: 14, fontWeight: '600' },
  dayNumberTextActive: { color: '#000000', fontWeight: 'bold' },

  // Estilos del Modal (Actualizados para estar centrados)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: '#181818', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, borderWidth: 1, borderColor: '#333333' },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  
  frequentSection: { marginBottom: 20 },
  frequentTitle: { color: '#B3B3B3', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10 },
  frequentChip: { backgroundColor: '#282828', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#333333' },
  frequentChipText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  inputContainer: { width: '48%', marginBottom: 15 },
  inputLabel: { color: '#B3B3B3', fontSize: 14, marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: '#282828', color: '#FFFFFF', fontSize: 16, borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#333333', textAlign: 'center' },
  
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 15, backgroundColor: '#282828', padding: 15, borderRadius: 12 },
  toggleLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', flex: 1 },
  nameInput: { backgroundColor: '#282828', color: '#FFFFFF', fontSize: 16, borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#1DB954', marginBottom: 15 },

  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelButton: { flex: 1, padding: 15, alignItems: 'center', marginRight: 10, borderRadius: 12, backgroundColor: '#282828' },
  cancelButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  saveButton: { flex: 1, padding: 15, alignItems: 'center', marginLeft: 10, borderRadius: 12, backgroundColor: '#1DB954' },
  saveButtonText: { color: '#000000', fontSize: 16, fontWeight: 'bold' }
});