import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { setTurnos, actualizarTurno } from '@/redux/slices/turnosSlice';
import { suscribirseATurnos, actualizarTurnoService } from '@/services/turnosService';
import TurnoDetailModal from '@/components/TurnoDetailModal'; // El que armamos antes

const SuperadminDashboard = () => {
  const dispatch = useDispatch();
  const turnos = useSelector((state: RootState) => state.turnos.turnos);
  const [selectedTurno, setSelectedTurno] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = suscribirseATurnos((data) => dispatch(setTurnos(data)));
    return () => unsubscribe();
  }, [dispatch]);

  // Filtramos solo los que acaban de entrar y no han sido procesados
  const ingresosPendientes = turnos.filter(t => t.estado === 'pending');
  const enTaller = turnos.filter(t => t.estado === 'scheduled' || t.estado === 'in_progress');

  const handleDecision = async (id: string, decision: 'liberar' | 'taller') => {
    const nuevoEstado = decision === 'taller' ? 'scheduled' : 'completed';
    const metadata = decision === 'taller' 
      ? { estado: 'scheduled', fechaDerivacion: new Date().toISOString() }
      : { estado: 'completed', fechaLiberacion: new Date().toISOString(), notas: 'Unidad liberada sin reparaciones' };

    try {
      await actualizarTurnoService(id, metadata);
      dispatch(actualizarTurno({ id, ...metadata }));
      setModalVisible(false);
    } catch (e) {
      console.error("Error en triage:", e);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <LinearGradient colors={['#0b0b0b', '#000']} className="flex-1 px-6">
        <ScrollView showsVerticalScrollIndicator={false} className="pt-8">
          
          {/* HEADER PREMIUM */}
          <View className="mb-10">
            <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[4px]">Logistics Management</Text>
            <Text className="text-white text-3xl font-black italic">CENTRO DE TRIAJE</Text>
          </View>

          {/* ESTADÍSTICAS RÁPIDAS */}
          <View className="flex-row space-x-4 mb-10">
            <View className="flex-1 bg-card/40 border border-white/5 p-4 rounded-3xl">
              <Text className="text-primary text-2xl font-black">{ingresosPendientes.length}</Text>
              <Text className="text-gray-600 text-[8px] font-bold uppercase">Por Revisar</Text>
            </View>
            <View className="flex-1 bg-card/40 border border-white/5 p-4 rounded-3xl">
              <Text className="text-danger text-2xl font-black">{enTaller.length}</Text>
              <Text className="text-gray-600 text-[8px] font-bold uppercase">En Taller MIT</Text>
            </View>
          </View>

          {/* LISTA DE INGRESOS (FICHA DE CHOFERES) */}
          <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px] mb-6 ml-2">Nuevos Ingresos al Galpón</Text>
          
          {ingresosPendientes.length === 0 ? (
            <View className="items-center py-20 opacity-20">
              <MaterialIcons name="fact-check" size={60} color="white" />
              <Text className="text-white mt-4 font-bold tracking-widest">SIN PENDIENTES</Text>
            </View>
          ) : (
            ingresosPendientes.map((turno) => (
              <TouchableOpacity 
                key={turno.id} 
                onPress={() => { setSelectedTurno(turno); setModalVisible(true); }}
                activeOpacity={0.8}
                className="mb-4 overflow-hidden rounded-[35px] border border-white/10"
              >
                <BlurView intensity={10} tint="dark" className="p-5 bg-card/40">
                  <View className="flex-row justify-between items-start mb-4">
                    <View>
                      <Text className="text-white font-black text-lg">{turno.numeroPatente}</Text>
                      <Text className="text-primary text-[10px] font-bold uppercase tracking-tighter">Chofer: {turno.chofer}</Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full ${turno.estadoGeneral === 'crit' ? 'bg-danger/20' : 'bg-success/20'}`}>
                      <Text className={`text-[8px] font-black ${turno.estadoGeneral === 'crit' ? 'text-danger' : 'text-success'}`}>
                        {turno.estadoGeneral === 'crit' ? 'REPARACIÓN NECESARIA' : 'TODO OK'}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-gray-400 text-xs mb-4 italic" numberOfLines={2}>
                    "{turno.comentariosChofer || 'Sin comentarios adicionales'}"
                  </Text>

                  <View className="flex-row space-x-2">
                    <TouchableOpacity 
                      onPress={() => handleDecision(turno.id, 'liberar')}
                      className="flex-1 bg-success/10 py-3 rounded-2xl items-center border border-success/20"
                    >
                      <Text className="text-success text-[10px] font-black uppercase">Liberar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => handleDecision(turno.id, 'taller')}
                      className="flex-[2] bg-danger py-3 rounded-2xl items-center shadow-lg shadow-danger/40"
                    >
                      <Text className="text-white text-[10px] font-black uppercase italic">Derivar a Taller MIT</Text>
                    </TouchableOpacity>
                  </View>
                </BlurView>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </LinearGradient>

      {/* MODAL DETALLE PARA REVISAR ANTES DE DECIDIR */}
      <TurnoDetailModal 
        visible={modalVisible}
        turno={selectedTurno}
        onClose={() => setModalVisible(false)}
        onAction={handleDecision}
      />
    </SafeAreaView>
  );
};

export default SuperadminDashboard;