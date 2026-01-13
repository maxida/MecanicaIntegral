import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

// Diccionario para convertir los IDs de síntomas en algo visual para el Admin
const SINTOMAS_MAP: Record<string, { label: string, icon: string, color: string }> = {
  ruido_motor: { label: 'Ruido Motor', icon: 'volume-up', color: '#FF4C4C' },
  tira_lado: { label: 'Tira a un lado', icon: 'alt-route', color: '#FACC15' },
  freno_largo: { label: 'Freno Largo', icon: 'stop-circle', color: '#FF4C4C' },
  vibracion: { label: 'Vibración', icon: 'vibration', color: '#60A5FA' },
  luz_quemada: { label: 'Luz Quemada', icon: 'lightbulb', color: '#FACC15' },
  humo: { label: 'Humo/Olor', icon: 'cloud', color: '#FF4C4C' },
  aire_ac: { label: 'Falla A/A', icon: 'ac-unit', color: '#60A5FA' },
};

const TurnoDetailModal = ({ visible, turno, onClose, onAction }: any) => {
  const router = useRouter();
  if (!turno) return null;
	const isAlert = turno.estadoGeneral === 'alert';

return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/95 justify-center items-center">
        <Animated.View 
          entering={FadeIn.duration(300)}
          className="w-full h-full monitor:w-[950px] monitor:h-[90%] bg-surface monitor:rounded-[40px] border border-white/10 overflow-hidden"
        >
          <SafeAreaView className="flex-1">
            
            {/* HEADER */}
            <View className="px-8 py-6 flex-row justify-between items-center border-b border-white/5 bg-black/40">
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
              </View>
                <TouchableOpacity onPress={onClose} className="bg-white/5 w-12 h-12 rounded-2xl items-center justify-center border border-white/10">
                <FontAwesome5 name="times" size={20} color="#FF4C4C" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-8 pt-8">
              
              {/* LAYOUT DE COLUMNAS CON GAP (ESPACIADO) */}
              <View className="flex-col monitor:flex-row monitor:space-x-12">
                
                {/* COLUMNA IZQUIERDA: FOTO Y SÍNTOMAS */}
                <View className="flex-1 mb-10 monitor:mb-0">
                  <Text className="text-primary text-[10px] font-black uppercase tracking-[2px] mb-4">Evidencia de Tablero</Text>
                  <View className="w-full h-72 bg-card rounded-[40px] overflow-hidden border border-white/10 shadow-2xl mb-10">
                    {turno.fotoTablero ? (
                      <Image source={{ uri: turno.fotoTablero }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                        <View className="flex-1 items-center justify-center bg-white/5">
                        <FontAwesome5 name="image" size={40} color="#222" />
                      </View>
                    )}
                  </View>

                  <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[2px] mb-4">Síntomas Reportados</Text>
                  <View className="flex-row flex-wrap gap-3">
                    {turno.sintomas?.length > 0 ? turno.sintomas.map((sId: string) => {
                      const sInfo = SINTOMAS_MAP[sId] || { label: sId, icon: 'error-outline', color: '#888' };
                      return (
                        <View key={sId} className="flex-row items-center bg-white/5 border border-white/5 px-4 py-3 rounded-2xl">
                          {/* Mapeo simple de iconos para web usando react-icons */}
                          {sInfo.icon === 'volume-up' && <FontAwesome5 name="volume-up" size={14} color={sInfo.color} />}
                          {sInfo.icon === 'alt-route' && <FontAwesome5 name="road" size={14} color={sInfo.color} />}
                          {sInfo.icon === 'stop-circle' && <FontAwesome5 name="stop-circle" size={14} color={sInfo.color} />}
                          {sInfo.icon === 'lightbulb' && <FontAwesome5 name="lightbulb" size={14} color={sInfo.color} />}
                          {sInfo.icon === 'cloud' && <FontAwesome5 name="cloud" size={14} color={sInfo.color} />}
                          {sInfo.icon === 'ac-unit' && <FontAwesome5 name="exclamation-triangle" size={14} color={sInfo.color} />}
                          {/* Fallback genérico */}
                          {!['volume-up','alt-route','stop-circle','lightbulb','cloud','ac-unit'].includes(sInfo.icon) && (
                            <FaExclamationTriangle size={14} color={sInfo.color} />
                          )}
                          <Text className="text-white text-xs font-bold ml-2">{sInfo.label}</Text>
                        </View>
                      );
                    }) : (
                      <Text className="text-gray-700 italic text-xs">No se reportaron síntomas visuales.</Text>
                    )}
                  </View>
                </View>

                {/* COLUMNA DERECHA: DATOS DUROS */}
                <View className="flex-1">
                  <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[2px] mb-4">Telemetría de Ingreso</Text>
                  <View className="flex-row gap-4 mb-10">
                    <View className="flex-1 bg-card p-6 rounded-[35px] border border-white/5">
                      <Ionicons name="speedometer-outline" size={22} color="#60A5FA" />
                      <Text className="text-white text-3xl font-black mt-2">{turno.kilometraje}</Text>
                      <Text className="text-gray-600 text-[10px] font-bold">KM TOTALES</Text>
                    </View>
                    <View className="flex-1 bg-card p-6 rounded-[35px] border border-white/5">
                      <FontAwesome5 name="gas-pump" size={20} color="#4ADE80" />
                      <Text className="text-white text-3xl font-black mt-2">{turno.nivelNafta}%</Text>
                      <Text className="text-gray-600 text-[10px] font-bold">DIESEL</Text>
                    </View>
                  </View>

                  <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[2px] mb-4">Notas del Chofer</Text>
                  <View className="bg-danger/5 border border-danger/10 p-6 rounded-[35px] mb-10">
                    <Text className="text-gray-300 text-sm leading-6 italic">
                      "{turno.comentariosChofer || turno.descripcion || 'Sin comentarios.'}"
                    </Text>
                  </View>
                </View>
              </View>

              <View className="h-40" />
            </ScrollView>

            {/* BOTONES DE ACCIÓN */}
            <BlurView intensity={40} tint="dark" className="p-8 border-t border-white/10 flex-row gap-4">
               <TouchableOpacity onPress={onClose} className="flex-1 bg-white/5 py-5 rounded-2xl items-center">
                  <Text className="text-gray-500 font-bold uppercase text-[10px]">Cerrar</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                 onPress={() => router.push({ pathname: '/solicitud', params: { prefillData: JSON.stringify(turno) } })}
                 className="flex-2 bg-danger py-5 rounded-2xl items-center shadow-lg shadow-danger/40"
               >
                 <Text className="text-white font-black text-xs uppercase italic">Derivar a Reparación</Text>
               </TouchableOpacity>
            </BlurView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};
export default TurnoDetailModal;