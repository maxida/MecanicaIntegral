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
import CustomAlert from '@/components/CustomAlert';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { actualizarTurno, setTurnos } from '@/redux/slices/turnosSlice';
import { actualizarTurnoService, obtenerTurnos, suscribirseATurnos } from '@/services/turnosService';
import LoadingOverlay from '@/components/LoadingOverlay';
import { useGlobalLoading } from '@/components/GlobalLoading';

const MecanicoDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const dispatch = useDispatch();
  const turnos = useSelector((state: RootState) => state.turnos.turnos);
  const [loading, setLoading] = useState(false);
  const globalLoading = useGlobalLoading();
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

  // Filtrar tareas asignadas al mecánico (por ahora todas las scheduled/in_progress)
  const tareas = turnos.filter(t => t.estado === 'scheduled' || t.estado === 'in_progress');

  // Calcular estadísticas reales
  const tareasCompletadas = tareas.filter(t => t.estado === 'completed').length;
  const tiempoTotalTrabajado = tareas
    .filter(t => t.tiempoTrabajado)
    .reduce((total, t) => total + (t.tiempoTrabajado || 0), 0);
  
  const horasTrabajadas = Math.floor(tiempoTotalTrabajado / 60);
  const minutosTrabajados = tiempoTotalTrabajado % 60;

  const handleMarcarCompleta = async (id: string) => {
    CustomAlert.alert('Confirmar', '¿Marcar esta tarea como completada?', [
      { text: 'Cancelar', onPress: () => {} },
      {
        text: 'Completar',
        onPress: async () => {
            setLoading(true);
            globalLoading.show('Actualizando estado...');
            try {
              const now = new Date().toISOString();
              await actualizarTurnoService(id, { 
                estado: 'completed',
                fechaFinTrabajo: now
              });
              dispatch(actualizarTurno({ 
                id, 
                estado: 'completed',
                fechaFinTrabajo: now
              }));
              CustomAlert.alert('Éxito', 'Tarea completada');
            } catch (error) {
              console.error('Error completando tarea:', error);
              CustomAlert.alert('Error', 'No se pudo completar la tarea');
            } finally {
              setLoading(false);
              globalLoading.hide();
            }
          },
      },
    ]);
  };

  const handleIniciarTarea = async (id: string) => {
    setLoading(true);
    globalLoading.show('Iniciando tarea...');
    try {
      const now = new Date().toISOString();
      await actualizarTurnoService(id, { 
        estado: 'in_progress',
        fechaInicioTrabajo: now
      });
      dispatch(actualizarTurno({ 
        id, 
        estado: 'in_progress',
        fechaInicioTrabajo: now
      }));
    } catch (error) {
      console.error('Error iniciando tarea:', error);
    } finally {
      setLoading(false);
      globalLoading.hide();
    }
  };

  const handlePausarTarea = async (id: string) => {
    setLoading(true);
    globalLoading.show('Pausando tarea...');
    try {
      await actualizarTurnoService(id, { estado: 'scheduled' });
      dispatch(actualizarTurno({ id, estado: 'scheduled' }));
    } catch (error) {
      console.error('Error pausando tarea:', error);
    } finally {
      setLoading(false);
      globalLoading.hide();
    }
  };

  const calcularTiempoTrabajado = (turno: any) => {
    if (!turno.fechaInicioTrabajo) return '0 min';
    
    const inicio = new Date(turno.fechaInicioTrabajo);
    const fin = turno.fechaFinTrabajo ? new Date(turno.fechaFinTrabajo) : new Date();
    const diffMs = fin.getTime() - inicio.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min`;
    const horas = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${horas}h ${mins}min`;
  };

  const getPrioridadColor = (prioridad: number) => {
    switch (prioridad) {
      case 1: return '#FF4C4C'; // Alta
      case 2: return '#FACC15'; // Media
      case 3: return '#4ADE80'; // Baja
      default: return '#888';
    }
  };

  const getEstadoColor = (estado: string) => {
    return estado === 'in_progress' ? '#60A5FA' : '#888';
  };

  const getEstadoText = (estado: string) => {
    return estado === 'in_progress' ? 'En Progreso' : 'Pendiente';
  };

  const getPrioridadText = (prioridad: number) => {
    switch (prioridad) {
      case 1: return 'Alta';
      case 2: return 'Media';
      case 3: return 'Baja';
      default: return 'Sin definir';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <LinearGradient colors={['#000000', '#121212']} style={{ flex: 1 }}>
        <ScrollView className="px-5 pt-10 pb-15">
          {loading && <LoadingOverlay message="Actualizando..." />}
          {/* Header */}
          <View className="mb-6">
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-2xl font-bold text-white">Mis Tareas Diarias</Text>
                <Text className="text-sm text-[#888] mt-1">Máximo 3 tareas por día</Text>
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

          {/* Progress Stats */}
          <View className="mb-6">
            <View className="bg-card rounded-lg p-4 border border-[#333]">
              <View className="mb-3">
                <Text className="text-xs text-[#888]">Completadas Hoy</Text>
                <Text className="text-lg font-bold text-primary mt-1">{tareasCompletadas} de {tareas.length}</Text>
              </View>
              <View className="h-1 bg-[#2A2A2A] rounded overflow-hidden">
                <View style={{ width: tareas.length > 0 ? `${(tareasCompletadas / tareas.length) * 100}%` : '0%', height: '100%', backgroundColor: '#60A5FA' }} />
              </View>
              <Text className="text-xs text-success mt-3 text-center">Tiempo trabajado: {horasTrabajadas}h {minutosTrabajados}min</Text>
            </View>
          </View>

          {/* Tareas List */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-white mb-3">Hoy</Text>
            {tareas.map((tarea) => (
              <View key={tarea.id} className="bg-card rounded-lg border border-[#333] mb-3 overflow-hidden">
                <View className="flex-row justify-between items-center p-4 border-b border-[#2A2A2A]">
                  <View className="flex-row items-start flex-1">
                    <View className="mr-3" style={{ width: 4, height: 60, borderRadius: 2, backgroundColor: getPrioridadColor(tarea.prioridad || 3) }} />
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-white">{tarea.descripcion}</Text>
                      <Text className="text-xs text-[#888] mt-1">{tarea.chofer || 'Sin chofer'} • {tarea.numeroPatente}</Text>
                      <Text className="text-xs text-[#666] mt-1">Tipo: {tarea.tipo || 'N/A'} • Creada: {new Date(tarea.fechaCreacion).toLocaleDateString('es-ES')}</Text>
                      {tarea.checklistVehiculo ? (
                        <Text className="text-sm text-[#ccc] mt-1" numberOfLines={1}>Checklist: {tarea.checklistVehiculo.observaciones || 'Sin observaciones'}</Text>
                      ) : null}
                      {tarea.estado === 'in_progress' && (
                        <Text className="text-sm text-yellow-400 mt-1">⏱️ {calcularTiempoTrabajado(tarea)}</Text>
                      )}
                    </View>
                  </View>
                  <View className="px-3 py-1 rounded-md" style={{ borderWidth: 1, borderColor: getEstadoColor(tarea.estado) }}>
                    <Text className="text-xs font-semibold" style={{ color: getEstadoColor(tarea.estado) }}>{getEstadoText(tarea.estado)}</Text>
                  </View>
                </View>

                <View className="p-4">
                  <View className="flex-row items-center mb-3">
                    <MaterialIcons name="schedule" size={16} color="#888" />
                    <Text className="text-xs text-[#888] ml-2">{tarea.horaReparacion}</Text>
                  </View>

                  <View className="flex-row space-x-3">
                    {tarea.estado === 'scheduled' ? (
                      <TouchableOpacity className="flex-1 bg-primary rounded-md py-2 items-center flex-row justify-center" onPress={() => handleIniciarTarea(tarea.id)}>
                        <MaterialIcons name="play-arrow" size={16} color="#fff" />
                        <Text className="text-sm text-white ml-2">Iniciar</Text>
                      </TouchableOpacity>
                    ) : tarea.estado === 'in_progress' ? (
                      <TouchableOpacity className="flex-1 bg-yellow-400 rounded-md py-2 items-center flex-row justify-center" onPress={() => handlePausarTarea(tarea.id)}>
                        <MaterialIcons name="pause" size={16} color="#fff" />
                        <Text className="text-sm text-white ml-2">Pausar</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity className={`flex-1 rounded-md py-2 items-center flex-row justify-center ${tarea.estado === 'scheduled' ? 'opacity-50' : ''}`} disabled={tarea.estado === 'scheduled'} onPress={() => handleMarcarCompleta(tarea.id)} style={tarea.estado === 'scheduled' ? { borderWidth: 1, borderColor: '#666', backgroundColor: '#1E1E1E' } : { borderWidth: 1, borderColor: '#4ADE80', backgroundColor: '#1E1E1E' }}>
                      <MaterialIcons name="check-circle" size={16} color={tarea.estado === 'scheduled' ? '#666' : '#4ADE80'} />
                      <Text className="text-sm font-semibold text-white ml-2">Completar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {tareas.length === 0 && (
              <View className="items-center py-10">
                <MaterialIcons name="check-circle" size={48} color="#4ADE80" />
                <Text className="text-white text-lg mt-4">¡Todas las tareas completadas!</Text>
                <Text className="text-[#888] text-sm mt-2">Descansa, has hecho un buen trabajo</Text>
              </View>
            )}
          </View>

          {/* Novedades */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-white mb-3">Novedades</Text>
            <View className="flex-row items-center bg-card rounded-lg p-4 border border-[#333]">
              <MaterialIcons name="info" size={24} color="#60A5FA" />
              <View className="flex-1 ml-3">
                <Text className="text-sm font-semibold text-white">Nuevo turno asignado</Text>
                <Text className="text-xs text-[#888]">Se agregó una reparación de urgencia a tu lista</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default MecanicoDashboard;

