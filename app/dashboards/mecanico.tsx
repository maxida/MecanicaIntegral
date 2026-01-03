import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';

const MecanicoDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const [tareas, setTareas] = useState([
    { id: 1, cliente: 'Juan García', patente: 'ABC-123', trabajo: 'Cambio de aceite y filtro', tiempo: '1h 30min', prioridad: 'Alta', estado: 'En Progreso' },
    { id: 2, cliente: 'Carlos López', patente: 'XYZ-456', trabajo: 'Reparación de frenos', tiempo: '2h', prioridad: 'Alta', estado: 'Pendiente' },
    { id: 3, cliente: 'María Silva', patente: 'DEF-789', trabajo: 'Alineación de ruedas', tiempo: '45min', prioridad: 'Media', estado: 'Pendiente' },
  ]);

  const handleMarcarCompleta = (id: number) => {
    Alert.alert('Confirmar', '¿Marcar esta tarea como completada?', [
      { text: 'Cancelar', onPress: () => {} },
      {
        text: 'Completar',
        onPress: () => {
          setTareas(tareas.filter(t => t.id !== id));
          Alert.alert('Éxito', 'Tarea completada');
        },
      },
    ]);
  };

  const handleIniciarTarea = (id: number) => {
    const updatedTareas = tareas.map(t =>
      t.id === id ? { ...t, estado: 'En Progreso' } : t
    );
    setTareas(updatedTareas);
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Alta':
        return '#FF4C4C';
      case 'Media':
        return '#FACC15';
      case 'Baja':
        return '#4ADE80';
      default:
        return '#888';
    }
  };

  const getEstadoColor = (estado: string) => {
    return estado === 'En Progreso' ? '#60A5FA' : '#888';
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#000000', '#121212']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.content}>
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
                <Text style={styles.progressLabel}>Completadas</Text>
                <Text style={styles.progressValue}>1 de 3</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '33%' }]} />
              </View>
            </View>
          </View>

          {/* Tareas List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hoy</Text>
            
            {tareas.map((tarea) => (
              <View key={tarea.id} style={styles.tareaCard}>
                <View style={styles.tareaHeader}>
                  <View style={styles.tareaLeft}>
                    <View style={[styles.prioridadIndicator, { backgroundColor: getPrioridadColor(tarea.prioridad) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trabajoTitulo}>{tarea.trabajo}</Text>
                      <Text style={styles.clienteInfo}>{tarea.cliente} • {tarea.patente}</Text>
                    </View>
                  </View>
                  <View style={[styles.estadoBadge, { borderColor: getEstadoColor(tarea.estado) }]}>
                    <Text style={[styles.estadoLabel, { color: getEstadoColor(tarea.estado) }]}>
                      {tarea.estado}
                    </Text>
                  </View>
                </View>

                <View style={styles.tareaBody}>
                  <View style={styles.tiempoEstimado}>
                    <MaterialIcons name="schedule" size={16} color="#888" />
                    <Text style={styles.tiempoText}>{tarea.tiempo}</Text>
                  </View>

                  <View style={styles.actionButtons}>
                    {tarea.estado === 'Pendiente' ? (
                      <TouchableOpacity
                        style={styles.buttonIniciar}
                        onPress={() => handleIniciarTarea(tarea.id)}
                      >
                        <MaterialIcons name="play-arrow" size={16} color="#fff" />
                        <Text style={styles.buttonText}>Iniciar</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={[styles.buttonCompletar, tarea.estado === 'Pendiente' && styles.buttonDisabled]}
                      disabled={tarea.estado === 'Pendiente'}
                      onPress={() => handleMarcarCompleta(tarea.id)}
                    >
                      <MaterialIcons name="check-circle" size={16} color={tarea.estado === 'Pendiente' ? '#666' : '#4ADE80'} />
                      <Text style={[styles.buttonText, tarea.estado === 'Pendiente' && { color: '#666' }]}>
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
  content: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 },

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
