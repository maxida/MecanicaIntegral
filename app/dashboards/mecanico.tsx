import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import {
  Wrench,
  Clock,
  CheckCircle2,
  LogOut,
  Play,
  Pause,
  ClipboardCheck,
  Eye,
  Timer,
  AlertTriangle,
  Truck,
  Calendar,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import CustomAlert from '@/components/CustomAlert';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { setSolicitudes, actualizarSolicitud } from '@/redux/slices/solicitudesSlice';
import { suscribirseASolicitudesMecanico, suscribirseATodasSolicitudes, actualizarSolicitud as actualizarSolicitudService } from '@/services/solicitudService';
import { actualizarTurnoService } from '@/services/turnosService';
import LoadingOverlay from '@/components/LoadingOverlay';
import { useGlobalLoading } from '@/components/GlobalLoading';
import TurnoDetailModal from '@/components/TurnoDetailModal';

// --- CONSTANTES DE COLORES (Strict Color Scheme) ---
const COLUMN_COLORS = {
  asignadas: '#3b82f6',   // blue-500 - Tareas asignadas
  enProceso: '#eab308',   // yellow-500 - Trabajo activo
  finalizadas: '#10b981', // emerald-500 - Completadas
} as const;

// --- KPI Card Compacta ---
const KpiCard = ({ 
  label, 
  value, 
  color, 
  icon: Icon,
  subtitle 
}: { 
  label: string; 
  value: number; 
  color: string; 
  icon: any;
  subtitle?: string;
}) => (
  <View 
    className="flex-1 mx-1"
    style={Platform.select({
      web: { boxShadow: `0 0 20px ${color}15` } as any,
      default: {}
    })}
  >
    <View 
      className="rounded-2xl overflow-hidden border bg-zinc-900/90"
      style={{ borderColor: color + '60' }}
    >
      <View className="p-3 items-center">
        <View 
          style={{ backgroundColor: color + '20' }} 
          className="w-10 h-10 rounded-xl items-center justify-center mb-2"
        >
          <Icon size={22} color={color} strokeWidth={2.5} />
        </View>
        <Text style={{ color }} className="text-3xl font-black">{value}</Text>
        <Text className="text-white text-[10px] font-bold uppercase tracking-wide mt-0.5">{label}</Text>
        {subtitle && (
          <Text className="text-gray-500 text-[9px] mt-0.5">{subtitle}</Text>
        )}
      </View>
      <View style={{ backgroundColor: color }} className="h-1 opacity-70" />
    </View>
  </View>
);

// --- Super Card del Mecánico ---
interface TareaCardProps {
  tarea: any;
  onVerDetalle: () => void;
  onIniciar: () => void;
  onPausar: () => void;
  onFinalizar: () => void;
  onChecklist: () => void;
}

const TareaCard = ({ tarea, onVerDetalle, onIniciar, onPausar, onFinalizar, onChecklist }: TareaCardProps) => {
  // Estados de solicitud: 'pendiente_inicio' | 'en_progreso' | 'pausada' | 'finalizada'
  const isInProgress = tarea.estado === 'en_progreso';
  const isPendiente = tarea.estado === 'pendiente_inicio' || tarea.estado === 'pausada';
  const hasChecklist = !!tarea.reporteMecanico;
  
  // Color del borde según estado
  const getBorderColor = () => {
    if (isInProgress) return COLUMN_COLORS.enProceso;
    return COLUMN_COLORS.asignadas;
  };

  // Calcular tiempo trabajado
  const calcularTiempo = () => {
    if (!tarea.fechaInicioTrabajo) return '0:00';
    const inicio = new Date(tarea.fechaInicioTrabajo);
    const fin = tarea.fechaFinTrabajo ? new Date(tarea.fechaFinTrabajo) : new Date();
    const diffMs = fin.getTime() - inicio.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const restMins = mins % 60;
    return `${hrs}:${restMins.toString().padStart(2, '0')}`;
  };

  // Prioridad visual
  const getPrioridadInfo = () => {
    switch (tarea.prioridad) {
      case 1: return { label: 'URGENTE', color: '#ef4444', bg: 'bg-red-500/20' };
      case 2: return { label: 'MEDIA', color: '#eab308', bg: 'bg-yellow-500/20' };
      default: return { label: 'NORMAL', color: '#10b981', bg: 'bg-emerald-500/20' };
    }
  };
  const prioridad = getPrioridadInfo();

  return (
    <View 
      className="mb-4 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800"
      style={Platform.select({
        web: { boxShadow: '0 8px 24px rgba(0,0,0,0.4)' } as any,
        default: {}
      })}
    >
      {/* Borde lateral de estado */}
      <View 
        style={{ backgroundColor: getBorderColor() }} 
        className="absolute left-0 top-0 bottom-0 w-1.5"
      />
      
      {/* HEADER: Patente + Tipo + Prioridad */}
      <View className="p-4 pl-5 border-b border-zinc-800">
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            {/* Patente Grande */}
            <View className="flex-row items-center">
              <Truck size={18} color="#60A5FA" strokeWidth={2} />
              <Text className="text-white text-2xl font-black ml-2 tracking-tight">
                {tarea.numeroPatente || 'S/P'}
              </Text>
            </View>
            
            {/* Modelo y Tipo */}
            <Text className="text-gray-400 text-xs mt-1">
              {tarea.modelo || 'Modelo N/D'} • <Text className="text-primary">{tarea.tipo || 'Servicio General'}</Text>
            </Text>
          </View>
          
          {/* Badge Prioridad */}
          <View className={`px-3 py-1.5 rounded-lg ${prioridad.bg} border`} style={{ borderColor: prioridad.color + '40' }}>
            <Text style={{ color: prioridad.color }} className="text-[10px] font-black">{prioridad.label}</Text>
          </View>
        </View>
        
        {/* Cronómetro si está en progreso */}
        {isInProgress && (
          <View className="flex-row items-center mt-3 bg-yellow-500/10 rounded-xl px-3 py-2 border border-yellow-500/30">
            <Timer size={16} color="#eab308" strokeWidth={2.5} />
            <Text className="text-yellow-500 text-lg font-black ml-2 font-mono">{calcularTiempo()}</Text>
            <Text className="text-yellow-500/60 text-xs ml-2">trabajando</Text>
          </View>
        )}
      </View>

      {/* BODY: Descripción y Detalles */}
      <View className="p-4 pl-5">
        {/* Descripción del trabajo */}
        <Text className="text-gray-300 text-sm mb-3" numberOfLines={2}>
          {tarea.descripcion || tarea.comentariosChofer || 'Sin descripción del trabajo'}
        </Text>
        
        {/* Chips de Info */}
        <View className="flex-row flex-wrap gap-2 mb-4">
          <View className="flex-row items-center bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-700">
            <Calendar size={12} color="#888" />
            <Text className="text-gray-400 text-[10px] ml-1">
              {new Date(tarea.fechaReparacion || tarea.fechaCreacion).toLocaleDateString('es-AR')}
            </Text>
          </View>
          
          {tarea.horaReparacion && (
            <View className="flex-row items-center bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-700">
              <Clock size={12} color="#888" />
              <Text className="text-gray-400 text-[10px] ml-1">{tarea.horaReparacion}</Text>
            </View>
          )}
          
          {tarea.chofer && (
            <View className="flex-row items-center bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-700">
              <Text className="text-gray-400 text-[10px]">Chofer: {tarea.chofer}</Text>
            </View>
          )}
        </View>

        {/* Indicador de Checklist */}
        {hasChecklist && (
          <View className="flex-row items-center bg-emerald-500/10 rounded-xl px-3 py-2 mb-3 border border-emerald-500/30">
            <ClipboardCheck size={16} color="#10b981" strokeWidth={2.5} />
            <Text className="text-emerald-500 text-xs font-bold ml-2">Inspección Técnica Realizada</Text>
          </View>
        )}
      </View>

      {/* FOOTER: Botones de Acción */}
      <View className="p-4 pt-0 pl-5">
        {/* Fila 1: Ver Detalle + Checklist */}
        <View className="flex-row space-x-2 mb-2">
          <TouchableOpacity 
            onPress={onVerDetalle}
            className="flex-1 flex-row items-center justify-center bg-zinc-800 py-3 rounded-xl border border-zinc-700"
          >
            <Eye size={16} color="#FFF" strokeWidth={2} />
            <Text className="text-white text-xs font-semibold ml-2">Ver Detalle</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={onChecklist}
            className="flex-1 flex-row items-center justify-center py-3 rounded-xl border"
            style={{ 
              backgroundColor: hasChecklist ? '#10b98115' : '#3b82f615',
              borderColor: hasChecklist ? '#10b98140' : '#3b82f640'
            }}
          >
            <ClipboardCheck size={16} color={hasChecklist ? '#10b981' : '#3b82f6'} strokeWidth={2} />
            <Text 
              className="text-xs font-bold ml-2"
              style={{ color: hasChecklist ? '#10b981' : '#3b82f6' }}
            >
              {hasChecklist ? 'Ver Inspección' : 'Inspeccionar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Fila 2: Play/Pause + Finalizar */}
        <View className="flex-row space-x-2">
          {isPendiente ? (
            <TouchableOpacity 
              onPress={onIniciar}
              className="flex-1 flex-row items-center justify-center bg-blue-600 py-4 rounded-xl"
              style={Platform.select({
                web: { boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)' } as any,
                default: {}
              })}
            >
              <Play size={20} color="#FFF" strokeWidth={2.5} fill="#FFF" />
              <Text className="text-white text-sm font-black ml-2 uppercase">Iniciar Reparación</Text>
            </TouchableOpacity>
          ) : isInProgress ? (
            <>
              <TouchableOpacity 
                onPress={onPausar}
                className="flex-1 flex-row items-center justify-center bg-yellow-500 py-4 rounded-xl"
              >
                <Pause size={20} color="#000" strokeWidth={2.5} />
                <Text className="text-black text-sm font-black ml-2 uppercase">Pausar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={onFinalizar}
                disabled={!hasChecklist}
                className={`flex-1 flex-row items-center justify-center py-4 rounded-xl ${hasChecklist ? 'bg-emerald-600' : 'bg-zinc-700'}`}
                style={hasChecklist ? Platform.select({
                  web: { boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' } as any,
                  default: {}
                }) : {}}
              >
                <CheckCircle2 size={20} color={hasChecklist ? '#FFF' : '#666'} strokeWidth={2.5} />
                <Text className={`text-sm font-black ml-2 uppercase ${hasChecklist ? 'text-white' : 'text-gray-500'}`}>
                  Finalizar
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
        
        {/* Mensaje si falta checklist para finalizar */}
        {isInProgress && !hasChecklist && (
          <View className="flex-row items-center justify-center mt-2">
            <AlertTriangle size={12} color="#eab308" />
            <Text className="text-yellow-500 text-[10px] ml-1">Realiza la inspección técnica para poder finalizar</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// --- DASHBOARD PRINCIPAL ---
const MecanicoDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  
  // Obtener usuario actual y solicitudes del store
  const user = useSelector((state: RootState) => state.login.user);
  const solicitudes = useSelector((state: RootState) => state.solicitudes.solicitudes);
  const [loading, setLoading] = useState(false);
  const globalLoading = useGlobalLoading();
  
  // Modal state
  const [selectedTarea, setSelectedTarea] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Suscripción en tiempo real a SOLICITUDES (no turnos)
  useEffect(() => {
    let unsubscribe: () => void;
    
    if (user?.id) {
      // Filtrar por mecánico asignado si tenemos ID
      unsubscribe = suscribirseASolicitudesMecanico(user.id, (data) => {
        dispatch(setSolicitudes(data));
      });
    } else {
      // Fallback: mostrar todas las solicitudes (pool general)
      unsubscribe = suscribirseATodasSolicitudes((data) => {
        dispatch(setSolicitudes(data));
      });
    }
    
    return () => unsubscribe && unsubscribe();
  }, [dispatch, user?.id]);

  // Filtrar tareas según estado de SOLICITUD
  const tareasAsignadas = solicitudes.filter(s => s.estado === 'pendiente_inicio' || s.estado === 'pausada');
  const tareasEnProceso = solicitudes.filter(s => s.estado === 'en_progreso');
  const tareasFinalizadasHoy = solicitudes.filter(s => {
    if (s.estado !== 'finalizada') return false;
    if (!s.fechaFinTrabajo) return false;
    const hoy = new Date().toDateString();
    return new Date(s.fechaFinTrabajo).toDateString() === hoy;
  });

  // Todas las tareas activas (pendientes + en progreso)
  const tareasActivas = [...tareasEnProceso, ...tareasAsignadas];

  // Handlers - Ahora actualizan SOLICITUDES
  const handleIniciarTarea = async (solicitudId: string, turnoId?: string) => {
    setLoading(true);
    globalLoading.show('Iniciando reparación...');
    try {
      const now = new Date().toISOString();
      
      // Actualizar la solicitud
      await actualizarSolicitudService(solicitudId, { 
        estado: 'en_progreso',
        fechaInicioTrabajo: now
      });
      
      // También actualizar el turno original si existe
      if (turnoId) {
        await actualizarTurnoService(turnoId, { 
          estado: 'in_progress',
          fechaInicioTrabajo: now
        });
      }
      
      dispatch(actualizarSolicitud({ 
        id: solicitudId, 
        estado: 'en_progreso',
        fechaInicioTrabajo: now
      }));
    } catch (error) {
      console.error('Error iniciando tarea:', error);
      CustomAlert.alert('Error', 'No se pudo iniciar la tarea');
    } finally {
      setLoading(false);
      globalLoading.hide();
    }
  };

  const handlePausarTarea = async (solicitudId: string) => {
    setLoading(true);
    globalLoading.show('Pausando...');
    try {
      await actualizarSolicitudService(solicitudId, { estado: 'pausada' });
      dispatch(actualizarSolicitud({ id: solicitudId, estado: 'pausada' }));
    } catch (error) {
      console.error('Error pausando tarea:', error);
    } finally {
      setLoading(false);
      globalLoading.hide();
    }
  };

  const handleFinalizarTarea = async (solicitudId: string, turnoId?: string) => {
    CustomAlert.alert('Confirmar Finalización', '¿Estás seguro de que completaste la reparación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Finalizar',
        onPress: async () => {
          setLoading(true);
          globalLoading.show('Finalizando...');
          try {
            const now = new Date().toISOString();
            
            // Actualizar solicitud
            await actualizarSolicitudService(solicitudId, { 
              estado: 'finalizada',
              fechaFinTrabajo: now
            });
            
            // También marcar el turno como completado
            if (turnoId) {
              await actualizarTurnoService(turnoId, { 
                estado: 'completed',
                fechaFinTrabajo: now
              });
            }
            
            dispatch(actualizarSolicitud({ 
              id: solicitudId, 
              estado: 'finalizada',
              fechaFinTrabajo: now
            }));
            CustomAlert.alert('¡Completado!', 'Excelente trabajo 💪');
          } catch (error) {
            console.error('Error finalizando tarea:', error);
            CustomAlert.alert('Error', 'No se pudo finalizar la tarea');
          } finally {
            setLoading(false);
            globalLoading.hide();
          }
        },
      },
    ]);
  };

  const handleVerDetalle = (tarea: any) => {
    setSelectedTarea(tarea);
    setModalVisible(true);
  };

  const handleChecklist = (tarea: any) => {
    router.push({ 
      pathname: '/checklist-mecanico', 
      params: { 
        solicitudId: tarea.id,
        turnoId: tarea.turnoId,
        numeroPatente: tarea.numeroPatente 
      } 
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <LinearGradient colors={['#0a0a0a', '#000']} className="flex-1">
        {loading && <LoadingOverlay message="Procesando..." />}
        
        <ScrollView 
          className="flex-1 px-4" 
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View className="flex-row justify-between items-start mb-6">
            <View>
              <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[4px]">Workshop Mode</Text>
              <Text className="text-white text-3xl font-black">MI TALLER</Text>
              <Text className="text-gray-500 text-xs mt-1">Bienvenido, Mecánico</Text>
            </View>
            
            <View className="flex-row items-center">
              {/* Live indicator */}
              <View className="flex-row items-center bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 mr-3">
                <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                <Text className="text-emerald-500 text-[10px] font-bold">CONECTADO</Text>
              </View>
              
              {onLogout && (
                <TouchableOpacity 
                  onPress={onLogout} 
                  className="rounded-xl p-2.5 bg-red-500/10 border border-red-500/30"
                >
                  <LogOut size={18} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* KPIs */}
          <View className="flex-row mb-6 -mx-1">
            <KpiCard
              label="Asignadas"
              subtitle="En cola"
              value={tareasAsignadas.length}
              color={COLUMN_COLORS.asignadas}
              icon={Clock}
            />
            <KpiCard
              label="En Proceso"
              subtitle="Trabajando"
              value={tareasEnProceso.length}
              color={COLUMN_COLORS.enProceso}
              icon={Wrench}
            />
            <KpiCard
              label="Finalizadas"
              subtitle="Hoy"
              value={tareasFinalizadasHoy.length}
              color={COLUMN_COLORS.finalizadas}
              icon={CheckCircle2}
            />
          </View>

          {/* LISTA DE TAREAS */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <Sparkles size={16} color="#3b82f6" />
              <Text className="text-white text-lg font-bold ml-2">Mis Tareas Activas</Text>
              <View className="ml-auto bg-zinc-800 px-3 py-1 rounded-lg">
                <Text className="text-gray-400 text-xs">{tareasActivas.length} pendientes</Text>
              </View>
            </View>

            {tareasActivas.length === 0 ? (
              <View className="items-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                <CheckCircle2 size={48} color="#10b981" strokeWidth={1.5} />
                <Text className="text-white text-lg font-bold mt-4">¡Todas las tareas completadas!</Text>
                <Text className="text-gray-500 text-sm mt-2">Descansa, has hecho un excelente trabajo 💪</Text>
              </View>
            ) : (
              tareasActivas.map((tarea) => (
                <TareaCard
                  key={tarea.id}
                  tarea={tarea}
                  onVerDetalle={() => handleVerDetalle(tarea)}
                  onIniciar={() => handleIniciarTarea(tarea.id, tarea.turnoId)}
                  onPausar={() => handlePausarTarea(tarea.id)}
                  onFinalizar={() => handleFinalizarTarea(tarea.id, tarea.turnoId)}
                  onChecklist={() => handleChecklist(tarea)}
                />
              ))
            )}
          </View>

          {/* SECCIÓN: Finalizadas Hoy */}
          {tareasFinalizadasHoy.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <CheckCircle2 size={16} color="#10b981" />
                <Text className="text-white text-lg font-bold ml-2">Finalizadas Hoy</Text>
              </View>
              
              {tareasFinalizadasHoy.map((tarea) => (
                <TouchableOpacity 
                  key={tarea.id}
                  onPress={() => handleVerDetalle(tarea)}
                  className="flex-row items-center bg-zinc-900/50 rounded-xl p-4 mb-2 border border-zinc-800"
                >
                  <View className="w-1 h-12 bg-emerald-500 rounded-full mr-3" />
                  <View className="flex-1">
                    <Text className="text-white font-bold">{tarea.numeroPatente}</Text>
                    <Text className="text-gray-500 text-xs">{tarea.descripcion || tarea.tipo}</Text>
                  </View>
                  <ChevronRight size={18} color="#666" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* NOVEDADES */}
          <View className="mb-6">
            <View className="flex-row items-center bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
              <View className="w-12 h-12 rounded-xl bg-blue-500/20 items-center justify-center mr-4">
                <Info size={24} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold">Sistema Actualizado</Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  Ahora puedes ver fotos del daño reportado en "Ver Detalle"
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Modal de Detalle */}
      <TurnoDetailModal
        visible={modalVisible}
        turno={selectedTarea}
        onClose={() => { setModalVisible(false); setSelectedTarea(null); }}
        readOnly={true}
      />
    </SafeAreaView>
  );
};

export default MecanicoDashboard;
