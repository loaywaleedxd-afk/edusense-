import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { C } from '../../theme';
import AdminDashboard       from './AdminDashboard';
import AdminStudentsScreen  from './AdminStudentsScreen';
import AdminLecturersScreen from './AdminLecturersScreen';
import AdminCoursesScreen   from './AdminCoursesScreen';
import AdminAnalyticsScreen from './AdminAnalyticsScreen';
import AdminSettingsScreen  from './AdminSettingsScreen';
import CommunityChat        from '../CommunityChat';

const Tab = createBottomTabNavigator();

const ICONS = {
  Dashboard: '🏛️', Students: '👥', Lecturers: '👨‍🏫', Courses: '📚',
  Analytics: '📊', Chat: '💬', Settings: '⚙️',
};

export default function AdminTabs({ user, onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border, height: 60 },
        tabBarActiveTintColor: C.cyan,
        tabBarInactiveTintColor: C.text3,
        tabBarLabelStyle: { fontSize: 9, marginBottom: 4 },
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Dashboard"  children={() => <AdminDashboard       user={user} onLogout={onLogout} />} />
      <Tab.Screen name="Students"   children={() => <AdminStudentsScreen  />} />
      <Tab.Screen name="Lecturers"  children={() => <AdminLecturersScreen />} />
      <Tab.Screen name="Courses"    children={() => <AdminCoursesScreen   />} />
      <Tab.Screen name="Analytics"  children={() => <AdminAnalyticsScreen />} />
      <Tab.Screen name="Chat"       children={() => <CommunityChat        user={user} />} />
      <Tab.Screen name="Settings"   children={() => <AdminSettingsScreen  onLogout={onLogout} />} />
    </Tab.Navigator>
  );
}
