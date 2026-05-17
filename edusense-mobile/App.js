import { registerRootComponent } from 'expo';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StatusBar } from 'react-native';

import SetupScreen from './src/screens/SetupScreen';
import LoginScreen from './src/screens/LoginScreen';
import StudentTabs from './src/screens/student/StudentTabs';
import DoctorTabs from './src/screens/doctor/DoctorTabs';
import AdminTabs  from './src/screens/admin/AdminTabs';
import ParentTabs  from './src/screens/parent/ParentTabs';

function App() {
  const [ready, setReady] = useState(false);
  const [hasBackend, setHasBackend] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const url = await AsyncStorage.getItem('backend_url');
        setHasBackend(!!url);
        // Do NOT restore saved session — always require login on app start
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

  async function handleResetServer() {
    await AsyncStorage.removeItem('backend_url');
    await AsyncStorage.removeItem('user');
    setUser(null);
    setHasBackend(false);
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
        <LoginScreen onLogin={handleLogin} onResetServer={handleResetServer} />
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
        {role === 'admin'  && <AdminTabs  user={user} onLogout={handleLogout} />}
        {role === 'parent' && <ParentTabs user={user} onLogout={handleLogout} />}
      </NavigationContainer>
    </>
  );
}

registerRootComponent(App);
