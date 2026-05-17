import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { C } from '../../theme';
import DoctorDashboard          from './DoctorDashboard';
import DoctorStudentsScreen     from './DoctorStudentsScreen';
import DoctorLecturesScreen     from './DoctorLecturesScreen';
import DoctorGradesScreen       from './DoctorGradesScreen';
import DoctorAnalyticsScreen    from './DoctorAnalyticsScreen';
import DoctorLiveSessionScreen  from './DoctorLiveSessionScreen';
import DoctorTopicDetectorScreen from './DoctorTopicDetectorScreen';
import DoctorAlertsScreen       from './DoctorAlertsScreen';
import CommunityChat            from '../CommunityChat';
import ChatScreen               from '../ChatScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  Dashboard: '📊', Students: '👥', Lectures: '📋', Grades: '📝',
  Analytics: '📈', Live: '🔴', Topics: '🔍', Alerts: '🔔',
  Chat: '💬', 'AI Chat': '🤖',
};

export default function DoctorTabs({ user, onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border, height: 60 },
        tabBarActiveTintColor: C.purple,
        tabBarInactiveTintColor: C.text3,
        tabBarLabelStyle: { fontSize: 9, marginBottom: 4 },
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Dashboard"  children={() => <DoctorDashboard         user={user} onLogout={onLogout} />} />
      <Tab.Screen name="Students"   children={() => <DoctorStudentsScreen    user={user} />} />
      <Tab.Screen name="Lectures"   children={() => <DoctorLecturesScreen    user={user} />} />
      <Tab.Screen name="Grades"     children={() => <DoctorGradesScreen      user={user} />} />
      <Tab.Screen name="Analytics"  children={() => <DoctorAnalyticsScreen   user={user} />} />
      <Tab.Screen name="Live"       children={() => <DoctorLiveSessionScreen  user={user} />} />
      <Tab.Screen name="Topics"     children={() => <DoctorTopicDetectorScreen user={user} />} />
      <Tab.Screen name="Alerts"     children={() => <DoctorAlertsScreen      user={user} />} />
      <Tab.Screen name="Chat"       children={() => <CommunityChat           user={user} />} />
      <Tab.Screen name="AI Chat"    children={() => <ChatScreen              user={user} />} />
    </Tab.Navigator>
  );
}
