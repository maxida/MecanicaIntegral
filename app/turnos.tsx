import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { 
  obtenerTurnos, 
  agregarNuevoTurno, 
  actualizarTurnoService, 
  eliminarTurnoService,
  crearTurnosPrueba 
} from '@/services/turnosService';
import { setTurnos, setLoading, setError, actualizarTurno, eliminarTurno as eliminarTurnoRedux } from '@/redux/slices/turnosSlice';
import { RootState } from '@/redux/store';

const TurnosScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  
  const { turnos, loading } = useSelector((state: RootState) => state.turnos);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    numeroPatente: '',
    fechaReparacion: new Date().toISOString().split('T')[0],
    horaReparacion: '09:00',
    descripcion: '',
  });

  // Cargar turnos al montar
  useEffect(() => {
    cargarTurnos();
  }, []);

  const cargarTurnos = async () => {
    dispatch(setLoading(true));
    try {
      const data = await obtenerTurnos();
      dispatch(setTurnos(data));
    } catch (error) {
      dispatch(setError('Error cargando turnos'));
      console.error(error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleAbrirFormulario = (turno?: any) => {
    if (turno) {
      setEditingId(turno.id);
      setFormData({
        numeroPatente: turno.numeroPatente,
        fechaReparacion: turno.fechaReparacion,
        horaReparacion: turno.horaReparacion,
        descripcion: turno.descripcion,
      });
    } else {
      setEditingId(null);
      setFormData({
        numeroPatente: '',
        fechaReparacion: new Date().toISOString().split('T')[0],
        horaReparacion: '09:00',
        descripcion: '',
      });
    }
    setModalVisible(true);
  };

  const handleGuardarTurno = async () => {
    if (!formData.numeroPatente.trim()) {
      Alert.alert('Error', 'Ingresa el número de patente');
      return;
    }
    if (!validarFecha(formData.fechaReparacion)) {
      Alert.alert('Error', 'Ingresa una fecha válida (YYYY-MM-DD)');
      return;
    }
    if (!validarHora(formData.horaReparacion)) {
      Alert.alert('Error', 'Ingresa una hora válida (HH:MM)');
      return;
    }
    if (!formData.descripcion.trim()) {
      Alert.alert('Error', 'Ingresa una descripción');
      return;
    }

    dispatch(setLoading(true));
    try {
      if (editingId) {
        await actualizarTurnoService(editingId, {
          numeroPatente: formData.numeroPatente,
          fechaReparacion: formData.fechaReparacion,
          horaReparacion: formData.horaReparacion,
          descripcion: formData.descripcion,
        });
        const turnoActualizado = turnos.find(t => t.id === editingId);
        if (turnoActualizado) {
          dispatch(actualizarTurno({
            ...turnoActualizado,
            ...formData,
          }));
        }
      } else {
        await agregarNuevoTurno({
          numeroPatente: formData.numeroPatente,
          fechaReparacion: formData.fechaReparacion,
          horaReparacion: formData.horaReparacion,
          descripcion: formData.descripcion,
          estado: 'pendiente',
          fechaCreacion: new Date().toISOString(),
        } as any);
        await cargarTurnos();
      }
      setModalVisible(false);
      Alert.alert('Éxito', editingId ? 'Turno actualizado' : 'Turno creado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el turno');
      console.error(error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleEliminarTurno = (id: string) => {
    Alert.alert('Eliminar turno', '¿Estás seguro?', [
      { text: 'Cancelar', onPress: () => {} },
      {
        text: 'Eliminar',
        onPress: async () => {
          dispatch(setLoading(true));
          try {
            await eliminarTurnoService(id);
            dispatch(eliminarTurnoRedux(id));
            Alert.alert('Éxito', 'Turno eliminado');
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar el turno');
            console.error(error);
          } finally {
            dispatch(setLoading(false));
          }
        },
      },
    ]);
  };

  const handleCambiarEstado = async (id: string, nuevoEstado: 'pendiente' | 'proceso' | 'completado') => {
    dispatch(setLoading(true));
    try {
      await actualizarTurnoService(id, { estado: nuevoEstado });
      const turnoActualizado = turnos.find(t => t.id === id);
      if (turnoActualizado) {
        dispatch(actualizarTurno({
          ...turnoActualizado,
          estado: nuevoEstado,
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar el estado');
      console.error(error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Filtrar turnos por estado
  const turnosPendientes = turnos.filter(t => t.estado === 'pendiente');
  const turnosProceso = turnos.filter(t => t.estado === 'proceso');
  const turnosCompletados = turnos.filter(t => t.estado === 'completado');

  // Componente de tarjeta de turno
  const TarjetaTurno = ({ turno }: { turno: any }) => (
    <View style={styles.tarjetaTurno}>
      <View style={styles.tarjetaHeader}>
        <Text style={styles.tarjetaPatente}>{turno.numeroPatente}</Text>
        <TouchableOpacity onPress={() => handleEliminarTurno(turno.id)}>
          <MaterialIcons name="close" size={16} color="#FF4C4C" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.tarjetaDescripcion} numberOfLines={2}>{turno.descripcion}</Text>
      
      <View style={styles.tarjetaFooter}>
        <Text style={styles.tarjetaFecha}>{turno.fechaReparacion}</Text>
        <Text style={styles.tarjetaHora}>{turno.horaReparacion}</Text>
      </View>
      
      <View style={styles.botonesEstado}>
        {turno.estado !== 'pendiente' && (
          <TouchableOpacity style={styles.btnEstado} onPress={() => handleCambiarEstado(turno.id, 'pendiente')}>
            <Text style={styles.btnEstadoText}>← Espera</Text>
          </TouchableOpacity>
        )}
        {turno.estado !== 'proceso' && (
          <TouchableOpacity style={[styles.btnEstado, styles.btnProceso]} onPress={() => handleCambiarEstado(turno.id, 'proceso')}>
            <Text style={styles.btnEstadoText}>→ Proceso</Text>
          </TouchableOpacity>
        )}
        {turno.estado !== 'completado' && (
          <TouchableOpacity style={[styles.btnEstado, styles.btnCompleto]} onPress={() => handleCambiarEstado(turno.id, 'completado')}>
            <Text style={styles.btnEstadoText}>✓ Hecho</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Componente de sección de estado
  const SeccionEstado = ({ titulo, color, turnos, icon }: { titulo: string; color: string; turnos: any[]; icon: string }) => (
    <View style={styles.seccionEstado}>
      <View style={[styles.seccionHeader, { borderLeftColor: color }]}>
        <MaterialIcons name={icon as any} size={20} color={color} />
        <Text style={styles.seccionTitulo}>{titulo}</Text>
        <View style={[styles.contador, { backgroundColor: color }]}>
          <Text style={styles.contadorText}>{turnos.length}</Text>
        </View>
      </View>
      {turnos.length === 0 ? (
        <View style={styles.vacio}>
          <MaterialIcons name="check-circle-outline" size={32} color="#444" />
          <Text style={styles.vacioText}>Sin turnos</Text>
        </View>
      ) : (
        <View style={styles.turnosLista}>
          {turnos.map((turno) => (
            <TarjetaTurno key={turno.id} turno={turno} />
          ))}
        </View>
      )}
    </View>
  );

  // Validar formato de fecha (YYYY-MM-DD)
  const validarFecha = (fecha: string): boolean => {
    return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !isNaN(new Date(fecha).getTime());
  };

  // Validar formato de hora (HH:MM)
  const validarHora = (hora: string): boolean => {
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hora);
  };

  return (
    <View style={styles.mainContainer}>
      <LinearGradient colors={['#000000', '#121212']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.title}>Turnos de Camiones</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => handleAbrirFormulario()}
              >
                <MaterialIcons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Lista de turnos */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#60A5FA" />
              </View>
            ) : turnos.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="event-busy" size={48} color="#666" />
                <Text style={styles.emptyText}>No hay turnos programados</Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => handleAbrirFormulario()}
                >
                  <Text style={styles.emptyButtonText}>Crear primer turno</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.tablero}>
                <SeccionEstado 
                  titulo="En Espera" 
                  color="#FACC15" 
                  turnos={turnosPendientes}
                  icon="schedule"
                />
                <SeccionEstado 
                  titulo="En Proceso" 
                  color="#60A5FA" 
                  turnos={turnosProceso}
                  icon="engineering"
                />
                <SeccionEstado 
                  titulo="Terminado" 
                  color="#4ADE80" 
                  turnos={turnosCompletados}
                  icon="check-circle"
                />
              </View>
            )}
          </ScrollView>
        </SafeAreaView>

        {/* Modal de formulario */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <LinearGradient colors={['#000000', '#121212']} style={styles.modalGradient}>
              <SafeAreaView style={styles.modalSafeArea}>
                <ScrollView contentContainerStyle={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <MaterialIcons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                      {editingId ? 'Editar turno' : 'Nuevo turno'}
                    </Text>
                    <View style={{ width: 24 }} />
                  </View>

                  {/* Inputs */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Patente del Camión</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ej: ABC-123"
                      placeholderTextColor="#666"
                      value={formData.numeroPatente}
                      onChangeText={(text) => setFormData({ ...formData, numeroPatente: text.toUpperCase() })}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Fecha de Reparación</Text>
                    <View style={styles.dateInputContainer}>
                      <MaterialIcons name="calendar-today" size={20} color="#60A5FA" />
                      <TextInput
                        style={styles.dateInputField}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#666"
                        value={formData.fechaReparacion}
                        onChangeText={(text) => setFormData({ ...formData, fechaReparacion: text })}
                      />
                    </View>
                    <Text style={styles.hint}>Formato: 2024-01-15</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Hora de Reparación</Text>
                    <View style={styles.dateInputContainer}>
                      <MaterialIcons name="access-time" size={20} color="#60A5FA" />
                      <TextInput
                        style={styles.dateInputField}
                        placeholder="HH:MM"
                        placeholderTextColor="#666"
                        value={formData.horaReparacion}
                        onChangeText={(text) => setFormData({ ...formData, horaReparacion: text })}
                        maxLength={5}
                      />
                    </View>
                    <Text style={styles.hint}>Formato: 09:30</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Descripción del Trabajo</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Describe el trabajo a realizar..."
                      placeholderTextColor="#666"
                      multiline
                      numberOfLines={4}
                      value={formData.descripcion}
                      onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleGuardarTurno}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Guardar turno</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </SafeAreaView>
            </LinearGradient>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 10 : 0 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#60A5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: { color: '#888', fontSize: 16, marginTop: 16 },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#60A5FA',
    borderRadius: 8,
  },
  emptyButtonText: { color: '#fff', fontWeight: '600' },

  turnoCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#60A5FA',
  },
  turnoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  turnoInfo: { flex: 1 },
  patente: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  descripcion: { fontSize: 13, color: '#aaa' },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FACC15',
    borderRadius: 12,
  },
  statusCompletado: { backgroundColor: '#4ADE80' },
  statusCancelado: { backgroundColor: '#FF4C4C' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#000' },

  turnoFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: { fontSize: 12, color: '#888' },

  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
  },

  // Modal styles
  modalContainer: { flex: 1 },
  modalGradient: { flex: 1 },
  modalSafeArea: { flex: 1 },
  modalContent: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 8 },
  input: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
  },
  dateInput: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateInputText: { color: '#fff', fontSize: 14 },
  dateInputContainer: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateInputField: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
  },
  textArea: { textAlignVertical: 'top', paddingTop: 12 },

  saveButton: {
    backgroundColor: '#60A5FA',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Nuevos estilos para tablero
  tablero: {
    gap: 20,
    marginBottom: 20,
  },
  seccionEstado: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  seccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderLeftWidth: 4,
    backgroundColor: '#252525',
  },
  seccionTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  contador: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  contadorText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  vacio: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  vacioText: {
    color: '#666',
    fontSize: 14,
  },
  turnosLista: {
    padding: 12,
    gap: 12,
  },
  tarjetaTurno: {
    backgroundColor: '#161616',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  tarjetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tarjetaPatente: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  tarjetaDescripcion: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 8,
    lineHeight: 18,
  },
  tarjetaFooter: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tarjetaFecha: {
    fontSize: 11,
    color: '#666',
  },
  tarjetaHora: {
    fontSize: 11,
    color: '#666',
  },
  botonesEstado: {
    flexDirection: 'row',
    gap: 6,
  },
  btnEstado: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#FACC15',
    alignItems: 'center',
  },
  btnProceso: {
    backgroundColor: '#60A5FA',
  },
  btnCompleto: {
    backgroundColor: '#4ADE80',
  },
  btnEstadoText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
  },
});

export default TurnosScreen;
