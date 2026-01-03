import { Stack } from 'expo-router';
import { Provider, useSelector } from 'react-redux';
import { store, RootState } from '../redux/store';
import { StatusBar } from 'expo-status-bar';

function LayoutContent() {
  const rol = useSelector((state: RootState) => state.login.rol);
  const user = useSelector((state: RootState) => state.login.user);

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

  // Navegación según rol
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* ADMIN - Acceso completo */}
      {rol === 'admin' && (
        <>
          <Stack.Screen
            name="home"
            options={{ headerShown: false, animationEnabled: false }}
          />
          <Stack.Screen
            name="form"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="preview"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="checklist/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="checklist/checklistitems"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="turnos"
            options={{ headerShown: false }}
          />
        </>
      )}

      {/* SUPERVISOR - Dashboard con historial */}
      {rol === 'supervisor' && (
        <>
          <Stack.Screen
            name="home"
            options={{ 
              headerShown: false, 
              animationEnabled: false,
              title: 'Supervisor Dashboard'
            }}
          />
          <Stack.Screen
            name="turnos"
            options={{ headerShown: false }}
          />
        </>
      )}

      {/* MECÁNICO - Solo tareas diarias */}
      {rol === 'mecanico' && (
        <>
          <Stack.Screen
            name="home"
            options={{ 
              headerShown: false, 
              animationEnabled: false,
              title: 'Mis Tareas'
            }}
          />
          <Stack.Screen
            name="turnos"
            options={{ headerShown: false }}
          />
        </>
      )}

      {/* CLIENTE - Información de camión y solicitudes */}
      {rol === 'cliente' && (
        <>
          <Stack.Screen
            name="home"
            options={{ 
              headerShown: false, 
              animationEnabled: false,
              title: 'Mi Camión'
            }}
          />
          <Stack.Screen
            name="form"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="preview"
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack>
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