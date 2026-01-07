import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { setTurnos } from '@/redux/slices/turnosSlice';
import { obtenerTurnos, suscribirseATurnos } from '@/services/turnosService';
import LoadingOverlay from '@/components/LoadingOverlay';

const ClienteDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.login.user);
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

  // Filtrar turnos del cliente actual
  const misTurnos = turnos.filter(t => t.clienteId === user?.id);
  const ultimaSolicitud = misTurnos.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())[0];
  const historialCompletado = misTurnos.filter(t => t.estado === 'completed');

  // Información del camión (por ahora hardcodeada, pero podríamos mejorarla)
  const camion = {
    patente: 'ABC-123',
    modelo: 'Volvo FH16',
    año: 2020,
    marca: 'Volvo',
    tipo: 'Camión Volquete',
    estado: ultimaSolicitud ? (ultimaSolicitud.estado === 'completed' ? 'Disponible' : 'En Reparación') : 'Disponible',
    ultimoServicio: ultimaSolicitud ? ultimaSolicitud.fechaCreacion : '2025-12-15',
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
          {loading && <LoadingOverlay message="Cargando datos..." />}
          {/* Header with Logout Button */}
          <View className="mb-6 px-5">
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-2xl font-bold text-white">Mi Camión</Text>
                <Text className="text-sm text-[#888] mt-1">Información y servicios</Text>
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

          {/* Camion Card */}
          <View className="bg-card rounded-xl border border-[#333] p-5 mb-6">
            <View className="flex-row justify-between items-start border-b border-[#2A2A2A] pb-4 mb-4">
              <View>
                <Text className="text-xl font-bold text-white">{camion.patente}</Text>
                <Text className="text-xs text-[#888] mt-1">{camion.modelo}</Text>
              </View>
              <View className="flex-row items-center px-3 py-1 rounded-md" style={{ backgroundColor: '#FF4C4C30' }}>
                <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#FF4C4C' }} />
                <Text className="text-sm font-semibold" style={{ color: '#FF4C4C' }}>En Reparación</Text>
              </View>
            </View>

            <View className="flex-row flex-wrap justify-between">
              <View className="w-1/2 mb-3">
                <Text className="text-xs text-[#888]">Marca</Text>
                <Text className="text-sm font-semibold text-white mt-1">{camion.marca}</Text>
              </View>
              <View className="w-1/2 mb-3">
                <Text className="text-xs text-[#888]">Año</Text>
                <Text className="text-sm font-semibold text-white mt-1">{camion.año}</Text>
              </View>
              <View className="w-1/2 mb-3">
                <Text className="text-xs text-[#888]">Tipo</Text>
                <Text className="text-sm font-semibold text-white mt-1">{camion.tipo}</Text>
              </View>
              <View className="w-1/2 mb-3">
                <Text className="text-xs text-[#888]">Último Servicio</Text>
                <Text className="text-sm font-semibold text-white mt-1">{camion.ultimoServicio}</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View className="flex-row space-x-3 mb-6">
            <TouchableOpacity className="flex-1 bg-danger rounded-lg py-4 items-center flex-row justify-center" onPress={() => navigation.navigate('solicitud')}>
              <MaterialIcons name="add" size={24} color="#fff" />
              <Text className="text-sm font-semibold text-white ml-2">Nueva Solicitud</Text>
            </TouchableOpacity>

            <TouchableOpacity className="flex-1 bg-card border border-[#333] rounded-lg py-4 items-center flex-row justify-center">
              <MaterialIcons name="visibility" size={24} color="#60A5FA" />
              <Text className="text-sm font-semibold text-primary ml-2">Ver Estado</Text>
            </TouchableOpacity>
          </View>

          {/* Estado de Última Solicitud */}
          {ultimaSolicitud && (
            <View className="mb-6">
              <Text className="text-lg font-bold text-white mb-3">Estado de Última Solicitud</Text>
              <View className="bg-card rounded-lg p-4 border border-[#333]">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <Text className="text-base font-bold text-white">{ultimaSolicitud.numeroPatente}</Text>
                    <Text className="text-xs text-[#888]">Creada: {new Date(ultimaSolicitud.fechaCreacion).toLocaleDateString('es-ES')}</Text>
                  </View>
                  <View className="px-3 py-1 rounded-md" style={{ backgroundColor: `${getEstadoColor(ultimaSolicitud.estado)}20` }}>
                    <Text className="text-sm font-semibold" style={{ color: getEstadoColor(ultimaSolicitud.estado) }}>{getEstadoText(ultimaSolicitud.estado)}</Text>
                  </View>
                </View>
                <Text className="text-sm text-[#ccc] mb-3">{ultimaSolicitud.descripcion}</Text>
                {ultimaSolicitud.chofer && (<Text className="text-xs text-[#888]">Chofer: {ultimaSolicitud.chofer}</Text>)}
              </View>
            </View>
          )}

          {/* Historial */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-white">Historial de Servicios</Text>
              <TouchableOpacity>
                <Text className="text-sm text-primary font-semibold">Ver más</Text>
              </TouchableOpacity>
            </View>

            {historialCompletado.length === 0 ? (
              <View className="items-center py-10">
                <MaterialIcons name="history" size={48} color="#666" />
                <Text className="text-[#888] mt-4">No hay servicios completados</Text>
              </View>
            ) : (
              historialCompletado.slice(0, 4).map(turno => (
                <TouchableOpacity key={turno.id} className="flex-row justify-between items-center bg-card rounded-lg p-3 mb-3 border border-[#333]">
                  <View className="flex-row items-center flex-1">
                    <View className="w-9 h-9 rounded-lg bg-[rgba(74,222,128,0.12)] items-center justify-center mr-3">
                      <MaterialIcons name="build" size={20} color="#4ADE80" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-white">{turno.descripcion}</Text>
                      <Text className="text-xs text-[#888]">{new Date(turno.fechaCreacion).toLocaleDateString('es-ES')}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-bold text-success">{turno.numeroPatente}</Text>
                    <View className="mt-2 px-2 py-1 rounded-md" style={{ backgroundColor: '#4ADE8030' }}>
                      <Text className="text-xs font-semibold" style={{ color: '#4ADE80' }}>{getEstadoText(turno.estado)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Support Card */}
          <View className="flex-row items-center bg-card rounded-lg p-4 border border-[#333]">
            <View className="w-12 h-12 rounded-lg bg-[rgba(96,165,250,0.12)] items-center justify-center mr-3">
              <MaterialIcons name="headset-mic" size={28} color="#60A5FA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text className="text-sm font-semibold text-white">¿Necesitas ayuda?</Text>
              <Text className="text-xs text-[#888] mt-1">Contáctanos para cualquier consulta sobre tus servicios</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

export default ClienteDashboard;
