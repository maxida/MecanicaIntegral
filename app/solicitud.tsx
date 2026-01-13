import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import CustomAlert from '@/components/CustomAlert';
import LoadingOverlay from '@/components/LoadingOverlay';
import { useGlobalLoading } from '@/components/GlobalLoading';
import { useDispatch, useSelector } from 'react-redux';
import { agregarNuevoTurno, actualizarTurnoService } from '@/services/turnosService';
import { agregarTurno } from '@/redux/slices/turnosSlice';
import { RootState } from '@/redux/store';

const SolicitudScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.login.user);

  const prefillRaw = route?.params?.prefillData ?? null;
  const prefill = useMemo(() => {
    try {
      return prefillRaw ? JSON.parse(prefillRaw as any) : null;
    } catch (e) {
      return null;
    }
  }, [prefillRaw]);

  const [formData, setFormData] = useState(() => ({
    patente: prefill?.numeroPatente ?? '',
    descripcion: prefill ? (`Síntomas: ${(prefill.sintomas || []).join(', ')}\nComentarios: ${prefill.comentariosChofer || prefill.descripcion || ''}`) : '',
    chofer: prefill?.chofer ?? user?.nombre ?? '',
    tipo: 'reparacion', // reparacion, mantenimiento, asistencia
    kilometraje: prefill?.kilometraje ?? '',
    nivelNafta: prefill?.nivelNafta ?? '',
    fotoTablero: prefill?.fotoTablero ?? null,
    checklistIngreso: prefill?.checklistIngreso ?? [],
    originalTurnoId: prefill?.id ?? null,
  }));

  const [loading, setLoading] = useState(false);
  const globalLoading = useGlobalLoading();

  const handleSubmit = async () => {
    if (!formData.patente.trim() || !formData.descripcion.trim()) {
      CustomAlert.alert('Error', 'Por favor completa la patente y descripción');
      return;
    }
    setLoading(true);
    globalLoading.show('Creando solicitud...');
    try {
      const nuevoTurno: any = {
        numeroPatente: formData.patente,
        fechaReparacion: new Date().toISOString().split('T')[0],
        horaReparacion: '09:00',
        descripcion: formData.descripcion,
        estado: 'scheduled', // directo a taller
        clienteId: user?.id,
        chofer: formData.chofer || user?.nombre || '',
        tipo: formData.tipo,
        prioridad: 2,
        // Technical fields preserved from ingreso
        kilometraje: formData.kilometraje,
        nivelNafta: formData.nivelNafta,
        fotoTablero: formData.fotoTablero,
        checklistIngreso: formData.checklistIngreso,
        origen: 'derivacion',
        origenTurnoId: formData.originalTurnoId,
      };

      const id = await agregarNuevoTurno(nuevoTurno);
      dispatch(agregarTurno({ ...nuevoTurno, id }));

      // Marcar el ingreso original como derivado
      if (formData.originalTurnoId) {
        await actualizarTurnoService(formData.originalTurnoId, { estado: 'derivado', derivadoATaller: true, fechaDerivacion: new Date().toISOString() });
      }

      CustomAlert.alert('Éxito', 'Solicitud creada y turno derivado al taller', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error creando solicitud:', error);
      CustomAlert.alert('Error', 'No se pudo crear la solicitud');
    } finally {
      setLoading(false);
      globalLoading.hide();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <LinearGradient colors={["#000000", "#121212"]} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 60 }}>
          {loading && <LoadingOverlay message="Creando solicitud..." />}
          {/* Header */}
          <View className="flex-row items-center mb-8">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
              <MaterialIcons name="arrow-back" size={24} color="#60A5FA" />
            </TouchableOpacity>
            <View>
              <Text className="text-white text-2xl font-black">Nueva Solicitud</Text>
              <Text className="text-gray-400 text-sm mt-1">Describe la reparación necesaria</Text>
            </View>
          </View>

          {/* Preview image if available */}
          {formData.fotoTablero ? (
            <View className="mb-6">
              <Text className="text-gray-500 text-xs font-black uppercase tracking-[2px] mb-2">Evidencia (Tablero)</Text>
              <Image source={{ uri: formData.fotoTablero }} className="w-full h-56 rounded-2xl bg-card" resizeMode="cover" />
            </View>
          ) : null}

          {/* Form */}
          <View className="mb-8">
            <View className="mb-4">
              <Text className="text-white font-semibold mb-2">Patente del Camión *</Text>
              <TextInput
                value={formData.patente}
                onChangeText={(text) => setFormData({ ...formData, patente: text.toUpperCase() })}
                placeholder="ABC-123"
                placeholderTextColor="#666"
                className="bg-[#1E1E1E] rounded-xl p-4 text-white border border-[#333]"
                autoCapitalize="characters"
              />
            </View>

            <View className="mb-4">
              <Text className="text-white font-semibold mb-2">Chofer</Text>
              <TextInput
                value={formData.chofer}
                onChangeText={(text) => setFormData({ ...formData, chofer: text })}
                placeholder="Nombre del chofer"
                placeholderTextColor="#666"
                className="bg-[#1E1E1E] rounded-xl p-4 text-white border border-[#333]"
              />
            </View>

            <View className="mb-4">
              <Text className="text-white font-semibold mb-2">Tipo de Servicio</Text>
              <View className="flex-row space-x-3">
                {['reparacion', 'mantenimiento', 'asistencia'].map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    onPress={() => setFormData({ ...formData, tipo })}
                    className={`flex-1 rounded-xl p-4 ${formData.tipo === tipo ? 'border-[#60A5FA] bg-[#60A5FA10]' : 'bg-[#1E1E1E] border-[#333]' } border`}
                  >
                    <Text className={`${formData.tipo === tipo ? 'text-[#60A5FA] font-semibold' : 'text-gray-400'}`}>{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-white font-semibold mb-2">Descripción del Problema *</Text>
              <TextInput
                value={formData.descripcion}
                onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
                placeholder="Describe detalladamente el problema o servicio requerido..."
                placeholderTextColor="#666"
                className="bg-[#1E1E1E] rounded-xl p-4 text-white border border-[#333] h-28"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Technical fields preview (readonly) */}
            <View className="mb-6">
              <Text className="text-gray-400 text-sm mb-2">Kilometraje: <Text className="text-white font-bold">{formData.kilometraje || 'N/A'}</Text></Text>
              <Text className="text-gray-400 text-sm">Nivel Nafta: <Text className="text-white font-bold">{formData.nivelNafta ? `${formData.nivelNafta}%` : 'N/A'}</Text></Text>
            </View>

          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className={`rounded-xl p-4 items-center ${loading ? 'opacity-60 bg-[#60A5FA]' : 'bg-[#60A5FA]'}`}
          >
            <Text className="text-white font-semibold">{loading ? 'Creando...' : 'Derivar a Reparación'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};


export default SolicitudScreen;