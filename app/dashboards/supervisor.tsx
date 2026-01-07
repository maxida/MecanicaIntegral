import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { setTurnos } from '@/redux/slices/turnosSlice';
import { obtenerTurnos, suscribirseATurnos } from '@/services/turnosService';
import LoadingOverlay from '@/components/LoadingOverlay';

const SupervisorDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const dispatch = useDispatch();
  const turnos = useSelector((state: RootState) => state.turnos.turnos);
  const [selectedFilter, setSelectedFilter] = useState('todos');
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

  // Convertir turnos a formato de reparaciones para el dashboard
  const reparaciones = turnos.map(turno => ({
    id: turno.id,
    cliente: turno.chofer || 'Sin chofer',
    patente: turno.numeroPatente,
    estado: turno.estado === 'pending' ? 'En Espera' :
            turno.estado === 'scheduled' ? 'Programado' :
            turno.estado === 'in_progress' ? 'En Proceso' : 'Completado',
    mecanico: turno.mecanico || 'Pendiente',
    progreso: turno.estado === 'completed' ? 100 :
             turno.estado === 'in_progress' ? 65 :
             turno.estado === 'scheduled' ? 25 : 0,
  }));

  const filters = [
    { id: 'todos', label: 'Todos', count: reparaciones.length },
    { id: 'proceso', label: 'En Proceso', count: reparaciones.filter(r => r.estado === 'En Proceso').length },
    { id: 'completado', label: 'Completado', count: reparaciones.filter(r => r.estado === 'Completado').length },
    { id: 'espera', label: 'En Espera', count: reparaciones.filter(r => r.estado === 'En Espera').length },
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
    <SafeAreaView className="flex-1 bg-black">
      <LinearGradient colors={['#000000', '#121212']} style={{ flex: 1 }}>
        <ScrollView className="px-5 pt-10 pb-15">
          {loading && <LoadingOverlay message="Cargando..." />}
          {/* Header with Logout Button */}
          <View className="px-5 mb-5">
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-2xl font-bold text-white">Dashboard Supervisor</Text>
                <Text className="text-sm text-[#888] mt-1">Control en Tiempo Real</Text>
              </View>
              {onLogout && (
                <TouchableOpacity
                  className="rounded-xl p-3"
                  style={{ backgroundColor: '#FF4C4C20', borderWidth: 1, borderColor: '#FF4C4C40' }}
                  onPress={onLogout}
                >
                  <MaterialIcons name="logout" size={20} color="#FF4C4C" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Quick Stats */}
          <View className="flex-row mx-5 bg-card rounded-lg border border-[#333] overflow-hidden mb-5">
            <View className="flex-1 items-center py-4">
              <Text className="text-2xl font-bold text-primary">6</Text>
              <Text className="text-xs text-[#888] mt-1">Reparaciones</Text>
            </View>
            <View className="flex-1 items-center py-4 border-l border-[#333]">
              <Text className="text-2xl font-bold text-primary">3</Text>
              <Text className="text-xs text-[#888] mt-1">En Proceso</Text>
            </View>
            <View className="flex-1 items-center py-4 border-l border-[#333]">
              <Text className="text-2xl font-bold text-primary">2</Text>
              <Text className="text-xs text-[#888] mt-1">Completadas</Text>
            </View>
          </View>

          {/* Filters */}
          <View className="mb-5 mt-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              <View className="flex-row space-x-3">
                {filters.map(filter => (
                  <TouchableOpacity
                    key={filter.id}
                    onPress={() => setSelectedFilter(filter.id)}
                    className={`px-4 py-2 rounded-full ${selectedFilter === filter.id ? 'bg-primary border-primary' : 'bg-card border border-[#333]'}`}
                  >
                    <Text className={`${selectedFilter === filter.id ? 'text-white' : 'text-[#888]'} font-semibold text-xs`}>
                      {filter.label} ({filter.count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Reparaciones List */}
          <View className="px-5">
            <Text className="text-lg font-bold text-white mb-4">Historial de Reparaciones</Text>
            {filteredReparaciones.map(reparacion => (
              <TouchableOpacity key={reparacion.id} className="bg-card rounded-lg border border-[#333] mb-3 overflow-hidden">
                <View className="flex-row justify-between items-center p-4 border-b border-[#2A2A2A]">
                  <View className="flex-row items-center flex-1">
                    <View className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: getEstadoColor(reparacion.estado) }} />
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-white">{reparacion.cliente}</Text>
                      <Text className="text-xs text-[#888] mt-1">{reparacion.patente}</Text>
                    </View>
                  </View>
                  <Text className="text-sm font-bold ml-3" style={{ color: getEstadoColor(reparacion.estado) }}>{reparacion.estado}</Text>
                </View>

                <View className="p-4">
                  <Text className="text-xs text-[#888]">Mecánico: <Text className="text-white font-semibold">{reparacion.mecanico}</Text></Text>
                  {reparacion.progreso > 0 && (
                    <View className="flex-row items-center mt-3">
                      <View className="flex-1 h-1 rounded bg-[#2A2A2A] overflow-hidden">
                        <View style={{ width: `${reparacion.progreso}%`, backgroundColor: getEstadoColor(reparacion.estado), height: '100%' }} />
                      </View>
                      <Text className="text-xs font-semibold text-[#888] ml-3">{reparacion.progreso}%</Text>
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

export default SupervisorDashboard;
