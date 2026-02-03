import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Wrench, CheckCircle2, LogOut, AlertTriangle, UserCog, Clock, Hash, Activity, Users, TrendingUp } from 'lucide-react-native';
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

  // 1. Suscripción
  useEffect(() => {
    const unsubscribe = suscribirseATurnos((data) => {
      dispatch(setTurnos(data));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [dispatch]);

  // 2. Filtros
  const workshopTurnos = useMemo(() => {
    return turnos.filter(t => ['taller_pendiente', 'scheduled', 'in_progress', 'completed'].includes(t.estado));
  }, [turnos]);

  // 3. KPIs DE TALLER (Cálculo en tiempo real)
  const workshopKpis = useMemo(() => {
    const enReparacion = workshopTurnos.filter(t => t.estado === 'in_progress').length;

    // Mecánicos únicos trabajando actualmente
    const mecanicosActivos = new Set(
      workshopTurnos.filter(t => t.estado === 'in_progress' && t.mecanicoId).map(t => t.mecanicoId)
    ).size;

    const colaEspera = workshopTurnos.filter(t => t.estado === 'taller_pendiente' || t.estado === 'scheduled').length;

    return { enReparacion, mecanicosActivos, colaEspera };
  }, [workshopTurnos]);

  const columns = useMemo(() => [
    { id: 'solicitudes', title: 'Nuevas', color: COLUMN_COLORS.solicitudes, data: workshopTurnos.filter(t => t.estado === 'taller_pendiente') },
    { id: 'asignados', title: 'Asignadas', color: COLUMN_COLORS.asignados, data: workshopTurnos.filter(t => t.estado === 'scheduled') },
    { id: 'en_proceso', title: 'En Taller', color: COLUMN_COLORS.en_proceso, data: workshopTurnos.filter(t => t.estado === 'in_progress') },
    { id: 'finalizados', title: 'Listos', color: COLUMN_COLORS.finalizados, data: workshopTurnos.filter(t => t.estado === 'completed') },
  ], [workshopTurnos]);

  // 4. Render Card
  const renderWorkshopCard = (t: any, color: string) => (
    <TouchableOpacity
      key={t.id}
      activeOpacity={0.9}
      onPress={() => { setSelectedTurno(t); setOrderModalVisible(true); }}
      className="mb-4 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm overflow-hidden"
    >
      <View style={{ backgroundColor: color }} className="absolute left-0 top-0 bottom-0 w-1.5" />

      <View className="p-4 pl-5">
        <View className="flex-row justify-between items-start mb-2">
          <View>
            <Text className="text-white font-black text-lg italic tracking-tight">{t.numeroPatente}</Text>
            {t.numeroOT && (
              <View className="flex-row items-center mt-1 bg-zinc-800 self-start px-2 py-0.5 rounded">
                <Hash size={10} color="#888" />
                <Text className="text-zinc-400 text-[10px] font-bold ml-1">{t.numeroOT}</Text>
              </View>
            )}
          </View>

          {t.prioridad === 1 && (
            <View className="bg-red-500/20 px-2 py-1 rounded border border-red-500/30">
              <Text className="text-red-500 text-[9px] font-black uppercase">URGENTE</Text>
            </View>
          )}
        </View>

        <Text className="text-zinc-400 text-xs mb-4 leading-5" numberOfLines={2}>
          {t.reporteSupervisor || t.comentariosChofer || 'Sin descripción detallada.'}
        </Text>

        <View className="flex-row justify-between items-center border-t border-zinc-800 pt-3">
          <View className="flex-row items-center">
            <UserCog size={14} color={t.mecanicoNombre ? color : "#555"} />
            <Text className={`text-[10px] ml-1.5 font-bold ${t.mecanicoNombre ? 'text-zinc-300' : 'text-zinc-600'}`}>
              {t.mecanicoNombre || 'SIN ASIGNAR'}
            </Text>
          </View>

          {t.horasEstimadas && (
            <View className="flex-row items-center bg-black/40 px-2 py-1 rounded-lg border border-zinc-800">
              <Clock size={10} color="#666" />
              <Text className="text-zinc-500 text-[10px] ml-1 font-mono">{t.horasEstimadas}h</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#050505]">
      <LinearGradient colors={['#111', '#000']} className="flex-1 px-4">
        {loading && <LoadingOverlay message="Sincronizando Taller..." />}

        {/* HEADER */}
        <View className="flex-row justify-between items-center mt-6 mb-6">
          <View>
            <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-[4px]">Workshop Fleet Control</Text>
            <Text className="text-white text-3xl font-black italic tracking-tighter">TALLER CENTRAL</Text>
          </View>
          {onLogout && (
            <TouchableOpacity onPress={onLogout} className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
              <LogOut size={20} color="#FF4C4C" />
            </TouchableOpacity>
          )}
        </View>

        {/* KPIs OPERATIVOS DEL TALLER */}
        <View className="flex-row gap-3 mb-6">
          {/* KPI 1: En Reparación */}
          <View className="flex-1 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
            <View className="flex-row items-center justify-between mb-2">
              <View className="p-2 rounded-full bg-blue-500/20">
                <Activity size={20} color="#3B82F6" />
              </View>
              <Text className="text-white text-xl font-black">{workshopKpis.enReparacion}</Text>
            </View>
            <Text className="text-zinc-400 text-[10px] uppercase font-bold">Unidades en Box</Text>
          </View>

          {/* KPI 2: Mecánicos Activos */}
          <View className="flex-1 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
            <View className="flex-row items-center justify-between mb-2">
              <View className="p-2 rounded-full bg-emerald-500/20">
                <Users size={20} color="#10B981" />
              </View>
              <Text className="text-white text-xl font-black">{workshopKpis.mecanicosActivos}</Text>
            </View>
            <Text className="text-zinc-400 text-[10px] uppercase font-bold">Mecánicos Online</Text>
          </View>

          {/* KPI 3: Cola de Espera */}
          <View className="flex-1 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
            <View className="flex-row items-center justify-between mb-2">
              <View className={`p-2 rounded-full ${workshopKpis.colaEspera > 5 ? 'bg-red-500/20' : 'bg-orange-500/20'}`}>
                <TrendingUp size={20} color={workshopKpis.colaEspera > 5 ? '#EF4444' : '#F97316'} />
              </View>
              <Text className={`text-xl font-black ${workshopKpis.colaEspera > 5 ? 'text-red-500' : 'text-white'}`}>{workshopKpis.colaEspera}</Text>
            </View>
            <Text className="text-zinc-400 text-[10px] uppercase font-bold">Pendientes</Text>
          </View>
        </View>

        {/* TABS (MÓVIL) */}
        {!isMonitor && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 max-h-14">
            {columns.map(col => (
              <TouchableOpacity
                key={col.id}
                onPress={() => setActiveTab(col.id as any)}
                className={`mr-3 px-5 py-2.5 rounded-2xl border flex-row items-center ${activeTab === col.id ? 'bg-white/10 border-white/20' : 'bg-zinc-900 border-zinc-800'}`}
              >
                <View style={{ backgroundColor: col.color }} className="w-2.5 h-2.5 rounded-full mr-2.5" />
                <Text className={`text-xs font-black uppercase ${activeTab === col.id ? 'text-white' : 'text-zinc-500'}`}>{col.title}</Text>
                <View className="ml-2 bg-black/40 px-2 py-0.5 rounded-full">
                  <Text className="text-zinc-500 text-[9px] font-bold">{col.data.length}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* KANBAN / LISTA */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {isMonitor ? (
            <View className="flex-row gap-4">
              {columns.map(col => (
                <View key={col.id} className="flex-1 bg-zinc-900/20 rounded-2xl p-2 border border-zinc-800/50">
                  <View className="flex-row items-center mb-4 px-2 py-2">
                    <Text className="text-zinc-500 font-black uppercase text-[10px] tracking-widest flex-1">{col.title}</Text>
                    <Text style={{ color: col.color }} className="text-lg font-black">{col.data.length}</Text>
                  </View>
                  {col.data.map(t => renderWorkshopCard(t, col.color))}
                </View>
              ))}
            </View>
          ) : (
            <View>
              {columns.filter(c => c.id === activeTab)[0]?.data.length === 0 ? (
                <View className="items-center py-20 opacity-20">
                  <Wrench size={60} color="white" />
                  <Text className="text-white mt-4 font-black tracking-widest">SIN TRABAJOS</Text>
                </View>
              ) : (
                columns.filter(c => c.id === activeTab)[0]?.data.map(t => renderWorkshopCard(t, columns.find(c => c.id === activeTab)!.color))
              )}
            </View>
          )}
        </ScrollView>

      </LinearGradient>

      {/* MODAL ORDEN DE TRABAJO */}
      <WorkshopOrderModal
        visible={orderModalVisible}
        turno={selectedTurno}
        onClose={() => { setOrderModalVisible(false); setSelectedTurno(null); }}
      />
    </SafeAreaView>
  );
};

export default AdminDashboard;