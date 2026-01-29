import { ArrowLeft, Wrench, User, FileText, Gauge, Fuel, ChevronDown, AlertTriangle, Send } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import CustomAlert from '@/components/CustomAlert';
import LoadingOverlay from '@/components/LoadingOverlay';
import { useGlobalLoading } from '@/components/GlobalLoading';
import { useDispatch, useSelector } from 'react-redux';
import { actualizarTurno } from '@/redux/slices/turnosSlice';
import { RootState } from '@/redux/store';
import { derivarATaller } from '@/services/solicitudService';
import { obtenerMecanicos } from '@/services/userService';

// Tipo para mecánico
interface Mecanico {
  id: string;
  nombre: string;
  email?: string;
}

const SolicitudScreen = () => {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.login.user);

  const params = useLocalSearchParams();
  const prefillRaw = (params as any)?.prefillData ?? (params as any)?.turno ?? null;
  const prefill = useMemo(() => {
    try {
      if (!prefillRaw) return null;
      return typeof prefillRaw === 'string' ? JSON.parse(prefillRaw as any) : prefillRaw;
    } catch (e) {
      return null;
    }
  }, [prefillRaw]);

  // Estado del formulario
  const [formData, setFormData] = useState(() => ({
    patente: prefill?.numeroPatente ?? '',
    modelo: prefill?.modelo ?? '',
    marca: prefill?.marca ?? '',
    descripcion: prefill 
      ? `Derivado de Ingreso. Síntomas: ${(prefill.sintomas || []).join(', ')}. Notas: ${prefill.comentariosChofer || prefill.descripcion || ''}`
      : '',
    chofer: prefill?.chofer ?? user?.nombre ?? '',
    tipo: 'reparacion' as 'reparacion' | 'mantenimiento' | 'asistencia',
    prioridad: 2 as 1 | 2 | 3, // 1=Alta, 2=Media, 3=Baja
    kilometraje: prefill?.kilometraje ?? '',
    nivelNafta: prefill?.nivelNafta ?? '',
    fotoTablero: prefill?.fotoTablero ?? null,
    sintomas: prefill?.sintomas ?? [],
    originalTurnoId: prefill?.id ?? null,
  }));

  // Estado del mecánico seleccionado
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [selectedMecanico, setSelectedMecanico] = useState<Mecanico | null>(null);
  const [mecanicoModalVisible, setMecanicoModalVisible] = useState(false);
  const [loadingMecanicos, setLoadingMecanicos] = useState(true);

  const [loading, setLoading] = useState(false);
  const globalLoading = useGlobalLoading();

  // Cargar mecánicos al montar
  useEffect(() => {
    const fetchMecanicos = async () => {
      try {
        const lista = await obtenerMecanicos();
        setMecanicos(lista as Mecanico[]);
      } catch (error) {
        console.error('Error cargando mecánicos:', error);
        // Fallback a mecánico demo si falla Firestore
        setMecanicos([{ id: 'mecanico-demo', nombre: 'Juan (Mecánico)' }]);
      } finally {
        setLoadingMecanicos(false);
      }
    };
    fetchMecanicos();
  }, []);

  // HANDLER PRINCIPAL: Derivar a Taller (TRANSACCIÓN ATÓMICA)
  const handleSubmit = async () => {
    // Validaciones
    if (!formData.patente.trim()) {
      CustomAlert.alert('Error', 'La patente es obligatoria');
      return;
    }
    if (!formData.descripcion.trim()) {
      CustomAlert.alert('Error', 'La descripción del problema es obligatoria');
      return;
    }
    if (!selectedMecanico) {
      CustomAlert.alert('Error', 'Debes seleccionar un mecánico para asignar la tarea');
      return;
    }
    if (!formData.originalTurnoId) {
      CustomAlert.alert('Error', 'No se encontró el turno original para derivar');
      return;
    }

    setLoading(true);
    globalLoading.show('Derivando a taller...');

    try {
      // Ejecutar transacción atómica
      const { solicitudId } = await derivarATaller({
        turnoId: formData.originalTurnoId,
        // Datos del vehículo
        numeroPatente: formData.patente,
        modelo: formData.modelo,
        marca: formData.marca,
        // Datos del reporte
        sintomas: formData.sintomas,
        fotoUrl: formData.fotoTablero,
        kilometraje: formData.kilometraje,
        nivelNafta: formData.nivelNafta,
        chofer: formData.chofer,
        // Instrucciones del Admin
        notasAdmin: formData.descripcion,
        tipo: formData.tipo,
        prioridad: formData.prioridad,
        // Mecánico asignado
        mecanicoAsignado: selectedMecanico.id,
        mecanicoNombre: selectedMecanico.nombre,
      });

      // Actualizar Redux local para reflejar el cambio inmediato
      dispatch(actualizarTurno({
        id: formData.originalTurnoId,
        estado: 'in_progress',
        derivadoATaller: true,
        mecanicoAsignado: selectedMecanico.id,
      } as any));

      CustomAlert.alert(
        '¡Derivado con Éxito!', 
        `La tarea fue asignada a ${selectedMecanico.nombre}. El turno ahora aparece en "En Taller".`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );

    } catch (error) {
      console.error('Error derivando a taller:', error);
      CustomAlert.alert('Error', 'No se pudo completar la derivación. Intenta de nuevo.');
    } finally {
      setLoading(false);
      globalLoading.hide();
    }
  };

  // Renderizar selector de mecánico
  const renderMecanicoSelector = () => (
    <TouchableOpacity
      onPress={() => setMecanicoModalVisible(true)}
      className="bg-zinc-900 rounded-xl p-4 border border-zinc-700 flex-row items-center justify-between"
      style={selectedMecanico ? { borderColor: '#3b82f6' } : {}}
    >
      <View className="flex-row items-center flex-1">
        <User size={20} color={selectedMecanico ? '#3b82f6' : '#666'} />
        <Text className={`ml-3 ${selectedMecanico ? 'text-white font-semibold' : 'text-gray-500'}`}>
          {selectedMecanico ? selectedMecanico.nombre : 'Seleccionar mecánico...'}
        </Text>
      </View>
      <ChevronDown size={20} color="#666" />
    </TouchableOpacity>
  );

  // Modal de selección de mecánico
  const renderMecanicoModal = () => (
    <Modal
      visible={mecanicoModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setMecanicoModalVisible(false)}
    >
      <View className="flex-1 bg-black/80 justify-end">
        <View className="bg-zinc-900 rounded-t-3xl max-h-[60%]">
          <View className="p-4 border-b border-zinc-800">
            <Text className="text-white text-lg font-bold text-center">Seleccionar Mecánico</Text>
          </View>
          
          {loadingMecanicos ? (
            <View className="p-8 items-center">
              <Text className="text-gray-400">Cargando mecánicos...</Text>
            </View>
          ) : mecanicos.length === 0 ? (
            <View className="p-8 items-center">
              <AlertTriangle size={32} color="#eab308" />
              <Text className="text-gray-400 mt-2 text-center">No hay mecánicos disponibles</Text>
            </View>
          ) : (
            <FlatList
              data={mecanicos}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedMecanico(item);
                    setMecanicoModalVisible(false);
                  }}
                  className={`p-4 border-b border-zinc-800 flex-row items-center ${
                    selectedMecanico?.id === item.id ? 'bg-blue-500/20' : ''
                  }`}
                >
                  <View className="w-10 h-10 rounded-full bg-zinc-800 items-center justify-center mr-3">
                    <Wrench size={18} color="#60A5FA" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold">{item.nombre}</Text>
                    {item.email && <Text className="text-gray-500 text-xs">{item.email}</Text>}
                  </View>
                  {selectedMecanico?.id === item.id && (
                    <View className="w-6 h-6 rounded-full bg-blue-500 items-center justify-center">
                      <Text className="text-white text-xs">✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
          )}
          
          <TouchableOpacity
            onPress={() => setMecanicoModalVisible(false)}
            className="p-4 items-center border-t border-zinc-800"
          >
            <Text className="text-gray-400 font-semibold">Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <LinearGradient colors={['#0a0a0a', '#000']} className="flex-1">
        {loading && <LoadingOverlay message="Derivando a taller..." />}
        
        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View className="flex-row items-center mb-6">
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              className="mr-4 p-2 rounded-xl bg-zinc-900 border border-zinc-800"
            >
              <ArrowLeft size={22} color="#60A5FA" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[2px]">Admin Action</Text>
              <Text className="text-white text-2xl font-black">Derivar a Taller</Text>
            </View>
          </View>

          {/* PREVIEW: Foto del tablero si existe */}
          {formData.fotoTablero && (
            <View className="mb-6">
              <Text className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">📸 Evidencia del Tablero</Text>
              <Image 
                source={{ uri: formData.fotoTablero }} 
                className="w-full h-48 rounded-2xl bg-zinc-900" 
                resizeMode="cover" 
              />
            </View>
          )}

          {/* SÍNTOMAS REPORTADOS */}
          {formData.sintomas.length > 0 && (
            <View className="mb-6">
              <Text className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">⚠️ Síntomas Reportados</Text>
              <View className="flex-row flex-wrap gap-2">
                {formData.sintomas.map((sintoma: string, idx: number) => (
                  <View key={idx} className="bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/40">
                    <Text className="text-red-400 text-xs font-semibold">{sintoma}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* FORMULARIO */}
          <View className="space-y-4">
            {/* Patente */}
            <View>
              <Text className="text-white font-semibold mb-2">Patente del Vehículo *</Text>
              <TextInput
                value={formData.patente}
                onChangeText={(text) => setFormData({ ...formData, patente: text.toUpperCase() })}
                placeholder="ABC-123"
                placeholderTextColor="#666"
                className="bg-zinc-900 rounded-xl p-4 text-white border border-zinc-700 text-lg font-bold"
                autoCapitalize="characters"
                editable={!prefill} // No editable si viene prefilled
              />
            </View>

            {/* Chofer */}
            <View>
              <Text className="text-white font-semibold mb-2">Chofer</Text>
              <TextInput
                value={formData.chofer}
                onChangeText={(text) => setFormData({ ...formData, chofer: text })}
                placeholder="Nombre del chofer"
                placeholderTextColor="#666"
                className="bg-zinc-900 rounded-xl p-4 text-white border border-zinc-700"
              />
            </View>

            {/* Tipo de Servicio */}
            <View>
              <Text className="text-white font-semibold mb-2">Tipo de Servicio</Text>
              <View className="flex-row space-x-2">
                {(['reparacion', 'mantenimiento', 'asistencia'] as const).map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    onPress={() => setFormData({ ...formData, tipo })}
                    className={`flex-1 rounded-xl p-3 items-center border ${
                      formData.tipo === tipo 
                        ? 'border-blue-500 bg-blue-500/20' 
                        : 'bg-zinc-900 border-zinc-700'
                    }`}
                  >
                    <Text className={`text-xs font-bold uppercase ${
                      formData.tipo === tipo ? 'text-blue-400' : 'text-gray-400'
                    }`}>
                      {tipo}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Prioridad */}
            <View>
              <Text className="text-white font-semibold mb-2">Prioridad</Text>
              <View className="flex-row space-x-2">
                {[
                  { value: 1, label: 'ALTA', color: '#ef4444' },
                  { value: 2, label: 'MEDIA', color: '#eab308' },
                  { value: 3, label: 'BAJA', color: '#10b981' },
                ].map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    onPress={() => setFormData({ ...formData, prioridad: p.value as 1 | 2 | 3 })}
                    className={`flex-1 rounded-xl p-3 items-center border`}
                    style={{
                      backgroundColor: formData.prioridad === p.value ? p.color + '30' : '#18181b',
                      borderColor: formData.prioridad === p.value ? p.color : '#3f3f46',
                    }}
                  >
                    <Text 
                      className="text-xs font-black"
                      style={{ color: formData.prioridad === p.value ? p.color : '#9ca3af' }}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* MECÁNICO ASIGNADO (CRÍTICO) */}
            <View>
              <Text className="text-white font-semibold mb-2">Asignar Mecánico *</Text>
              {renderMecanicoSelector()}
              {!selectedMecanico && (
                <Text className="text-yellow-500 text-xs mt-1 ml-1">
                  ⚠️ Debes seleccionar un mecánico para derivar
                </Text>
              )}
            </View>

            {/* Descripción / Notas del Admin */}
            <View>
              <Text className="text-white font-semibold mb-2">Instrucciones para el Mecánico *</Text>
              <TextInput
                value={formData.descripcion}
                onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
                placeholder="Describe el trabajo a realizar, prioridades, observaciones..."
                placeholderTextColor="#666"
                className="bg-zinc-900 rounded-xl p-4 text-white border border-zinc-700 h-32"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            {/* Info técnica (readonly) */}
            <View className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
              <Text className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-2">Datos Técnicos</Text>
              <View className="flex-row space-x-4">
                <View className="flex-row items-center">
                  <Gauge size={14} color="#666" />
                  <Text className="text-gray-400 text-sm ml-1">
                    {formData.kilometraje ? `${Number(formData.kilometraje).toLocaleString('es-AR')} km` : 'N/A'}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Fuel size={14} color="#666" />
                  <Text className="text-gray-400 text-sm ml-1">
                    {formData.nivelNafta ? `${formData.nivelNafta}%` : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* BOTÓN SUBMIT */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !selectedMecanico}
            className={`mt-8 rounded-xl p-4 flex-row items-center justify-center ${
              loading || !selectedMecanico ? 'bg-zinc-700' : 'bg-blue-600'
            }`}
            style={!loading && selectedMecanico ? Platform.select({
              web: { boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)' } as any,
              default: {}
            }) : {}}
          >
            <Send size={20} color={loading || !selectedMecanico ? '#666' : '#FFF'} />
            <Text className={`text-lg font-black ml-2 uppercase ${
              loading || !selectedMecanico ? 'text-gray-500' : 'text-white'
            }`}>
              {loading ? 'Derivando...' : 'Confirmar Derivación'}
            </Text>
          </TouchableOpacity>

          {/* Hint */}
          <Text className="text-gray-600 text-xs text-center mt-4">
            Al confirmar, el turno pasará a "En Taller" y el mecánico recibirá la tarea
          </Text>
        </ScrollView>
      </LinearGradient>

      {/* Modal de Mecánicos */}
      {renderMecanicoModal()}
    </SafeAreaView>
  );
};

export default SolicitudScreen;
