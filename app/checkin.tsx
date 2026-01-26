import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Image, Platform } from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Animated, { FadeInDown } from 'react-native-reanimated';
import LoadingOverlay from '@/components/LoadingOverlay';
import NumberInput from '@/components/NumberInput';
import CustomAlert from '@/components/CustomAlert';
import { crearTurnoService } from '@/services/turnosService';
import { agregarTurno } from '@/redux/slices/turnosSlice';
import { useDispatch } from 'react-redux';

// Checklist profesional de 20 ítems categorizados
const VEHICLE_CHECKLIST_ITEMS = [
  {
    category: 'Motor y Fluidos',
    items: [
      { id: 'aceite', label: 'Aceite', icon: 'opacity' },
      { id: 'refrigerante', label: 'Refrigerante', icon: 'ac-unit' },
      { id: 'fugas', label: 'Fugas', icon: 'warning' },
      { id: 'correas', label: 'Correas', icon: 'build' },
      { id: 'ruido_motor', label: 'Ruido Motor', icon: 'volume-up' },
    ],
  },
  {
    category: 'Rodamiento',
    items: [
      { id: 'neumaticos_presion', label: 'Neumáticos (Presión)', icon: 'track-changes' },
      { id: 'cubiertas_dano', label: 'Cubiertas (Daño)', icon: 'report-problem' },
      { id: 'direccion', label: 'Dirección', icon: 'sync_alt' },
      { id: 'frenos', label: 'Frenos', icon: 'stop' },
      { id: 'freno_mano', label: 'Freno Mano', icon: 'pan-tool' },
    ],
  },
  {
    category: 'Electricidad',
    items: [
      { id: 'luces_delanteras', label: 'Luces Delanteras', icon: 'lightbulb' },
      { id: 'luces_traseras', label: 'Luces Traseras', icon: 'lightbulb' },
      { id: 'guinos', label: 'Guiños', icon: 'swap-horiz' },
      { id: 'bateria', label: 'Batería', icon: 'battery-charging-full' },
      { id: 'tablero', label: 'Tablero', icon: 'dashboard' },
    ],
  },
  {
    category: 'Carrocería / Cabina',
    items: [
      { id: 'aire_ac', label: 'Aire Acond.', icon: 'ac-unit' },
      { id: 'limpiaparabrisas', label: 'Limpiaparabrisas', icon: 'water' },
      { id: 'espejos', label: 'Espejos', icon: 'visibility' },
      { id: 'vidrios', label: 'Vidrios', icon: 'filter-none' },
      { id: 'chapa_pintura', label: 'Chapa/Pintura', icon: 'brush' },
    ],
  },
];

