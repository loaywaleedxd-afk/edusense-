import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { C } from '../../theme';
import ParentDashboard        from './ParentDashboard';
import ParentAttendanceScreen from './ParentAttendanceScreen';
import ParentEmotionsScreen   from './ParentEmotionsScreen';
import ParentPerformanceScreen from './ParentPerformanceScreen';
import ParentScheduleScreen   from './ParentScheduleScreen';
import ChatScreen             from '../ChatScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  Dashboard: '👨‍👩‍👧', Attendance: '✅', Emotions: '😊',
  Performance: '📈', Schedule: '📅', 'AI Chat': '🤖',
};

export default function ParentTabs({ user, onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border, height: 60 },
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.text3,
        tabBarLabelStyle: { fontSize: 9, marginBottom: 4 },
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Dashboard"   children={() => <ParentDashboard        user={user} onLogout={onLogout} />} />
      <Tab.Screen name="Attendance"  children={() => <ParentAttendanceScreen user={user} />} />
      <Tab.Screen name="Emotions"    children={() => <ParentEmotionsScreen   user={user} />} />
      <Tab.Screen name="Performance" children={() => <ParentPerformanceScreen user={user} />} />
      <Tab.Screen name="Schedule"    children={() => <ParentScheduleScreen   user={user} />} />
      <Tab.Screen name="AI Chat"     children={() => <ChatScreen             user={user} />} />
    </Tab.Navigator>
  );
}
