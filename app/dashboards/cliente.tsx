import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { setTurnos } from '@/redux/slices/turnosSlice';
import { obtenerTurnos, suscribirseATurnos } from '@/services/turnosService';

const ClienteDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.login.user);
  const turnos = useSelector((state: RootState) => state.turnos.turnos);

  useEffect(() => {
    // Cargar datos iniciales
    const loadTurnos = async () => {
      try {
        const turnosData = await obtenerTurnos();
        dispatch(setTurnos(turnosData));
      } catch (error) {
        console.error('Error cargando turnos:', error);
      }
    };
    loadTurnos();

    // Configurar listener en tiempo real
    const unsubscribe = suscribirseATurnos((turnosData) => {
      dispatch(setTurnos(turnosData));
    });

    // Cleanup: desuscribirse cuando el componente se desmonte
    return () => unsubscribe();
  }, [dispatch]);

  // Filtrar turnos del cliente actual
  const misTurnos = turnos.filter(t => t.clienteId === user?.id);
  const ultimaSolicitud = misTurnos.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())[0];
  const historialCompletado = misTurnos.filter(t => t.estado === 'completed');

  // Información del camión (por ahora hardcodeada, pero podríamos mejorarla)
  const camion = {
    patente: 'ABC-123',
    modelo: 'Volvo FH16',
    año: 2020,
    marca: 'Volvo',
    tipo: 'Camión Volquete',
    estado: ultimaSolicitud ? (ultimaSolicitud.estado === 'completed' ? 'Disponible' : 'En Reparación') : 'Disponible',
    ultimoServicio: ultimaSolicitud ? ultimaSolicitud.fechaCreacion : '2025-12-15',
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pending': return '#FACC15';
      case 'scheduled': return '#60A5FA';
      case 'in_progress': return '#4ADE80';
      case 'completed': return '#A855F7';
      default: return '#888';
    }
  };

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'pending': return 'Pendiente';
      case 'scheduled': return 'Programado';
      case 'in_progress': return 'En Proceso';
      case 'completed': return 'Completado';
      default: return estado;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#000000', '#121212']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header with Logout Button */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.headerTitle}>Mi Camión</Text>
                <Text style={styles.headerSubtitle}>Información y servicios</Text>
              </View>
              {onLogout && (
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={onLogout}
                >
                  <MaterialIcons name="logout" size={20} color="#FF4C4C" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Camion Card */}
          <View style={styles.camionCard}>
            <View style={styles.camionHeader}>
              <View>
                <Text style={styles.patente}>{camion.patente}</Text>
                <Text style={styles.modelo}>{camion.modelo}</Text>
              </View>
              <View style={[styles.estadoBadge, { backgroundColor: '#FF4C4C30' }]}>
                <View style={[styles.estadoIndicator, { backgroundColor: '#FF4C4C' }]} />
                <Text style={[styles.estadoText, { color: '#FF4C4C' }]}>En Reparación</Text>
              </View>
            </View>

            <View style={styles.camionDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Marca</Text>
                <Text style={styles.detailValue}>{camion.marca}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Año</Text>
                <Text style={styles.detailValue}>{camion.año}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Tipo</Text>
                <Text style={styles.detailValue}>{camion.tipo}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Último Servicio</Text>
                <Text style={styles.detailValue}>{camion.ultimoServicio}</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('solicitud')}>
              <MaterialIcons name="add" size={24} color="#fff" />
              <Text style={styles.actionLabel}>Nueva Solicitud</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]}>
              <MaterialIcons name="visibility" size={24} color="#60A5FA" />
              <Text style={[styles.actionLabel, { color: '#60A5FA' }]}>Ver Estado</Text>
            </TouchableOpacity>
          </View>

          {/* Estado de Última Solicitud */}
          {ultimaSolicitud && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Estado de Última Solicitud</Text>
              <View style={styles.ultimaSolicitudCard}>
                <View style={styles.solicitudHeader}>
                  <View style={styles.solicitudInfo}>
                    <Text style={styles.solicitudPatente}>{ultimaSolicitud.numeroPatente}</Text>
                    <Text style={styles.solicitudFecha}>
                      Creada: {new Date(ultimaSolicitud.fechaCreacion).toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                  <View style={[styles.solicitudEstadoBadge, { backgroundColor: `${getEstadoColor(ultimaSolicitud.estado)}20` }]}>
                    <Text style={[styles.solicitudEstadoBadgeText, { color: getEstadoColor(ultimaSolicitud.estado) }]}>
                      {getEstadoText(ultimaSolicitud.estado)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.solicitudDescripcion}>{ultimaSolicitud.descripcion}</Text>
                {ultimaSolicitud.chofer && (
                  <Text style={styles.solicitudChofer}>Chofer: {ultimaSolicitud.chofer}</Text>
                )}
              </View>
            </View>
          )}

          {/* Historial */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Historial de Servicios</Text>
              <TouchableOpacity>
                <Text style={styles.verMasLink}>Ver más</Text>
              </TouchableOpacity>
            </View>

            {historialCompletado.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="history" size={48} color="#666" />
                <Text style={styles.emptyText}>No hay servicios completados</Text>
              </View>
            ) : (
              historialCompletado.slice(0, 4).map(turno => (
                <TouchableOpacity key={turno.id} style={styles.servicioCard}>
                  <View style={styles.servicioLeft}>
                    <View style={styles.servicioIconContainer}>
                      <MaterialIcons name="build" size={20} color="#4ADE80" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.servicioNombre}>{turno.descripcion}</Text>
                      <Text style={styles.servicioFecha}>
                        {new Date(turno.fechaCreacion).toLocaleDateString('es-ES')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.servicioRight}>
                    <Text style={styles.servicioCosto}>{turno.numeroPatente}</Text>
                    <View style={[styles.servicioBadge, { backgroundColor: '#4ADE8030' }]}>
                      <Text style={[styles.servicioBadgeText, { color: '#4ADE80' }]}>
                        {getEstadoText(turno.estado)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Support Card */}
          <View style={styles.supportCard}>
            <View style={styles.supportIcon}>
              <MaterialIcons name="headset-mic" size={28} color="#60A5FA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.supportTitle}>¿Necesitas ayuda?</Text>
              <Text style={styles.supportText}>Contáctanos para cualquier consulta sobre tus servicios</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 60 },

  header: { marginBottom: 25 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#888', marginTop: 4 },
  logoutButton: {
    backgroundColor: '#FF4C4C20',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF4C4C40',
  },

  camionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    padding: 20,
    marginBottom: 25,
  },
  camionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  patente: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  modelo: { fontSize: 12, color: '#888', marginTop: 4 },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  estadoIndicator: { width: 8, height: 8, borderRadius: 4 },
  estadoText: { fontSize: 11, fontWeight: '600' },

  camionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: { width: '48%', marginBottom: 12 },
  detailLabel: { fontSize: 11, color: '#888' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#fff', marginTop: 2 },

  actionsContainer: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  actionButton: {
    flex: 1,
    backgroundColor: '#FF4C4C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonSecondary: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
  },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#fff' },

  section: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  verMasLink: { fontSize: 12, color: '#60A5FA', fontWeight: '600' },

  servicioCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  servicioLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  servicioIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#4ADE8020',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  servicioNombre: { fontSize: 13, fontWeight: '600', color: '#fff' },
  servicioFecha: { fontSize: 11, color: '#888', marginTop: 2 },
  servicioRight: { alignItems: 'flex-end' },
  servicioCosto: { fontSize: 14, fontWeight: 'bold', color: '#4ADE80' },
  servicioBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  servicioBadgeText: { fontSize: 10, fontWeight: '600' },

  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  supportIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#60A5FA20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  supportTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  supportText: { fontSize: 11, color: '#888', marginTop: 2 },

  ultimaSolicitudCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  solicitudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  solicitudInfo: { flex: 1 },
  solicitudPatente: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  solicitudFecha: { fontSize: 12, color: '#888', marginTop: 2 },
  solicitudEstadoBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  solicitudEstadoBadgeText: { fontSize: 12, fontWeight: '600' },
  solicitudDescripcion: { fontSize: 14, color: '#ccc', marginBottom: 8 },
  solicitudChofer: { fontSize: 12, color: '#888' },

  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#888', fontSize: 16, marginTop: 16 },
});

export default ClienteDashboard;
