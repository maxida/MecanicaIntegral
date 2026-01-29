import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, Modal, useWindowDimensions, Platform } from 'react-native';
import { 
  Clock, 
  Wrench, 
  CheckCircle2, 
  LogOut, 
  History, 
  AlertTriangle,
  Ambulance,
  FileText,
  Receipt,
  ChevronLeft,
  ChevronRight
} from 'lucide-react-native';
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
import TurnoDetailModal from '@/components/TurnoDetailModal';

// --- CONSTANTES DE COLORES (Strict Color Scheme) ---
const COLUMN_COLORS = {
  pendientes: '#ef4444',  // red-500 - Urgencia/Cola de espera
  entaller: '#eab308',    // yellow-500 - Trabajo en progreso
  finalizados: '#10b981', // emerald-500 - Tarea completada
} as const;

// --- SUB-COMPONENTES PREMIUM ---

// Burbuja de Conteo con Color Sólido Vibrante
const CountBadge = ({ count, color }: { count: number; color: string }) => {
  // Contraste: texto blanco para rojo/verde, texto negro para amarillo
  const textColor = color === COLUMN_COLORS.entaller ? '#000' : '#FFF';
  return (
    <View 
      style={{ backgroundColor: color }} 
      className="px-3 py-1.5 rounded-full min-w-[28px] items-center justify-center shadow-lg"
    >
      <Text style={{ color: textColor }} className="text-xs font-black">{count}</Text>
    </View>
  );
};

// KPI Card con Estilo Semáforo Vibrante
const KpiCard = ({ 
  label, 
  value, 
  color, 
  icon: Icon,
  subtitle 
}: { 
  label: string; 
  value: number; 
  color: string; 
  icon: any;
  subtitle?: string;
}) => (
  <View 
    className="flex-1 mx-1.5"
    style={Platform.select({
      web: { boxShadow: `0 0 30px ${color}20, 0 4px 20px rgba(0,0,0,0.3)` } as any,
      default: {}
    })}
  >
    <View 
      className="rounded-2xl overflow-hidden border-2 bg-zinc-900/80"
      style={{ borderColor: color }}
    >
      {/* Glow Effect Top */}
      <View 
        style={{ backgroundColor: color, opacity: 0.15 }} 
        className="absolute top-0 left-0 right-0 h-16 blur-xl"
      />
      
      <View className="p-4 items-center">
        {/* Icono con Halo */}
        <View 
          style={{ backgroundColor: color + '20', borderColor: color + '40' }} 
          className="w-14 h-14 rounded-2xl items-center justify-center mb-3 border"
        >
          <Icon size={28} color={color} strokeWidth={2} />
        </View>
        
        {/* Contador Grande */}
        <Text style={{ color }} className="text-4xl font-black">{value}</Text>
        
        {/* Label */}
        <Text className="text-white text-xs font-bold uppercase tracking-wider mt-1">{label}</Text>
        
        {/* Subtitle opcional */}
        {subtitle && (
          <Text className="text-gray-500 text-[10px] mt-1">{subtitle}</Text>
        )}
      </View>
      
      {/* Bottom Accent Strip */}
      <View style={{ backgroundColor: color }} className="h-1 opacity-80" />
    </View>
  </View>
);

// Action Tile (Baldosa Grande) para Gestión Documental
const ActionTile = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  accentColor, 
  onPress 
}: { 
  title: string; 
  subtitle: string; 
  icon: any; 
  accentColor: string;
  onPress: () => void;
}) => (
  <TouchableOpacity 
    onPress={onPress} 
    activeOpacity={0.85}
    className="flex-1 mx-1.5"
    style={Platform.select({
      web: { boxShadow: `0 4px 20px ${accentColor}15` } as any,
      default: {}
    })}
  >
    <View 
      className="rounded-2xl overflow-hidden border p-5 items-center justify-center"
      style={{ 
        backgroundColor: accentColor + '10',
        borderColor: accentColor + '30'
      }}
    >
      {/* Icono Grande Centrado */}
      <View 
        style={{ backgroundColor: accentColor + '20', borderColor: accentColor + '50' }} 
        className="w-16 h-16 rounded-2xl items-center justify-center mb-3 border"
      >
        <Icon size={32} color={accentColor} strokeWidth={2} />
      </View>
      
      {/* Título en Negrita */}
      <Text className="text-white font-black text-base text-center">{title}</Text>
      
      {/* Subtítulo */}
      <Text style={{ color: accentColor }} className="text-[11px] font-semibold mt-1 uppercase tracking-wide">
        {subtitle}
      </Text>
    </View>
  </TouchableOpacity>
);

