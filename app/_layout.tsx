import React from 'react';
import '../global.css';
import { Stack } from 'expo-router';
import { Provider, useSelector } from 'react-redux';
import { store, RootState } from '../redux/store';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native';
import { CustomAlertProvider } from '@/components/CustomAlert';
import { GlobalLoadingProvider } from '@/components/GlobalLoading';

function LayoutContent() {
  const rol = useSelector((state: RootState) => state.login.rol);
  const user = useSelector((state: RootState) => state.login.user);

  // Si no hay usuario, mostrar login
  if (!user || !rol) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} redirect />
        <Stack.Screen name="login" options={{ headerShown: false, animationEnabled: false }} />
      </Stack>
    );
  }

  // Always render stack screens full width (no sidebar)
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="home" options={{ headerShown: false, animationEnabled: false }} />
        <Stack.Screen name="form" options={{ headerShown: false }} />
        <Stack.Screen name="preview" options={{ headerShown: false }} />
        <Stack.Screen name="checklist/index" options={{ headerShown: false }} />
        <Stack.Screen name="checklist/checklistitems" options={{ headerShown: false }} />
        <Stack.Screen name="turnos" options={{ headerShown: false }} />
        <Stack.Screen name="solicitud" options={{ headerShown: false }} />
        <Stack.Screen name="checkin" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaView>
  );
}

export default function Layout() {
  return (
    <Provider store={store}>
      <StatusBar style="light" backgroundColor="#000" />
      <GlobalLoadingProvider>
        <CustomAlertProvider>
          <LayoutContent />
        </CustomAlertProvider>
      </GlobalLoadingProvider>
    </Provider>
  );
}