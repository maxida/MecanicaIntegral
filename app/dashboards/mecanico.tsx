import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { actualizarTurno, setTurnos } from '@/redux/slices/turnosSlice';
import { actualizarTurnoService, obtenerTurnos, suscribirseATurnos } from '@/services/turnosService';
import LoadingOverlay from '@/components/LoadingOverlay';

const MecanicoDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const dispatch = useDispatch();
  const turnos = useSelector((state: RootState) => state.turnos.turnos);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar datos iniciales
    const loadTurnos = async () => {
      setLoading(true);
      try {
        const turnosData = await obtenerTurnos();
        dispatch(setTurnos(turnosData));
      } catch (error) {
        console.error('Error cargando turnos:', error);
      } finally {
        setLoading(false);
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

  // Filtrar tareas asignadas al mecánico (por ahora todas las scheduled/in_progress)
  const tareas = turnos.filter(t => t.estado === 'scheduled' || t.estado === 'in_progress');

  // Calcular estadísticas reales
  const tareasCompletadas = tareas.filter(t => t.estado === 'completed').length;
  const tiempoTotalTrabajado = tareas
    .filter(t => t.tiempoTrabajado)
    .reduce((total, t) => total + (t.tiempoTrabajado || 0), 0);
  
  const horasTrabajadas = Math.floor(tiempoTotalTrabajado / 60);
  const minutosTrabajados = tiempoTotalTrabajado % 60;

  const handleMarcarCompleta = async (id: string) => {
    Alert.alert('Confirmar', '¿Marcar esta tarea como completada?', [
      { text: 'Cancelar', onPress: () => {} },
      {
        text: 'Completar',
        onPress: async () => {
            setLoading(true);
            try {
              const now = new Date().toISOString();
              await actualizarTurnoService(id, { 
                estado: 'completed',
                fechaFinTrabajo: now
              });
              dispatch(actualizarTurno({ 
                id, 
                estado: 'completed',
                fechaFinTrabajo: now
              }));
              Alert.alert('Éxito', 'Tarea completada');
            } catch (error) {
              console.error('Error completando tarea:', error);
              Alert.alert('Error', 'No se pudo completar la tarea');
            } finally {
              setLoading(false);
            }
          },
      },
    ]);
  };

  const handleIniciarTarea = async (id: string) => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      await actualizarTurnoService(id, { 
        estado: 'in_progress',
        fechaInicioTrabajo: now
      });
      dispatch(actualizarTurno({ 
        id, 
        estado: 'in_progress',
        fechaInicioTrabajo: now
      }));
    } catch (error) {
      console.error('Error iniciando tarea:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePausarTarea = async (id: string) => {
    setLoading(true);
    try {
      await actualizarTurnoService(id, { estado: 'scheduled' });
      dispatch(actualizarTurno({ id, estado: 'scheduled' }));
    } catch (error) {
      console.error('Error pausando tarea:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularTiempoTrabajado = (turno: any) => {
    if (!turno.fechaInicioTrabajo) return '0 min';
    
    const inicio = new Date(turno.fechaInicioTrabajo);
    const fin = turno.fechaFinTrabajo ? new Date(turno.fechaFinTrabajo) : new Date();
    const diffMs = fin.getTime() - inicio.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min`;
    const horas = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${horas}h ${mins}min`;
  };

  const getPrioridadColor = (prioridad: number) => {
    switch (prioridad) {
      case 1: return '#FF4C4C'; // Alta
      case 2: return '#FACC15'; // Media
      case 3: return '#4ADE80'; // Baja
      default: return '#888';
    }
  };

  const getEstadoColor = (estado: string) => {
    return estado === 'in_progress' ? '#60A5FA' : '#888';
  };

  const getEstadoText = (estado: string) => {
    return estado === 'in_progress' ? 'En Progreso' : 'Pendiente';
  };

  const getPrioridadText = (prioridad: number) => {
    switch (prioridad) {
      case 1: return 'Alta';
      case 2: return 'Media';
      case 3: return 'Baja';
      default: return 'Sin definir';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#000000', '#121212']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.content}>
          {loading && <LoadingOverlay message="Actualizando..." />}
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.headerTitle}>Mis Tareas Diarias</Text>
                <Text style={styles.headerSubtitle}>Máximo 3 tareas por día</Text>
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

          {/* Progress Stats */}
          <View style={styles.progressSection}>
            <View style={styles.progressCard}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressLabel}>Completadas Hoy</Text>
                <Text style={styles.progressValue}>{tareasCompletadas} de {tareas.length}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: tareas.length > 0 ? `${(tareasCompletadas / tareas.length) * 100}%` : '0%' }]} />
              </View>
              <Text style={styles.tiempoTotal}>
                Tiempo trabajado: {horasTrabajadas}h {minutosTrabajados}min
              </Text>
            </View>
          </View>

          {/* Tareas List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hoy</Text>
            
            {tareas.map((tarea) => (
              <View key={tarea.id} style={styles.tareaCard}>
                <View style={styles.tareaHeader}>
                  <View style={styles.tareaLeft}>
                    <View style={[styles.prioridadIndicator, { backgroundColor: getPrioridadColor(tarea.prioridad || 3) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trabajoTitulo}>{tarea.descripcion}</Text>
                      <Text style={styles.clienteInfo}>
                        {tarea.chofer || 'Sin chofer'} • {tarea.numeroPatente}
                      </Text>
                      <Text style={styles.tareaDetalles}>
                        Tipo: {tarea.tipo || 'N/A'} • Creada: {new Date(tarea.fechaCreacion).toLocaleDateString('es-ES')}
                      </Text>
                          {tarea.checklistVehiculo ? (
                            <Text style={styles.checklistSmall} numberOfLines={1}>Checklist: {tarea.checklistVehiculo.observaciones || 'Sin observaciones'}</Text>
                          ) : null}
                      {tarea.estado === 'in_progress' && (
                        <Text style={styles.tiempoTrabajado}>
                          ⏱️ {calcularTiempoTrabajado(tarea)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={[styles.estadoBadge, { borderColor: getEstadoColor(tarea.estado) }]}>
                    <Text style={[styles.estadoLabel, { color: getEstadoColor(tarea.estado) }]}>
                      {getEstadoText(tarea.estado)}
                    </Text>
                  </View>
                </View>

                <View style={styles.tareaBody}>
                  <View style={styles.tiempoEstimado}>
                    <MaterialIcons name="schedule" size={16} color="#888" />
                    <Text style={styles.tiempoText}>{tarea.horaReparacion}</Text>
                  </View>

                  <View style={styles.actionButtons}>
                    {tarea.estado === 'scheduled' ? (
                      <TouchableOpacity
                        style={styles.buttonIniciar}
                        onPress={() => handleIniciarTarea(tarea.id)}
                      >
                        <MaterialIcons name="play-arrow" size={16} color="#fff" />
                        <Text style={styles.buttonText}>Iniciar</Text>
                      </TouchableOpacity>
                    ) : tarea.estado === 'in_progress' ? (
                      <TouchableOpacity
                        style={styles.buttonPausar}
                        onPress={() => handlePausarTarea(tarea.id)}
                      >
                        <MaterialIcons name="pause" size={16} color="#fff" />
                        <Text style={styles.buttonText}>Pausar</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={[styles.buttonCompletar, tarea.estado === 'scheduled' && styles.buttonDisabled]}
                      disabled={tarea.estado === 'scheduled'}
                      onPress={() => handleMarcarCompleta(tarea.id)}
                    >
                      <MaterialIcons name="check-circle" size={16} color={tarea.estado === 'scheduled' ? '#666' : '#4ADE80'} />
                      <Text style={[styles.buttonText, tarea.estado === 'scheduled' && { color: '#666' }]}>
                        Completar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {tareas.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="check-circle" size={48} color="#4ADE80" />
                <Text style={styles.emptyText}>¡Todas las tareas completadas!</Text>
                <Text style={styles.emptySubtext}>Descansa, has hecho un buen trabajo</Text>
              </View>
            )}
          </View>

          {/* Novedades */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Novedades</Text>
            <View style={styles.novedadCard}>
              <MaterialIcons name="info" size={24} color="#60A5FA" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.novedadTitulo}>Nuevo turno asignado</Text>
                <Text style={styles.novedadTexto}>Se agregó una reparación de urgencia a tu lista</Text>
              </View>
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

  progressSection: { marginBottom: 25 },
  progressCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  progressInfo: { marginBottom: 12 },
  progressLabel: { fontSize: 12, color: '#888' },
  progressValue: { fontSize: 20, fontWeight: 'bold', color: '#60A5FA', marginTop: 4 },
  progressBar: { height: 6, backgroundColor: '#2A2A2A', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#60A5FA' },
  tiempoTotal: { fontSize: 12, color: '#4ADE80', marginTop: 8, textAlign: 'center' },

  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15 },

  tareaCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
    overflow: 'hidden',
  },
  tareaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  tareaLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  prioridadIndicator: { width: 4, height: 60, borderRadius: 2, marginRight: 12 },
  trabajoTitulo: { fontSize: 14, fontWeight: '600', color: '#fff' },
  clienteInfo: { fontSize: 12, color: '#888', marginTop: 4 },
  estadoBadge: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  estadoLabel: { fontSize: 11, fontWeight: '600' },

  tareaBody: { padding: 16 },
  tiempoEstimado: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  tiempoText: { fontSize: 12, color: '#888' },

  actionButtons: { flexDirection: 'row', gap: 10 },
  buttonIniciar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#60A5FA',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  buttonCompletar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#4ADE80',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  buttonDisabled: { opacity: 0.5, borderColor: '#666' },
  buttonText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  tareaDetalles: { fontSize: 10, color: '#666', marginTop: 2 },
  tiempoTrabajado: { fontSize: 11, color: '#FACC15', marginTop: 2, fontWeight: '600' },
  checklistSmall: { color: '#fff', fontSize: 12, marginTop: 6, color: '#ccc' },
  buttonPausar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FACC15',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginTop: 12 },
  emptySubtext: { fontSize: 12, color: '#888', marginTop: 4 },

  novedadCard: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  novedadTitulo: { fontSize: 14, fontWeight: '600', color: '#fff' },
  novedadTexto: { fontSize: 12, color: '#888', marginTop: 2 },
});

export default MecanicoDashboard;
