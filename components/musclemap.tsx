import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Rect } from 'react-native-svg';

// 1. Tipos de datos
export type Muscle = 'pecho' | 'espalda' | 'brazos' | 'piernas' | 'hombros';
export type FatigueLevel = 'strong' | 'light' | 'none';

interface MuscleMapProps {
  // Ahora recibe un diccionario con el nivel exacto de fatiga de cada músculo
  fatigueData: Record<Muscle, FatigueLevel>;
}

export default function MuscleMap({ fatigueData }: MuscleMapProps) {
  // 2. Nueva paleta de colores para la fatiga
  const strongColor = '#1DB954'; // Verde fuerte (Mucha fatiga)
  const lightColor = '#1DB95460'; // Verde claro (60% de opacidad - Baja fatiga)
  const inactiveColor = '#282828'; // Gris (Recuperado)

  // 3. Lógica de renderizado de color
  const getColor = (muscle: Muscle) => {
    const level = fatigueData[muscle] || 'none';
    if (level === 'strong') return strongColor;
    if (level === 'light') return lightColor;
    return inactiveColor;
  };

  return (
    <View style={styles.container}>
      <Svg height="180" width="120" viewBox="0 0 100 200">
        <G id="maniqui-muscular">
          <Circle cx="50" cy="30" r="20" fill={inactiveColor} />
          <Rect x="20" y="55" width="60" height="20" rx="10" fill={getColor('hombros')} />
          <Rect x="30" y="80" width="40" height="40" rx="5" fill={getColor('pecho')} />
          <Rect x="10" y="80" width="15" height="50" rx="7.5" fill={getColor('brazos')} />
          <Rect x="75" y="80" width="15" height="50" rx="7.5" fill={getColor('brazos')} />
          <Rect x="30" y="125" width="15" height="60" rx="7.5" fill={getColor('piernas')} />
          <Rect x="55" y="125" width="15" height="60" rx="7.5" fill={getColor('piernas')} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 10 }
});