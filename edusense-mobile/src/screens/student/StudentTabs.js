import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { C } from '../../theme';
import DashboardScreen     from './DashboardScreen';
import AttendanceScreen    from './AttendanceScreen';
import EmotionsScreen      from './EmotionsScreen';
import PerformanceScreen   from './PerformanceScreen';
import ScheduleScreen      from './ScheduleScreen';
import CommunityChat       from '../CommunityChat';
import ChatScreen          from '../ChatScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  Dashboard: '📊', Attendance: '✅', Emotions: '😊',
  Performance: '📈', Schedule: '📅', Chat: '💬', 'AI Chat': '🤖',
};

export default function StudentTabs({ user, onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border, height: 60 },
        tabBarActiveTintColor: C.blue,
        tabBarInactiveTintColor: C.text3,
        tabBarLabelStyle: { fontSize: 9, marginBottom: 4 },
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Dashboard"   children={() => <DashboardScreen   user={user} onLogout={onLogout} />} />
      <Tab.Screen name="Attendance"  children={() => <AttendanceScreen  user={user} />} />
      <Tab.Screen name="Emotions"    children={() => <EmotionsScreen    user={user} />} />
      <Tab.Screen name="Performance" children={() => <PerformanceScreen user={user} />} />
      <Tab.Screen name="Schedule"    children={() => <ScheduleScreen    user={user} />} />
      <Tab.Screen name="Chat"        children={() => <CommunityChat     user={user} />} />
      <Tab.Screen name="AI Chat"     children={() => <ChatScreen        user={user} />} />
    </Tab.Navigator>
  );
}
