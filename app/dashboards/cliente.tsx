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

const ClienteDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const camion = {
    patente: 'ABC-123',
    modelo: 'Volvo FH16',
    año: 2020,
    marca: 'Volvo',
    tipo: 'Camión Volquete',
    estado: 'En Reparación',
    ultimoServicio: '2025-12-15',
  };

  const historialReparaciones = [
    { id: 1, fecha: '2025-12-20', servicio: 'Cambio de aceite', costo: '$450', estado: 'Completado' },
    { id: 2, fecha: '2025-12-15', servicio: 'Reparación de frenos', costo: '$1,200', estado: 'Completado' },
    { id: 3, fecha: '2025-12-10', servicio: 'Alineación de ruedas', costo: '$350', estado: 'Completado' },
    { id: 4, fecha: '2025-12-05', servicio: 'Revisión general', costo: '$550', estado: 'Completado' },
  ];

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
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="add" size={24} color="#fff" />
              <Text style={styles.actionLabel}>Nueva Solicitud</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]}>
              <MaterialIcons name="visibility" size={24} color="#60A5FA" />
              <Text style={[styles.actionLabel, { color: '#60A5FA' }]}>Ver Estado</Text>
            </TouchableOpacity>
          </View>

          {/* Historial */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Historial de Servicios</Text>
              <TouchableOpacity>
                <Text style={styles.verMasLink}>Ver más</Text>
              </TouchableOpacity>
            </View>

            {historialReparaciones.map(reparacion => (
              <TouchableOpacity key={reparacion.id} style={styles.servicioCard}>
                <View style={styles.servicioLeft}>
                  <View style={styles.servicioIconContainer}>
                    <MaterialIcons name="build" size={20} color="#4ADE80" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.servicioNombre}>{reparacion.servicio}</Text>
                    <Text style={styles.servicioFecha}>{reparacion.fecha}</Text>
                  </View>
                </View>
                <View style={styles.servicioRight}>
                  <Text style={styles.servicioCosto}>{reparacion.costo}</Text>
                  <View style={[styles.servicioBadge, { backgroundColor: '#4ADE8030' }]}>
                    <Text style={[styles.servicioBadgeText, { color: '#4ADE80' }]}>
                      {reparacion.estado}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
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
});

export default ClienteDashboard;
