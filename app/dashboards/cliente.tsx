import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, Modal, Pressable, Alert, Platform, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5, Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '@/redux/store';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import TurnoDetailModal from '@/components/TurnoDetailModal';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';

const ClienteDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const navigation = useNavigation<any>();
  const user = useSelector((state: RootState) => state.login.user);

  // --- ESTADOS ---
  const [vehicleList, setVehicleList] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // KPIs y Estado (Dependen del Vehículo Seleccionado)
  const [kpiData, setKpiData] = useState<{ odometer: string | number; fuel: string | number }>({ odometer: '-', fuel: '-' });
  const [camionEstado, setCamionEstado] = useState<string>('disponible');
  const [kpiLoading, setKpiLoading] = useState(false);

  // Historial (Depende del Chofer Logueado)
  const [historial, setHistorial] = useState<any[]>([]);
  const [selectedTurno, setSelectedTurno] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [historialPage, setHistorialPage] = useState(0);
  const historialPageSize = 5;
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- HELPERS DE FECHA ---
  const formatTimestamp = (ts: any) => {
    if (!ts) return null;
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' ' + date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  // --- CARGA DE DATOS ---

  // 1. Vehículos (Al inicio)
  useFocusEffect(
    useCallback(() => {
      const fetchVehicles = async () => {
        try {
          const col = collection(db, 'vehiculo');
          const q = query(col, orderBy('numeroPatente'), limit(100));
          const snap = await getDocs(q);
          const list = snap.docs.map(d => d.data().numeroPatente).filter(Boolean);
          setVehicleList(list);
        } catch (err) { console.error(err); }
        finally { setLoadingVehicles(false); }
      };
      fetchVehicles();
    }, [])
  );

  // 2. Historial DEL CHOFER (Siempre visible, no depende de selección de camión)
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      const fetchUserHistory = async () => {
        try {
          const col = collection(db, 'turnos');
          // Buscamos TODO el historial de este chofer, sin importar la patente
          const q = query(
            col,
            where('chofer', '==', user.nombre),
            orderBy('fechaCreacion', 'desc'),
            limit(20)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            list.sort((a: any, b: any) => {
              const dateA = new Date(a.fechaIngreso || a.fechaCreacion).getTime();
              const dateB = new Date(b.fechaIngreso || b.fechaCreacion).getTime();
              return dateB - dateA;
            });
            setHistorial(list);
          } else {
            setHistorial([]);
          }
        } catch (error) {
          console.error("Error cargando historial:", error);
        }
      };
      fetchUserHistory();
    }, [user])
  );

  // 3. Estado del Vehículo Seleccionado (KPIs y Botones)
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const refreshStatus = async () => {
        if (!selectedVehicle) return;

        try {
          setKpiLoading(true);
          const col = collection(db, 'turnos');
          const qStatus = query(col, where('numeroPatente', '==', selectedVehicle), orderBy('fechaCreacion', 'desc'), limit(1));
          const snapStatus = await getDocs(qStatus);

          if (isActive) {
            if (snapStatus.empty) {
              setKpiData({ odometer: '-', fuel: '-' });
              setCamionEstado('disponible');
            } else {
              const d = snapStatus.docs[0].data() as any;
              const kmVal = d.kilometrajeIngreso ?? d.kilometrajeSalida ?? d.kilometraje ?? null;
              const fuelVal = d.nivelNaftaIngreso ?? d.nivelNaftaSalida ?? d.nivelNafta ?? null;

              setKpiData({
                odometer: kmVal ? String(kmVal).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '-',
                fuel: fuelVal ? `${fuelVal}%` : '-'
              });
              setCamionEstado(d.estado || 'disponible');
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          if (isActive) setKpiLoading(false);
        }
      };

      refreshStatus();
      return () => { isActive = false; };
    }, [selectedVehicle])
  );

  // --- FILTROS ---
  const normalizeDateKey = (dateInput: any) => {
    if (!dateInput) return null;
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  };

  const selectedDateKey = selectedDate ? normalizeDateKey(selectedDate) : null;

  const historialFiltrado = historial.filter((h) => {
    // YA NO FILTRAMOS POR CAMIÓN AQUÍ. El chofer ve todo su historial.
    if (selectedDateKey) {
      const itemKey = normalizeDateKey(h.fechaIngreso || h.fechaCreacion);
      return itemKey === selectedDateKey;
    }
    return true;
  });

  const isEnViaje = camionEstado === 'en_viaje';
  const isEnTaller = ['pending_triage', 'scheduled', 'in_progress'].includes(camionEstado);
  const canCheckout = !isEnViaje && !isEnTaller;
  const canCheckin = isEnViaje;

  const handleAction = (action: 'checkout' | 'checkin' | 'sos') => {
    if (!selectedVehicle) return;
    const commonParams = { numeroPatente: selectedVehicle, choferName: user?.nombre };

    if (action === 'checkout') navigation.navigate('checkout', commonParams);
    else if (action === 'checkin') navigation.navigate('checkin', commonParams);
    else if (action === 'sos') Alert.alert("Emergencia", "Enviando alerta...");
  };

  const handleOpenTurnoDetail = (turno: any) => {
    setSelectedTurno(turno);
    setModalVisible(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface pt-8">
      <LinearGradient colors={['#0b0b0b', '#000']} className="flex-1 px-6">
        <ScrollView showsVerticalScrollIndicator={false} className="pt-4">

          {/* HEADER */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px]">Bienvenido</Text>
              <Text className="text-white text-xl font-black italic">{user?.nombre || 'Chofer'}</Text>
            </View>
            <TouchableOpacity onPress={onLogout} className="p-2 bg-white/5 rounded-xl border border-white/10">
              <MaterialIcons name="logout" size={20} color="#FF4C4C" />
            </TouchableOpacity>
          </View>

          {/* SELECTOR */}
          <View className="mb-8">
            <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px] mb-2">Seleccionar Unidad</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => !loadingVehicles && setVehicleDropdownOpen(true)}
              className={`flex-row items-center justify-between p-4 rounded-2xl border ${selectedVehicle ? 'bg-zinc-900 border-white/20' : 'bg-primary/10 border-primary/50'}`}
            >
              {loadingVehicles ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#60A5FA" />
                  <Text className="text-gray-400 ml-2 text-xs">Cargando flota...</Text>
                </View>
              ) : (
                <>
                  <View className="flex-row items-center">
                    <FontAwesome5 name="truck" size={18} color={selectedVehicle ? "white" : "#60A5FA"} />
                    <Text className={`ml-3 text-lg font-black italic ${selectedVehicle ? 'text-white' : 'text-primary'}`}>
                      {selectedVehicle || 'TOCA PARA ELEGIR'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color={selectedVehicle ? "#666" : "#60A5FA"} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* DASHBOARD CONTENT (Botones solo si hay selección) */}
          {selectedVehicle && (
            <Animated.View entering={FadeInUp.duration(500)}>
              {/* KPI */}
              <View className="flex-row gap-3 mb-8">
                <View className="flex-1 bg-gray-900/50 p-3 rounded-2xl border border-white/5 flex-row items-center">
                  <View className="bg-blue-500/20 p-2 rounded-lg mr-3"><Ionicons name="speedometer" size={18} color="#60A5FA" /></View>
                  <View>
                    <Text className="text-white font-black text-sm">{kpiLoading ? '...' : kpiData.odometer} {kpiData.odometer !== '-' && !kpiLoading && 'km'}</Text>
                    <Text className="text-gray-500 text-[9px] uppercase font-bold">Odómetro</Text>
                  </View>
                </View>
                <View className="flex-1 bg-gray-900/50 p-3 rounded-2xl border border-white/5 flex-row items-center">
                  <View className="bg-green-500/20 p-2 rounded-lg mr-3"><FontAwesome5 name="gas-pump" size={16} color="#4ADE80" /></View>
                  <View>
                    <Text className="text-white font-black text-sm">{kpiLoading ? '...' : kpiData.fuel}</Text>
                    <Text className="text-gray-500 text-[9px] uppercase font-bold">Nivel</Text>
                  </View>
                </View>
              </View>

              {/* ALERTA TALLER */}
              {isEnTaller && !kpiLoading && (
                <View className="bg-yellow-900/30 border border-yellow-600/50 p-3 rounded-xl mb-4 flex-row items-center">
                  <MaterialIcons name="warning" size={20} color="#F59E0B" />
                  <Text className="text-yellow-500 text-xs font-bold ml-2 flex-1">Unidad en revisión. Operación bloqueada.</Text>
                </View>
              )}

              {/* ACCIONES */}
              {kpiLoading ? (
                <View className="py-10 items-center"><ActivityIndicator size="large" color="#60A5FA" /></View>
              ) : (
                <>
                  <TouchableOpacity activeOpacity={0.9} disabled={!canCheckout} onPress={() => handleAction('checkout')} className={`mb-4 overflow-hidden rounded-[24px] border ${canCheckout ? 'border-emerald-500/30' : 'border-gray-800 opacity-40'}`}>
                    <LinearGradient colors={canCheckout ? ['#059669', '#047857'] : ['#1a1a1a', '#111']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5 flex-row items-center justify-between">
                      <View>
                        <Text className={`text-lg font-black italic uppercase ${canCheckout ? 'text-white' : 'text-gray-500'}`}>{isEnViaje ? 'VIAJE EN CURSO' : isEnTaller ? 'EN REVISIÓN' : 'INICIAR VIAJE'}</Text>
                        <Text className={`${canCheckout ? 'text-emerald-100' : 'text-gray-600'} text-[10px] font-bold mt-1`}>INSPECCIÓN DE SALIDA</Text>
                      </View>
                      <MaterialCommunityIcons name="truck-check" size={28} color={canCheckout ? 'white' : '#444'} />
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity activeOpacity={0.9} disabled={!canCheckin} onPress={() => handleAction('checkin')} className={`mb-4 overflow-hidden rounded-[24px] border ${canCheckin ? 'border-blue-500/30' : 'border-gray-800 opacity-40'}`}>
                    <LinearGradient colors={canCheckin ? ['#3B82F6', '#1D4ED8'] : ['#1a1a1a', '#111']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5 flex-row items-center justify-between">
                      <View>
                        <Text className={`text-lg font-black italic uppercase ${canCheckin ? 'text-white' : 'text-gray-500'}`}>FINALIZAR VIAJE</Text>
                        <Text className={`${canCheckin ? 'text-blue-100' : 'text-gray-600'} text-[10px] font-bold mt-1`}>INGRESO GALPÓN</Text>
                      </View>
                      <MaterialIcons name="garage" size={28} color={canCheckin ? 'white' : '#444'} />
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity activeOpacity={0.9} onPress={() => handleAction('sos')} className="mb-8 overflow-hidden rounded-[24px] border border-red-500/30">
                    <LinearGradient colors={['#EF4444', '#B91C1C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5 flex-row items-center justify-between">
                      <View>
                        <Text className="text-white text-lg font-black italic uppercase">Asistencia</Text>
                        <Text className="text-red-100 text-[10px] font-bold mt-1">MECÁNICO RUTA</Text>
                      </View>
                      <MaterialIcons name="sos" size={28} color="white" />
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          )}

          {/* --- HISTORIAL COMPLETO DEL CHOFER --- */}
          <View className="mt-6 mb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px]">
                HISTORIAL DE {user?.nombre?.toUpperCase()}
              </Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} className="bg-white/5 px-3 py-1 rounded-full border border-white/10">
                <Text className="text-primary text-[10px]">{selectedDate ? selectedDate.toLocaleDateString() : 'Filtrar Fecha'}</Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (<DateTimePicker value={selectedDate || new Date()} mode="date" display="default" onChange={(_, d) => { setShowDatePicker(Platform.OS === 'ios'); if (d) setSelectedDate(d); }} />)}

            {historialFiltrado.length === 0 ? (
              <View className="py-10 items-center justify-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                <MaterialCommunityIcons name="history" size={32} color="#666" />
                <Text className="text-gray-600 text-xs italic mt-2">Sin actividad registrada.</Text>
              </View>
            ) : (
              historialFiltrado.slice(historialPage * historialPageSize, (historialPage + 1) * historialPageSize).map((h, i) => {
                const estadoLabel = h.estado || 'Pendiente';

                // DATOS DE LA CARD MEJORADA
                const salidaStr = formatTimestamp(h.fechaSalida || h.fechaCreacion) || '---';
                const ingresoStr = h.fechaIngreso ? formatTimestamp(h.fechaIngreso) : 'EN CURSO';

                let badgeColor = 'bg-gray-700';
                if (estadoLabel === 'en_viaje') badgeColor = 'bg-emerald-600';
                if (estadoLabel === 'pending_triage') badgeColor = 'bg-yellow-600';
                if (estadoLabel === 'completed') badgeColor = 'bg-blue-600';

                return (
                  <TouchableOpacity key={h.id || i} onPress={() => handleOpenTurnoDetail(h)} className="mb-3 bg-card/40 border border-white/5 p-4 rounded-2xl flex-row justify-between items-start">
                    <View className="flex-1 mr-4">
                      {/* TÍTULO: CHOFER + PATENTE */}
                      <View className="flex-row items-center mb-2">
                        <Text className="text-white font-black text-sm uppercase mr-2">{h.chofer}</Text>
                        <View className="bg-white/10 px-2 py-0.5 rounded">
                          <Text className="text-zinc-400 text-[10px] font-bold">{h.numeroPatente}</Text>
                        </View>
                      </View>

                      {/* DETALLE: FECHAS */}
                      <View className="space-y-1">
                        <View className="flex-row items-center">
                          <MaterialIcons name="north-east" size={12} color="#60A5FA" style={{ marginRight: 4 }} />
                          <Text className="text-gray-500 text-[10px]">
                            Salida: <Text className="text-gray-300 font-bold">{salidaStr}</Text>
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <MaterialIcons name="south-west" size={12} color={h.fechaIngreso ? "#4ADE80" : "#F59E0B"} style={{ marginRight: 4 }} />
                          <Text className="text-gray-500 text-[10px]">
                            Llegada: <Text className={h.fechaIngreso ? "text-gray-300 font-bold" : "text-emerald-400 font-black italic"}>{ingresoStr}</Text>
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* BADGE ESTADO */}
                    <View className={`${badgeColor} px-3 py-1 rounded-full`}>
                      <Text className="text-white text-[9px] font-bold uppercase">{estadoLabel.replace(/_/g, ' ')}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Modal Selección */}
          <Modal visible={vehicleDropdownOpen} transparent animationType="fade">
            <Pressable className="flex-1 bg-black/80 justify-center px-6" onPress={() => setVehicleDropdownOpen(false)}>
              <View className="bg-gray-900 rounded-3xl border border-white/10 max-h-[400px]">
                <Text className="text-white text-center font-bold py-4 border-b border-white/5">Seleccionar Unidad</Text>
                <ScrollView>
                  {vehicleList.map(patente => (
                    <TouchableOpacity key={patente} onPress={() => { setSelectedVehicle(patente); setVehicleDropdownOpen(false); }} className="p-4 border-b border-white/5">
                      <Text className="text-white text-center font-bold">{patente}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>

          <TurnoDetailModal visible={modalVisible} turno={selectedTurno} onClose={() => setModalVisible(false)} readOnly />

        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default ClienteDashboard;