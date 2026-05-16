import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { C } from '../../theme';
import DoctorDashboard from './DoctorDashboard';
import DoctorStudentsScreen from './DoctorStudentsScreen';
import DoctorLecturesScreen from './DoctorLecturesScreen';
import ChatScreen from '../ChatScreen';

const Tab = createBottomTabNavigator();

export default function DoctorTabs({ user, onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border, height: 60 },
        tabBarActiveTintColor: C.purple,
        tabBarInactiveTintColor: C.text3,
        tabBarLabelStyle: { fontSize: 10, marginBottom: 4 },
        tabBarIcon: ({ color }) => {
          const icons = { Dashboard: '📊', Students: '👥', Lectures: '📋', Chat: '💬' };
          return <Text style={{ fontSize: 20, color }}>{icons[route.name]}</Text>;
        },
      })}
    >
      <Tab.Screen name="Dashboard" children={() => <DoctorDashboard user={user} onLogout={onLogout} />} />
      <Tab.Screen name="Students"  children={() => <DoctorStudentsScreen user={user} />} />
      <Tab.Screen name="Lectures"  children={() => <DoctorLecturesScreen user={user} />} />
      <Tab.Screen name="Chat"      children={() => <ChatScreen user={user} />} />
    </Tab.Navigator>
  );
}
