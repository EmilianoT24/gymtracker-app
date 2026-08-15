import { FontAwesome5 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, 
        tabBarStyle: {
          backgroundColor: '#000000', 
          borderTopWidth: 1,
          borderTopColor: '#282828', 
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 90 : 70, 
        },
        tabBarActiveTintColor: '#1DB954', 
        tabBarInactiveTintColor: '#B3B3B3', 
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginBottom: 5, 
        }
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          // Aumentamos el tamaño de 20 a 26
          tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={26} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Rutinas',
          // Aumentamos el tamaño de 20 a 26
          tabBarIcon: ({ color }) => <FontAwesome5 name="dumbbell" size={26} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrición',
          // Aumentamos el tamaño de 22 a 28
          tabBarIcon: ({ color }) => <FontAwesome5 name="apple-alt" size={28} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progreso',
          // Aumentamos el tamaño de 20 a 26
          tabBarIcon: ({ color }) => <FontAwesome5 name="chart-line" size={26} color={color} />,
        }}
      />
      
    </Tabs>
  );
}