const NovedadesChoferForm = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((state: RootState) => state.login.user);
  const route = useRoute<any>();

  const [km, setKm] = useState<number>(0);
  const [fuel, setFuel] = useState(50);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const dispatch = useDispatch();

  const resizeIfNeeded = async (uri: string, width?: number, height?: number) => {
    if (Platform.OS === 'web' || !width || !height) return uri;
    const maxDimension = Math.max(width, height);
    const MAX_DIMENSION = 1280;
    if (maxDimension <= MAX_DIMENSION) return uri;

    const scale = MAX_DIMENSION / maxDimension;
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);

    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: targetWidth, height: targetHeight } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );

    return manipulated.uri;
  };

  const toggleIssue = (id: string) => {
    setSelectedIssues(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const takePhoto = async () => {
    try {
      if (Platform.OS === 'web') {
        const webResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.6,
          allowsEditing: true,
        });

        if (!webResult.canceled && webResult.assets?.length) {
          setPhoto(webResult.assets[0].uri);
        }
        return;
      }

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        CustomAlert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para sacar la foto del tablero.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const safeUri = await resizeIfNeeded(asset.uri, asset.width, asset.height);
      setPhoto(safeUri);
    } catch (error) {
      console.error('Error al capturar la foto:', error);
      CustomAlert.alert('Error', 'No se pudo capturar la foto. Intenta nuevamente.');
    }
  };

  const handleFinalizarIngreso = async () => {
    // Validaciones mínimas
    if (!route.params?.numeroPatente) {
      CustomAlert.alert('Por favor, seleccione un vehículo primero');
      return;
    }

    if (!km && km !== 0) {
      CustomAlert.alert('Por favor ingresa el kilometraje');
      return;
    }

    setSaving(true);
    try {
      const patenteVal = route.params?.numeroPatente || 'S/D';
      const choferName = route.params?.choferName || user?.nombre || user?.username || null;

      const payload: any = {
        numeroPatente: patenteVal,
        patente: patenteVal,
        vehiculo: patenteVal,
        chofer: choferName,
        kilometraje: km,
        nivelNafta: fuel,
        fotoTablero: photo || null,
        sintomas: selectedIssues,
        comentariosChofer: notas || null,
        estadoGeneral: selectedIssues.length > 0 ? 'alert' : 'ok',
        estado: 'pending_triage',
        choferId: user?.id || null,
        fechaIngreso: new Date().toISOString(),
      };

      const id = await crearTurnoService(payload);

      // Optional: agregar al store inmediatamente
      dispatch(agregarTurno({ id, ...payload }));

      // Notificar y volver
      CustomAlert.alert('Ingreso registrado correctamente');
      navigation.reset({ index: 0, routes: [{ name: 'home' }] });
    } catch (err) {
      console.error('Error guardando ingreso:', err);
      CustomAlert.alert('Error al guardar el ingreso');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <LinearGradient colors={['#0b0b0b', '#000']} className="flex-1 px-6">
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="pt-10"
          contentContainerStyle={{ paddingBottom: 150 }}
          keyboardShouldPersistTaps="handled"
        >

          <View className="mb-4">
            <Text className="text-white text-3xl font-black italic uppercase">Novedades</Text>
            <Text className="text-primary text-[10px] font-bold tracking-[3px]">REPORTE DE FIN DE JORNADA</Text>
          </View>

          {/* DATOS DUROS: KM Y NAFTA */}
          <View className="flex-row space-x-4 mb-4">
            <View className="flex-1 bg-card border border-white/10 rounded-[30px] p-2 items-center">
              <Text className="text-gray-500 text-[8px] font-bold uppercase mb-2">Kilometraje</Text>
              <NumberInput
                className="text-white text-2xl font-black text-center"
                value={km}
                onChangeText={(val: string) => setKm(Number(val) || 0)}
                decimalPlaces={0}
              />
            </View>
            <View className="flex-1 bg-card border border-white/10 rounded-[30px] p-4">
              <Text className="text-gray-500 text-[8px] font-bold uppercase mb-2 text-center">Combustible</Text>
              <View className="flex-row justify-between">
                {[0, 50, 100].map(v => (
                  <TouchableOpacity key={v} onPress={() => setFuel(v)} className={`px-2 py-1 rounded-lg ${fuel === v ? 'bg-primary' : 'bg-white/5'}`}>
                    <Text className="text-[10px] text-white font-bold">{v}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* CHECKLIST CATEGORIZADO */}
          <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px] mb-2 ml-2">¿Cómo sentiste el camión?</Text>
          <View className="mb-6">
            {VEHICLE_CHECKLIST_ITEMS.map((group) => (
              <View key={group.category} className="mb-4">
                <Text className="text-gray-400 text-[10px] font-bold mb-2 uppercase">{group.category}</Text>
                <View className="flex-row flex-wrap">
                  {group.items.map((it) => {
                    const isSelected = selectedIssues.includes(it.id);
                    return (
                      <TouchableOpacity
                        key={it.id}
                        onPress={() => toggleIssue(it.id)}
                        style={{ width: '32%' }}
                        className={`px-3 py-2 mb-2 mr-2 rounded-xl flex-row items-center border ${isSelected ? 'bg-red-900/50 border-red-500' : 'bg-zinc-800 border-zinc-700'}`}
                      >
                        <MaterialIcons name={it.icon as any} size={18} color="#fff" />
                        <Text className={`text-[12px] ml-2 ${isSelected ? 'text-white' : 'text-gray-200'}`}>{it.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {/* EVIDENCIA Y NOTAS */}
          <View className="flex-row space-x-4 mb-1">
            <TouchableOpacity onPress={takePhoto} className="flex-1 h-64 bg-card rounded-[20px] border border-dashed border-white/10 items-center justify-center overflow-hidden">
              {photo ? (
                <View className="w-full h-64 bg-zinc-800 rounded-2xl overflow-hidden border border-zinc-700 mb-6">
                  <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
                </View>
              ) : (
                <>
                  <MaterialIcons name="camera-alt" size={24} color="#60A5FA" />
                  <Text className="text-gray-600 text-[10px] font-bold mt-2">FOTO TABLERO</Text>
                </>
              )}
            </TouchableOpacity>

            <View className="flex-[1.5] bg-card rounded-[30px] border border-white/10 p-4">
              <Text className="text-gray-600 text-[10px] font-bold uppercase mb-2">Otras Notas</Text>
              <TextInput
                multiline
                className="text-white text-xs"
                placeholder="Ej: Golpe en puerta..."
                placeholderTextColor="#222"
                value={notas}
                onChangeText={setNotas}
              />
            </View>
          </View>

          {/* CONFIRMAR */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleFinalizarIngreso}
            className="mt-3 mb-12 overflow-hidden rounded-[30px] shadow-2xl shadow-primary/40"
            disabled={saving}
          >
            <LinearGradient colors={['#60A5FA', '#2563EB']} className="py-4 items-center">
              <Text className="text-white text-xl font-black italic uppercase italic">Confirmar y Salir</Text>
            </LinearGradient>
          </TouchableOpacity>
          {saving && <LoadingOverlay message="Guardando ingreso..." />}

        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default NovedadesChoferForm;