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
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { actualizarTurno, setTurnos } from '@/redux/slices/turnosSlice';
import { actualizarTurnoService, obtenerTurnos } from '@/services/turnosService';

const AdminDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const dispatch = useDispatch();
  const turnos = useSelector((state: RootState) => state.turnos.turnos);

  useEffect(() => {
    const loadTurnos = async () => {
      try {
        const turnosData = await obtenerTurnos();
        dispatch(setTurnos(turnosData));
      } catch (error) {
        console.error('Error cargando turnos:', error);
      }
    };
    loadTurnos();
  }, [dispatch]);

  // Filtrar turnos por estado
  const pendingTurnos = turnos.filter(t => t.estado === 'pending');
  const scheduledTurnos = turnos.filter(t => t.estado === 'scheduled');
  const inProgressTurnos = turnos.filter(t => t.estado === 'in_progress');
  const completedTurnos = turnos.filter(t => t.estado === 'completed');

  // Datos simulados de estadísticas (actualizar con datos reales)
  const stats = [
    { label: 'Reparaciones Hoy', value: completedTurnos.length.toString(), color: '#60A5FA', icon: 'build' },
    { label: 'En Proceso', value: inProgressTurnos.length.toString(), color: '#4ADE80', icon: 'engineering' },
    { label: 'Pendientes', value: pendingTurnos.length.toString(), color: '#FACC15', icon: 'schedule' },
    { label: 'Completadas', value: completedTurnos.length.toString(), color: '#A855F7', icon: 'check-circle' },
  ];

  const handleScheduleTurno = async (id: string) => {
    try {
      await actualizarTurnoService(id, { estado: 'scheduled' });
      dispatch(actualizarTurno({ id, estado: 'scheduled' }));
    } catch (error) {
      console.error('Error actualizando turno:', error);
    }
  };

  const handleChangePriority = async (id: string, currentPriority: number) => {
    const newPriority = currentPriority === 1 ? 2 : currentPriority === 2 ? 3 : 1;
    try {
      await actualizarTurnoService(id, { prioridad: newPriority });
      dispatch(actualizarTurno({ id, prioridad: newPriority }));
    } catch (error) {
      console.error('Error cambiando prioridad:', error);
    }
  };

  const handleAssignMechanic = async (id: string) => {
    // Por ahora asignamos un mecánico por defecto
    try {
      await actualizarTurnoService(id, { mecanico: 'Juan M.' });
      dispatch(actualizarTurno({ id, mecanico: 'Juan M.' }));
    } catch (error) {
      console.error('Error asignando mecánico:', error);
    }
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
                <Text style={styles.headerTitle}>Dashboard Admin</Text>
                <Text style={styles.headerSubtitle}>Gestión Integral</Text>
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

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${stat.color}15` }]}>
                  <MaterialIcons name={stat.icon as any} size={24} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Backlog de Solicitudes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Backlog de Solicitudes</Text>
              <TouchableOpacity>
                <MaterialIcons name="refresh" size={24} color="#60A5FA" />
              </TouchableOpacity>
            </View>

            {pendingTurnos.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="check-circle" size={48} color="#4ADE80" />
                <Text style={styles.emptyText}>No hay solicitudes pendientes</Text>
              </View>
            ) : (
              pendingTurnos.map((turno) => (
                <View key={turno.id} style={styles.turnoCard}>
                  <View style={styles.turnoLeft}>
                    <View style={[styles.turnoStatusDot, { backgroundColor: getEstadoColor(turno.estado) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.turnoCliente}>{turno.chofer || 'Sin chofer'}</Text>
                      <Text style={styles.turnoPatente}>{turno.numeroPatente}</Text>
                      <Text style={styles.turnoTipo}>{turno.tipo || 'Sin tipo'} • Prioridad: {turno.prioridad || 3}</Text>
                      <Text style={styles.turnoFecha}>
                        Creada: {new Date(turno.fechaCreacion).toLocaleDateString('es-ES')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.turnoRight}>
                    <Text style={styles.turnoDescripcion} numberOfLines={2}>
                      {turno.descripcion}
                    </Text>
                    <View style={[styles.turbEstadoBadge, { backgroundColor: `${getEstadoColor(turno.estado)}20` }]}>
                      <Text style={[styles.turnoEstadoText, { color: getEstadoColor(turno.estado) }]}>
                        {getEstadoText(turno.estado)}
                      </Text>
                    </View>
                    <View style={styles.adminActions}>
                      <TouchableOpacity
                        style={styles.priorityButton}
                        onPress={() => handleChangePriority(turno.id, turno.prioridad || 3)}
                      >
                        <MaterialIcons name="flag" size={14} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.assignButton}
                        onPress={() => handleAssignMechanic(turno.id)}
                      >
                        <MaterialIcons name="person-add" size={14} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.scheduleButton}
                        onPress={() => handleScheduleTurno(turno.id)}
                      >
                        <MaterialIcons name="schedule" size={16} color="#fff" />
                        <Text style={styles.scheduleText}>Programar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="add-circle" size={32} color="#FF4C4C" />
                <Text style={styles.actionLabel}>Nuevo Turno</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="receipt-long" size={32} color="#60A5FA" />
                <Text style={styles.actionLabel}>Facturar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="analytics" size={32} color="#4ADE80" />
                <Text style={styles.actionLabel}>Reportes</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="people" size={32} color="#FACC15" />
                <Text style={styles.actionLabel}>Clientes</Text>
              </TouchableOpacity>
            </View>
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

  header: { marginBottom: 30 },
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

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
  statCard: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4, textAlign: 'center' },

  section: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  turnoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  turnoLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  turnoRight: { alignItems: 'flex-end' },
  turnoStatusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  turnoCliente: { fontSize: 14, fontWeight: '600', color: '#fff' },
  turnoPatente: { fontSize: 12, color: '#888', marginTop: 2 },
  turbEstadoBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 8 },
  turnoEstadoText: { fontSize: 12, fontWeight: '600' },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#60A5FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  scheduleText: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 4 },

  turnoTipo: { fontSize: 11, color: '#666', marginTop: 2 },
  turnoFecha: { fontSize: 10, color: '#666', marginTop: 2 },
  turnoDescripcion: { fontSize: 12, color: '#ccc', marginBottom: 8, textAlign: 'right' },
  adminActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  priorityButton: {
    backgroundColor: '#FACC15',
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignButton: {
    backgroundColor: '#60A5FA',
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#888', fontSize: 16, marginTop: 16 },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionButton: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  actionLabel: { fontSize: 12, color: '#fff', marginTop: 8, fontWeight: '600', textAlign: 'center' },
});

export default AdminDashboard;
