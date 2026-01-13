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
  const router = useRouter();

  // Lógica de carga y tiempo real
  useEffect(() => {
    const unsubscribe = suscribirseATurnos((data) => dispatch(setTurnos(data)));
    return () => unsubscribe();
  }, [dispatch]);

  // Filtros de estado
  const columns = [
    { id: 'pending', title: 'Backlog', icon: 'inventory', color: '#FACC15', data: turnos.filter(t => t.estado === 'pending') },
    { id: 'scheduled', title: 'Programados', icon: 'event', color: '#60A5FA', data: turnos.filter(t => t.estado === 'scheduled') },
    { id: 'in_progress', title: 'En Taller', icon: 'engineering', color: '#4ADE80', data: turnos.filter(t => t.estado === 'in_progress') },
    { id: 'completed', title: 'Finalizados', icon: 'verified', color: '#A855F7', data: turnos.filter(t => t.estado === 'completed') },
  ];

  // Acciones de Negocio
  const handleUpdateStatus = async (id: string, nuevoEstado: string) => {
    try {
      await actualizarTurnoService(id, { estado: nuevoEstado });
      dispatch(actualizarTurno({ id, estado: nuevoEstado }));
    } catch (e) { console.error(e); }
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
    <SafeAreaView className="flex-1 bg-surface">
      <LinearGradient colors={['#0b0b0b', '#000']} className="flex-1 px-6">
        {loading && <LoadingOverlay message="Sincronizando..." />}

        {/* HEADER TÉCNICO */}
        <View className="flex-row justify-between items-end mt-8 mb-10">
          <View>
            <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[4px]">Command Center</Text>
            <Text className="text-white text-3xl font-black italic">MIT_DASHBOARD</Text>
          </View>
          <View className="flex-row items-center bg-card px-4 py-2 rounded-2xl border border-white/10">
            <View className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
            <Text className="text-success text-[10px] font-bold">LIVE_SINC</Text>
          </View>
          {onLogout && (
            <TouchableOpacity onPress={onLogout} className="ml-3 rounded-xl p-3" style={{ backgroundColor: '#FF4C4C12', borderWidth: 1, borderColor: '#FF4C4C22' }}>
              <MaterialIcons name="logout" size={20} color="#FF4C4C" />
            </TouchableOpacity>
          )}
        </View>

        {/* STATS RESPONSIVE */}
        <View className="flex-row flex-wrap -mx-2 mb-6">
          <StatCard label="Entregas Hoy" value={columns[3].data.length} color="#A855F7" icon="check-circle" />
          <StatCard label="Ocupación" value={columns[2].data.length} color="#4ADE80" icon="bolt" />
          <StatCard label="Esperando" value={columns[0].data.length} color="#FACC15" icon="hourglass-empty" />
          {isMonitor && <StatCard label="Eficiencia" value="94%" color="#60A5FA" icon="trending-up" />}
        </View>

        {/* KANBAN SYSTEM */}
        <View className={`flex-1 ${isMonitor ? 'flex-row' : 'flex-col'} -mx-2`}>
          {columns.map(col => (
            <KanbanColumn
              key={col.id}
              title={col.title}
              data={col.data}
              color={col.color}
              icon={col.icon}
              renderCard={renderTurnoCard}
            />
          ))}
        </View>

        {/* ACCIONES RÁPIDAS FLOTANTES (Solo en móvil) */}
        {!isMonitor && (
          <TouchableOpacity className="absolute bottom-10 right-10 bg-danger w-16 h-16 rounded-full items-center justify-center shadow-2xl shadow-danger/50">
            <MaterialIcons name="add" size={30} color="white" />
          </TouchableOpacity>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

export default AdminDashboard;