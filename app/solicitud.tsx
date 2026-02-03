import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, TextInput, Image, ActivityIndicator } from 'react-native';
import { MaterialIcons, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { collection, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import ActionModal, { ActionModalType } from '@/components/ActionModal';
import { TriangleAlert, Wrench, CalendarClock, Car, Fuel, Gauge } from 'lucide-react-native';

// Tipos de ingreso al taller
type ServiceType = 'correctivo' | 'preventivo' | 'siniestro';

const SolicitudScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useSelector((state: RootState) => state.login.user);

  // Parsear datos del turno previo
  const prefillRaw = (params as any)?.prefillData;
  const prefill = useMemo(() => {
    try {
      return prefillRaw ? JSON.parse(prefillRaw) : null;
    } catch (e) { return null; }
  }, [prefillRaw]);

  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);

  // Formulario Lógico de Supervisor
  const [tipoServicio, setTipoServicio] = useState<ServiceType>('correctivo');
  const [prioridad, setPrioridad] = useState<1 | 2 | 3>(2); // 1: Alta (Parada), 2: Media, 3: Baja (Programable)
  const [operativo, setOperativo] = useState(true); // ¿El camión anda o necesita grúa?

  // Modal Feedback
  const [modalState, setModalState] = useState<{ visible: boolean; type: ActionModalType; title: string; desc: string; action?: () => void }>({
    visible: false, type: 'success', title: '', desc: ''
  });

  const [descripcion, setDescripcion] = useState(() => {
    if (!prefill) return '';
    const partes = [];
    if (prefill.sintomas && prefill.sintomas.length > 0) {
      partes.push(`Síntomas reportados: ${prefill.sintomas.join(', ')}.`);
    }
    if (prefill.comentariosChofer) {
      partes.push(`Chofer dice: "${prefill.comentariosChofer}"`);
    }
    return partes.join('\n\n');
  });

  // --- LÓGICA DE ENVÍO AL TALLER ---
  const handleSubmit = async () => {
    if (!descripcion.trim()) {
      setModalState({ visible: true, type: 'warning', title: 'Falta Descripción', desc: 'Por favor detalla el problema o el servicio a realizar.' });
      return;
    }

    setLoading(true);
    try {
      // Datos puros para el Admin de Taller
      const ordenTaller = {
        estado: 'taller_pendiente', // Nuevo estado: Esperando asignación en taller

        // Clasificación del Trabajo
        tipoIngreso: tipoServicio, // Correctivo/Preventivo
        prioridad: prioridad,
        unidadOperativa: operativo, // ¿Llega andando o en grúa?

        // Reporte
        reporteSupervisor: descripcion,
        solicitadoPor: user?.nombre || 'Supervisor',
        fechaSolicitud: serverTimestamp(),

        // Heredamos datos técnicos del turno (snapshot del momento)
        kilometrajeEntrada: prefill?.kilometrajeLlegada || prefill?.kilometrajeSalida || 0,
        nivelNaftaEntrada: prefill?.nivelNaftaLlegada || prefill?.nivelNaftaSalida || 0,
        sintomasReportados: prefill?.sintomas || [],
      };

      if (prefill?.id) {
        // Actualizamos el turno existente
        const turnoRef = doc(db, 'turnos', prefill.id);
        await updateDoc(turnoRef, ordenTaller);
      } else {
        // Caso raro: Solicitud manual sin turno previo
        await addDoc(collection(db, 'turnos'), {
          ...ordenTaller,
          numeroPatente: prefill?.numeroPatente || 'S/D',
          fechaCreacion: new Date().toISOString(),
          tipo: 'solicitud_manual'
        });
      }

      setModalState({
        visible: true,
        type: 'success',
        title: 'Solicitud Enviada',
        desc: `La unidad ${prefill?.numeroPatente || ''} está en cola de taller. El Jefe de Taller recibirá la notificación.`,
        action: () => {
          if (router.canDismiss()) router.dismissAll();
          router.replace('/dashboards/superadmin');
        }
      });

    } catch (error) {
      console.error(error);
      setModalState({ visible: true, type: 'error', title: 'Error', desc: 'No se pudo enviar la solicitud.' });
    } finally {
      setLoading(false);
    }
  };

  // --- COMPONENTES UI ---
  const SelectorTipo = ({ type, label, icon: Icon, color }: { type: ServiceType, label: string, icon: any, color: string }) => (
    <TouchableOpacity
      onPress={() => setTipoServicio(type)}
      className={`flex-1 p-3 rounded-xl border flex-col items-center justify-center mr-2 ${tipoServicio === type ? 'bg-white/10' : 'bg-transparent'}`}
      style={{ borderColor: tipoServicio === type ? color : '#333' }}
    >
      <Icon size={20} color={tipoServicio === type ? color : '#666'} />
      <Text style={{ color: tipoServicio === type ? color : '#666', fontSize: 10, fontWeight: 'bold', marginTop: 6, textTransform: 'uppercase' }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <LinearGradient colors={['#1e1e24', '#000000']} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 24 }}>

          {/* HEADER */}
          <View className="flex-row items-center mb-6">
            <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-white/5 rounded-full">
              <MaterialIcons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View>
              <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[2px]">Mantenimiento</Text>
              <Text className="text-white text-2xl font-black italic">SOLICITUD DE TALLER</Text>
            </View>
          </View>

          {/* RESUMEN UNIDAD (Datos que ve el Supervisor) */}
          <View className="bg-zinc-900/80 p-4 rounded-2xl border border-white/10 mb-6 flex-row">
            <View className="flex-1">
              <Text className="text-white text-3xl font-black">{prefill?.numeroPatente || 'S/D'}</Text>
              <View className="flex-row mt-2 space-x-3">
                <View className="flex-row items-center">
                  <Gauge size={14} color="#666" />
                  <Text className="text-zinc-400 text-xs ml-1 font-mono">
                    {Number(prefill?.kilometrajeIngreso || prefill?.kilometrajeSalida || 0).toLocaleString()} km
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Fuel size={14} color="#666" />
                  <Text className="text-zinc-400 text-xs ml-1 font-mono">
                    {prefill?.nivelNaftaIngreso || prefill?.nivelNaftaSalida || 0}%
                  </Text>
                </View>
              </View>
            </View>
            {/* Foto Miniatura */}
            {(prefill?.fotoTableroIngreso || prefill?.fotoTableroSalida) && (
              <Image
                source={{ uri: prefill.fotoTableroIngreso || prefill.fotoTableroSalida }}
                className="w-16 h-16 rounded-xl bg-black border border-white/5"
              />
            )}
          </View>

          {/* SINTOMAS REPORTADOS (Lo que dijo el chofer) */}
          {/* {prefill?.sintomas && prefill.sintomas.length > 0 && (
            <View className="mb-6">
              <Text className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-2">Reporte del Chofer</Text>
              <View className="flex-row flex-wrap gap-2">
                {prefill.sintomas.map((s: string, i: number) => (
                  <View key={i} className="bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 flex-row items-center">
                    <TriangleAlert size={12} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text className="text-red-200 text-xs font-bold uppercase">{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )} */}

          {/* --- FORMULARIO DE DECISIÓN --- */}

          {/* 1. Motivo de Ingreso */}
          <Text className="text-white font-bold mb-3">Motivo de Ingreso</Text>
          <View className="flex-row mb-6">
            <SelectorTipo type="correctivo" label="Reparación" icon={Wrench} color="#EF4444" />
            <SelectorTipo type="preventivo" label="Mantenimiento" icon={CalendarClock} color="#3B82F6" />
            <SelectorTipo type="siniestro" label="Siniestro" icon={Car} color="#F59E0B" />
          </View>

          {/* 2. Estado de la Unidad (Movilidad) */}
          <Text className="text-white font-bold mb-3">Estado de Movilidad</Text>
          <View className="flex-row bg-zinc-900 rounded-xl p-1 mb-6 border border-zinc-700">
            <TouchableOpacity
              onPress={() => setOperativo(true)}
              className={`flex-1 py-3 rounded-lg items-center ${operativo ? 'bg-emerald-600' : 'bg-transparent'}`}
            >
              <Text className={`text-xs font-bold uppercase ${operativo ? 'text-white' : 'text-gray-500'}`}>Operativa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setOperativo(false)}
              className={`flex-1 py-3 rounded-lg items-center ${!operativo ? 'bg-red-600' : 'bg-transparent'}`}
            >
              <Text className={`text-xs font-bold uppercase ${!operativo ? 'text-white' : 'text-gray-500'}`}>No Camina / Grúa</Text>
            </TouchableOpacity>
          </View>

          {/* 3. Prioridad Sugerida */}
          <Text className="text-white font-bold mb-3">Prioridad Sugerida</Text>
          <View className="flex-row gap-3 mb-6">
            {/* Botones de Prioridad (Reutilizados visualmente) */}
            {[
              { val: 1, label: 'URGENTE', color: '#EF4444' },
              { val: 2, label: 'NORMAL', color: '#EAB308' },
              { val: 3, label: 'BAJA', color: '#10B981' }
            ].map((p) => (
              <TouchableOpacity
                key={p.val}
                onPress={() => setPrioridad(p.val as 1 | 2 | 3)}
                className="flex-1 py-3 rounded-xl border items-center justify-center"
                style={{
                  backgroundColor: prioridad === p.val ? `${p.color}20` : 'transparent',
                  borderColor: prioridad === p.val ? p.color : '#333'
                }}
              >
                <Text style={{ color: prioridad === p.val ? p.color : '#666', fontWeight: '900', fontSize: 10 }}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 4. Descripción / Observaciones (EDITABLE) */}
          <View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-white font-bold">Reporte Técnico para Taller</Text>
              <Text className="text-xs text-gray-500">Editable</Text>
            </View>
            <TextInput
              multiline
              numberOfLines={8} // Un poco más alto para que sea cómodo editar
              textAlignVertical="top"
              value={descripcion}
              onChangeText={setDescripcion} // Permitimos editar libremente
              placeholder="Describe el problema o ajusta el reporte del chofer..."
              placeholderTextColor="#555"
              className="bg-zinc-900 p-4 rounded-xl border border-zinc-700 text-white min-h-[150px] mb-8 text-sm leading-5"
            />
          </View>

          {/* BOTÓN ENVIAR */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className={`w-full py-4 rounded-2xl flex-row items-center justify-center shadow-lg ${loading ? 'bg-zinc-700' : 'bg-blue-600'}`}
          >
            {loading ? <ActivityIndicator color="white" /> : (
              <>
                <Text className="text-white font-black uppercase tracking-widest mr-2">Enviar al Taller</Text>
                <MaterialIcons name="send" size={20} color="white" />
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </LinearGradient>

      {/* FEEDBACK MODAL */}
      <ActionModal
        visible={modalState.visible}
        type={modalState.type}
        title={modalState.title}
        description={modalState.desc}
        onConfirm={() => {
          setModalState(prev => ({ ...prev, visible: false }));
          modalState.action && modalState.action();
        }}
      />

    </SafeAreaView>
  );
};

export default SolicitudScreen;