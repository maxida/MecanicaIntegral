import { setFlagConFactura, setIdPresupuesto } from '@/redux/slices/invoiceSlice';
import { obtenerUltimoIdPresupuestoGlobal } from '@/services/invoiceService';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { logout } from '@/redux/slices/loginSlice';
import AdminDashboard from '@/app/dashboards/admin';
import SupervisorDashboard from '@/app/dashboards/supervisor';
import MecanicoDashboard from '@/app/dashboards/mecanico';
import ClienteDashboard from '@/app/dashboards/cliente';

// --- COMPONENTE TARJETA ---
const MenuCard = ({ title, subtitle, icon, color, onPress, loading, disabled }: any) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={loading || disabled}
    style={[styles.card, disabled && styles.cardDisabled]}
    activeOpacity={0.7}
  >
    <View style={styles.cardHeader}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        {loading ? (
          <ActivityIndicator color={color} size="small" />
        ) : (
          icon
        )}
      </View>
      <View style={[styles.indicator, { backgroundColor: color }]} />
    </View>
    <View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </View>
  </TouchableOpacity>
);

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  
  const rol = useSelector((state: RootState) => state.login.rol);
  const user = useSelector((state: RootState) => state.login.user);
  
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Lógica de ID
  const generarSiguienteId = (presupuestoActual: string | null | undefined): string => {
    if (!presupuestoActual || presupuestoActual === '0') return '00000000000-1';
    const partes = presupuestoActual.split('-');
    const siguienteNumero = parseInt(partes[1], 10) + 1;
    const cerosNecesarios = 11 - siguienteNumero.toString().length;
    const ceros = '0'.repeat(Math.max(0, cerosNecesarios));
    return `${ceros}-${siguienteNumero}`;
  }

  const handleLogout = () => {
    dispatch(logout());
    navigation.reset({ index: 0, routes: [{ name: 'login' }] });
  };

  // --- NAVEGACIÓN CORREGIDA ---
  const handleNavigation = async (ruta: string, conFactura: boolean, tipoFactura: string | null = null) => {
    
    // 1. DETERMINAR QUIÉN ESTÁ CARGANDO (FIX)
    let actionKey = '';
    if (ruta.includes('checklist')) {
        actionKey = 'checklist';
    } else if (conFactura) {
        actionKey = 'factura';
    } else {
        actionKey = 'presupuesto';
    }

    // 2. Lógica del Modal (Solo para Facturas formales)
    if (actionKey === 'factura' && !tipoFactura) {
      setModalVisible(true);
      return;
    }

    if (tipoFactura) setModalVisible(false);
    
    // 3. Activar Spinner correcto
    setLoadingAction(actionKey);

    try {
      dispatch(setFlagConFactura(conFactura));
      
      const ultimoId = await obtenerUltimoIdPresupuestoGlobal(conFactura);
      const nuevoId = generarSiguienteId(ultimoId);
      dispatch(setIdPresupuesto(nuevoId));
      
      navigation.navigate(ruta, { tipoFactura });
      
    } catch (error) {
      console.error("Error generando ID:", error);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <View style={styles.mainContainer}>
      {/* ADMIN Dashboard */}
      {rol === 'admin' && <AdminDashboard onLogout={handleLogout} />}

      {/* SUPERVISOR Dashboard */}
      {rol === 'supervisor' && <SupervisorDashboard onLogout={handleLogout} />}

      {/* MECÁNICO Dashboard */}
      {rol === 'mecanico' && <MecanicoDashboard onLogout={handleLogout} />}

      {/* CLIENTE Dashboard */}
      {rol === 'cliente' && <ClienteDashboard onLogout={handleLogout} />}

      {/* Fallback para cualquier otro rol */}
      {!rol && (
        <LinearGradient colors={['#000000', '#121212']} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            <Text style={styles.fallbackText}>Rol no reconocido</Text>
          </SafeAreaView>
        </LinearGradient>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  fallbackText: { color: '#fff', textAlign: 'center', marginTop: 50 },
});

export default HomeScreen;