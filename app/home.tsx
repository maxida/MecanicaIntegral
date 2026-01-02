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
import { useDispatch } from 'react-redux';

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
      <LinearGradient
        colors={['#000000', '#121212']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>Bienvenido,</Text>
                <Text style={styles.headerTitle}>Mecánica Integral</Text>
              </View>
              <TouchableOpacity 
                style={styles.logoutButton}
                onPress={() => navigation.navigate('login')}
              >
                <MaterialIcons name="logout" size={20} color="#FF4C4C" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Operaciones</Text>
            
            <View style={styles.gridContainer}>
              <MenuCard
                title="Presupuesto"
                subtitle="Control Interno"
                color="#60A5FA"
                icon={<MaterialIcons name="description" size={26} color="#60A5FA" />}
                loading={loadingAction === 'presupuesto'}
                onPress={() => handleNavigation('form', false)}
              />

              <MenuCard
                title="Facturar"
                subtitle="Seleccionar Tipo"
                color="#FF4C4C"
                icon={<MaterialIcons name="receipt-long" size={26} color="#FF4C4C" />}
                loading={loadingAction === 'factura'}
                onPress={() => handleNavigation('form', true)}
              />

              {/* AHORA SÍ: El loading escucha a 'checklist' específicamente */}
              <MenuCard
                title="Checklist"
                subtitle="Ingreso Vehículo"
                color="#4ADE80"
                icon={<FontAwesome5 name="car-crash" size={22} color="#4ADE80" />}
                loading={loadingAction === 'checklist'}
                onPress={() => handleNavigation('checklist/index', true)}
              />

              <MenuCard
                title="Clientes"
                subtitle="Base de datos"
                color="#FACC15"
                icon={<MaterialIcons name="people" size={26} color="#FACC15" />}
                loading={false}
                onPress={() => console.log("Clientes")}
              />
            </View>

            <View style={styles.bannerContainer}>
              <LinearGradient
                colors={['#1E1E1E', '#252525']}
                style={styles.bannerContent}
                start={{x:0, y:0}} end={{x:1, y:1}}
              >
                <View style={styles.bannerIconBox}>
                   <MaterialIcons name="insights" size={24} color="#fff" />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.bannerTitle}>Resumen Mensual</Text>
                  <Text style={styles.bannerText}>Ver balance de ingresos y egresos</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#666" />
              </LinearGradient>
            </View>

          </ScrollView>
        </SafeAreaView>

        {/* --- MODAL --- */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalIndicator} />
                  <Text style={styles.modalTitle}>Tipo de Comprobante</Text>
                  <Text style={styles.modalSubtitle}>Selecciona el tipo de factura a emitir</Text>

                  {/* Factura A */}
                  <TouchableOpacity 
                    style={styles.optionButton} 
                    onPress={() => handleNavigation('form', true, 'A')}
                  >
                    <View style={[styles.badge, { backgroundColor: '#FF4C4C' }]}>
                      <Text style={styles.badgeText}>A</Text>
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>Factura A</Text>
                      <Text style={styles.optionDescription}>Resp. Inscripto a R.I.</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#666" />
                  </TouchableOpacity>

                  {/* Factura B */}
                  <TouchableOpacity 
                    style={styles.optionButton}
                    onPress={() => handleNavigation('form', true, 'B')}
                  >
                    <View style={[styles.badge, { backgroundColor: '#60A5FA' }]}>
                      <Text style={styles.badgeText}>B</Text>
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>Factura B</Text>
                      <Text style={styles.optionDescription}>Consumidor Final / Exento</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#666" />
                  </TouchableOpacity>

                  {/* Factura C */}
                  <TouchableOpacity 
                    style={styles.optionButton}
                    onPress={() => handleNavigation('form', true, 'C')}
                  >
                    <View style={[styles.badge, { backgroundColor: '#4ADE80' }]}>
                      <Text style={styles.badgeText}>C</Text>
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>Factura C</Text>
                      <Text style={styles.optionDescription}>Monotributo</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#666" />
                  </TouchableOpacity>

                  {/* Factura M */}
                  <TouchableOpacity 
                    style={[styles.optionButton, { borderBottomWidth: 0 }]}
                    onPress={() => handleNavigation('form', true, 'M')}
                  >
                    <View style={[styles.badge, { backgroundColor: '#A855F7' }]}>
                      <Text style={styles.badgeText}>M</Text>
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>Factura M</Text>
                      <Text style={styles.optionDescription}>R.I. (Con Observaciones)</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#666" />
                  </TouchableOpacity>

                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1 },
  safeArea: { 
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 10 : 0 
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  greeting: { color: '#888', fontSize: 14 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', letterSpacing: 0.5 },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },

  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 15 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 15 },
  
  card: {
    width: '47%',
    aspectRatio: 1.1,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cardDisabled: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconContainer: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  indicator: { width: 6, height: 6, borderRadius: 3 },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 8 },
  cardSubtitle: { color: '#888', fontSize: 12, marginTop: 2 },

  bannerContainer: { marginTop: 25, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  bannerContent: { padding: 20, flexDirection: 'row', alignItems: 'center' },
  bannerIconBox: { backgroundColor: '#333', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  bannerText: { color: '#aaa', fontSize: 12 },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#333',
    elevation: 20,
  },
  modalIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  modalSubtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 25 },
  
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  optionTextContainer: { flex: 1 },
  optionTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  optionDescription: { color: '#666', fontSize: 12, marginTop: 2 },
});

export default HomeScreen;