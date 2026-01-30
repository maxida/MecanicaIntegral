import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, SafeAreaView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Droplet, Disc, Battery, Lightbulb, CircleDot, Image as LucideImage,
  Info, X, Gauge, Wrench, FileCheck, Calendar, Clock, Hash, AlertTriangle, CheckCircle, ArrowRight
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp } from 'react-native-reanimated';

// --- CONFIGURACIÓN Y MAPAS ---
const SINTOMAS_MAP: Record<string, { label: string, Icon: any, color: string }> = {
  aceite: { label: 'Nivel/Presión Aceite', Icon: Droplet, color: '#EF4444' },
  fuga: { label: 'Fuga Detectada', Icon: Droplet, color: '#EF4444' },
  frenos: { label: 'Sistema de Frenos', Icon: Disc, color: '#EF4444' },
  freno_largo: { label: 'Freno Largo', Icon: Disc, color: '#F59E0B' },
  vibracion: { label: 'Vibración Anormal', Icon: Gauge, color: '#F59E0B' },
  luz_quemada: { label: 'Luces Quemadas', Icon: Lightbulb, color: '#EAB308' },
  humo: { label: 'Humo o Mal Olor', Icon: Info, color: '#EF4444' },
  aire_ac: { label: 'Falla A/A', Icon: Info, color: '#3B82F6' },
  bateria: { label: 'Batería/Arranque', Icon: Battery, color: '#EAB308' },
  neumaticos: { label: 'Neumáticos/Presión', Icon: CircleDot, color: '#EF4444' },
  vidrios: { label: 'Parabrisas/Vidrios', Icon: LucideImage, color: '#3B82F6' },
  ruido_motor: { label: 'Ruido en Motor', Icon: Wrench, color: '#EF4444' },
  freno_mano: { label: 'Freno de Mano', Icon: Disc, color: '#EAB308' },
  cubiertas_dano: { label: 'Daño en Cubierta', Icon: CircleDot, color: '#EF4444' },
  luces_traseras: { label: 'Luces Traseras', Icon: Lightbulb, color: '#EF4444' },
  tablero: { label: 'Falla en Tablero', Icon: Gauge, color: '#F59E0B' },
  limpiaparabrisas: { label: 'Limpiaparabrisas', Icon: Droplet, color: '#3B82F6' },
  refrigerante: { label: 'Nivel Refrigerante', Icon: Droplet, color: '#EF4444' },
};

type TurnoEstado = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'pending_triage' | 'en_viaje';

interface TurnoDetailModalProps {
  visible: boolean;
  turno: any;
  onClose: () => void;
  readOnly?: boolean;
  adminContext?: boolean;
}

