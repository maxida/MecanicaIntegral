import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LoadingOverlay from '@/components/LoadingOverlay';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { actualizarTurno, setTurnos } from '@/redux/slices/turnosSlice';
import { setFlagConFactura } from '@/redux/slices/invoiceSlice';
import { actualizarTurnoService, obtenerTurnos, suscribirseATurnos } from '@/services/turnosService';

const AdminDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const dispatch = useDispatch();
  const turnos = useSelector((state: RootState) => state.turnos.turnos);
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width > 1024;

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
    setLoading(true);
    try {
      await actualizarTurnoService(id, { estado: 'scheduled' });
      dispatch(actualizarTurno({ id, estado: 'scheduled' }));
    } catch (error) {
      console.error('Error actualizando turno:', error);
    } finally {
      setLoading(false);
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
    setLoading(true);
    try {
      await actualizarTurnoService(id, { mecanico: 'Juan M.' });
      dispatch(actualizarTurno({ id, mecanico: 'Juan M.' }));
    } catch (error) {
      console.error('Error asignando mecánico:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFacturar = (turno?: any) => {
    const pref = turno ? {
      Patente: turno.numeroPatente || '',
      clientName: turno.chofer || '',
      items: [{ description: turno.descripcion || '', units: 1, price: 0, total: 0 }],
    } : undefined;

    // Abrir modal personalizado para seleccionar tipo de factura
    setModalPrefill(pref);
    setShowInvoiceModal(true);
  };

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [modalPrefill, setModalPrefill] = useState<any>(null);

  const selectInvoiceType = (tipo: string) => {
    dispatch(setFlagConFactura(true));
    setShowInvoiceModal(false);
    navigation.navigate('form', { tipoFactura: tipo, prefill: modalPrefill });
  };

  const closeInvoiceModal = () => {
    setShowInvoiceModal(false);
    setModalPrefill(null);
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
    <SafeAreaView className="flex-1 bg-black">
      <LinearGradient colors={['#000000', '#121212']} style={{ flex: 1 }}>
        <ScrollView className="px-5 pt-10 pb-15">
          {loading && <LoadingOverlay message="Cargando turnos..." />}

          <Modal
            visible={showInvoiceModal}
            transparent
            animationType="fade"
            onRequestClose={closeInvoiceModal}
          >
            <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
              <View className="w-11/12 bg-[#0f1724] rounded-xl p-4 border border-[#222]">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-white text-base font-bold">Seleccionar Tipo de Factura</Text>
                  <TouchableOpacity onPress={closeInvoiceModal} className="p-2 bg-[#111827] rounded-md">
                    <MaterialIcons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row flex-wrap justify-between gap-2">
                  <TouchableOpacity className="w-1/2 bg-[#111827] p-3 rounded-lg items-center border border-[#222]" onPress={() => selectInvoiceType('A')}>
                    <MaterialIcons name="receipt" size={24} color="#A855F7" />
                    <Text className="text-white mt-2 font-semibold">Factura A</Text>
                  </TouchableOpacity>

                  <TouchableOpacity className="w-1/2 bg-[#111827] p-3 rounded-lg items-center border border-[#222]" onPress={() => selectInvoiceType('B')}>
                    <MaterialIcons name="receipt" size={24} color="#60A5FA" />
                    <Text className="text-white mt-2 font-semibold">Factura B</Text>
                  </TouchableOpacity>

                  <TouchableOpacity className="w-1/2 bg-[#111827] p-3 rounded-lg items-center border border-[#222]" onPress={() => selectInvoiceType('C')}>
                    <MaterialIcons name="receipt" size={24} color="#4ADE80" />
                    <Text className="text-white mt-2 font-semibold">Factura C</Text>
                  </TouchableOpacity>

                  <TouchableOpacity className="w-1/2 bg-[#111827] p-3 rounded-lg items-center border border-[#222]" onPress={() => selectInvoiceType('M')}>
                    <MaterialIcons name="receipt" size={24} color="#FACC15" />
                    <Text className="text-white mt-2 font-semibold">Factura M</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          {/* Header with Logout Button */}
          <View className="mb-8">
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-2xl font-bold text-white">Dashboard Admin</Text>
                <Text className="text-sm text-[#888] mt-1">Gestión Integral</Text>
              </View>
              {onLogout && (
                <TouchableOpacity
                  className="rounded-xl p-3 border"
                  style={{ backgroundColor: '#FF4C4C20', borderColor: '#FF4C4C40' }}
                  onPress={onLogout}
                >
                  <MaterialIcons name="logout" size={20} color="#FF4C4C" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Stats Grid */}
          <View className="flex-row flex-wrap mb-8 -mx-2">
            {stats.map((stat, index) => (
              <View key={index} className="w-full monitor:w-1/3 px-2 mb-4">
                <View className="bg-card rounded-xl p-4 items-center border border-[#333]">
                  <View className="w-12 h-12 rounded-lg items-center justify-center mb-2" style={{ backgroundColor: `${stat.color}15` }}>
                    <MaterialIcons name={stat.icon as any} size={24} color={stat.color} />
                  </View>
                  <Text className="text-lg font-bold text-white">{stat.value}</Text>
                  <Text className="text-xs text-[#888] mt-1 text-center">{stat.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Backlog de Solicitudes (Kanban en pantallas grandes) */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-white">Backlog de Solicitudes</Text>
              <TouchableOpacity>
                <MaterialIcons name="refresh" size={24} color="#60A5FA" />
              </TouchableOpacity>
            </View>

            {/* Responsive: Kanban columns when wide */}
            {(() => {
              if (!isWide) {
                return (
                  pendingTurnos.length === 0 ? (
                    <View className="items-center p-10">
                      <MaterialIcons name="check-circle" size={48} color="#4ADE80" />
                      <Text className="text-[#888] text-base mt-4">No hay solicitudes pendientes</Text>
                    </View>
                  ) : (
                    pendingTurnos.map((turno) => (
                      <View key={turno.id} className="flex-row justify-between items-center bg-card rounded-lg p-4 mb-3 border border-[#333]">
                        <View className="flex-row items-center flex-1">
                          <View className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: getEstadoColor(turno.estado) }} />
                          <View className="flex-1">
                            <Text className="text-base font-semibold text-white">{turno.chofer || 'Sin chofer'}</Text>
                            <Text className="text-xs text-[#888] mt-1">{turno.numeroPatente}</Text>
                            <Text className="text-xs text-[#666] mt-1">{turno.tipo || 'Sin tipo'} • Prioridad: {turno.prioridad || 3}</Text>
                            <Text className="text-xs text-[#666] mt-1">Creada: {new Date(turno.fechaCreacion).toLocaleDateString('es-ES')}</Text>
                          </View>
                        </View>
                        <View className="items-end">
                          <Text className="text-sm text-[#ccc] mb-2 text-right" numberOfLines={2}>{turno.descripcion}</Text>
                          {turno.checklistVehiculo ? (
                            <View className="mt-2 items-end">
                              <Text className="text-[#888] text-xs">Checklist:</Text>
                              <Text className="text-white text-sm mt-1" numberOfLines={2}>{turno.checklistVehiculo.observaciones || 'Sin observaciones'}</Text>
                            </View>
                          ) : null}
                          <View className="px-3 py-1 rounded-md mt-2" style={{ backgroundColor: `${getEstadoColor(turno.estado)}20` }}>
                            <Text className="text-sm font-semibold" style={{ color: getEstadoColor(turno.estado) }}>{getEstadoText(turno.estado)}</Text>
                          </View>
                          <View className="flex-row mt-3 space-x-2">
                            <TouchableOpacity className="p-2 rounded-md" style={{ backgroundColor: '#FACC15' }} onPress={() => handleChangePriority(turno.id, turno.prioridad || 3)}>
                              <MaterialIcons name="flag" size={14} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity className="p-2 rounded-md" style={{ backgroundColor: '#60A5FA' }} onPress={() => handleAssignMechanic(turno.id)}>
                              <MaterialIcons name="person-add" size={14} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity className="p-2 rounded-md" style={{ backgroundColor: '#A855F7' }} onPress={() => handleFacturar(turno)}>
                              <MaterialIcons name="receipt" size={14} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity className="p-2 rounded-md" style={{ backgroundColor: '#111827' }} onPress={() => navigation.navigate('checkin', { turnoId: turno.id })}>
                              <MaterialIcons name="local-shipping" size={14} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity className="flex-row items-center px-3 py-1 rounded-md" style={{ backgroundColor: '#60A5FA' }} onPress={() => handleScheduleTurno(turno.id)}>
                              <MaterialIcons name="schedule" size={16} color="#fff" />
                              <Text className="text-white text-xs font-semibold ml-2">Programar</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))
                  )
                );
              }

              // Kanban columns for wide screens
              return (
                <View className="flex-row space-x-4">
                  <View className="flex-1">
                    <Text className="text-sm text-[#9CA3AF] mb-2">Pendientes</Text>
                    <ScrollView className="space-y-3" style={{ maxHeight: 600 }}>
                      {pendingTurnos.map(t => (
                        <View key={t.id} className="bg-card rounded-lg p-3 border border-[#333]">
                          <Text className="text-sm font-semibold text-white">{t.chofer || 'Sin chofer'}</Text>
                          <Text className="text-xs text-[#888]">{t.numeroPatente}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>

                  <View className="flex-1">
                    <Text className="text-sm text-[#9CA3AF] mb-2">Programados</Text>
                    <ScrollView className="space-y-3" style={{ maxHeight: 600 }}>
                      {scheduledTurnos.map(t => (
                        <View key={t.id} className="bg-card rounded-lg p-3 border border-[#333]">
                          <Text className="text-sm font-semibold text-white">{t.chofer || 'Sin chofer'}</Text>
                          <Text className="text-xs text-[#888]">{t.numeroPatente}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>

                  <View className="flex-1">
                    <Text className="text-sm text-[#9CA3AF] mb-2">En Proceso</Text>
                    <ScrollView className="space-y-3" style={{ maxHeight: 600 }}>
                      {inProgressTurnos.map(t => (
                        <View key={t.id} className="bg-card rounded-lg p-3 border border-[#333]">
                          <Text className="text-sm font-semibold text-white">{t.chofer || 'Sin chofer'}</Text>
                          <Text className="text-xs text-[#888]">{t.numeroPatente}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>

                  <View className="flex-1">
                    <Text className="text-sm text-[#9CA3AF] mb-2">Completadas</Text>
                    <ScrollView className="space-y-3" style={{ maxHeight: 600 }}>
                      {completedTurnos.map(t => (
                        <View key={t.id} className="bg-card rounded-lg p-3 border border-[#333]">
                          <Text className="text-sm font-semibold text-white">{t.chofer || 'Sin chofer'}</Text>
                          <Text className="text-xs text-[#888]">{t.numeroPatente}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              );
            })()}
          </View>

          {/* Quick Actions */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-white mb-3">Acciones Rápidas</Text>
            <View className="flex-row flex-wrap -mx-2">
              <TouchableOpacity className="w-1/2 px-2 mb-3">
                <View className="bg-card rounded-lg p-4 items-center border border-[#333]">
                  <MaterialIcons name="add-circle" size={32} color="#FF4C4C" />
                  <Text className="text-sm text-white mt-2 font-semibold">Nuevo Turno</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="w-1/2 px-2 mb-3" onPress={() => handleFacturar()}>
                <View className="bg-card rounded-lg p-4 items-center border border-[#333]">
                  <MaterialIcons name="receipt-long" size={32} color="#60A5FA" />
                  <Text className="text-sm text-white mt-2 font-semibold">Facturar</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="w-1/2 px-2 mb-3">
                <View className="bg-card rounded-lg p-4 items-center border border-[#333]">
                  <MaterialIcons name="analytics" size={32} color="#4ADE80" />
                  <Text className="text-sm text-white mt-2 font-semibold">Reportes</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="w-1/2 px-2 mb-3">
                <View className="bg-card rounded-lg p-4 items-center border border-[#333]">
                  <MaterialIcons name="people" size={32} color="#FACC15" />
                  <Text className="text-sm text-white mt-2 font-semibold">Clientes</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default AdminDashboard;
