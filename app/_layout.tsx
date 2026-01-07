import React from 'react';
import '../global.css';
import { Stack } from 'expo-router';
import { Provider, useSelector } from 'react-redux';
import { store, RootState } from '../redux/store';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, useWindowDimensions, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

function Sidebar({ rol }: { rol: string }) {
  const router = useRouter();
  return (
    <View style={{ width: 320, padding: 20, backgroundColor: '#0b0b0b', borderRightWidth: 1, borderRightColor: '#222' }}>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>MIT - {rol.toUpperCase()}</Text>
      <TouchableOpacity onPress={() => router.push('/home')} style={{ paddingVertical: 12 }}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Dashboard</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/turnos')} style={{ paddingVertical: 12 }}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Turnos</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/checklist')} style={{ paddingVertical: 12 }}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Checklist</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/form')} style={{ paddingVertical: 12 }}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Form</Text>
      </TouchableOpacity>
    </View>
  );
}

function LayoutContent() {
  const rol = useSelector((state: RootState) => state.login.rol);
  const user = useSelector((state: RootState) => state.login.user);
  const { width } = useWindowDimensions();

  // Si no hay usuario, mostrar login
  if (!user || !rol) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
          redirect
        />
        <Stack.Screen
          name="login"
          options={{ headerShown: false, animationEnabled: false }}
        />
      </Stack>
    );
  }

  const isWide = width > 1024;

  const stackScreens = (
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
  );

  if (isWide) {
    // Desktop / Monitor layout: Sidebar + Content
    return (
      <SafeAreaView style={{ flex: 1, flexDirection: 'row', backgroundColor: '#000' }}>
        <Sidebar rol={rol} />
        <View style={{ flex: 1 }}>
          {stackScreens}
        </View>
      </SafeAreaView>
    );
  }

  // Mobile / Tablet: Stack full width (keeps existing experience)
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      {stackScreens}
    </SafeAreaView>
  );
}

export default function Layout() {
  return (
    <Provider store={store}>
      <StatusBar style="light" backgroundColor="#000" />
      <LayoutContent />
    </Provider>
  );
}