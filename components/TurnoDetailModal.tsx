import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Droplet, Disc, Battery, Lightbulb, CircleDot, Image as LucideImage, Info, X, Gauge, Wrench, FileCheck, ArrowRight } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import UniversalImage from '@/components/UniversalImage';

// Diccionario para convertir los IDs de síntomas en algo visual para el Admin
const SINTOMAS_MAP: Record<string, { label: string, Icon: any, color: string }> = {
  aceite: { label: 'Aceite', Icon: Droplet, color: '#60A5FA' },
  fuga: { label: 'Fugas', Icon: Droplet, color: '#FF4C4C' },
  frenos: { label: 'Frenos', Icon: Disc, color: '#FF4C4C' },
  freno_largo: { label: 'Freno Largo', Icon: Disc, color: '#FF4C4C' },
  vibracion: { label: 'Vibración', Icon: Gauge, color: '#60A5FA' },
  luz_quemada: { label: 'Luces', Icon: Lightbulb, color: '#FACC15' },
  humo: { label: 'Humo/Olor', Icon: Info, color: '#FF4C4C' },
  aire_ac: { label: 'Falla A/A', Icon: Info, color: '#60A5FA' },
  bateria: { label: 'Batería', Icon: Battery, color: '#FACC15' },
  neumaticos: { label: 'Neumáticos', Icon: CircleDot, color: '#60A5FA' },
  vidrios: { label: 'Vidrios', Icon: LucideImage, color: '#60A5FA' },
  ruido_motor: { label: 'Ruido Motor', Icon: Wrench, color: '#FF4C4C' },
  freno_mano: { label: 'Freno de Mano', Icon: Disc, color: '#FACC15' },
  cubiertas_dano: { label: 'Daño Cubiertas', Icon: CircleDot, color: '#FF4C4C' },
  luces_traseras: { label: 'Luces Traseras', Icon: Lightbulb, color: '#FACC15' },
  tablero: { label: 'Tablero', Icon: Gauge, color: '#60A5FA' },
  limpiaparabrisas: { label: 'Limpiaparabrisas', Icon: Droplet, color: '#60A5FA' },
  refrigerante: { label: 'Refrigerante', Icon: Droplet, color: '#60A5FA' },
};

// Tipos de estado del turno
type TurnoEstado = 'pending' | 'scheduled' | 'in_progress' | 'completed';

interface TurnoDetailModalProps {
  visible: boolean;
  turno: any;
  onClose: () => void;
  onAction?: () => void;
  readOnly?: boolean;
  // Contexto del Admin: permite acciones contextuales según estado
  adminContext?: boolean;
}