const KanbanColumn = ({ title, data, color, icon: Icon, renderCard }: { 
  title: string; 
  data: any[]; 
  color: string; 
  icon: any; 
  renderCard: (item: any, columnColor: string) => React.ReactNode;
}) => (
  <View className="flex-1 mx-2 min-w-[300px] monitor:min-w-0">
    {/* Header de Columna con Burbuja de Conteo */}
    <View className="flex-row items-center mb-4 px-2">
      <View style={{ backgroundColor: color }} className="w-3 h-3 rounded-full mr-3 shadow-lg" />
      <Icon size={16} color={color} strokeWidth={2.5} />
      <Text className="text-white font-bold uppercase text-xs tracking-widest flex-1 ml-2">{title}</Text>
      <CountBadge count={data.length} color={color} />
    </View>
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
      {data.map((item: any) => renderCard(item, color))}
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
    { id: 'pendientes', title: 'Pendientes', icon: Clock, color: COLUMN_COLORS.pendientes, data: turnos.filter(t => t.estado === 'pending' || t.estado === 'scheduled') },
    { id: 'entaller', title: 'En Taller', icon: Wrench, color: COLUMN_COLORS.entaller, data: turnos.filter(t => t.estado === 'in_progress') },
    { id: 'finalizados', title: 'Finalizados', icon: CheckCircle2, color: COLUMN_COLORS.finalizados, data: turnos.filter(t => t.estado === 'completed') },
  ];
  const ITEMS_PER_PAGE = 2;
  const [currentPage, setCurrentPage] = useState(1);

  // Tipo de estados válidos
  type TurnoEstado = 'pending' | 'scheduled' | 'in_progress' | 'completed';

  // Acciones de Negocio
  const handleUpdateStatus = async (id: string, nuevoEstado: TurnoEstado) => {
    try {
      await actualizarTurnoService(id, { estado: nuevoEstado });
      dispatch(actualizarTurno({ id, estado: nuevoEstado } as any));
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

  const renderTurnoCard = (turno: any, columnColor: string = COLUMN_COLORS.pendientes) => {
    // CORRECCIÓN: Buscamos "alert" que es como viene de tu DB
    const isAlert = turno.estadoGeneral === 'alert';
    
    // Determinar si el turno está en estado pendiente (permite derivar)
    const isPending = columnColor === COLUMN_COLORS.pendientes;

    // Determinar color del badge según la columna
    const getBadgeStyle = () => {
      if (columnColor === COLUMN_COLORS.pendientes) {
        return { bg: 'bg-red-500', text: 'text-white' };
      } else if (columnColor === COLUMN_COLORS.entaller) {
        return { bg: 'bg-yellow-500', text: 'text-black' };
      } else {
        return { bg: 'bg-emerald-500', text: 'text-white' };
      }
    };
    const badgeStyle = getBadgeStyle();

    return (
      <View 
        key={turno.id} 
        className="mb-4 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800"
        style={Platform.select({
          web: { 
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
          } as any,
          default: {}
        })}
      >
        {/* Borde lateral izquierdo grueso del color de la columna */}
        <View 
          style={{ backgroundColor: columnColor }} 
          className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
        />
        
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => { setSelectedTurno(turno); setModalVisible(true); }}
          className="p-4 pl-5"
        >
          <View className="flex-row justify-between items-start mb-3">
            <View>
              <Text className="text-white font-bold text-base leading-tight">{turno.chofer || 'Chofer no identificado'}</Text>
              {/* CORRECCIÓN: Mostramos numeroPatente */}
              <Text className="text-primary font-mono text-xs mt-1 tracking-tighter">
                {turno.numeroPatente === "S/D" ? "⚠️ SIN PATENTE" : turno.numeroPatente}
              </Text>
            </View>

            {/* INDICADOR DE ESTADO - Badge que hereda color de columna */}
            <View className={`px-2 py-1 rounded-md ${isAlert ? 'bg-red-600' : badgeStyle.bg}`}>
              <Text className={`text-[10px] font-bold italic ${isAlert ? 'text-white' : badgeStyle.text}`}>
                {isAlert ? 'CRÍTICO' : (turno.tipo || 'SERVICIO')}
              </Text>
            </View>
          </View>

          <Text className="text-gray-400 text-xs mb-4" numberOfLines={2}>
            {turno.comentariosChofer || turno.descripcion || "Sin descripción"}
          </Text>

          <View className="flex-row justify-between items-center border-t border-zinc-700 pt-3">
            <View className="flex-row items-center">
              <History size={12} color="#666" />
              <Text className="text-[9px] text-gray-600 font-mono ml-1">
                {new Date(turno.fechaCreacion).toLocaleDateString()}
              </Text>
            </View>
            <Text className="text-[9px] text-gray-600 font-mono italic">ID: {turno.id?.slice(-5)}</Text>
          </View>
          
          {/* BOTONES CONDICIONALES: Solo mostramos "Derivar" en PENDIENTES */}
          <View className="flex-row space-x-2 mt-3">
            <TouchableOpacity 
              onPress={() => { setSelectedTurno(turno); setModalVisible(true); }} 
              className={`${isPending ? 'flex-1' : 'w-full'} bg-zinc-800 py-2.5 rounded-xl items-center border border-zinc-700`}
            >
              <Text className="text-white text-[12px] font-semibold">Ver Detalle</Text>
            </TouchableOpacity>
            
            {/* Botón DERIVAR solo visible en columna PENDIENTES */}
            {isPending && (
              <TouchableOpacity 
                onPress={() => router.push({ pathname: '/solicitud', params: { prefillData: JSON.stringify(turno) } })} 
                className="flex-1 bg-red-600 py-2.5 rounded-xl items-center"
                style={Platform.select({
                  web: { boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)' } as any,
                  default: {}
                })}
              >
                <Text className="text-white text-[12px] font-bold">Derivar a Taller</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface pt-8">
      <LinearGradient colors={['#0b0b0b', '#000']} className="flex-1 px-4">
        {loading && <LoadingOverlay message="Sincronizando..." />}

        {/* HEADER COMPACTO */}
        <View className="flex-row justify-between items-end mt-4 mb-5">
          <View>
            <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[4px]">Command Center</Text>
            <Text className="text-white text-2xl font-black italic">ADMINISTRACIÓN DE TALLER</Text>
          </View>

          <View className="flex-row items-center bg-card px-3 py-1 rounded-2xl border border-white/10">
            <View className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
            <Text className="text-success text-[10px] font-bold">LIVE_SINC</Text>
          </View>

          {onLogout && (
            <TouchableOpacity onPress={onLogout} className="ml-3 rounded-xl p-2" style={{ backgroundColor: '#FF4C4C12', borderWidth: 1, borderColor: '#FF4C4C22' }}>
              <LogOut size={18} color="#FF4C4C" />
            </TouchableOpacity>
          )}
        </View>

        {/* KPIs SEMÁFORO - Vista Rápida del Estado del Taller */}
        <View className="flex-row mb-6 -mx-1.5">
          {/* ROJO: Pendientes (La Cola) */}
          <KpiCard
            label="Pendientes"
            subtitle="En cola de espera"
            value={columns[0].data.length}
            color={COLUMN_COLORS.pendientes}
            icon={Clock}
          />
          
          {/* AMARILLO: En Taller (El Proceso) */}
          <KpiCard
            label="En Taller"
            subtitle="Reparando ahora"
            value={columns[1].data.length}
            color={COLUMN_COLORS.entaller}
            icon={Wrench}
          />
          
          {/* VERDE: Finalizados (El Éxito) */}
          <KpiCard
            label="Finalizados"
            subtitle="Listos para entrega"
            value={columns[2].data.length}
            color={COLUMN_COLORS.finalizados}
            icon={CheckCircle2}
          />
        </View>

        {/* GESTIÓN DOCUMENTAL - Action Tiles Premium */}
        <View className="mb-5">
          <Text className="text-gray-500 uppercase text-[10px] font-black tracking-[3px] mb-3 ml-1">ACCIONES RÁPIDAS</Text>
          <View className="flex-row -mx-1.5">
            <ActionTile
              title="Asistencia"
              subtitle="→ Generar PDF"
              icon={Ambulance}
              accentColor="#f97316"
              onPress={() => openDoc('asistencia')}
            />

            <ActionTile
              title="Informe"
              subtitle="→ Reporte Técnico"
              icon={FileText}
              accentColor="#3b82f6"
              onPress={() => openDoc('reparacion')}
            />

            <ActionTile
              title="Presupuesto"
              subtitle="→ Cotización"
              icon={Receipt}
              accentColor="#10b981"
              onPress={() => openDoc('presupuesto')}
            />
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
              {/* Mobile Tabs con colores de columna */}
              <View className="flex-row justify-between mb-4">
                <TouchableOpacity 
                  onPress={() => setActiveTab('pendientes')} 
                  className={`flex-1 py-2.5 mr-2 rounded-2xl items-center flex-row justify-center space-x-2`}
                  style={{ 
                    backgroundColor: activeTab === 'pendientes' ? COLUMN_COLORS.pendientes + '30' : 'rgba(255,255,255,0.05)',
                    borderWidth: activeTab === 'pendientes' ? 1 : 0,
                    borderColor: COLUMN_COLORS.pendientes + '50'
                  }}
                >
                  <Clock size={14} color={activeTab === 'pendientes' ? COLUMN_COLORS.pendientes : '#888'} />
                  <Text style={{ color: activeTab === 'pendientes' ? COLUMN_COLORS.pendientes : '#FFF' }} className="text-sm font-bold">Pendientes</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => setActiveTab('entaller')} 
                  className={`flex-1 py-2.5 mx-1 rounded-2xl items-center flex-row justify-center space-x-2`}
                  style={{ 
                    backgroundColor: activeTab === 'entaller' ? COLUMN_COLORS.entaller + '30' : 'rgba(255,255,255,0.05)',
                    borderWidth: activeTab === 'entaller' ? 1 : 0,
                    borderColor: COLUMN_COLORS.entaller + '50'
                  }}
                >
                  <Wrench size={14} color={activeTab === 'entaller' ? COLUMN_COLORS.entaller : '#888'} />
                  <Text style={{ color: activeTab === 'entaller' ? COLUMN_COLORS.entaller : '#FFF' }} className="text-sm font-bold">En Taller</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => setActiveTab('finalizados')} 
                  className={`flex-1 py-2.5 ml-2 rounded-2xl items-center flex-row justify-center space-x-2`}
                  style={{ 
                    backgroundColor: activeTab === 'finalizados' ? COLUMN_COLORS.finalizados + '30' : 'rgba(255,255,255,0.05)',
                    borderWidth: activeTab === 'finalizados' ? 1 : 0,
                    borderColor: COLUMN_COLORS.finalizados + '50'
                  }}
                >
                  <CheckCircle2 size={14} color={activeTab === 'finalizados' ? COLUMN_COLORS.finalizados : '#888'} />
                  <Text style={{ color: activeTab === 'finalizados' ? COLUMN_COLORS.finalizados : '#FFF' }} className="text-sm font-bold">Finalizados</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-1 pb-16">
                {columns.filter(c => c.id === activeTab).map(col => {
                  const total = col.data.length;
                  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
                  const start = (currentPage - 1) * ITEMS_PER_PAGE;
                  const pageItems = col.data.slice(start, start + ITEMS_PER_PAGE);
                  const ColIcon = col.icon;

                  return (
                    <View key={col.id} className="px-1 flex-1">
                      {/* Header de columna móvil con CountBadge vibrante */}
                      <View className="flex-row items-center mb-4 px-2">
                        <View style={{ backgroundColor: col.color }} className="w-3 h-3 rounded-full mr-3 shadow-lg" />
                        <ColIcon size={16} color={col.color} strokeWidth={2.5} />
                        <Text className="text-white font-bold uppercase text-xs tracking-widest flex-1 ml-2">{col.title}</Text>
                        <CountBadge count={total} color={col.color} />
                      </View>

                      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                        {pageItems.map((item: any) => renderTurnoCard(item, col.color))}
                      </ScrollView>

                      {/* Paginación con iconos Lucide */}
                      <View className="flex-row items-center justify-between mt-4 px-2">
                        <TouchableOpacity
                          onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                          className={`flex-row items-center px-4 py-2.5 rounded-xl ${currentPage <= 1 ? 'bg-zinc-800/50' : 'bg-zinc-800 border border-zinc-700'}`}
                        >
                          <ChevronLeft size={16} color={currentPage <= 1 ? '#555' : '#FFF'} />
                          <Text className={`ml-1 ${currentPage <= 1 ? 'text-gray-600' : 'text-white'}`}>Anterior</Text>
                        </TouchableOpacity>

                        <View className="bg-zinc-800/50 px-4 py-2 rounded-xl">
                          <Text className="text-gray-300 text-sm">{currentPage} / {totalPages}</Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className={`flex-row items-center px-4 py-2.5 rounded-xl ${currentPage >= totalPages ? 'bg-zinc-800/50' : 'bg-zinc-800 border border-zinc-700'}`}
                        >
                          <Text className={`mr-1 ${currentPage >= totalPages ? 'text-gray-600' : 'text-white'}`}>Siguiente</Text>
                          <ChevronRight size={16} color={currentPage >= totalPages ? '#555' : '#FFF'} />
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
      
      {/* Turno Detail Modal - Vista Pro del Admin */}
      <TurnoDetailModal
        visible={modalVisible}
        turno={selectedTurno}
        onClose={() => { setModalVisible(false); setSelectedTurno(null); }}
        adminContext={true}
      />
    </SafeAreaView>
  );
};

export default AdminDashboard;