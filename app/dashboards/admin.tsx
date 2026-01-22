import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, Modal, useWindowDimensions } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { RootState } from '@/redux/store';
import { actualizarTurno, setTurnos } from '@/redux/slices/turnosSlice';
import { setFlagConFactura } from '@/redux/slices/invoiceSlice';
import { actualizarTurnoService, obtenerTurnos, suscribirseATurnos } from '@/services/turnosService';
import LoadingOverlay from '@/components/LoadingOverlay';

// --- SUB-COMPONENTES PREMIUM ---

const StatCard = ({ label, value, color, icon }: any) => (
  <View className="flex-1 min-w-[160px] monitor:min-w-0 mx-2 mb-4">
    <BlurView intensity={10} tint="dark" className="rounded-[30px] border border-white/5 overflow-hidden">
      <View className="p-5 bg-card/40">
        <View className="flex-row justify-between items-center mb-2">
          <View className="p-2 rounded-xl bg-surface/50">
            <MaterialIcons name={icon} size={20} color={color} />
          </View>
          <Text style={{ color }} className="text-2xl font-black">{value}</Text>
        </View>
        <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">{label}</Text>
      </View>
    </BlurView>
  </View>
);

const KanbanColumn = ({ title, data, color, icon, renderCard }: any) => (
  <View className="flex-1 mx-2 min-w-[300px] monitor:min-w-0">
    <View className="flex-row items-center mb-4 px-2">
      <View style={{ backgroundColor: color }} className="w-2 h-2 rounded-full mr-2 shadow-lg" />
      <Text className="text-white font-bold uppercase text-xs tracking-widest flex-1">{title}</Text>
      <View className="bg-white/10 px-2 py-1 rounded-lg">
        <Text className="text-white text-[10px] font-bold">{data.length}</Text>
      </View>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
      {data.map((item: any) => renderCard(item))}
    </ScrollView>
  </View>
);

const AdminDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isMonitor = width > 1024;

  const turnos = useSelector((state: RootState) => state.turnos.turnos);
  const [loading, setLoading] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedTurno, setSelectedTurno] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [docType, setDocType] = useState<'asistencia' | 'reparacion' | 'presupuesto' | null>(null);
  const [DocGen, setDocGen] = useState<any>(null);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pendientes' | 'entaller' | 'finalizados'>('pendientes');

  // Lógica de carga y tiempo real
  useEffect(() => {
    const unsubscribe = suscribirseATurnos((data) => dispatch(setTurnos(data)));
    return () => unsubscribe();
  }, [dispatch]);

  // reset pagination when turnos array changes
  useEffect(() => {
    setCurrentPage(1);
  }, [turnos]);

  // reset page when active tab changes
  useEffect(() => { setCurrentPage(1); }, [activeTab]);

  // Consolidación de columnas -> 3 categorías: pendientes (backlog + scheduled), en taller, finalizados
  const columns = [
    { id: 'pendientes', title: 'Pendientes', icon: 'hourglass-empty', color: '#FACC15', data: turnos.filter(t => t.estado === 'pending' || t.estado === 'scheduled') },
    { id: 'entaller', title: 'En Taller', icon: 'engineering', color: '#4ADE80', data: turnos.filter(t => t.estado === 'in_progress') },
    { id: 'finalizados', title: 'Finalizados', icon: 'verified', color: '#A855F7', data: turnos.filter(t => t.estado === 'completed') },
  ];
  const ITEMS_PER_PAGE = 2;
  const [currentPage, setCurrentPage] = useState(1);

  // Acciones de Negocio
  const handleUpdateStatus = async (id: string, nuevoEstado: string) => {
    try {
      await actualizarTurnoService(id, { estado: nuevoEstado });
      dispatch(actualizarTurno({ id, estado: nuevoEstado }));
    } catch (e) { console.error(e); }
  };

  // Cargar DocumentGenerator dinámicamente para evitar dependencias circulares en build minificado
  const openDoc = async (type: 'asistencia' | 'reparacion' | 'presupuesto') => {
    setDocType(type);
    setDocModalVisible(true);
    if (!DocGen) {
      try {
        const mod = await import('@/components/DocumentGenerator');
        // almacenar el componente default
        setDocGen(() => mod.default || mod);
      } catch (e) {
        console.error('Error cargando DocumentGenerator dinámicamente', e);
      }
    }
  };

  const renderTurnoCard = (turno: any) => {
    // CORRECCIÓN: Buscamos "alert" que es como viene de tu DB
    const isAlert = turno.estadoGeneral === 'alert';

    return (
      <BlurView key={turno.id} intensity={5}
        // Si es alert, ponemos un borde rojo sutil
        className={`mb-4 rounded-3xl border ${isAlert ? 'border-danger/50' : 'border-white/5'} overflow-hidden`}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => { setSelectedTurno(turno); setModalVisible(true); }}
          className="p-4 bg-card/60"
        >
          <View className="flex-row justify-between items-start mb-3">
            <View>
              <Text className="text-white font-bold text-base leading-tight">{turno.chofer || 'Chofer no identificado'}</Text>
              {/* CORRECCIÓN: Mostramos numeroPatente */}
              <Text className="text-primary font-mono text-xs mt-1 tracking-tighter">
                {turno.numeroPatente === "S/D" ? "⚠️ SIN PATENTE" : turno.numeroPatente}
              </Text>
            </View>

            {/* INDICADOR DE ESTADO CRÍTICO EN EL DASHBOARD */}
            <View className={`px-2 py-1 rounded-md ${isAlert ? 'bg-danger' : 'bg-white/5'}`}>
              <Text className={`text-[10px] font-bold italic ${isAlert ? 'text-white' : 'text-gray-500'}`}>
                {isAlert ? 'CRÍTICO' : (turno.tipo || 'SERVICIO')}
              </Text>
            </View>
          </View>

          <Text className="text-gray-400 text-xs mb-4" numberOfLines={2}>
            {turno.comentariosChofer || turno.descripcion || "Sin descripción"}
          </Text>

          <View className="flex-row justify-between items-center border-t border-white/5 pt-3">
            <View className="flex-row items-center">
              <MaterialIcons name="history" size={12} color="#444" />
              <Text className="text-[9px] text-gray-600 font-mono ml-1">
                {new Date(turno.fechaCreacion).toLocaleDateString()}
              </Text>
            </View>
            <Text className="text-[9px] text-gray-600 font-mono italic">ID: {turno.id?.slice(-5)}</Text>
          </View>
          <View className="flex-row space-x-2 mt-3">
            <TouchableOpacity onPress={() => { setSelectedTurno(turno); setModalVisible(true); }} className="flex-1 bg-white/5 py-2 rounded-lg items-center">
              <Text className="text-white text-[12px]">Ver Detalle</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push({ pathname: '/solicitud', params: { prefillData: JSON.stringify(turno) } })} className="flex-1 bg-danger py-2 rounded-lg items-center">
              <Text className="text-white text-[12px]">Derivar a Taller</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </BlurView>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface pt-4">
      <LinearGradient colors={['#0b0b0b', '#000']} className="flex-1 px-4">
        {loading && <LoadingOverlay message="Sincronizando..." />}

        {/* HEADER COMPACTO */}
        <View className="flex-row justify-between items-end mt-4 mb-6">
          <View>
            <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[4px]">Command Center</Text>
            <Text className="text-white text-2xl font-black italic">MIT_DASHBOARD</Text>
          </View>

          <View className="flex-row items-center bg-card px-3 py-1 rounded-2xl border border-white/10">
            <View className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
            <Text className="text-success text-[10px] font-bold">LIVE_SINC</Text>
          </View>

          {onLogout && (
            <TouchableOpacity onPress={onLogout} className="ml-3 rounded-xl p-2" style={{ backgroundColor: '#FF4C4C12', borderWidth: 1, borderColor: '#FF4C4C22' }}>
              <MaterialIcons name="logout" size={18} color="#FF4C4C" />
            </TouchableOpacity>
          )}
        </View>

        {/* KPIS COMPACTOS - UNA FILA */}
        <View className="flex-row items-center justify-between mb-4 space-x-3">
          <View className="flex-1 h-20 rounded-2xl overflow-hidden">
            <BlurView intensity={8} tint="dark" className="p-3 bg-card/30 rounded-2xl border border-white/5 h-full">
              <Text className="text-gray-400 text-[10px] uppercase font-bold">Entregas</Text>
              <Text className="text-white text-lg font-black mt-1">{columns[2].data.length}</Text>
            </BlurView>
          </View>

          <View className="flex-1 h-20 rounded-2xl overflow-hidden">
            <BlurView intensity={8} tint="dark" className="p-3 bg-card/30 rounded-2xl border border-white/5 h-full">
              <Text className="text-gray-400 text-[10px] uppercase font-bold">Ocupación</Text>
              <Text className="text-white text-lg font-black mt-1">{columns[1].data.length}</Text>
            </BlurView>
          </View>

          <View className="flex-1 h-20 rounded-2xl overflow-hidden">
            <BlurView intensity={8} tint="dark" className="p-3 bg-card/30 rounded-2xl border border-white/5 h-full">
              <Text className="text-gray-400 text-[10px] uppercase font-bold">Esperando</Text>
              <Text className="text-white text-lg font-black mt-1">{columns[0].data.length}</Text>
            </BlurView>
          </View>
        </View>

        {/* GESTIÓN DOCUMENTAL - FRANJA DELGADA COMPACTA */}
        <View className="mb-4">
          <Text className="text-gray-400 uppercase text-[12px] font-bold mb-2">GESTIÓN DOCUMENTAL</Text>
          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={() => { openDoc('asistencia'); }}
              className="flex-1 bg-card/30 rounded-lg py-3 items-center justify-center"
              activeOpacity={0.8}
            >
              <Text className="text-white text-2xl">🚑</Text>
              <Text className="text-white text-sm mt-1">Asistencia</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { openDoc('reparacion'); }}
              className="flex-1 bg-card/30 rounded-lg py-3 items-center justify-center"
              activeOpacity={0.8}
            >
              <Text className="text-white text-2xl">🛠️</Text>
              <Text className="text-white text-sm mt-1">Informe</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { openDoc('presupuesto'); }}
              className="flex-1 bg-card/30 rounded-lg py-3 items-center justify-center"
              activeOpacity={0.8}
            >
              <Text className="text-white text-2xl">💰</Text>
              <Text className="text-white text-sm mt-1">Presupuesto</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* KANBAN / LISTA (ESPACIADO REDUCIDO) */}
        <View className={`flex-1 ${isMonitor ? 'flex-row' : 'flex-col'} -mx-2`}> 
          {isMonitor ? (
            columns.map(col => (
              <KanbanColumn
                key={col.id}
                title={col.title}
                data={col.data}
                color={col.color}
                icon={col.icon}
                renderCard={renderTurnoCard}
              />
            ))
          ) : (
            <View className="flex-1">
              <View className="flex-row justify-between mb-3">
                <TouchableOpacity onPress={() => setActiveTab('pendientes')} className={`flex-1 py-2 mr-2 rounded-2xl items-center ${activeTab === 'pendientes' ? 'bg-primary/20' : 'bg-white/5'}`}>
                  <Text className="text-white text-sm font-bold">Pendientes</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('entaller')} className={`flex-1 py-2 mx-1 rounded-2xl items-center ${activeTab === 'entaller' ? 'bg-primary/20' : 'bg-white/5'}`}>
                  <Text className="text-white text-sm font-bold">En Taller</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('finalizados')} className={`flex-1 py-2 ml-2 rounded-2xl items-center ${activeTab === 'finalizados' ? 'bg-primary/20' : 'bg-white/5'}`}>
                  <Text className="text-white text-sm font-bold">Finalizados</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-1 pb-16">
                {columns.filter(c => c.id === activeTab).map(col => {
                  const total = col.data.length;
                  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
                  const start = (currentPage - 1) * ITEMS_PER_PAGE;
                  const pageItems = col.data.slice(start, start + ITEMS_PER_PAGE);

                  return (
                    <View key={col.id} className="px-1 flex-1">
                      <View className="flex-row items-center mb-3 px-2">
                        <View style={{ backgroundColor: col.color }} className="w-2 h-2 rounded-full mr-2 shadow-lg" />
                        <Text className="text-white font-bold uppercase text-xs tracking-widest flex-1">{col.title}</Text>
                        <View className="bg-white/10 px-2 py-1 rounded-lg">
                          <Text className="text-white text-[10px] font-bold">{total}</Text>
                        </View>
                      </View>

                      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                        {pageItems.map((item: any) => renderTurnoCard(item))}
                      </ScrollView>

                      <View className="flex-row items-center justify-between mt-3">
                        <TouchableOpacity
                          onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                          className={`px-4 py-2 rounded-lg ${currentPage <= 1 ? 'bg-white/5' : 'bg-primary'}`}
                        >
                          <Text className="text-white">Anterior</Text>
                        </TouchableOpacity>

                        <View>
                          <Text className="text-gray-300">Página {currentPage} de {totalPages}</Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className={`px-4 py-2 rounded-lg ${currentPage >= totalPages ? 'bg-white/5' : 'bg-primary'}`}
                        >
                          <Text className="text-white">Siguiente</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </LinearGradient>
      {/* Document generator modal (compact) */}
      {docType && DocGen && (
        <DocGen
          visible={docModalVisible}
          onClose={() => { setDocModalVisible(false); setDocType(null); }}
          docType={docType}
        />
      )}
    </SafeAreaView>
  );
};

export default AdminDashboard;