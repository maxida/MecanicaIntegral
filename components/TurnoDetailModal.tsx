import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, SafeAreaView, Platform, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Droplet, Disc, Battery, Lightbulb, CircleDot, Image as LucideImage,
  Info, X, Gauge, Wrench, Clock, Hash, AlertTriangle, CheckCircle, ArrowRight, LineChart,
  Lock, Toolbox, Sparkles, ArrowDownCircle, Wind, ArrowUpCircle, Tent
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';

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

const CARGA_ITEMS_MAP: Record<string, { label: string; Icon: any; color: string }> = {
  valvulas: { label: 'Válvulas Cerradas', Icon: Lock, color: '#60A5FA' },
  tapas_domo: { label: 'Tapas Domo', Icon: Disc, color: '#60A5FA' },
  precintos: { label: 'Precintos Seguridad', Icon: Lock, color: '#60A5FA' },
  mangueras: { label: 'Mangueras/Acoples', Icon: Toolbox, color: '#60A5FA' },
  limpieza: { label: 'Limpieza Exterior', Icon: Sparkles, color: '#60A5FA' },
  descarga: { label: 'Bocas Descarga', Icon: ArrowDownCircle, color: '#60A5FA' },
  perdida_aire: { label: 'Pérdida de aire', Icon: Wind, color: '#60A5FA' },
  levante_eje: { label: 'Levante eje neumático', Icon: ArrowUpCircle, color: '#60A5FA' },
  fueyes_estado: { label: 'Fueyes / Estado', Icon: Disc, color: '#60A5FA' },
  luces: { label: 'Luces', Icon: Lightbulb, color: '#60A5FA' },
  neumaticos: { label: 'Neumáticos', Icon: Disc, color: '#60A5FA' },
  carpa: { label: 'Estado de carpa', Icon: Tent, color: '#60A5FA' },
  cajones: { label: 'Cajones de herramientas', Icon: Toolbox, color: '#60A5FA' },
  auxilio: { label: 'Ruedas de auxilio', Icon: Disc, color: '#60A5FA' },
};

