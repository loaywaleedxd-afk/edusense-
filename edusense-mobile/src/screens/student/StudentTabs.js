import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { C } from '../../theme';
import DashboardScreen from './DashboardScreen';
import AttendanceScreen from './AttendanceScreen';
import EmotionsScreen from './EmotionsScreen';
import GradesScreen from './GradesScreen';
import ChatScreen from '../ChatScreen';

const Tab = createBottomTabNavigator();

export default function StudentTabs({ user, onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border, height: 60 },
        tabBarActiveTintColor: C.blue,
        tabBarInactiveTintColor: C.text3,
        tabBarLabelStyle: { fontSize: 10, marginBottom: 4 },
        tabBarIcon: ({ color }) => {
          const icons = { Dashboard: '📊', Attendance: '✅', Emotions: '😊', Grades: '📝', Chat: '💬' };
          return <Text style={{ fontSize: 20, color }}>{icons[route.name]}</Text>;
        },
      })}
    >
      <Tab.Screen name="Dashboard"  children={() => <DashboardScreen  user={user} onLogout={onLogout} />} />
      <Tab.Screen name="Attendance" children={() => <AttendanceScreen user={user} />} />
      <Tab.Screen name="Emotions"   children={() => <EmotionsScreen   user={user} />} />
      <Tab.Screen name="Grades"     children={() => <GradesScreen     user={user} />} />
      <Tab.Screen name="Chat"       children={() => <ChatScreen       user={user} />} />
    </Tab.Navigator>
  );
}
