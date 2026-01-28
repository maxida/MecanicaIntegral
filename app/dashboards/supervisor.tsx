import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image, TextInput } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { RootState } from '@/redux/store';
import { setTurnos, actualizarTurno } from '@/redux/slices/turnosSlice';
import { suscribirseAPendingTriage, actualizarTurnoService, suscribirseATurnos } from '@/services/turnosService';
import TicketCard from '@/components/TicketCard';
import TurnoDetailModal from '@/components/TurnoDetailModal'; // El que armamos antes

const SuperadminDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const dispatch = useDispatch();
  const turnos = useSelector((state: RootState) => state.turnos.turnos);
  const [selectedTurno, setSelectedTurno] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  const [pendings, setPendings] = useState<any[]>([]);
  const [allTurnos, setAllTurnos] = useState<any[]>([]);
  const [filterText, setFilterText] = useState('');
  const [filterEstadoGeneral, setFilterEstadoGeneral] = useState<'all' | 'crit' | 'ok'>('crit');
  const [page, setPage] = useState(0);
  const pageSize = 2;

  useEffect(() => {
    // Suscribimos a todos los turnos y también a los ingresos pendientes de triage.
    const unsubAll = suscribirseATurnos((data) => {
      // recibimos todos los documentos de la colección 'turnos'
      setAllTurnos(data);
      // mantener redux en sincronía (opcional)
      dispatch(setTurnos(data));
    });

    const unsubPendings = suscribirseAPendingTriage((data) => {
      // ingresos muy recientes que todavía pueden tener estado 'pending_triage'
      setPendings(data);
    });

    return () => {
      unsubAll && unsubAll();
      unsubPendings && unsubPendings();
    };
  }, [dispatch]);

  // Construir la lista "Torre de Control" mezclada: combinamos turnos registrados y los ingresos pendientes.
  const combinedMap: Record<string, any> = {};
  // Agregar todos los documentos de la colección principal
  allTurnos.forEach(t => { combinedMap[t.id] = { ...t }; });
  // Los pendientes de triage pueden ser documentos nuevos; los fusionamos (sobrescriben si mismo id)
  pendings.forEach(t => { combinedMap[t.id] = { ...combinedMap[t.id], ...t }; });

  const combinedList = Object.values(combinedMap).map((t: any) => ({
    ...t,
    // normalizar campo de fecha para orden
    _fechaOrden: t.fechaCreacion || t.fechaReparacion || new Date().toISOString(),
  }));

  // Orden descendente: el más reciente arriba
  combinedList.sort((a: any, b: any) => new Date(b._fechaOrden).getTime() - new Date(a._fechaOrden).getTime());

  // Filtros por UI
  const matchStatus = (t: any) => {
    if (filterEstadoGeneral === 'all') return true;
    if (filterEstadoGeneral === 'crit') return t.estadoGeneral === 'alert' || t.prioridad === 1;
    if (filterEstadoGeneral === 'ok') return t.estado === 'completed' || t.estadoGeneral === 'ok';
    return true;
  };

  const ingresosFiltrados = combinedList.filter((t: any) => {
    const matchText = !filterText || (t.numeroPatente || '').toLowerCase().includes(filterText.toLowerCase());
    return matchText && matchStatus(t);
  });

  const totalPages = Math.max(1, Math.ceil(ingresosFiltrados.length / pageSize));
  const ingresosPendientes = ingresosFiltrados.slice(page * pageSize, (page + 1) * pageSize);

  const enTaller = combinedList.filter((t: any) => t.derivadoATaller || t.estado === 'scheduled' || t.estado === 'in_progress');

  const handleDecision = async (id: string, decision: string) => {
    // Accepts either modal values ('scheduled'/'rejected') or earlier ('taller'/'liberar')
    const isTaller = decision === 'taller' || decision === 'scheduled';
    const isLiberar = decision === 'liberar' || decision === 'rejected';

    const metadata = isTaller
      ? { estado: 'scheduled' as const, derivadoATaller: true, fechaDerivacion: new Date().toISOString() }
      : { estado: 'completed' as const, fechaLiberacion: new Date().toISOString(), notas: 'Unidad liberada sin reparaciones' };

    try {
      await actualizarTurnoService(id, metadata);
      const currentTurno = turnos.find(t => t.id === id);
      if (currentTurno) {
        dispatch(actualizarTurno({ ...currentTurno, ...metadata }));
      }
      setModalVisible(false);
      // reset page to first to show newest
      setPage(0);
    } catch (e) {
      console.error('Error en triage:', e);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <LinearGradient colors={['#0b0b0b', '#000']} className="flex-1 px-6">
        <ScrollView showsVerticalScrollIndicator={false} className="pt-11">
          
          {/* HEADER PREMIUM */}
          <View className="mb-10">
            <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[4px]">Logistics Management</Text>
            <Text className="text-white text-3xl font-black italic">CENTRO DE CONTROL</Text>
          </View>
          {onLogout && (
            <View style={{ position: 'absolute', right: 24, top: 24 }}>
              <TouchableOpacity onPress={onLogout} className="rounded-xl p-3" style={{ backgroundColor: '#FF4C4C12', borderWidth: 1, borderColor: '#FF4C4C22' }}>
                <MaterialIcons name="logout" size={20} color="#FF4C4C" />
              </TouchableOpacity>
            </View>
          )}

          {/* ESTADÍSTICAS RÁPIDAS */}
          <View className="flex-row space-x-4 mb-10">
            <View className="flex-1 bg-card/40 border border-white/5 p-4 rounded-3xl">
              <Text className="text-primary text-2xl font-black">{ingresosFiltrados.length}</Text>
              <Text className="text-gray-600 text-[8px] font-bold uppercase">Por Revisar</Text>
            </View>
            <View className="flex-1 bg-card/40 border border-white/5 p-4 rounded-3xl">
              <Text className="text-danger text-2xl font-black">{enTaller.length}</Text>
              <Text className="text-gray-600 text-[8px] font-bold uppercase">En Taller MIT</Text>
            </View>
          </View>

          {/* LISTA DE INGRESOS (FICHA DE CHOFERES) */}
          <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px] mb-3 ml-2">Nuevos Ingresos al Galpón</Text>
          <View className="mb-4">
            <TextInput
              value={filterText}
              onChangeText={(t) => { setFilterText(t); setPage(0); }}
              placeholder="Buscar por patente..."
              placeholderTextColor="#9CA3AF"
              className="bg-card/30 text-white px-4 py-3 rounded-2xl mb-3"
            />

            <View className="flex-row space-x-2">
              <TouchableOpacity onPress={() => { setFilterEstadoGeneral('crit'); setPage(0); }} className={`px-3 py-2 rounded-2xl ${filterEstadoGeneral === 'crit' ? 'bg-danger/20' : 'bg-white/5'}`}>
                <Text className="text-white text-[12px]">Alerta</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setFilterEstadoGeneral('ok'); setPage(0); }} className={`px-3 py-2 rounded-2xl ${filterEstadoGeneral === 'ok' ? 'bg-success/20' : 'bg-white/5'}`}>
                <Text className="text-white text-[12px]">Operativo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setFilterEstadoGeneral('all'); setPage(0); }} className={`px-3 py-2 rounded-2xl ${filterEstadoGeneral === 'all' ? 'bg-primary/20' : 'bg-white/5'}`}>
                <Text className="text-white text-[12px]">Todos</Text>
              </TouchableOpacity>
            </View>
          </View>

          {ingresosPendientes.length === 0 ? (
            <View className="items-center py-20 opacity-20">
              <MaterialIcons name="fact-check" size={60} color="white" />
              <Text className="text-white mt-4 font-bold tracking-widest">SIN RESULTADOS</Text>
            </View>
          ) : (
            ingresosPendientes.map((turno: any) => (
              <TicketCard
                key={turno.id}
                turno={turno}
                onPress={() => { setSelectedTurno(turno); setModalVisible(true); }}
                onDerivar={async (tId: string) => {
                  // Acción de derivar desde la tarjeta: actualiza backend y localmente mantiene la tarjeta visible
                  try {
                    const metadata = { estado: 'scheduled' as const, derivadoATaller: true, fechaDerivacion: new Date().toISOString() };
                    await actualizarTurnoService(tId, metadata);
                    const current = turnos.find((t:any) => t.id === tId);
                    if (current) dispatch(actualizarTurno({ ...current, ...metadata }));
                    // No removemos la tarjeta: solamente se actualiza su badge por la suscripción
                  } catch (e) {
                    console.error('Error al derivar:', e);
                  }
                }}
                onLiberar={async (tId: string) => {
                  try {
                    const metadata = { estado: 'completed' as const, fechaLiberacion: new Date().toISOString() };
                    await actualizarTurnoService(tId, metadata);
                    const current = turnos.find((t:any) => t.id === tId);
                    if (current) dispatch(actualizarTurno({ ...current, ...metadata }));
                  } catch (e) {
                    console.error('Error al liberar:', e);
                  }
                }}
              />
            ))
          )}

          {/* PAGINACIÓN */}
          {ingresosFiltrados.length > pageSize && (
            <View className="flex-row justify-center items-center space-x-4 my-6">
              <TouchableOpacity
                onPress={() => setPage(p => Math.max(0, p - 1))}
                className={`px-4 py-2 rounded-2xl ${page === 0 ? 'bg-white/5' : 'bg-primary/20'}`}
              >
                <Text className="text-white">Anterior</Text>
              </TouchableOpacity>

              <Text className="text-white">{`${page + 1} / ${totalPages}`}</Text>

              <TouchableOpacity
                onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                className={`px-4 py-2 rounded-2xl ${page >= totalPages - 1 ? 'bg-white/5' : 'bg-primary/20'}`}
              >
                <Text className="text-white">Siguiente</Text>
              </TouchableOpacity>
            </View>
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