const CISTERNA_IDS = ['valvulas', 'tapas_domo', 'precintos', 'mangueras', 'limpieza', 'descarga'] as const;
const SEMIREMOLQUE_IDS = ['perdida_aire', 'levante_eje', 'fueyes_estado', 'luces', 'neumaticos', 'carpa', 'cajones', 'auxilio'] as const;

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

  const [informeModalVisible, setInformeModalVisible] = useState(false);
  const [isLiberando, setIsLiberando] = useState(false);
  const [showLiberarConfirm, setShowLiberarConfirm] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const parseDate = (dateInput: any): Date | null => {
    if (!dateInput) return null;
    if (typeof dateInput.toDate === 'function') return dateInput.toDate();
    if (dateInput.seconds) return new Date(dateInput.seconds * 1000);
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) return d;
    return null;
  };

  const formatDate = (d: Date | null) => d ? d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '--/--';
  const formatTime = (d: Date | null) => d ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

  const fechaSalida = parseDate(turno.fechaSalida || turno.fechaCreacion);
  const kmSalida = Number(turno.kilometrajeSalida || 0);
  const naftaSalida = Number(turno.nivelNaftaSalida || 0);
  const fotoSalida = turno.fotoTableroSalida;

  const fechaIngreso = parseDate(turno.fechaIngreso);
  const kmIngreso = Number(turno.kilometrajeIngreso || 0);
  const naftaIngreso = Number(turno.nivelNaftaIngreso || 0);
  const fotoIngreso = turno.fotoTableroIngreso;

  const isViajeCerrado = !!fechaIngreso;
  const isAlert = turno.estadoGeneral === 'alert' || (turno.sintomas && turno.sintomas.length > 0);
  const turnoEstado: TurnoEstado = turno.estado || 'pending';

  const isPending = turnoEstado === 'pending' || turnoEstado === 'pending_triage';
  const isScheduled = turnoEstado === 'scheduled';

  // Tipo de Carga
  const tipoCarga: 'cisterna' | 'semiremolque' | undefined = turno.tipoCarga;
  const tipoCargaLabel = tipoCarga === 'semiremolque' ? 'Semiremolque' : tipoCarga === 'cisterna' ? 'Cisterna' : null;

  // Checklists por tipo de carga
  const checksCisternaSalida = turno.checklistCisternaSalida;
  const checksCisternaIngreso = turno.checklistCisternaIngreso;
  const checksSemiremolqueSalida = turno.checklistSemiremolqueSalida;
  const checksSemiremolqueIngreso = turno.checklistSemiremolqueIngreso;

  const checksSalida = tipoCarga === 'semiremolque' ? checksSemiremolqueSalida : checksCisternaSalida;
  const checksIngreso = tipoCarga === 'semiremolque' ? checksSemiremolqueIngreso : checksCisternaIngreso;
  const cargaIds = tipoCarga === 'semiremolque' ? SEMIREMOLQUE_IDS : CISTERNA_IDS;
  const salidaCargaOk = !!checksSalida && cargaIds.every((id) => checksSalida?.[id] === true);
  const ingresoCargaOk = turno.controlCargaOk !== undefined
    ? turno.controlCargaOk
    : (!!checksIngreso && cargaIds.every((id) => checksIngreso?.[id] === true));

  const handleLiberarUnidad = () => {
    setShowLiberarConfirm(true);
  };

  const confirmLiberarUnidad = async () => {
    if (!turno?.id) return;
    setIsLiberando(true);
    try {
      const turnoRef = doc(db, 'turnos', turno.id);
      await updateDoc(turnoRef, {
        estado: 'completed',
        estadoGeneral: 'ok',
        resolucionAdmin: 'Liberado por el Administrador de Flota. Falla menor.'
      });
      onClose();
    } catch (error) {
      setShowLiberarConfirm(false);
    } finally {
      setIsLiberando(false);
    }
  };

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
        <View className="w-full">

          {(isPending || isScheduled) ? (
            <View className="flex-col gap-3 w-full">
              {showLiberarConfirm && (
                <View className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
                  <Text className="text-emerald-300 text-xs font-bold uppercase mb-2">Confirmar liberación</Text>
                  <Text className="text-zinc-200 text-sm mb-4">
                    ¿Estás seguro de marcar este camión como OPERATIVO? Las fallas reportadas se registrarán como menores y el camión podrá volver a salir.
                  </Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => setShowLiberarConfirm(false)}
                      className="flex-1 bg-zinc-900 py-3 rounded-xl items-center border border-zinc-700"
                      disabled={isLiberando}
                    >
                      <Text className="text-gray-300 font-bold uppercase text-xs">Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={confirmLiberarUnidad}
                      className="flex-1 bg-emerald-600 py-3 rounded-xl items-center"
                      disabled={isLiberando}
                    >
                      {isLiberando ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text className="text-white font-black uppercase text-xs">Confirmar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <TouchableOpacity
                onPress={handleLiberarUnidad}
                disabled={isLiberando}
                className="w-full py-4 rounded-xl items-center border bg-emerald-600/20 border-emerald-500/50"
              >
                {isLiberando ? (
                  <ActivityIndicator color="#10B981" />
                ) : (
                  <Text className="text-white font-black text-xs uppercase">Falla Menor - Mantener Operativo</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  onClose();
                  router.push({ pathname: '/solicitud', params: { prefillData: JSON.stringify(turno) } });
                }}
                className="w-full bg-red-600 py-4 rounded-xl flex-row items-center justify-center shadow-lg shadow-red-900/40"
              >
                <Wrench size={18} color="#FFF" />
                <Text className="text-white font-black text-xs uppercase ml-2">Bloquear y Enviar a Taller</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  router.push({ pathname: '/historial-unidad', params: { patente: turno.numeroPatente } });
                }}
                className="w-full bg-zinc-800 py-3 rounded-xl flex-row items-center justify-center mb-3 border border-white/10"
              >
                <LineChart size={14} color="#A1A1AA" style={{ marginRight: 8 }} />
                <Text className="text-zinc-300 font-bold text-xs uppercase">Ver Hoja de Vida Completa</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} className="w-full py-2 items-center">
                <Text className="text-gray-400 font-bold uppercase text-xs">Cerrar sin hacer nada</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-col gap-3 w-full">
              <TouchableOpacity onPress={onClose} className="w-full bg-zinc-900 py-4 rounded-xl items-center border border-zinc-800">
                <Text className="text-gray-400 font-bold uppercase text-xs">Cerrar</Text>
              </TouchableOpacity>
            </View>
          )}


        </View>
      );
    }

    return (
      <TouchableOpacity onPress={onClose} className="bg-white/10 py-4 rounded-xl items-center w-full border border-white/10">
        <Text className="text-white font-bold uppercase">Entendido</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/85 justify-center items-center p-2 md:p-6">
        {!!(Platform.OS === 'ios') && <BlurView intensity={30} tint="dark" style={{ position: 'absolute', width: '100%', height: '100%' }} />}

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
                <Text className="text-zinc-500 text-xs mt-1 font-bold uppercase tracking-widest">CHOFER ACTUAL: {turno.chofer || 'S/D'}</Text>
                {tipoCargaLabel && (
                  <View className="self-start mt-2 bg-white/5 border border-white/10 px-2 py-1 rounded-full">
                    <Text className="text-[9px] uppercase font-black tracking-[2px] text-blue-400">{tipoCargaLabel}</Text>
                  </View>
                )}
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

              {/* BOTÓN: HISTORIA CLÍNICA DE LA UNIDAD */}
              <View className="mb-6">
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    router.push({ pathname: '/historial-unidad', params: { patente: turno.numeroPatente } });
                  }}
                  className="w-full bg-blue-600/20 py-4 rounded-xl flex-row items-center justify-center border border-blue-500/30 shadow-lg shadow-blue-900/20"
                >
                  <LineChart size={18} color="#60A5FA" style={{ marginRight: 8 }} />
                  <Text className="text-blue-400 font-black text-xs uppercase tracking-widest">Ver Historia Clínica Completa</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Resumen del Viaje</Text>

              <View className="flex-row gap-2 mb-8 h-auto min-h-[140px]">
                {/* CARD SALIDA */}
                <View className="flex-1 bg-zinc-900/50 rounded-2xl border border-white/5 p-4 justify-between relative overflow-hidden">
                  <View className="absolute top-0 right-0 p-3 opacity-10"><ArrowRight size={80} color="white" /></View>
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
                  {!isViajeCerrado ? (
                    <View className="flex-1 items-center justify-center">
                      <Clock size={32} color="#F59E0B" />
                      <Text className="text-yellow-500 text-xs font-bold mt-2 uppercase">EN VIAJE</Text>
                    </View>
                  ) : (
                    <>
                      <View className="absolute top-0 right-0 p-3 opacity-10"><CheckCircle size={80} color="white" /></View>
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

              <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Evidencia de Tablero</Text>
              <View className="flex-row gap-4 mb-8">
                {/* FOTO SALIDA */}
                <View className="flex-1 aspect-video bg-black rounded-xl overflow-hidden border border-white/10 relative">
                  {fotoSalida ? (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => setExpandedImage(fotoSalida)} className="w-full h-full">
                      <Image source={{ uri: fotoSalida }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </TouchableOpacity>
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
                    <TouchableOpacity activeOpacity={0.9} onPress={() => setExpandedImage(fotoIngreso)} className="w-full h-full">
                      <Image source={{ uri: fotoIngreso }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </TouchableOpacity>
                  ) : (
                    <View className="flex-1 items-center justify-center"><LucideImage size={24} color="#333" /><Text className="text-zinc-700 text-[9px] mt-1">PENDIENTE</Text></View>
                  )}
                  <View className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded border border-white/10">
                    <Text className="text-white text-[8px] font-bold">LLEGADA</Text>
                  </View>
                </View>
              </View>

              {/* BLOQUE CONTROL CARGA (DINÁMICO) */}
              {(checksSalida || checksIngreso || (turno.fallasCargaIngreso && turno.fallasCargaIngreso.length > 0)) && (
                <View className="mb-8">
                  <Text className="text-blue-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Control {tipoCargaLabel || 'Cisterna'}</Text>
                  <View className="flex-row gap-4 mb-4">
                    <View className="flex-1 bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                      <Text className="text-zinc-500 text-[9px] font-bold uppercase mb-2">SALIDA</Text>
                      {checksSalida ? (
                        <View className="flex-row items-center">
                          {salidaCargaOk ? <CheckCircle size={16} color="#10B981" /> : <AlertTriangle size={16} color="#EF4444" />}
                          <Text className={`ml-2 text-xs font-bold ${salidaCargaOk ? 'text-emerald-500' : 'text-red-400'}`}>
                            {salidaCargaOk ? 'Control OK' : 'Fallas en control de carga'}
                          </Text>
                        </View>
                      ) : (
                        <Text className="text-zinc-600 text-xs italic">No registrado</Text>
                      )}
                    </View>

                    <View className="flex-1 bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                      <Text className="text-zinc-500 text-[9px] font-bold uppercase mb-2">INGRESO</Text>
                      {checksIngreso || turno.controlCargaOk !== undefined ? (
                        <View className="flex-row items-center">
                          {ingresoCargaOk ? <CheckCircle size={16} color="#10B981" /> : <AlertTriangle size={16} color="#EF4444" />}
                          <Text className={`ml-2 text-xs font-bold ${ingresoCargaOk ? 'text-emerald-500' : 'text-red-400'}`}>
                            {ingresoCargaOk ? 'Control OK' : 'Fallas en control de carga'}
                          </Text>
                        </View>
                      ) : (
                        <Text className="text-zinc-600 text-xs italic">Pendiente</Text>
                      )}
                    </View>
                  </View>

                  <View className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                    <Text className="text-zinc-400 text-[9px] font-bold uppercase mb-2">Fallas registradas en ingreso</Text>
                    {turno.fallasCargaIngreso && turno.fallasCargaIngreso.length > 0 ? (
                      <View className="flex-row flex-wrap gap-2">
                        {turno.fallasCargaIngreso.map((id: string) => {
                          const data = CARGA_ITEMS_MAP[id] || { label: id, Icon: AlertTriangle, color: '#EF4444' };
                          return (
                            <View key={id} className="bg-red-500/10 border border-red-500/30 pl-2 pr-3 py-1.5 rounded-lg flex-row items-center">
                              <data.Icon size={14} color={data.color} />
                              <Text className="text-red-200 text-xs font-bold ml-2">{data.label}</Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text className="text-zinc-500 text-xs">Sin fallas reportadas en el control de carga de ingreso.</Text>
                    )}
                  </View>
                </View>
              )}

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

              {turno.estado === 'completed' && (
                <View className="mb-8">
                  <Text className="text-emerald-500 text-[10px] font-black uppercase tracking-[3px] mb-3">Ficha de Resolución del Taller</Text>
                  <View className="bg-emerald-900/10 border border-emerald-500/20 p-5 rounded-3xl">

                    {/* Diagnóstico Final (Cliente/Supervisor) */}
                    <View className="mb-5">
                      <Text className="text-emerald-400 text-[10px] font-black uppercase mb-2">Estado de la Unidad / Diagnóstico</Text>
                      <View className="bg-black/40 p-4 rounded-2xl border border-emerald-500/10">
                        <Text className="text-zinc-200 text-sm leading-6 italic">
                          "{turno.diagnosticoMecanico || 'Sin diagnóstico registrado.'}"
                        </Text>
                      </View>
                    </View>

                    {/* Informe Técnico del Mecánico */}
                    {turno.informeTecnico && (
                      <View className="mb-5">
                        <Text className="text-blue-400 text-[10px] font-black uppercase mb-2">Informe Técnico (Detalle del Taller)</Text>
                        <View className="bg-black/40 p-4 rounded-2xl border border-blue-500/10">
                          <Text className="text-zinc-300 text-sm leading-6">
                            {turno.informeTecnico}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Checklist de Tareas Cumplidas */}
                    {turno.instruccionesMecanico && turno.instruccionesMecanico.length > 0 && (
                      <View className="mb-5">
                        <Text className="text-emerald-400 text-[10px] font-black uppercase mb-2">Plan de Trabajo Realizado</Text>
                        <View className="bg-black/40 p-4 rounded-2xl border border-emerald-500/10">
                          {turno.instruccionesMecanico.map((tarea: string, idx: number) => (
                            <View key={idx} className="flex-row items-center mb-2">
                              <CheckCircle size={14} color="#10B981" />
                              <Text className="text-zinc-300 text-xs ml-2">{tarea}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Repuestos */}
                    {(turno.repuestosTexto || (Array.isArray(turno.repuestosUtilizados) && turno.repuestosUtilizados.length > 0)) && (
                      <View className="mb-4">
                        <Text className="text-emerald-400 text-[10px] font-black uppercase mb-2">Repuestos y Consumibles</Text>
                        <View className="bg-black/40 p-4 rounded-2xl border border-emerald-500/10">
                          <Text className="text-zinc-300 text-sm leading-6">
                            {turno.repuestosTexto || (Array.isArray(turno.repuestosUtilizados) ? turno.repuestosUtilizados.join(', ') : '')}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Alerta de Tareas Pendientes */}
                    {!turno.tareasCompletadas && (
                      <View className="bg-red-500/10 p-4 rounded-2xl border border-red-500/30 flex-row items-center mt-2">
                        <AlertTriangle size={24} color="#EF4444" />
                        <Text className="text-red-300 text-xs font-bold ml-3 flex-1 leading-5">
                          ATENCIÓN: El mecánico indicó que NO se lograron solucionar todas las fallas reportadas inicialmente.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              <Text className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Comentarios del Chofer</Text>
              <View className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 min-h-[80px]">
                <Text className="text-zinc-300 text-sm leading-6 italic">
                  "{turno.comentariosChofer || turno.descripcion || 'Sin comentarios adicionales.'}"
                </Text>
              </View>

            </ScrollView>

            <View className="p-6 border-t border-white/5 bg-[#09090b]">
              {renderFooterActions()}
            </View>

            {/* MODAL: INFORME TÉCNICO / DIAGNÓSTICO (Supervisor) */}
            {informeModalVisible && (
              <Modal visible={informeModalVisible} transparent animationType="slide">
                <View className="flex-1 bg-black/80 justify-center items-center px-6">
                  <Animated.View entering={FadeInUp} className="w-full max-h-[85%] bg-[#0c0c0e] rounded-2xl border border-yellow-600 overflow-hidden">
                    <View className="flex-row justify-between items-center px-4 py-3 bg-yellow-500">
                      <Text className="text-black font-black uppercase">Informe Técnico del Trabajo Realizado y Diagnóstico</Text>
                      <TouchableOpacity onPress={() => setInformeModalVisible(false)} className="p-2">
                        <X color="#111" size={18} />
                      </TouchableOpacity>
                    </View>
                    <ScrollView className="p-4">
                      {(turno.diagnosticoMecanico || turno.informeTrabajo) ? (
                        <>
                          {turno.informeTrabajo && (
                            <View className="mb-4">
                              <Text className="text-zinc-400 text-sm font-bold mb-2">Informe de Trabajo</Text>
                              <Text className="text-zinc-200 text-sm">{turno.informeTrabajo}</Text>
                            </View>
                          )}
                          {turno.diagnosticoMecanico && (
                            <View className="mb-4">
                              <Text className="text-zinc-400 text-sm font-bold mb-2">Diagnóstico del Mecánico</Text>
                              <Text className="text-zinc-200 text-sm">{turno.diagnosticoMecanico}</Text>
                            </View>
                          )}
                        </>
                      ) : (
                        <Text className="text-zinc-500">No hay informe técnico o diagnóstico registrado.</Text>
                      )}
                    </ScrollView>
                  </Animated.View>
                </View>
              </Modal>
            )}

            <Modal visible={!!expandedImage} transparent animationType="fade" onRequestClose={() => setExpandedImage(null)}>
              <View className="flex-1 bg-black/95 justify-center items-center">
                <TouchableOpacity onPress={() => setExpandedImage(null)} className="absolute top-10 right-6 p-2 bg-white/10 rounded-full">
                  <X size={30} color="white" />
                </TouchableOpacity>
                {expandedImage && (
                  <Image source={{ uri: expandedImage }} className="w-full h-full" resizeMode="contain" />
                )}
              </View>
            </Modal>

          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default TurnoDetailModal;