import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Wrench, CheckCircle2, LogOut, AlertTriangle, UserCog, Clock, Hash } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { RootState } from '@/redux/store';
import { setTurnos } from '@/redux/slices/turnosSlice';
import { suscribirseATurnos } from '@/services/turnosService';
import LoadingOverlay from '@/components/LoadingOverlay';
import WorkshopOrderModal from '@/components/WorkshopOrderModal';

const COLUMN_COLORS = {
  solicitudes: '#F97316',
  asignados: '#3B82F6',
  en_proceso: '#EAB308',
  finalizados: '#10B981',
} as const;

const AdminDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();
  const isMonitor = width > 1024;
  const router = useRouter();

  const turnos = useSelector((state: RootState) => state.turnos.turnos);
  const [loading, setLoading] = useState(true);
  const [selectedTurno, setSelectedTurno] = useState<any>(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'solicitudes' | 'asignados' | 'en_proceso' | 'finalizados'>('solicitudes');

  useEffect(() => {
    const unsubscribe = suscribirseATurnos((data) => {
      dispatch(setTurnos(data));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [dispatch]);

  const workshopTurnos = useMemo(() => {
    return turnos.filter(t => ['taller_pendiente', 'scheduled', 'in_progress', 'completed'].includes(t.estado));
  }, [turnos]);

  const columns = useMemo(() => [
    { id: 'solicitudes', title: 'Nuevas', color: COLUMN_COLORS.solicitudes, data: workshopTurnos.filter(t => t.estado === 'taller_pendiente') },
    { id: 'asignados', title: 'Asignadas', color: COLUMN_COLORS.asignados, data: workshopTurnos.filter(t => t.estado === 'scheduled') },
    { id: 'en_proceso', title: 'En Taller', color: COLUMN_COLORS.en_proceso, data: workshopTurnos.filter(t => t.estado === 'in_progress') },
    { id: 'finalizados', title: 'Listos', color: COLUMN_COLORS.finalizados, data: workshopTurnos.filter(t => t.estado === 'completed') },
  ], [workshopTurnos]);

  const renderWorkshopCard = (t: any, color: string) => (
    <TouchableOpacity
      key={t.id}
      onPress={() => { setSelectedTurno(t); setOrderModalVisible(true); }}
      className="mb-3 bg-zinc-900/80 p-4 rounded-2xl border-l-4 shadow-2xl border-zinc-800"
      style={{ borderLeftColor: color }}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View>
          <Text className="text-white font-black text-lg italic tracking-tighter">{t.numeroPatente}</Text>
          {t.numeroOT && (
            <View className="flex-row items-center mt-0.5">
              <Hash size={10} color="#666" />
              <Text className="text-zinc-500 text-[10px] font-bold ml-0.5">{t.numeroOT}</Text>
            </View>
          )}
        </View>
        <View className={`px-2 py-0.5 rounded ${t.prioridad === 1 ? 'bg-red-500/20' : 'bg-zinc-800'}`}>
          <Text className={`${t.prioridad === 1 ? 'text-red-500' : 'text-zinc-400'} text-[8px] font-black`}>
            {t.prioridad === 1 ? 'URGENTE' : 'NORMAL'}
          </Text>
        </View>
      </View>

      <Text className="text-zinc-400 text-xs mb-4 leading-4" numberOfLines={2}>
        {t.reporteSupervisor || t.comentariosChofer || 'Sin descripción del problema...'}
      </Text>

      <View className="flex-row justify-between items-center border-t border-white/5 pt-3">
        <View className="flex-row items-center">
          <UserCog size={12} color={t.mecanicoNombre ? color : "#444"} />
          <Text className="text-zinc-300 text-[10px] ml-1 font-bold">
            {t.mecanicoNombre || 'SIN ASIGNAR'}
          </Text>
        </View>
        <View className="flex-row items-center bg-black/40 px-2 py-1 rounded-lg">
          <Clock size={10} color="#666" />
          <Text className="text-zinc-500 text-[10px] ml-1 font-mono">{t.horasEstimadas || '0'}h</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#050505]">
      <LinearGradient colors={['#111', '#000']} className="flex-1 px-4">
        {loading && <LoadingOverlay message="Sincronizando Taller..." />}

        {/* HEADER */}
        <View className="flex-row justify-between items-center mt-6 mb-8">
          <View>
            <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-[4px]">Workshop Fleet Control</Text>
            <Text className="text-white text-3xl font-black italic tracking-tighter">TALLER CENTRAL</Text>
          </View>
          <TouchableOpacity onPress={onLogout} className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
            <LogOut size={20} color="#FF4C4C" />
          </TouchableOpacity>
        </View>

        {/* TABS MOBILE */}
        {!isMonitor && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 max-h-12">
            {columns.map(col => (
              <TouchableOpacity
                key={col.id}
                onPress={() => setActiveTab(col.id as any)}
                className={`mr-3 px-5 py-2 rounded-2xl border flex-row items-center ${activeTab === col.id ? 'bg-white/10 border-white/20' : 'bg-zinc-900 border-transparent'}`}
              >
                <View style={{ backgroundColor: col.color }} className="w-2 h-2 rounded-full mr-2" />
                <Text className={`text-xs font-black uppercase ${activeTab === col.id ? 'text-white' : 'text-zinc-500'}`}>{col.title}</Text>
                <Text className="text-zinc-600 text-[10px] font-black ml-2">({col.data.length})</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* KANBAN / LISTA */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {isMonitor ? (
            <View className="flex-row gap-4">
              {columns.map(col => (
                <View key={col.id} className="flex-1">
                  <View className="flex-row items-center mb-4 px-2">
                    <Text className="text-zinc-500 font-black uppercase text-[10px] tracking-widest">{col.title}</Text>
                    <View style={{ backgroundColor: col.color + '20' }} className="ml-2 px-2 py-0.5 rounded">
                      <Text style={{ color: col.color }} className="text-[10px] font-black">{col.data.length}</Text>
                    </View>
                  </View>
                  {col.data.map(t => renderWorkshopCard(t, col.color))}
                </View>
              ))}
            </View>
          ) : (
            <View className="pb-20">
              {columns.filter(c => c.id === activeTab)[0]?.data.length === 0 ? (
                <View className="items-center py-20 opacity-20">
                  <Wrench size={60} color="white" />
                  <Text className="text-white mt-4 font-black">SIN TRABAJOS</Text>
                </View>
              ) : (
                columns.filter(c => c.id === activeTab)[0]?.data.map(t => renderWorkshopCard(t, columns.find(c => c.id === activeTab)!.color))
              )}
            </View>
          )}
        </ScrollView>
      </LinearGradient>

      <WorkshopOrderModal
        visible={orderModalVisible}
        turno={selectedTurno}
        onClose={() => { setOrderModalVisible(false); setSelectedTurno(null); }}
      />
    </SafeAreaView>
  );
};

export default AdminDashboard;