const TurnoDetailModal = ({ visible, turno, onClose, onAction, readOnly = false, adminContext = false }: TurnoDetailModalProps) => {
  const router = useRouter();
  const evidenceUrl = turno?.fotoTablero
    || turno?.evidenceUrl
    || turno?.photoUrl
    || turno?.dashboardPhoto
    || turno?.imageUrl
    || turno?.checklistPhotoURL
    || turno?.foto?.url
    || null;

  useEffect(() => {
    if (visible) {
      console.log('Foto recibida:', turno);
    }
  }, [visible, turno]);

  if (!turno) return null;
  const isAlert = turno.estadoGeneral === 'alert';
  
  // Determinar el estado actual del turno
  const turnoEstado: TurnoEstado = turno.estado || 'pending';
  const isPending = turnoEstado === 'pending' || turnoEstado === 'scheduled';
  const isInProgress = turnoEstado === 'in_progress';
  const isCompleted = turnoEstado === 'completed';

  // utility para capitalizar palabras
  const capitalize = (s: string) => s?.toString().split(/[_\s-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  // Renderizar botones de acción según el contexto y estado
  const renderActionButtons = () => {
    // Si es contexto Admin, mostrar botones contextuales según estado
    if (adminContext) {
      return (
        <View className="flex-row gap-3">
          {/* Botón Cerrar siempre visible */}
          <TouchableOpacity 
            onPress={onClose} 
            className="flex-1 bg-zinc-800 py-4 rounded-2xl items-center border border-zinc-700"
          >
            <Text className="text-gray-400 font-bold uppercase text-xs">Cerrar</Text>
          </TouchableOpacity>
          
          {/* Botón Principal Contextual */}
          {isPending && (
            <TouchableOpacity 
              onPress={() => {
                router.push({ pathname: '/solicitud', params: { prefillData: JSON.stringify(turno) } });
                onClose();
              }}
              className="flex-[2] bg-red-600 py-4 rounded-2xl items-center flex-row justify-center"
              style={{ shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 }}
            >
              <Wrench size={18} color="#FFF" strokeWidth={2.5} />
              <Text className="text-white font-black text-xs uppercase ml-2">Derivar a Mecánico</Text>
              <ArrowRight size={16} color="#FFF" strokeWidth={2.5} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}
          
          {isInProgress && (
            <TouchableOpacity 
              onPress={() => {
                // Ver orden de trabajo actual
                router.push({ pathname: '/solicitud', params: { turnoId: turno.id, viewMode: 'true' } });
                onClose();
              }}
              className="flex-[2] bg-yellow-500 py-4 rounded-2xl items-center flex-row justify-center"
            >
              <FileCheck size={18} color="#000" strokeWidth={2.5} />
              <Text className="text-black font-black text-xs uppercase ml-2">Ver Orden de Trabajo</Text>
            </TouchableOpacity>
          )}
          
          {isCompleted && (
            <TouchableOpacity 
              onPress={() => {
                // Ver historial o cerrar
                onClose();
              }}
              className="flex-[2] bg-emerald-600 py-4 rounded-2xl items-center flex-row justify-center"
            >
              <FileCheck size={18} color="#FFF" strokeWidth={2.5} />
              <Text className="text-white font-black text-xs uppercase ml-2">Ver Historial</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    
    // Comportamiento por defecto (no Admin)
    return (
      <View className="flex-row gap-4">
        <TouchableOpacity onPress={onClose} className="flex-1 bg-white/5 py-5 rounded-2xl items-center">
          <Text className="text-gray-500 font-bold uppercase text-[10px]">Cerrar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => {
            router.push({ pathname: '/solicitud', params: { prefillData: JSON.stringify(turno) } });
            onClose();
          }}
          className="flex-[2] bg-danger py-5 rounded-2xl items-center shadow-lg shadow-danger/40"
        >
          <Text className="text-white font-black text-xs uppercase italic">Derivar a Reparación</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/95 justify-center items-center">
        <Animated.View 
          entering={FadeIn.duration(300)}
          className="w-full h-full monitor:w-[950px] monitor:h-[90%] bg-surface monitor:rounded-[40px] border border-white/10 overflow-hidden"
        >
          <SafeAreaView className="flex-1">
            
            {/* HEADER */}
                <View className="px-6 py-4 flex-row justify-between items-center border-b border-white/5 bg-black/40">
              <View>
                <View className="flex-row items-center">
                  <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px]">Expediente de Unidad</Text>
                  <View className={`ml-3 px-3 py-1 rounded-full ${isAlert ? 'bg-danger' : 'bg-success/20'}`}>
                    <Text className="text-[9px] font-black text-white">
                      {isAlert ? 'UNIDAD EN ALERTA' : 'UNIDAD OPERATIVA'}
                    </Text>
                  </View>
                </View>
                <Text className="text-white text-3xl font-black italic mt-1">
                  {turno.numeroPatente === "S/D" ? "PENDIENTE DE PATENTE" : turno.numeroPatente}
                </Text>
                <Text className="text-zinc-400 text-base mt-1">Chofer: {turno.chofer || 'No registrado'}</Text>
              </View>
                <TouchableOpacity onPress={onClose} className="bg-white/5 w-10 h-10 rounded-2xl items-center justify-center border border-white/10">
                  <X color="#FF4C4C" width={18} height={18} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
              
              {/* LAYOUT DE COLUMNAS CON GAP (ESPACIADO) */}
              <View className="flex-col monitor:flex-row monitor:space-x-12">
                
                {/* COLUMNA IZQUIERDA: FOTO Y SÍNTOMAS */}
                <View className="flex-1 mb-6 monitor:mb-0">
                  <Text className="text-primary text-[10px] font-black uppercase tracking-[2px] mb-2">Evidencia de Tablero</Text>
                  <View className="w-full h-56 rounded-xl overflow-hidden border border-white/10 bg-zinc-800 mb-3">
                    {evidenceUrl ? (
                      <UniversalImage uri={evidenceUrl} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
                    ) : (
                      <View className="flex-1 items-center justify-center bg-white/5">
                        <LucideImage color="#222" width={40} height={40} />
                      </View>
                    )}
                  </View>

                  <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[2px] mb-2">Síntomas Reportados</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {turno.sintomas?.length > 0 ? turno.sintomas.map((sId: string) => {
                      const sInfo = SINTOMAS_MAP[sId] || { label: sId, Icon: Info, color: '#888' };
                      const chipBg = isAlert ? 'bg-red-900/40' : 'bg-zinc-800';
                      return (
                        <View key={sId} className={`${chipBg} border border-zinc-700 px-3 py-1 rounded-full flex-row items-center`}>
                          {sInfo.Icon ? <sInfo.Icon color={sInfo.color} width={14} height={14} /> : <Info color={sInfo.color} width={14} height={14} />}
                          <Text className="text-white text-xs font-bold ml-2">{capitalize(sInfo.label)}</Text>
                        </View>
                      );
                    }) : (
                      <Text className="text-gray-700 italic text-xs">No se reportaron síntomas visuales.</Text>
                    )}
                  </View>
                </View>

                {/* COLUMNA DERECHA: DATOS DUROS */}
                <View className="flex-1">
                  <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[2px] mb-2">Telemetría de Ingreso</Text>
                  <View className="flex-row gap-3 mb-4">
                    <View className="flex-1 bg-card h-20 p-3 rounded-2xl border border-white/5 flex-row items-center">
                      <Gauge color="#60A5FA" width={20} height={20} />
                      <View className="ml-3">
                        <Text className="text-white text-2xl font-black">{Number(turno.kilometraje || 0).toLocaleString('es-ES')}</Text>
                        <Text className="text-gray-600 text-[10px] font-bold">KM TOTALES</Text>
                      </View>
                    </View>
                    <View className="flex-1 bg-card h-20 p-3 rounded-2xl border border-white/5 flex-row items-center">
                      <Droplet color="#4ADE80" width={18} height={18} />
                      <View className="ml-3">
                        <Text className="text-white text-2xl font-black">{turno.nivelNafta}%</Text>
                        <Text className="text-gray-600 text-[10px] font-bold">COMBUSTIBLE</Text>
                      </View>
                    </View>
                  </View>

                  <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[2px] mb-2">Notas del Chofer</Text>
                  <View className="min-h-[80px] p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50 mb-6">
                    <Text className="text-gray-300 text-sm leading-6 italic">
                      "{turno.comentariosChofer || turno.descripcion || 'Sin comentarios.'}"
                    </Text>
                  </View>
                </View>
              </View>

              <View className="h-40" />
            </ScrollView>

            {/* BOTONES DE ACCIÓN CONTEXTUALES */}
            {!readOnly && (
              <BlurView intensity={40} tint="dark" className="p-6 border-t border-white/10">
                {renderActionButtons()}
              </BlurView>
            )}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};
export default TurnoDetailModal;