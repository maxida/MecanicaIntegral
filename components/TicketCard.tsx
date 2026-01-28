import React from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { LucideAlertTriangle, LucideCheckCircle2, LucideWrench } from 'lucide-react-native';

type Turno = any;

const Badge = ({ label, styleClass, icon: Icon }: { label: string; styleClass: string; icon?: any }) => (
  <View className={`px-2 py-1 rounded-full flex-row items-center space-x-1 ${styleClass}`}>
    {Icon && <Icon size={10} color={styleClass.includes('text-black') ? '#000' : '#FFF'} />}
    <Text className={`text-[9px] font-black uppercase ${styleClass.includes('text-black') ? 'text-black' : 'text-white'}`}>{label}</Text>
  </View>
);

export default function TicketCard({ turno, onPress, onDerivar, onLiberar }: { turno: Turno; onPress?: () => void; onDerivar?: (id: string) => void; onLiberar?: (id: string) => void; }) {
  const router = useRouter();

  const isAlert = turno.estadoGeneral === 'alert';
  const isEnTaller = turno.derivadoATaller || turno.estado === 'scheduled' || turno.estado === 'in_progress';
  const isCompleted = turno.estado === 'completed' || turno.estadoGeneral === 'ok';

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View className="mb-4 overflow-hidden rounded-[24px] border border-white/10">
        <BlurView intensity={20} tint="dark" className="p-4 bg-card/40">
          <View className="flex-row justify-between items-start mb-2">
            <View>
              <Text className="text-white font-black text-xl tracking-tight">{turno.numeroPatente || '—'}</Text>
              <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mt-1">{turno.chofer || 'SIN CHOFER'}</Text>
            </View>

            <View className="items-end space-y-1">
               {isEnTaller && (
                <Badge label="EN TALLER" styleClass="bg-yellow-500 text-black border border-yellow-400" icon={LucideWrench} />
              )}
              {isAlert && (
                 <Badge label="ALERTA" styleClass="bg-red-600 text-white border border-red-500" icon={LucideAlertTriangle} />
              )}
              {(!isAlert && !isEnTaller && isCompleted) && (
                 <Badge label="OPERATIVO" styleClass="bg-emerald-600 text-white border border-emerald-500" icon={LucideCheckCircle2} />
              )}
               {(!isAlert && !isEnTaller && !isCompleted) && (
                 <Badge label="PENDIENTE" styleClass="bg-gray-700 text-white border border-gray-600" />
              )}
            </View>
          </View>

          {/* Singleton Chips */}
          {turno.sintomas && turno.sintomas.length > 0 && (
            <View className="flex-row flex-wrap gap-1 mb-3">
              {turno.sintomas.slice(0, 3).map((s: string, i: number) => (
                <View key={i} className="bg-white/5 px-2 py-1 rounded-md border border-white/5">
                  <Text className="text-gray-300 text-[10px]">{s}</Text>
                </View>
              ))}
               {turno.sintomas.length > 3 && (
                <View className="bg-white/5 px-2 py-1 rounded-md border border-white/5">
                  <Text className="text-gray-300 text-[10px]">+{turno.sintomas.length - 3}</Text>
                </View>
              )}
            </View>
          )}


          <View className="flex-row items-center justify-between mt-2 pt-3 border-t border-white/5">
             <View className="flex-1 pr-2">
              {turno.fechaDerivacion ? (
                 <Text className="text-yellow-500/80 text-[10px] font-mono">Derivado: {new Date(turno.fechaDerivacion).toLocaleDateString()}</Text>
              ) : (
                <Text className="text-gray-500 text-[10px] font-mono">{new Date(turno.createdAt || turno.fechaCreacion || Date.now()).toLocaleDateString()}</Text>
              )}
            </View>

            <View className="flex-row space-x-2">
              {/* Liberar siempre visible (si no está liberado y no está en taller) */}
              {!isCompleted && !isEnTaller && (
                <TouchableOpacity onPress={() => onLiberar && onLiberar(turno.id)} className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <Text className="text-emerald-500 text-[11px] font-black uppercase">Liberar</Text>
                </TouchableOpacity>
              )}

              {/* Botón de Acción Principal */}
              {isEnTaller ? (
                 <TouchableOpacity disabled className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 opacity-70">
                    <Text className="text-gray-400 text-[11px] font-black uppercase">EN TALLER</Text>
                 </TouchableOpacity>
              ) : (
                !isCompleted && (
                  <TouchableOpacity onPress={() => onDerivar ? onDerivar(turno.id) : router.push({ pathname: '/solicitud', params: { prefillData: JSON.stringify(turno) } })} className="px-3 py-2 rounded-xl bg-red-600 shadow-sm shadow-red-900/50">
                    <Text className="text-white text-[11px] font-black uppercase">Derivar</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </BlurView>
      </View>
    </TouchableWithoutFeedback>
  );
}
