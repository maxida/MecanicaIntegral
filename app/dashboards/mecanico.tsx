import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, useWindowDimensions, Platform, TextInput, Modal, ActivityIndicator, Image } from 'react-native';
import {
  Wrench, Clock, CheckCircle2, LogOut, Play, Pause, AlertTriangle, Truck, Timer, Check, X, FileText, User, Award, ListTodo
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { setTurnos } from '@/redux/slices/turnosSlice';
import { suscribirseATurnos, actualizarTurnoService } from '@/services/turnosService';
import LoadingOverlay from '@/components/LoadingOverlay';
import TurnoDetailModal from '@/components/TurnoDetailModal';

const MecanicoDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.login.user);
  const turnos = useSelector((state: RootState) => state.turnos.turnos);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modales
  const [selectedTurno, setSelectedTurno] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [finishModalVisible, setFinishModalVisible] = useState(false);

  // Input Diagnóstico Final
  const [diagnosticoFinal, setDiagnosticoFinal] = useState('');

  // 1. Suscripción INTELIGENTE
  useEffect(() => {
    if (!user) return;

    // console.log("🔍 BUSCANDO TAREAS PARA:", user.nombre, "| ID:", user.id);

    const unsubscribe = suscribirseATurnos((data) => {
      const misTareas = data.filter((t: any) => {
        const estadoValido = ['scheduled', 'in_progress', 'completed'].includes(t.estado);
        if (!estadoValido) return false;

        // Filtro por ID o Nombre (Robustez)
        const idMatch = t.mecanicoId === user.id;
        const nombreMatch = t.mecanicoNombre && user.nombre &&
          t.mecanicoNombre.toLowerCase().trim() === user.nombre.toLowerCase().trim();

        return idMatch || nombreMatch;
      });

      dispatch(setTurnos(misTareas));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [dispatch, user]);

  // 2. Clasificación & KPIs
  const { asignadas, enProceso, finalizadas, kpis } = useMemo(() => {
    const _asignadas = turnos.filter(t => t.estado === 'scheduled');
    const _enProceso = turnos.filter(t => t.estado === 'in_progress');
    const _finalizadas = turnos.filter(t => t.estado === 'completed');

    // KPI: Tiempo Promedio (aprox en horas de tareas finalizadas)
    let totalHoras = 0;
    let countConTiempo = 0;
    _finalizadas.forEach(t => {
      if (t.fechaInicioReal && t.fechaFinReal) {
        const start = new Date(t.fechaInicioReal).getTime();
        const end = new Date(t.fechaFinReal).getTime();
        const diff = (end - start) / (1000 * 60 * 60); // Horas
        if (diff > 0) {
          totalHoras += diff;
          countConTiempo++;
        }
      }
    });
    const avgTime = countConTiempo > 0 ? (totalHoras / countConTiempo).toFixed(1) : '0.0';

    return {
      asignadas: _asignadas,
      enProceso: _enProceso,
      finalizadas: _finalizadas,
      kpis: {
        completadasTotal: _finalizadas.length,
        pendientes: _asignadas.length,
        tiempoPromedio: avgTime
      }
    };
  }, [turnos]);

  // --- ACCIONES ---
  const handleStart = async (turno: any) => {
    setActionLoading(true);
    try {
      await actualizarTurnoService(turno.id, {
        estado: 'in_progress',
        fechaInicioReal: new Date().toISOString()
      });
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const handleFinish = async () => {
    if (!diagnosticoFinal.trim()) return;
    setActionLoading(true);
    try {
      await actualizarTurnoService(selectedTurno.id, {
        estado: 'completed',
        fechaFinReal: new Date().toISOString(),
        diagnosticoMecanico: diagnosticoFinal
      });
      setFinishModalVisible(false);
      setDiagnosticoFinal('');
      setSelectedTurno(null);
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  // --- CARD COMPONENT ---
  const TaskCard = ({ t }: { t: any }) => {
    const isWorking = t.estado === 'in_progress';
    const isDone = t.estado === 'completed';
    const startTime = t.fechaInicioReal ? new Date(t.fechaInicioReal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

    return (
      <View
        className={`mb-4 bg-zinc-900 rounded-2xl border-l-4 overflow-hidden ${isWorking ? 'border-yellow-500 bg-zinc-900/80 border' : isDone ? 'border-emerald-500 opacity-60' : 'border-blue-500'}`}
        style={isWorking ? { borderColor: '#EAB308' } : {}}
      >
        <View className="p-4">
          {/* Header */}
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <View className="flex-row items-center">
                <Truck size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text className="text-white text-2xl font-black italic">{t.numeroPatente}</Text>
              </View>
              <Text className="text-zinc-500 text-[10px] font-bold uppercase mt-1 ml-1">{t.tipoIngreso || 'MANTENIMIENTO'}</Text>
            </View>
            <View className="items-end">
              {t.prioridad === 1 && (
                <View className="bg-red-500/20 px-2 py-1 rounded mb-1">
                  <Text className="text-red-500 text-[8px] font-black">URGENTE</Text>
                </View>
              )}
              {t.horasEstimadas && (
                <View className="flex-row items-center bg-zinc-800 px-2 py-1 rounded">
                  <Clock size={10} color="#888" />
                  <Text className="text-zinc-400 text-[10px] ml-1 font-mono">{t.horasEstimadas}h Est.</Text>
                </View>
              )}
            </View>
          </View>

          {/* Instrucciones */}
          <View className="bg-blue-900/10 p-3 rounded-lg mb-3 border border-blue-500/20">
            <Text className="text-blue-400 text-[9px] font-black uppercase mb-1">Instrucción Taller</Text>
            <Text className="text-zinc-300 text-xs leading-5 font-medium">
              "{t.instruccionesAdmin || 'Sin instrucciones específicas.'}"
            </Text>
          </View>

          {/* Reporte Chofer */}
          {(t.reporteSupervisor || t.comentariosChofer || (t.sintomas && t.sintomas.length > 0)) && (
            <View className="bg-red-900/10 p-3 rounded-lg mb-4 border border-red-500/10">
              <View className="flex-row justify-between items-start mb-1">
                <Text className="text-red-400 text-[9px] font-black uppercase">Falla Reportada</Text>
                <User size={10} color="#EF4444" />
              </View>
              {t.sintomas && t.sintomas.length > 0 && (
                <View className="flex-row flex-wrap gap-1 mb-2">
                  {t.sintomas.map((s: string, i: number) => (
                    <View key={i} className="bg-red-500/20 px-1.5 py-0.5 rounded">
                      <Text className="text-red-300 text-[8px] font-bold uppercase">{s}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text className="text-zinc-400 text-xs italic">
                "{t.reporteSupervisor || t.comentariosChofer}"
              </Text>
            </View>
          )}

          {/* Foto Evidencia */}
          {(t.fotoTableroIngreso || t.fotoTablero) && (
            <TouchableOpacity onPress={() => { setSelectedTurno(t); setDetailVisible(true); }} className="mb-4 flex-row items-center">
              <Image source={{ uri: t.fotoTableroIngreso || t.fotoTablero }} className="w-8 h-8 rounded bg-zinc-800 mr-2" />
              <Text className="text-zinc-500 text-[10px] underline">Ver foto</Text>
            </TouchableOpacity>
          )}

          {/* Footer Acciones */}
          {!isDone && (
            <View className="flex-row gap-3 pt-2 border-t border-zinc-800/50">
              <TouchableOpacity
                onPress={() => { setSelectedTurno(t); setDetailVisible(true); }}
                className="flex-1 bg-zinc-800 py-3 rounded-xl items-center border border-zinc-700"
              >
                <Text className="text-zinc-400 text-xs font-bold uppercase">Ver Ficha</Text>
              </TouchableOpacity>

              {isWorking ? (
                <TouchableOpacity
                  onPress={() => { setSelectedTurno(t); setFinishModalVisible(true); }}
                  className="flex-[2] bg-emerald-600 py-3 rounded-xl flex-row items-center justify-center shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 size={16} color="white" />
                  <Text className="text-white text-xs font-black uppercase ml-2">Finalizar</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => handleStart(t)}
                  disabled={actionLoading}
                  className="flex-[2] bg-blue-600 py-3 rounded-xl flex-row items-center justify-center shadow-lg shadow-blue-500/20"
                >
                  {actionLoading ? <ActivityIndicator color="white" /> : (
                    <>
                      <Play size={16} color="white" fill="white" />
                      <Text className="text-white text-xs font-black uppercase ml-2">Iniciar Trabajo</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Timer Visual */}
          {isWorking && (
            <View className="mt-3 flex-row items-center justify-center bg-yellow-500/10 py-1 rounded">
              <Timer size={12} color="#EAB308" />
              <Text className="text-yellow-500 text-[10px] font-bold ml-1 uppercase">En Progreso desde {startTime}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <LinearGradient colors={['#111', '#000']} className="flex-1 px-4">
        {loading && <LoadingOverlay message="Cargando tus tareas..." />}

        {/* HEADER */}
        <View className="flex-row justify-between items-end mt-4 mb-6">
          <View>
            <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[4px]">Workshop Mode</Text>
            <Text className="text-white text-2xl font-black italic">MIS TAREAS</Text>
          </View>
          {onLogout && (
            <TouchableOpacity onPress={onLogout} className="rounded-xl p-2 bg-white/5 border border-white/10">
              <LogOut size={18} color="#FF4C4C" />
            </TouchableOpacity>
          )}
        </View>

        {/* KPIs DEL MECÁNICO (NUEVO) */}
        <View className="flex-row gap-3 mb-6">
          {/* KPI 1: Completadas */}
          <View className="flex-1 bg-zinc-900/50 p-3 rounded-2xl border border-white/5 items-center">
            <Award size={20} color="#10B981" style={{ marginBottom: 4 }} />
            <Text className="text-white text-xl font-black">{kpis.completadasTotal}</Text>
            <Text className="text-zinc-500 text-[8px] font-bold uppercase text-center">Finalizadas</Text>
          </View>

          {/* KPI 2: Pendientes */}
          <View className="flex-1 bg-zinc-900/50 p-3 rounded-2xl border border-white/5 items-center">
            <ListTodo size={20} color="#3B82F6" style={{ marginBottom: 4 }} />
            <Text className="text-white text-xl font-black">{kpis.pendientes}</Text>
            <Text className="text-zinc-500 text-[8px] font-bold uppercase text-center">En Cola</Text>
          </View>

          {/* KPI 3: Tiempo Promedio */}
          <View className="flex-1 bg-zinc-900/50 p-3 rounded-2xl border border-white/5 items-center">
            <Timer size={20} color="#EAB308" style={{ marginBottom: 4 }} />
            <Text className="text-white text-xl font-black">{kpis.tiempoPromedio}h</Text>
            <Text className="text-zinc-500 text-[8px] font-bold uppercase text-center">Promedio/Camión</Text>
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

          {/* EN PROCESO */}
          {enProceso.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center mb-3">
                <View className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse" />
                <Text className="text-white font-bold text-sm uppercase tracking-wider">Trabajando Ahora</Text>
              </View>
              {enProceso.map(t => <TaskCard key={t.id} t={t} />)}
            </View>
          )}

          {/* PENDIENTES */}
          <View className="mb-8">
            <View className="flex-row items-center mb-3">
              <View className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
              <Text className="text-zinc-400 font-bold text-sm uppercase tracking-wider">Pendientes ({asignadas.length})</Text>
            </View>
            {asignadas.length === 0 && enProceso.length === 0 ? (
              <View className="items-center py-10 opacity-30">
                <CheckCircle2 size={48} color="#FFF" />
                <Text className="text-white mt-4 font-bold">¡Todo listo! Sin tareas pendientes.</Text>
              </View>
            ) : (
              asignadas.map(t => <TaskCard key={t.id} t={t} />)
            )}
          </View>

          {/* FINALIZADAS */}
          {finalizadas.length > 0 && (
            <View className="opacity-50">
              <Text className="text-zinc-600 font-bold text-xs uppercase tracking-wider mb-3">Completadas Recientemente</Text>
              {finalizadas.map(t => <TaskCard key={t.id} t={t} />)}
            </View>
          )}

        </ScrollView>
      </LinearGradient>

      {/* MODAL FINISH */}
      <Modal visible={finishModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/90 justify-end">
          <View className="bg-zinc-900 rounded-t-3xl p-6 border-t border-white/10">
            <Text className="text-white text-xl font-bold mb-1">Finalizar Reparación</Text>
            <Text className="text-zinc-500 text-xs mb-4 uppercase tracking-widest">{selectedTurno?.numeroPatente}</Text>

            <Text className="text-zinc-300 text-sm font-bold mb-2">Informe Técnico del Trabajo Realizado *</Text>
            <TextInput
              multiline
              numberOfLines={5}
              value={diagnosticoFinal}
              onChangeText={setDiagnosticoFinal}
              placeholder="Describe qué reparaste, qué repuestos usaste..."
              placeholderTextColor="#555"
              textAlignVertical="top"
              className="bg-black p-4 rounded-xl border border-zinc-700 text-white min-h-[120px] mb-6"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setFinishModalVisible(false)} className="flex-1 bg-zinc-800 py-4 rounded-xl items-center">
                <Text className="text-zinc-400 font-bold uppercase text-xs">Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleFinish} disabled={!diagnosticoFinal.trim() || actionLoading} className={`flex-[2] py-4 rounded-xl items-center ${!diagnosticoFinal.trim() ? 'bg-zinc-700' : 'bg-emerald-600'}`}>
                {actionLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black uppercase text-xs">Confirmar y Cerrar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TurnoDetailModal visible={detailVisible} turno={selectedTurno} onClose={() => setDetailVisible(false)} readOnly={true} />
    </SafeAreaView>
  );
};

export default MecanicoDashboard;