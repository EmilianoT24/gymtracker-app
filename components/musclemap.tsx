import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import Svg, { Circle, G, Rect } from 'react-native-svg';

// 1. Expandimos los tipos de datos a 10 zonas musculares
export type Muscle = 'pecho' | 'espalda' | 'hombros' | 'biceps' | 'triceps' | 'piernas' | 'gluteos' | 'pantorrillas' | 'core' | 'antebrazos';
export type FatigueLevel = 'strong' | 'light' | 'none';

interface MuscleMapProps {
  fatigueData: Record<Muscle, FatigueLevel>;
}

export default function MuscleMap({ fatigueData }: MuscleMapProps) {
  // Estado para controlar si vemos el frente o la espalda
  const [view, setView] = useState<'front' | 'back'>('front');

  const strongColor = '#1DB954'; 
  const lightColor = '#1DB95460'; 
  const inactiveColor = '#282828'; 

  const getColor = (muscle: Muscle) => {
    const level = fatigueData[muscle] || 'none';
    if (level === 'strong') return strongColor;
    if (level === 'light') return lightColor;
    return inactiveColor;
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={0.8} 
      onPress={() => setView(view === 'front' ? 'back' : 'front')}
    >
      <Svg height="180" width="120" viewBox="0 0 100 200">
        {view === 'front' ? (
          <G id="front-view">
            {/* Cabeza y Cuello */}
            <Circle cx="50" cy="20" r="15" fill={inactiveColor} />
            {/* Hombros frontales */}
            <Rect x="20" y="40" width="60" height="15" rx="7.5" fill={getColor('hombros')} />
            {/* Pecho */}
            <Rect x="28" y="58" width="44" height="25" rx="6" fill={getColor('pecho')} />
            {/* Abdomen / Core */}
            <Rect x="32" y="85" width="36" height="30" rx="6" fill={getColor('core')} />
            {/* Bíceps */}
            <Rect x="12" y="58" width="14" height="30" rx="7" fill={getColor('biceps')} />
            <Rect x="74" y="58" width="14" height="30" rx="7" fill={getColor('biceps')} />
            {/* Antebrazos frontales */}
            <Rect x="12" y="90" width="12" height="25" rx="6" fill={getColor('antebrazos')} />
            <Rect x="76" y="90" width="12" height="25" rx="6" fill={getColor('antebrazos')} />
            {/* Piernas Frontales (Cuádriceps) */}
            <Rect x="28" y="118" width="20" height="40" rx="10" fill={getColor('piernas')} />
            <Rect x="52" y="118" width="20" height="40" rx="10" fill={getColor('piernas')} />
            {/* Pantorrillas frontales */}
            <Rect x="30" y="160" width="16" height="35" rx="8" fill={getColor('pantorrillas')} />
            <Rect x="54" y="160" width="16" height="35" rx="8" fill={getColor('pantorrillas')} />
          </G>
        ) : (
          <G id="back-view">
            {/* Cabeza */}
            <Circle cx="50" cy="20" r="15" fill={inactiveColor} />
            {/* Hombros (Trapecios/Posteriores) */}
            <Rect x="20" y="40" width="60" height="15" rx="7.5" fill={getColor('hombros')} />
            {/* Espalda (Dorsales y espalda baja) */}
            <Rect x="28" y="58" width="44" height="57" rx="6" fill={getColor('espalda')} />
            {/* Tríceps */}
            <Rect x="12" y="58" width="14" height="30" rx="7" fill={getColor('triceps')} />
            <Rect x="74" y="58" width="14" height="30" rx="7" fill={getColor('triceps')} />
            {/* Antebrazos traseros */}
            <Rect x="12" y="90" width="12" height="25" rx="6" fill={getColor('antebrazos')} />
            <Rect x="76" y="90" width="12" height="25" rx="6" fill={getColor('antebrazos')} />
            {/* Glúteos */}
            <Rect x="28" y="118" width="21" height="22" rx="8" fill={getColor('gluteos')} />
            <Rect x="51" y="118" width="21" height="22" rx="8" fill={getColor('gluteos')} />
            {/* Piernas Traseras (Femorales) */}
            <Rect x="28" y="142" width="20" height="33" rx="10" fill={getColor('piernas')} />
            <Rect x="52" y="142" width="20" height="33" rx="10" fill={getColor('piernas')} />
            {/* Pantorrillas traseras */}
            <Rect x="30" y="177" width="16" height="18" rx="8" fill={getColor('pantorrillas')} />
            <Rect x="54" y="177" width="16" height="18" rx="8" fill={getColor('pantorrillas')} />
          </G>
        )}
      </Svg>
      {/* Indicador visual para que el usuario sepa que puede tocarlo */}
      <Text style={styles.toggleText}>
        {view === 'front' ? 'Frente (Toca para girar)' : 'Espalda (Toca para girar)'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 5 },
  toggleText: { color: '#B3B3B3', fontSize: 10, marginTop: 10, fontWeight: '600', textTransform: 'uppercase' }
});