const TurnoDetailModal = ({ visible, turno, onClose, readOnly = false, adminContext = false }: TurnoDetailModalProps) => {
  const router = useRouter();

  if (!turno) return null;

  // --- HELPER DE FECHAS ROBUSTO ---
  const parseDate = (dateInput: any): Date | null => {
    if (!dateInput) return null;
    // Caso 1: Es un objeto Timestamp de Firestore (tiene toDate)
    if (typeof dateInput.toDate === 'function') {
      return dateInput.toDate();
    }
    // Caso 2: Es un objeto con seconds (Timestamp serializado)
    if (dateInput.seconds) {
      return new Date(dateInput.seconds * 1000);
    }
    // Caso 3: Es un string o número
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) return d;

    return null;
  };

  const formatDate = (d: Date | null) => d ? d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '--/--';
  const formatTime = (d: Date | null) => d ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

  // --- DATOS DEL VIAJE ---

  // Salida
  const fechaSalida = parseDate(turno.fechaSalida || turno.fechaCreacion); // Fallback a creación si no hay salida explícita
  const kmSalida = Number(turno.kilometrajeSalida || 0);
  const naftaSalida = Number(turno.nivelNaftaSalida || 0);
  const fotoSalida = turno.fotoTableroSalida;

  // Llegada (Ingreso)
  const fechaIngreso = parseDate(turno.fechaIngreso);
  const kmIngreso = Number(turno.kilometrajeIngreso || 0);
  const naftaIngreso = Number(turno.nivelNaftaIngreso || 0);
  const fotoIngreso = turno.fotoTableroIngreso;

  // Deltas (Solo si el viaje está cerrado o tiene datos de ingreso)
  const isViajeCerrado = !!fechaIngreso;
  const kmRecorridos = isViajeCerrado ? (kmIngreso - kmSalida) : 0;

  // Estado y Alertas
  const isAlert = turno.estadoGeneral === 'alert' || (turno.sintomas && turno.sintomas.length > 0);
  const turnoEstado: TurnoEstado = turno.estado || 'pending';

  // Helpers de estado para botones
  const isPending = turnoEstado === 'pending' || turnoEstado === 'pending_triage';
  const isScheduled = turnoEstado === 'scheduled';
  const isInProgress = turnoEstado === 'in_progress';
  const isCompleted = turnoEstado === 'completed';

  // --- RENDER ACCIONES ---
  const renderFooterActions = () => {
    if (readOnly) {
      return (
        <TouchableOpacity onPress={onClose} className="bg-zinc-800 py-4 rounded-xl items-center border border-zinc-700 w-full">
          <Text className="text-white font-bold uppercase">Cerrar</Text>
        </TouchableOpacity>
      );
    }

    if (adminContext) {
      return (
        <View className="flex-col md:flex-row gap-3 w-full">
          <TouchableOpacity onPress={onClose} className="flex-1 bg-zinc-800 py-4 rounded-xl items-center border border-zinc-700">
            <Text className="text-gray-400 font-bold uppercase text-xs">Volver</Text>
          </TouchableOpacity>

          {(isPending || isScheduled) && (
            <TouchableOpacity
              onPress={() => {
                onClose();
                router.push({ pathname: '/solicitud', params: { prefillData: JSON.stringify(turno) } });
              }}
              className="flex-[2] bg-red-600 py-4 rounded-xl flex-row items-center justify-center shadow-lg shadow-red-900/40"
            >
              <Wrench size={18} color="#FFF" />
              <Text className="text-white font-black text-xs uppercase ml-2">Gestionar Mantenimiento</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <TouchableOpacity onPress={onClose} className="bg-white/10 py-4 rounded-xl items-center w-full border border-white/10">
        <Text className="text-white font-bold uppercase">Cerrar Detalle</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/85 justify-center items-center p-2 md:p-6">
        {Platform.OS === 'ios' && <BlurView intensity={30} tint="dark" style={{ position: 'absolute', width: '100%', height: '100%' }} />}

        <Animated.View
          entering={FadeInUp.springify().damping(20)}
          className="w-full h-full md:w-[900px] md:h-[90%] bg-[#09090b] md:rounded-[32px] border border-white/10 overflow-hidden shadow-2xl flex-1"
        >
          <SafeAreaView className="flex-1">

            {/* HEADER */}
            <View className={`px-6 py-5 border-b border-white/5 flex-row justify-between items-start ${isAlert ? 'bg-red-500/5' : 'bg-emerald-500/5'}`}>
              <View>
                <View className="flex-row items-center space-x-2 mb-1.5">
                  {isAlert ? <AlertTriangle size={16} color="#EF4444" /> : <CheckCircle size={16} color="#10B981" />}
                  <Text className={`text-[10px] font-black uppercase tracking-[2px] ${isAlert ? 'text-red-500' : 'text-emerald-500'}`}>
                    {isAlert ? 'REPORTE CON NOVEDADES' : 'OPERATIVO NORMAL'}
                  </Text>
                </View>
                <Text className="text-white text-4xl font-black italic tracking-tighter">{turno.numeroPatente}</Text>
                <Text className="text-zinc-500 text-xs mt-1 font-bold uppercase tracking-widest">CHOFER: {turno.chofer || 'S/D'}</Text>
              </View>

              <View className="items-end">
                <TouchableOpacity onPress={onClose} className="bg-white/5 p-2 rounded-full mb-3 hover:bg-white/10">
                  <X color="white" size={20} />
                </TouchableOpacity>
                <View className="flex-row items-center bg-zinc-900 px-3 py-1.5 rounded-full border border-white/5">
                  <Hash size={12} color="#666" />
                  <Text className="text-zinc-500 text-[10px] ml-1 font-mono">ID: {turno.id?.slice(0, 6).toUpperCase()}</Text>
                </View>
              </View>
            </View>

            {/* BODY SCROLLABLE */}
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>

              {/* BLOQUE 1: COMPARATIVA DE VIAJE (SALIDA vs LLEGADA) */}
              <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Resumen del Viaje</Text>

              <View className="flex-row gap-2 mb-8 h-auto min-h-[140px]">

                {/* CARD SALIDA */}
                <View className="flex-1 bg-zinc-900/50 rounded-2xl border border-white/5 p-4 justify-between relative overflow-hidden">
                  <View className="absolute top-0 right-0 p-3 opacity-10">
                    <ArrowRight size={80} color="white" />
                  </View>
                  <View>
                    <Text className="text-emerald-500 text-[10px] font-bold uppercase mb-1">SALIDA</Text>
                    <Text className="text-white text-lg font-bold">{formatDate(fechaSalida)}</Text>
                    <Text className="text-zinc-500 text-xs">{formatTime(fechaSalida)} hs</Text>
                  </View>
                  <View>
                    <Text className="text-zinc-400 text-[9px] uppercase font-bold mb-0.5">ODÓMETRO</Text>
                    <Text className="text-white text-xl font-mono">{kmSalida.toLocaleString()} km</Text>
                  </View>
                  <View className="mt-2">
                    <Text className="text-zinc-400 text-[9px] uppercase font-bold mb-0.5">TANQUE</Text>
                    <Text className="text-white text-sm font-mono">{naftaSalida}%</Text>
                  </View>
                </View>

                {/* CARD LLEGADA */}
                <View className="flex-1 bg-zinc-900/50 rounded-2xl border border-white/5 p-4 justify-between relative overflow-hidden">
                  {/* Si no llegó, mostramos estado */}
                  {!isViajeCerrado ? (
                    <View className="flex-1 items-center justify-center">
                      <Clock size={32} color="#F59E0B" />
                      <Text className="text-yellow-500 text-xs font-bold mt-2 uppercase">EN VIAJE</Text>
                    </View>
                  ) : (
                    <>
                      <View className="absolute top-0 right-0 p-3 opacity-10">
                        <CheckCircle size={80} color="white" />
                      </View>
                      <View>
                        <Text className="text-blue-500 text-[10px] font-bold uppercase mb-1">INGRESO</Text>
                        <Text className="text-white text-lg font-bold">{formatDate(fechaIngreso)}</Text>
                        <Text className="text-zinc-500 text-xs">{formatTime(fechaIngreso)} hs</Text>
                      </View>
                      <View>
                        <Text className="text-zinc-400 text-[9px] uppercase font-bold mb-0.5">ODÓMETRO</Text>
                        <Text className="text-white text-xl font-mono">{kmIngreso.toLocaleString()} km</Text>
                      </View>
                      <View className="mt-2">
                        <Text className="text-zinc-400 text-[9px] uppercase font-bold mb-0.5">TANQUE</Text>
                        <Text className="text-white text-sm font-mono">{naftaIngreso}%</Text>
                      </View>
                    </>
                  )}
                </View>

              </View>

              {/* BLOQUE 2: EVIDENCIA FOTOGRÁFICA (COMPARATIVA) */}
              <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Evidencia de Tablero</Text>

              <View className="flex-row gap-4 mb-8">
                {/* FOTO SALIDA */}
                <View className="flex-1 aspect-video bg-black rounded-xl overflow-hidden border border-white/10 relative">
                  {fotoSalida ? (
                    <Image source={{ uri: fotoSalida }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <View className="flex-1 items-center justify-center"><LucideImage size={24} color="#333" /><Text className="text-zinc-700 text-[9px] mt-1">SIN FOTO</Text></View>
                  )}
                  <View className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded border border-white/10">
                    <Text className="text-white text-[8px] font-bold">SALIDA</Text>
                  </View>
                </View>

                {/* FOTO LLEGADA */}
                <View className="flex-1 aspect-video bg-black rounded-xl overflow-hidden border border-white/10 relative">
                  {fotoIngreso ? (
                    <Image source={{ uri: fotoIngreso }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <View className="flex-1 items-center justify-center"><LucideImage size={24} color="#333" /><Text className="text-zinc-700 text-[9px] mt-1">PENDIENTE</Text></View>
                  )}
                  <View className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded border border-white/10">
                    <Text className="text-white text-[8px] font-bold">LLEGADA</Text>
                  </View>
                </View>
              </View>

              {/* BLOQUE 3: OBSERVACIONES Y SÍNTOMAS */}
              {isAlert && (
                <>
                  <Text className="text-red-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Novedades Reportadas</Text>
                  <View className="flex-row flex-wrap gap-2 mb-6">
                    {turno.sintomas?.map((sId: string) => {
                      const sData = SINTOMAS_MAP[sId] || { label: sId, Icon: AlertTriangle, color: '#fff' };
                      return (
                        <View key={sId} className="bg-red-500/10 border border-red-500/30 pl-2 pr-3 py-1.5 rounded-lg flex-row items-center">
                          <sData.Icon size={14} color={sData.color} />
                          <Text className="text-red-200 text-xs font-bold ml-2">{sData.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Comentarios del Chofer</Text>
              <View className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 min-h-[80px]">
                <Text className="text-zinc-300 text-sm leading-6 italic">
                  "{turno.comentariosChofer || turno.descripcion || 'Sin comentarios adicionales.'}"
                </Text>
              </View>

            </ScrollView>

            {/* FOOTER */}
            <View className="p-6 border-t border-white/5 bg-[#09090b]">
              {renderFooterActions()}
            </View>

          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default TurnoDetailModal;