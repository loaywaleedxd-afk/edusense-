import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StatusBar } from 'react-native';

import SetupScreen from './src/screens/SetupScreen';
import LoginScreen from './src/screens/LoginScreen';
import StudentTabs from './src/screens/student/StudentTabs';
import DoctorTabs from './src/screens/doctor/DoctorTabs';
import AdminDashboard from './src/screens/admin/AdminDashboard';
import ParentDashboard from './src/screens/parent/ParentDashboard';

const Stack = createNativeStackNavigator();

export default function App() {
  const [ready, setReady] = useState(false);
  const [hasBackend, setHasBackend] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const url = await AsyncStorage.getItem('backend_url');
        const savedUser = await AsyncStorage.getItem('user');
        setHasBackend(!!url);
        if (savedUser) setUser(JSON.parse(savedUser));
      } catch {}
      setReady(true);
    }
    init();
  }, []);

  async function handleLogin(userData) {
    setUser(userData);
  }

  async function handleLogout() {
    await AsyncStorage.removeItem('user');
    setUser(null);
  }

  function handleSetupDone() {
    setHasBackend(true);
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  if (!hasBackend) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <SetupScreen onDone={handleSetupDone} />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <LoginScreen onLogin={handleLogin} />
      </>
    );
  }

  const role = user.role;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <NavigationContainer>
        {role === 'student' && <StudentTabs user={user} onLogout={handleLogout} />}
        {role === 'doctor'  && <DoctorTabs  user={user} onLogout={handleLogout} />}
        {role === 'admin'   && (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Admin" children={() => <AdminDashboard user={user} onLogout={handleLogout} />} />
          </Stack.Navigator>
        )}
        {role === 'parent'  && (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Parent" children={() => <ParentDashboard user={user} onLogout={handleLogout} />} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </>
  );
}
