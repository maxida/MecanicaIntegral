import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { obtenerTurnos, actualizarTurnoService } from '@/services/turnosService';
import { Turno } from '@/redux/slices/turnosSlice';

interface TurnoConMecanico extends Turno {
  mecanico?: string;
  horas?: number;
}

const mecanicosDefault = [
  { id: 1, nombre: 'Juan García', especialidad: 'Motor', horasDisponibles: 8 },
  { id: 2, nombre: 'Carlos López', especialidad: 'Frenos', horasDisponibles: 6 },
  { id: 3, nombre: 'Roberto Silva', especialidad: 'Suspensión', horasDisponibles: 5 },
];

const AsignacionMecanicos = () => {
  const [turnos, setTurnos] = useState<TurnoConMecanico[]>([]);
  const [mecanicos, setMecanicos] = useState(mecanicosDefault);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<TurnoConMecanico | null>(null);
  const [mecanicoBuscador, setMecanicoBuscador] = useState('');

  useEffect(() => {
    cargarTurnos();
  }, []);

  const cargarTurnos = async () => {
    setLoading(true);
    try {
      const data = await obtenerTurnos();
      setTurnos(data as TurnoConMecanico[]);
    } catch (error) {
      console.error('Error cargando turnos:', error);
      Alert.alert('Error', 'No se pudieron cargar los turnos');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarMecanico = async (mecanico: typeof mecanicosDefault[0]) => {
    if (!turnoSeleccionado?.id) return;

    try {
      // Actualizar turno con mecánico asignado
      await actualizarTurnoService(turnoSeleccionado.id, {
        mecanico: mecanico.nombre,
        estado: 'proceso' as const,
      });

      // Actualizar UI
      setTurnos(
        turnos.map((t) =>
          t.id === turnoSeleccionado.id
            ? { ...t, mecanico: mecanico.nombre, estado: 'proceso' }
            : t
        )
      );

      // Actualizar horas disponibles del mecánico
      setMecanicos(
        mecanicos.map((m) =>
          m.id === mecanico.id
            ? { ...m, horasDisponibles: m.horasDisponibles - 1 }
            : m
        )
      );

      Alert.alert('Éxito', `Turno asignado a ${mecanico.nombre}`);
      setModalVisible(false);
      setTurnoSeleccionado(null);
    } catch (error) {
      console.error('Error asignando turno:', error);
      Alert.alert('Error', 'No se pudo asignar el turno');
    }
  };

  const handleDesasignar = async (turno: TurnoConMecanico) => {
    if (!turno.id) return;

    Alert.alert('Confirmar', '¿Desasignar este turno?', [
      { text: 'Cancelar' },
      {
        text: 'Desasignar',
        onPress: async () => {
          try {
            await actualizarTurnoService(turno.id, {
              mecanico: null,
              estado: 'pendiente' as const,
            });

            setTurnos(
              turnos.map((t) =>
                t.id === turno.id
                  ? { ...t, mecanico: undefined, estado: 'pendiente' }
                  : t
              )
            );

            Alert.alert('Éxito', 'Turno desasignado');
          } catch (error) {
            Alert.alert('Error', 'No se pudo desasignar el turno');
          }
        },
      },
    ]);
  };

  const mecanicosDisponibles = mecanicos.filter((m) =>
    m.nombre.toLowerCase().includes(mecanicoBuscador.toLowerCase())
  );

  const turnosSinAsignar = turnos.filter((t) => !t.mecanico);
  const turnosAsignados = turnos.filter((t) => t.mecanico);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#000000', '#121212']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Asignación de Mecánicos</Text>
          <Text style={styles.headerSubtitle}>{turnos.length} turnos totales</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {loading ? (
            <ActivityIndicator size="large" color="#60A5FA" />
          ) : (
            <>
              {/* Turnos sin asignar */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="pending-actions" size={20} color="#60A5FA" />
                  <Text style={styles.sectionTitle}>
                    Por Asignar ({turnosSinAsignar.length})
                  </Text>
                </View>

                {turnosSinAsignar.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>Todos los turnos asignados</Text>
                  </View>
                ) : (
                  <FlatList
                    scrollEnabled={false}
                    data={turnosSinAsignar}
                    keyExtractor={(item) => item.id || Math.random().toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => {
                          setTurnoSeleccionado(item);
                          setModalVisible(true);
                          setMecanicoBuscador('');
                        }}
                        style={styles.turnoCard}
                        activeOpacity={0.7}
                      >
                        <View style={styles.turnoInfo}>
                          <Text style={styles.turnoPatente}>{item.numeroPatente}</Text>
                          <Text style={styles.turnoDescripcion}>{item.descripcion}</Text>
                          <View style={styles.turnoMeta}>
                            <MaterialIcons name="schedule" size={14} color="#888" />
                            <Text style={styles.turnoFecha}>
                              {new Date(item.fechaReparacion).toLocaleDateString('es-AR')} - {item.horaReparacion}
                            </Text>
                          </View>
                        </View>
                        <MaterialIcons name="arrow-forward" size={20} color="#60A5FA" />
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>

              {/* Turnos asignados */}
              {turnosAsignados.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <MaterialIcons name="check-circle" size={20} color="#4ADE80" />
                    <Text style={styles.sectionTitle}>
                      Asignados ({turnosAsignados.length})
                    </Text>
                  </View>

                  <FlatList
                    scrollEnabled={false}
                    data={turnosAsignados}
                    keyExtractor={(item) => item.id || Math.random().toString()}
                    renderItem={({ item }) => (
                      <View style={styles.turnoAsignadoCard}>
                        <View style={styles.turnoAsignadoInfo}>
                          <Text style={styles.turnoPatente}>{item.numeroPatente}</Text>
                          <View style={styles.mecanicoBadge}>
                            <MaterialIcons name="person" size={12} color="#60A5FA" />
                            <Text style={styles.mecanicoBadgeText}>{item.mecanico}</Text>
                          </View>
                          <Text style={styles.turnoDescripcion}>{item.descripcion}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDesasignar(item)}
                          style={styles.desasignarButton}
                        >
                          <MaterialIcons name="close" size={20} color="#FF4C4C" />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                </View>
              )}

              {/* Estado de mecánicos */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="people" size={20} color="#FACC15" />
                  <Text style={styles.sectionTitle}>Estado de Mecánicos</Text>
                </View>

                <FlatList
                  scrollEnabled={false}
                  data={mecanicos}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.mecanicoCard}>
                      <View style={styles.mecanicoInfo}>
                        <Text style={styles.mecanicoNombre}>{item.nombre}</Text>
                        <Text style={styles.mecanicoEspecialidad}>{item.especialidad}</Text>
                      </View>
                      <View style={styles.mecanicoHoras}>
                        <Text style={styles.mecanicoHorasLabel}>Horas disponibles</Text>
                        <Text style={[
                          styles.mecanicoHorasValue,
                          { color: item.horasDisponibles > 3 ? '#4ADE80' : '#FF4C4C' }
                        ]}>
                          {item.horasDisponibles}h
                        </Text>
                      </View>
                    </View>
                  )}
                />
              </View>
            </>
          )}
        </ScrollView>

        {/* Modal de selección de mecánico */}
        <Modal
          animationType="fade"
          transparent
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(false);
            setTurnoSeleccionado(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <LinearGradient
              colors={['rgba(0,0,0,0.9)', 'rgba(20,20,20,0.95)']}
              style={styles.modal}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seleccionar Mecánico</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.searchInput}
                placeholder="Buscar mecánico..."
                placeholderTextColor="#666"
                value={mecanicoBuscador}
                onChangeText={setMecanicoBuscador}
              />

              <FlatList
                data={mecanicosDisponibles}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleAsignarMecanico(item)}
                    style={styles.modalMecanicoItem}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalMecanicoInfo}>
                      <View style={styles.modalMecanicoIcon}>
                        <MaterialIcons name="person" size={20} color="#60A5FA" />
                      </View>
                      <View>
                        <Text style={styles.modalMecanicoNombre}>{item.nombre}</Text>
                        <Text style={styles.modalMecanicoEspecialidad}>{item.especialidad}</Text>
                      </View>
                    </View>
                    <View style={styles.modalMecanicoHoras}>
                      <Text style={styles.modalMecanicoHorasText}>{item.horasDisponibles}h</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </LinearGradient>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 14,
  },
  turnoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  turnoInfo: {
    flex: 1,
  },
  turnoPatente: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  turnoDescripcion: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  turnoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  turnoFecha: {
    color: '#888',
    fontSize: 11,
    marginLeft: 4,
  },
  turnoAsignadoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  turnoAsignadoInfo: {
    flex: 1,
  },
  mecanicoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  mecanicoBadgeText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  desasignarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 76, 76, 0.1)',
  },
  mecanicoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  mecanicoInfo: {
    flex: 1,
  },
  mecanicoNombre: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  mecanicoEspecialidad: {
    color: '#aaa',
    fontSize: 12,
  },
  mecanicoHoras: {
    alignItems: 'flex-end',
  },
  mecanicoHorasLabel: {
    color: '#888',
    fontSize: 11,
    marginBottom: 2,
  },
  mecanicoHorasValue: {
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalMecanicoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalMecanicoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalMecanicoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalMecanicoNombre: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  modalMecanicoEspecialidad: {
    color: '#888',
    fontSize: 12,
  },
  modalMecanicoHoras: {
    alignItems: 'center',
  },
  modalMecanicoHorasText: {
    color: '#4ADE80',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default AsignacionMecanicos;
