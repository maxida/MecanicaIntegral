import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import TurnoDetailModal from '@/components/TurnoDetailModal';
import ComplianceWidget from '@/components/ComplianceWidget';
import { getExpirationStatus } from '@/utils/complianceHelper';

type TabType = 'alerta' | 'viaje' | 'taller' | 'todos' | 'vencimientos';

const SuperadminDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const router = useRouter();

  // --- ESTADOS ---
  const [turnos, setTurnos] = useState<any[]>([]);
  const [vehiclesData, setVehiclesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('alerta');

  const [selectedTurno, setSelectedTurno] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Responsive helper for KPI tiles
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 2900;
  const tileStyle = isWideScreen ? { flex: 1, minWidth: 0 } : { width: 260 } as any;

  // 1. Cargar Vehículos
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const col = collection(db, 'vehiculo');
        const snap = await getDocs(col);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setVehiclesData(list);
      } catch (e) { console.error("Error cargando vehiculos", e); }
    };
    fetchVehicles();
  }, []);

  // 2. Suscripción a Turnos
  useEffect(() => {
    const q = query(collection(db, 'turnos'), orderBy('fechaCreacion', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTurnos(data);
      setLoading(false);
    }, (error) => { setLoading(false); });
    return () => unsubscribe();
  }, []);

  // 3. KPIs Turnos (CORREGIDO PARA INCLUIR taller_pendiente)
  const kpis = useMemo(() => {
    let alerta = 0; let viaje = 0; let taller = 0; let disponible = 0;
    turnos.forEach((t) => {
      const est = t.estado || 'pending';
      const general = t.estadoGeneral || 'ok';

      if (est === 'en_viaje') {
        viaje++;
      }
      // Si es taller_pendiente, cuenta como TALLER, no como alerta
      else if (est === 'scheduled' || est === 'in_progress' || est === 'taller_pendiente') {
        taller++;
      }
      else if (est === 'pending_triage' || (general === 'alert' && est !== 'completed')) {
        alerta++;
      }
      else if (est === 'completed') {
        disponible++;
      }
    });
    return { alerta, viaje, taller, disponible };
  }, [turnos]);

  // 4. LÓGICA DE FILTRADO (CORREGIDA)
  const isVehicleMode = activeTab === 'vencimientos';

  const listToRender = isVehicleMode
    ? vehiclesData.filter(v => {
      const vtv = getExpirationStatus(v.vtvVencimiento);
      const seguro = getExpirationStatus(v.seguroVencimiento);
      const ruta = getExpirationStatus(v.rutaVencimiento);
      const hasIssue = vtv.status !== 'ok' || seguro.status !== 'ok' || ruta.status !== 'ok';
      const matchText = v.numeroPatente.toLowerCase().includes(filterText.toLowerCase());
      return hasIssue && matchText;
    })
    : turnos.filter((t) => {
      const searchStr = `${t.numeroPatente} ${t.chofer}`.toLowerCase();
      if (filterText && !searchStr.includes(filterText.toLowerCase())) return false;

      const est = t.estado || 'pending';
      switch (activeTab) {
        case 'alerta':
          // Excluir lo que ya está derivado al taller
          return est === 'pending_triage' || (t.estadoGeneral === 'alert' && est !== 'scheduled' && est !== 'in_progress' && est !== 'completed' && est !== 'taller_pendiente');
        case 'viaje':
          return est === 'en_viaje';
        case 'taller':
          // INCLUIR EL NUEVO ESTADO AQUÍ
          return est === 'scheduled' || est === 'in_progress' || est === 'taller_pendiente';
        case 'todos':
          return true;
        default:
          return true;
      }
    });

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleOpenDetail = (turno: any) => {
    setSelectedTurno(turno);
    setModalVisible(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]">
      <LinearGradient colors={['#1a1a1a', '#000000']} className="flex-1 px-4 md:px-8">
        <ScrollView showsVerticalScrollIndicator={false} className="pt-6">

          {/* HEADER */}
          <View className="flex-row justify-between items-start mb-6">
            <View>
              <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[4px]">Fleet Command Center</Text>
              <Text className="text-white text-3xl font-black italic">TORRE DE CONTROL</Text>
            </View>
            <TouchableOpacity onPress={onLogout} className="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10">
              <MaterialIcons name="logout" size={20} color="#FF4C4C" />
            </TouchableOpacity>
          </View>

          {/* WIDGET */}
          <ComplianceWidget
            vehicles={vehiclesData}
            onPress={() => { setActiveTab('vencimientos'); setFilterText(''); }}
          />

          {/* PESTAÑAS */}
          {activeTab === 'vencimientos' ? (
            <View className="flex-row items-center mb-6">
              <TouchableOpacity onPress={() => setActiveTab('alerta')} className="bg-white/10 px-4 py-3 rounded-2xl flex-row items-center border border-white/10">
                <MaterialIcons name="arrow-back" size={18} color="white" />
                <Text className="text-white ml-2 font-bold text-xs uppercase">Volver a Operaciones</Text>
              </TouchableOpacity>
              <View className="ml-4">
                <Text className="text-red-500 font-black uppercase tracking-widest text-xs">MODO VENCIMIENTOS</Text>
                <Text className="text-gray-500 text-[10px]">Vehículos con documentación crítica</Text>
              </View>
            </View>
          ) : (
            <View className="mb-6">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                <TouchableOpacity onPress={() => setActiveTab('alerta')} style={tileStyle} className={`p-4 rounded-2xl border ${activeTab === 'alerta' ? 'bg-red-900/20 border-red-500' : 'bg-zinc-900/50 border-white/5'}`}>
                  <Text className={`text-3xl font-black ${activeTab === 'alerta' ? 'text-red-500' : 'text-gray-400'}`}>{kpis.alerta}</Text>
                  <Text className="text-gray-500 text-[9px] font-bold uppercase mt-1">ALERTAS</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setActiveTab('viaje')} style={tileStyle} className={`p-4 rounded-2xl border ${activeTab === 'viaje' ? 'bg-blue-900/20 border-blue-500' : 'bg-zinc-900/50 border-white/5'}`}>
                  <Text className={`text-3xl font-black ${activeTab === 'viaje' ? 'text-blue-500' : 'text-gray-400'}`}>{kpis.viaje}</Text>
                  <Text className="text-gray-500 text-[9px] font-bold uppercase mt-1">EN RUTA</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setActiveTab('taller')} style={tileStyle} className={`p-4 rounded-2xl border ${activeTab === 'taller' ? 'bg-yellow-900/20 border-yellow-500' : 'bg-zinc-900/50 border-white/5'}`}>
                  <Text className={`text-3xl font-black ${activeTab === 'taller' ? 'text-yellow-500' : 'text-gray-400'}`}>{kpis.taller}</Text>
                  <Text className="text-gray-500 text-[9px] font-bold uppercase mt-1">TALLER</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setActiveTab('todos')} style={tileStyle} className={`p-4 rounded-2xl border ${activeTab === 'todos' ? 'bg-emerald-900/20 border-emerald-500' : 'bg-zinc-900/50 border-white/5'}`}>
                  <Text className={`text-3xl font-black ${activeTab === 'todos' ? 'text-emerald-500' : 'text-gray-400'}`}>{turnos.length}</Text>
                  <Text className="text-gray-500 text-[9px] font-bold uppercase mt-1">TOTAL</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
          

          {/* BARRA DE BÚSQUEDA */}
          <View className="flex-row items-center bg-zinc-900/80 border border-white/10 rounded-2xl px-4 py-3 mb-6">
            <MaterialIcons name="search" size={20} color="#666" />
            <TextInput
              value={filterText}
              onChangeText={setFilterText}
              placeholder="Buscar por Patente o Chofer..."
              placeholderTextColor="#666"
              className="flex-1 ml-3 text-white font-medium"
            />
            {filterText.length > 0 && (
              <TouchableOpacity onPress={() => setFilterText('')}>
                <MaterialIcons name="close" size={18} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {/* LISTA */}
          {loading ? (
            <ActivityIndicator size="large" color="#60A5FA" className="mt-10" />
          ) : (
            <View className="pb-20">
              {listToRender.length === 0 ? (
                <View className="items-center py-20 opacity-30">
                  <MaterialCommunityIcons name="clipboard-text-off-outline" size={64} color="white" />
                  <Text className="text-gray-500 mt-4 font-bold uppercase">Sin registros en esta vista</Text>
                </View>
              ) : (
                listToRender.map((item, index) => {
                  // MODO VENCIMIENTOS
                  if (isVehicleMode) {
                    const vtv = getExpirationStatus(item.vtvVencimiento);
                    return (
                      <Animated.View key={item.id} entering={FadeInUp.delay(index * 50).springify()}>
                        <TouchableOpacity
                          onPress={() => router.push({ pathname: '/historial-unidad', params: { patente: item.numeroPatente } })}
                          className="bg-[#111] mb-4 rounded-2xl border border-red-500/30 overflow-hidden flex-row"
                        >
                          <View className="w-1.5 bg-red-500" />
                          <View className="p-4 flex-1">
                            <View className="flex-row justify-between items-center mb-2">
                              <Text className="text-white font-black text-xl">{item.numeroPatente}</Text>
                              <MaterialIcons name="error" size={20} color="#EF4444" />
                            </View>
                            <Text className="text-red-400 text-xs font-bold uppercase">Documentación Crítica</Text>
                            <Text className="text-zinc-500 text-[10px] mt-2">Toca para ver hoja de vida.</Text>
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  }

                  // MODO OPERATIVO (CORREGIDO)
                  else {
                    const t = item;
                    // Detectar Estado
                    const isAlert = t.estadoGeneral === 'alert' || t.estado === 'pending_triage';
                    const isViaje = t.estado === 'en_viaje';

                    // AQUI ESTÁ EL FIX: Incluimos taller_pendiente
                    const isTaller = t.estado === 'scheduled' || t.estado === 'in_progress' || t.estado === 'taller_pendiente';

                    // Variables Visuales por defecto (Finalizado)
                    let borderColor = 'border-white/5';
                    let statusText = 'FINALIZADO';
                    let statusColor = 'text-gray-500';
                    let iconName = 'check-circle';

                    if (isTaller) {
                      borderColor = 'border-yellow-500/50';
                      statusColor = 'text-yellow-500';
                      iconName = 'build';

                      if (t.estado === 'taller_pendiente') {
                        statusText = 'EN COLA DE TALLER'; // ESTADO NUEVO
                        statusColor = 'text-orange-400'; // Naranja para diferenciar
                        borderColor = 'border-orange-500/50';
                      } else {
                        statusText = 'MANTENIMIENTO';
                      }
                    } else if (isAlert) {
                      borderColor = 'border-red-500/50';
                      statusText = 'REVISIÓN REQUERIDA';
                      statusColor = 'text-red-500';
                      iconName = 'error';
                    } else if (isViaje) {
                      borderColor = 'border-blue-500/50';
                      statusText = 'EN TRÁNSITO';
                      statusColor = 'text-blue-500';
                      iconName = 'local-shipping';
                    }

                    return (
                      <Animated.View key={t.id || index} entering={FadeInUp.delay(index * 50).springify()}>
                        <TouchableOpacity
                          activeOpacity={0.95}
                          onPress={() => handleOpenDetail(t)}
                          className={`bg-[#111] mb-4 rounded-2xl border ${borderColor} overflow-hidden`}
                        >
                          <View className="p-4 flex-row justify-between items-start bg-white/5">
                            <View>
                              <Text className="text-white font-black text-lg">{t.numeroPatente}</Text>
                              <Text className="text-zinc-400 text-xs font-bold uppercase">{t.chofer || 'SIN CHOFER'}</Text>
                            </View>
                            <View className="items-end">
                              <View className="flex-row items-center gap-1">
                                <Text className={`text-[10px] font-black uppercase ${statusColor}`}>{statusText}</Text>
                                <MaterialIcons name={iconName as any} size={14} color={statusColor.includes('red') ? '#EF4444' : statusColor.includes('blue') ? '#3B82F6' : statusColor.includes('yellow') || statusColor.includes('orange') ? '#EAB308' : '#666'} />
                              </View>
                              <Text className="text-zinc-600 text-[10px] mt-1 font-mono">
                                {formatTime(t.fechaCreacion)} hs
                              </Text>
                            </View>
                          </View>

                          <View className="p-4 flex-row justify-between items-center">
                            <View>
                              <Text className="text-zinc-500 text-[10px] font-bold uppercase mb-1">Último Evento</Text>
                              <Text className="text-zinc-300 text-xs font-medium">
                                {t.tipo === 'salida' ? '📤 Salida Registrada' : t.tipo === 'ingreso' ? '📥 Ingreso a Galpón' : '📝 Reporte'}
                              </Text>
                            </View>
                            <View className="bg-white/10 px-3 py-2 rounded-lg">
                              <Text className="text-white text-[10px] font-bold">VER FICHA</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  }
                })
              )}
            </View>
          )}

        </ScrollView>
      </LinearGradient>

      <TurnoDetailModal
        visible={modalVisible}
        turno={selectedTurno}
        onClose={() => setModalVisible(false)}
        adminContext={true}
      />

    </SafeAreaView>
  );
};

export default SuperadminDashboard;