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
  FlatList,
} from 'react-native';

const SupervisorDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const [selectedFilter, setSelectedFilter] = useState('todos');

  // Datos simulados de reparaciones en tiempo real
  const reparaciones = [
    { id: 1, cliente: 'Juan García', patente: 'ABC-123', estado: 'En Proceso', mecanico: 'Juan M.', progreso: 65 },
    { id: 2, cliente: 'Carlos López', patente: 'XYZ-456', estado: 'Completado', mecanico: 'Juan M.', progreso: 100 },
    { id: 3, cliente: 'María Silva', patente: 'DEF-789', estado: 'En Espera', mecanico: 'Pendiente', progreso: 0 },
    { id: 4, cliente: 'Roberto Ruiz', patente: 'GHI-012', estado: 'En Proceso', mecanico: 'Carlos M.', progreso: 45 },
    { id: 5, cliente: 'Ana Martínez', patente: 'JKL-345', estado: 'En Proceso', mecanico: 'Juan M.', progreso: 80 },
    { id: 6, cliente: 'Luis Pérez', patente: 'MNO-678', estado: 'Completado', mecanico: 'Carlos M.', progreso: 100 },
  ];

  const filters = [
    { id: 'todos', label: 'Todos', count: 6 },
    { id: 'proceso', label: 'En Proceso', count: 3 },
    { id: 'completado', label: 'Completado', count: 2 },
    { id: 'espera', label: 'En Espera', count: 1 },
  ];

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'En Proceso':
        return '#FACC15';
      case 'Completado':
        return '#4ADE80';
      case 'En Espera':
        return '#60A5FA';
      default:
        return '#888';
    }
  };

  const filteredReparaciones = selectedFilter === 'todos' ? reparaciones : reparaciones.filter(r => 
    selectedFilter === 'proceso' ? r.estado === 'En Proceso' :
    selectedFilter === 'completado' ? r.estado === 'Completado' :
    selectedFilter === 'espera' ? r.estado === 'En Espera' :
    true
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#000000', '#121212']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header with Logout Button */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.headerTitle}>Dashboard Supervisor</Text>
                <Text style={styles.headerSubtitle}>Control en Tiempo Real</Text>
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

          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>6</Text>
              <Text style={styles.statLabel}>Reparaciones</Text>
            </View>
            <View style={[styles.statItem, { borderLeftWidth: 1, borderLeftColor: '#333' }]}>
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>En Proceso</Text>
            </View>
            <View style={[styles.statItem, { borderLeftWidth: 1, borderLeftColor: '#333' }]}>
              <Text style={styles.statValue}>2</Text>
              <Text style={styles.statLabel}>Completadas</Text>
            </View>
          </View>

          {/* Filters */}
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}>
              <View style={{ paddingHorizontal: 20, flexDirection: 'row', gap: 10 }}>
                {filters.map(filter => (
                  <TouchableOpacity
                    key={filter.id}
                    onPress={() => setSelectedFilter(filter.id)}
                    style={[
                      styles.filterButton,
                      selectedFilter === filter.id && styles.filterButtonActive,
                    ]}
                  >
                    <Text style={[
                      styles.filterLabel,
                      selectedFilter === filter.id && styles.filterLabelActive,
                    ]}>
                      {filter.label} ({filter.count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Reparaciones List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historial de Reparaciones</Text>
            {filteredReparaciones.map(reparacion => (
              <TouchableOpacity key={reparacion.id} style={styles.reparacionCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <View style={[styles.statusIndicator, { backgroundColor: getEstadoColor(reparacion.estado) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clienteNombre}>{reparacion.cliente}</Text>
                      <Text style={styles.patente}>{reparacion.patente}</Text>
                    </View>
                  </View>
                  <Text style={[styles.estadoText, { color: getEstadoColor(reparacion.estado) }]}>
                    {reparacion.estado}
                  </Text>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.mecanicoLabel}>Mecánico: <Text style={styles.mecanicoValue}>{reparacion.mecanico}</Text></Text>
                  
                  {reparacion.progreso > 0 && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBackground}>
                        <View 
                          style={[
                            styles.progressBar,
                            { width: `${reparacion.progreso}%`, backgroundColor: getEstadoColor(reparacion.estado) }
                          ]} 
                        />
                      </View>
                      <Text style={styles.progressText}>{reparacion.progreso}%</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1 },
  content: { paddingVertical: 20, paddingBottom: 40 },

  header: { paddingHorizontal: 20, marginBottom: 20 },
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

  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
    marginBottom: 20,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#60A5FA' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },

  filterContainer: { marginBottom: 20, marginTop: 10 },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
  },
  filterButtonActive: {
    backgroundColor: '#60A5FA',
    borderColor: '#60A5FA',
  },
  filterLabel: { color: '#888', fontSize: 12, fontWeight: '600' },
  filterLabelActive: { color: '#fff' },

  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15 },

  reparacionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  clienteNombre: { fontSize: 14, fontWeight: '600', color: '#fff' },
  patente: { fontSize: 12, color: '#888', marginTop: 2 },
  estadoText: { fontSize: 12, fontWeight: '700', marginLeft: 12 },

  cardBody: { padding: 16 },
  mecanicoLabel: { fontSize: 12, color: '#888' },
  mecanicoValue: { color: '#fff', fontWeight: '600' },

  progressContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  progressBarBackground: { flex: 1, height: 6, backgroundColor: '#2A2A2A', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%' },
  progressText: { fontSize: 11, fontWeight: '600', color: '#888', minWidth: 30 },
});

export default SupervisorDashboard;
