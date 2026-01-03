import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';

const AdminDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  // Datos simulados de estadísticas
  const stats = [
    { label: 'Reparaciones Hoy', value: '8', color: '#60A5FA', icon: 'build' },
    { label: 'Facturación', value: '$12,450', color: '#4ADE80', icon: 'attach-money' },
    { label: 'Clientes Activos', value: '24', color: '#FACC15', icon: 'people' },
    { label: 'Ingresos Mes', value: '$45,320', color: '#A855F7', icon: 'trending-up' },
  ];

  const recentTurnos = [
    { id: 1, cliente: 'Juan García', patente: 'ABC-123', estado: 'En Proceso', color: '#FACC15' },
    { id: 2, cliente: 'Carlos López', patente: 'XYZ-456', estado: 'Completado', color: '#4ADE80' },
    { id: 3, cliente: 'María Silva', patente: 'DEF-789', estado: 'En Espera', color: '#60A5FA' },
    { id: 4, cliente: 'Roberto Ruiz', patente: 'GHI-012', estado: 'En Proceso', color: '#FACC15' },
  ];

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

          {/* Recent Turnos */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Reparaciones Recientes</Text>
              <TouchableOpacity>
                <MaterialIcons name="chevron-right" size={24} color="#60A5FA" />
              </TouchableOpacity>
            </View>

            {recentTurnos.map((turno) => (
              <TouchableOpacity key={turno.id} style={styles.turnoCard}>
                <View style={styles.turnoLeft}>
                  <View style={[styles.turnoStatusDot, { backgroundColor: turno.color }]} />
                  <View>
                    <Text style={styles.turnoCliente}>{turno.cliente}</Text>
                    <Text style={styles.turnoPatente}>{turno.patente}</Text>
                  </View>
                </View>
                <View style={[styles.turbEstadoBadge, { backgroundColor: `${turno.color}20` }]}>
                  <Text style={[styles.turnoEstadoText, { color: turno.color }]}>
                    {turno.estado}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
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
  content: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 },

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
  turnoStatusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  turnoCliente: { fontSize: 14, fontWeight: '600', color: '#fff' },
  turnoPatente: { fontSize: 12, color: '#888', marginTop: 2 },
  turbEstadoBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  turnoEstadoText: { fontSize: 12, fontWeight: '600' },

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
