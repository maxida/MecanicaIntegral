import React from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

type Turno = any;

const Badge = ({ label, styleClass }: { label: string; styleClass: string }) => (
  <View className={`px-3 py-1 rounded-full ${styleClass}`}>
    <Text className="text-[10px] font-black uppercase">{label}</Text>
  </View>
);

export default function TicketCard({ turno, onPress, onDerivar, onLiberar }: { turno: Turno; onPress?: () => void; onDerivar?: (id: string) => void; onLiberar?: (id: string) => void; }) {
  const router = useRouter();

  // Determinar badge según estado
  const getBadge = () => {
    // ALERTA: estadoGeneral === 'alert'
    if (turno.estadoGeneral === 'alert') return { label: 'ALERTA', className: 'bg-red-600 text-white' };
    // EN TALLER: derivadoATaller === true OR estado scheduled/in_progress
    if (turno.derivadoATaller || turno.estado === 'scheduled' || turno.estado === 'in_progress') return { label: 'EN TALLER', className: 'bg-yellow-500 text-black' };
    // OPERATIVO: estado === 'completed' or estadoGeneral === 'ok'
    if (turno.estado === 'completed' || turno.estadoGeneral === 'ok') return { label: 'OPERATIVO', className: 'bg-green-600 text-white' };
    // PENDIENTE: fallback
    return { label: 'PENDIENTE', className: 'bg-gray-600 text-white' };
  };

  const badge = getBadge();

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View className="mb-4 overflow-hidden rounded-[28px] border border-white/10">
        <BlurView intensity={10} tint="dark" className="p-4 bg-card/40">
          <View className="flex-row justify-between items-start mb-2">
            <View>
              <Text className="text-white font-black text-lg">{turno.numeroPatente || '—'}</Text>
              <Text className="text-primary text-[10px] font-bold uppercase tracking-tighter">Chofer: {turno.chofer || 'N/D'}</Text>
            </View>

            <View>
              <View className="absolute right-0 -top-2" />
              <View className={`px-3 py-1 rounded-full ${badge.className}`}>
                <Text className={`text-[10px] font-black ${badge.className.includes('text-black') ? 'text-black' : 'text-white'}`}>{badge.label}</Text>
              </View>
            </View>
          </View>

          <Text className="text-gray-400 text-xs mb-3 italic" numberOfLines={2}>
            {turno.comentariosChofer || turno.descripcion || 'Sin comentarios adicionales'}
          </Text>

          <View className="flex-row items-center justify-between">
            <View>
              {turno.fechaDerivacion && (
                <Text className="text-yellow-300 text-[11px]">Derivado: {new Date(turno.fechaDerivacion).toLocaleString()}</Text>
              )}
              {turno.fechaLiberacion && (
                <Text className="text-green-300 text-[11px]">Liberado: {new Date(turno.fechaLiberacion).toLocaleString()}</Text>
              )}
            </View>

            <View className="flex-row space-x-2">
              {/* Liberar siempre visible (si no está liberado) */}
              {turno.estado !== 'completed' && (
                <TouchableOpacity onPress={() => onLiberar && onLiberar(turno.id)} className="px-3 py-2 rounded-2xl bg-success/10 border border-success/20">
                  <Text className="text-success text-[12px] font-black uppercase">Liberar</Text>
                </TouchableOpacity>
              )}

              {/* Derivar: mostrar sólo si no fue derivado todavía */}
              {!(turno.derivadoATaller || turno.estado === 'scheduled' || turno.estado === 'in_progress') && (
                <TouchableOpacity onPress={() => onDerivar ? onDerivar(turno.id) : router.push({ pathname: '/solicitud', params: { prefillData: JSON.stringify(turno) } })} className="px-3 py-2 rounded-2xl bg-danger">
                  <Text className="text-white text-[12px] font-black uppercase">Derivar a Taller</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </BlurView>
      </View>
    </TouchableWithoutFeedback>
  );
}
