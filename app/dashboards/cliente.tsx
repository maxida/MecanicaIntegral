import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '@/redux/store';
import { setTurnos } from '@/redux/slices/turnosSlice';
import { obtenerTurnos, suscribirseATurnos } from '@/services/turnosService';
import LoadingOverlay from '@/components/LoadingOverlay';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import TurnoDetailModal from '@/components/TurnoDetailModal';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import UniversalImage from '@/components/UniversalImage';

const ClienteDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.login.user);
  const turnos = useSelector((state: RootState) => state.turnos.turnos);
  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState<any[]>([]);
  const [selectedTurno, setSelectedTurno] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [historialPage, setHistorialPage] = useState(0);
  const historialPageSize = 3;
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleOpenTurnoDetail = (turno: any) => {
    setSelectedTurno(turno);
    setModalVisible(true);
  };

  useEffect(() => {
    const unsubscribe = suscribirseATurnos((data) => dispatch(setTurnos(data)));
    return () => unsubscribe();
  }, [dispatch]);

  // Obtener historial de turnos / ingresos para el cliente logueado
  useEffect(() => {
    let mounted = true;
    const fetchHistorial = async () => {
      if (!user) return;
      try {
        const col = collection(db, 'turnos');
        const userAny = user as any;
        const userId = userAny?.clientId || user?.id || null;
        const queries = [] as ReturnType<typeof query>[];

        if (userId) {
          queries.push(query(col, where('clientId', '==', userId)));
          queries.push(query(col, where('clienteId', '==', userId)));
        }

        if (user?.id) {
          queries.push(query(col, where('choferId', '==', user.id)));
        }

        if (queries.length === 0) {
          if (mounted) setHistorial([]);
          return;
        }

        const results = await Promise.allSettled(queries.map((q) => getDocs(q)));
        const items: any[] = [];
        results.forEach((res) => {
          if (res.status === 'fulfilled') {
            res.value.forEach((d) => items.push({ id: d.id, ...((d.data() as any) || {}) }));
          }
        });

        // Unificar por id y ordenar por fecha (intenta createdAt, fechaCreacion, fechaIngreso)
        const map = new Map<string, any>();
        items.forEach(it => map.set(it.id, it));
        const unique = Array.from(map.values());
        unique.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.fechaCreacion || a.fechaIngreso || 0).getTime();
          const dateB = new Date(b.createdAt || b.fechaCreacion || b.fechaIngreso || 0).getTime();
          return dateB - dateA;
        });
        if (mounted) setHistorial(unique);
      } catch (err) {
        console.error('Error fetching historial de flota:', err);
      }
    };
    fetchHistorial();
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    setHistorialPage(0);
  }, [historial]);

  const normalizeDateKey = (dateInput: any) => {
    if (!dateInput) return null;

    let d: Date | null = null;

    if (dateInput instanceof Date) {
      d = dateInput;
    } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
      const parsed = new Date(dateInput);
      d = Number.isNaN(parsed.getTime()) ? null : parsed;
    } else if (typeof dateInput?.toDate === 'function') {
      const parsed = dateInput.toDate();
      d = parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
    } else if (typeof dateInput?.seconds === 'number') {
      const parsed = new Date(dateInput.seconds * 1000);
      d = Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return d ? d.toISOString().split('T')[0] : null;
  };

  const selectedDateKey = selectedDate ? normalizeDateKey(selectedDate) : null;
  const historialFiltrado = historial.filter((h) => {
    const fechaRaw = h.createdAt || h.fechaCreacion || h.fechaIngreso || null;
    const itemKey = normalizeDateKey(fechaRaw);
    const matchDate = selectedDateKey ? itemKey === selectedDateKey : true;
    return matchDate;
  });

  // Simulamos la vinculación del camión según el usuario logueado
  const camionAsignado = {
    patente: 'AE-744-GT',
    modelo: 'Scania R500 V8',
    kmActual: '45.200 km',
    combustible: '75%',
    ultimoCheckin: 'Ayer, 18:30 hs'
  };

  return (
    <SafeAreaView className="flex-1 bg-surface pt-16">
      <LinearGradient colors={['#0b0b0b', '#000']} className="flex-1 px-6">
        <ScrollView showsVerticalScrollIndicator={false} className="pt-4">
          
          {/* HEADER CHOFER */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px]">Unidad Asignada</Text>
              <Text className="text-white text-2xl font-black italic">{camionAsignado.patente}</Text>
              <Text className="text-primary/80 font-bold text-xs">Chofer: {user?.nombre || 'Operador'}</Text>
            </View>
              <TouchableOpacity 
              onPress={onLogout}
              className="w-10 h-10 rounded-2xl bg-danger/10 border border-danger/20 items-center justify-center"
            >
              <MaterialIcons name="logout" size={18} color="#FF4C4C" />
            </TouchableOpacity>
          </View>

          {/* BOTÓN DE ACCIÓN PRINCIPAL: CHECK-IN AL GALPÓN */}
          <Animated.View entering={FadeInUp.delay(200)}>
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => navigation.navigate('checkin', { numeroPatente: camionAsignado.patente })}
              className="mb-6 overflow-hidden rounded-[28px] border border-primary/30 shadow-2xl shadow-primary/20"
            >
              <LinearGradient colors={['#60A5FA', '#2563EB']} start={{x:0, y:0}} end={{x:1, y:1}} className="py-4 px-6 flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-white text-xl font-black italic uppercase">Ingreso al Galpón</Text>
                  <Text className="text-white/80 text-xs font-bold mt-1">INICIAR CHECKLIST DE ENTRADA</Text>
                </View>
                <View className="bg-white/20 p-3 rounded-full">
                  <FontAwesome5 name="clipboard-list" size={24} color="white" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* STATUS ACTUAL DEL CAMIÓN */}
          <View className="flex-row justify-between mb-4">
            <BlurView intensity={10} tint="dark" className="flex-1 mr-2 h-24 rounded-2xl border border-white/5 overflow-hidden">
              <View className="p-3 bg-card/40 items-center justify-center h-full">
                <Ionicons name="speedometer-outline" size={18} color="#60A5FA" />
                <Text className="text-white font-black text-base mt-1">{camionAsignado.kmActual}</Text>
                <Text className="text-gray-600 text-[9px] uppercase font-bold">Odómetro</Text>
              </View>
            </BlurView>

            <BlurView intensity={10} tint="dark" className="flex-1 ml-2 h-24 rounded-2xl border border-white/5 overflow-hidden">
              <View className="p-3 bg-card/40 items-center justify-center h-full">
                <FontAwesome5 name="gas-pump" size={18} color="#4ADE80" />
                <Text className="text-white font-black text-base mt-1">{camionAsignado.combustible}</Text>
                <Text className="text-gray-600 text-[9px] uppercase font-bold">Tanque</Text>
              </View>
            </BlurView>
          </View>

          {/* HISTORIAL TÉCNICO (Compacto) */}
          {turnos.filter(t => t.estado === 'completed').slice(0, 2).map((turno, idx) => (
            <Animated.View key={turno.id} entering={FadeInRight.delay(idx * 100)}>
              <BlurView intensity={5} tint="dark" className="mb-3 rounded-2xl border border-white/5 overflow-hidden">
                <View className="p-4 bg-card/40 flex-row items-center">
                    <View className="bg-success/10 p-2 rounded-lg mr-4">
                    <FontAwesome5 name="check" size={14} color="#4ADE80" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-sm">{turno.descripcion}</Text>
                    <Text className="text-gray-500 text-[10px]">{new Date(turno.fechaCreacion).toLocaleDateString()}</Text>
                  </View>
                </View>
              </BlurView>
            </Animated.View>
          ))}

          {/* HISTORIAL DE FLOTA (Cliente) */}
          <View className="mt-6 mb-2">
            <View className="flex-row justify-between items-end mb-3">
              <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px]">Historial de Flota</Text>
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="flex-row items-center px-4 py-2 rounded-full border border-white/10 bg-white/5"
              >
                <MaterialIcons name="date-range" size={16} color="#60A5FA" />
                <Text className="text-white text-[11px] font-bold ml-2">
                  {selectedDate ? selectedDate.toLocaleDateString('es-AR') : 'Seleccionar Fecha'}
                </Text>
              </TouchableOpacity>

              {selectedDate && (
                <TouchableOpacity
                  onPress={() => setSelectedDate(null)}
                  className="px-3 py-2 rounded-full border border-white/10 bg-white/5"
                >
                  <Text className="text-gray-300 text-[11px] font-bold">Limpiar</Text>
                </TouchableOpacity>
              )}
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setSelectedDate(date);
                }}
              />
            )}

            <View>
              {historialFiltrado.length === 0 && (
                <Text className="text-gray-600 text-[12px]">No se encontraron ingresos para tu cuenta.</Text>
              )}

              {historialFiltrado
                .slice(historialPage * historialPageSize, (historialPage + 1) * historialPageSize)
                .map((h, i) => {
                const fechaRaw = h.createdAt || h.fechaCreacion || h.fechaIngreso || null;
                const fecha = fechaRaw ? new Date(fechaRaw).toLocaleDateString('es-AR') : 'S/F';
                const estadoKey = (h.estado || '').toLowerCase();
                const estadoLabel = estadoKey.includes('pending') ? 'Pendiente' : estadoKey.includes('in_progress') ? 'En Taller' : (estadoKey.includes('completed') ? 'Finalizado' : (h.estado || 'Pendiente'));
                const estadoColor = estadoLabel === 'Pendiente' ? 'bg-warning/60' : estadoLabel === 'En Taller' ? 'bg-primary/60' : 'bg-success/60';
                const evidenceUrl = h?.fotoTablero
                  || h?.evidenceUrl
                  || h?.photoUrl
                  || h?.dashboardPhoto
                  || h?.imageUrl
                  || h?.checklistPhotoURL
                  || h?.foto?.url
                  || null;

                const hasEvidence = typeof evidenceUrl === 'string' && evidenceUrl.length > 0;

                return (
                  <Animated.View key={h.id} entering={FadeInRight.delay(i * 60)}>
                    <TouchableOpacity onPress={() => handleOpenTurnoDetail(h)} activeOpacity={0.9} className="mb-3 rounded-2xl overflow-hidden border border-white/5">
                      <View className="p-4 bg-card/40 flex-row items-center">
                        {hasEvidence ? (
                          <View className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 mr-4">
                            <UniversalImage uri={evidenceUrl} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          </View>
                        ) : (
                          <View className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 items-center justify-center mr-4">
                            <MaterialIcons name="image" size={18} color="#555" />
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="text-white font-black text-sm">{h.numeroPatente || 'S/D'}</Text>
                          <Text className="text-gray-500 text-[10px]">{h.chofer || h.nombreChofer || 'Chofer desconocido'}</Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-gray-400 text-[11px] mb-1">{fecha}</Text>
                          <View className={`px-3 py-1 rounded-full ${estadoColor}`}>
                            <Text className="text-white text-[11px] font-bold">{estadoLabel}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}

              {historialFiltrado.length > historialPageSize && (
                <View className="flex-row justify-between items-center mt-2">
                  <TouchableOpacity
                    onPress={() => setHistorialPage(p => Math.max(0, p - 1))}
                    disabled={historialPage === 0}
                    className={`px-4 py-2 rounded-full border ${historialPage === 0 ? 'border-white/5 bg-white/5' : 'border-primary/30 bg-primary/10'}`}
                  >
                    <Text className={`text-[11px] font-bold ${historialPage === 0 ? 'text-gray-600' : 'text-primary'}`}>Anterior</Text>
                  </TouchableOpacity>

                  <Text className="text-gray-500 text-[11px]">
                    Página {historialPage + 1} / {Math.max(1, Math.ceil(historialFiltrado.length / historialPageSize))}
                  </Text>

                  <TouchableOpacity
                    onPress={() => setHistorialPage(p => Math.min(Math.ceil(historialFiltrado.length / historialPageSize) - 1, p + 1))}
                    disabled={historialPage >= Math.ceil(historialFiltrado.length / historialPageSize) - 1}
                    className={`px-4 py-2 rounded-full border ${historialPage >= Math.ceil(historialFiltrado.length / historialPageSize) - 1 ? 'border-white/5 bg-white/5' : 'border-primary/30 bg-primary/10'}`}
                  >
                    <Text className={`text-[11px] font-bold ${historialPage >= Math.ceil(historialFiltrado.length / historialPageSize) - 1 ? 'text-gray-600' : 'text-primary'}`}>Siguiente</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Modal detalle solo lectura */}
          <TurnoDetailModal visible={modalVisible} turno={selectedTurno} onClose={() => setModalVisible(false)} readOnly />

        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default ClienteDashboard;