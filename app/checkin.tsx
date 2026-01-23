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

// Definimos los síntomas más comunes para evitar que el chofer escriba
const SINTOMAS_PREDEFINIDOS = [
  { id: 'ruido_motor', label: 'Ruido Motor', icon: 'volume-up', cat: 'mecanica' },
  { id: 'tira_lado', label: 'Tira a un lado', icon: 'alt-route', cat: 'direccion' },
  { id: 'freno_largo', label: 'Freno Largo', icon: 'stop-circle', cat: 'direccion' },
  { id: 'aire_ac', label: 'Aire/Calefac.', icon: 'ac-unit', cat: 'confort' },
  { id: 'vibracion', label: 'Vibración', icon: 'vibration', cat: 'mecanica' },
  { id: 'luz_quemada', label: 'Luz Quemada', icon: 'lightbulb', cat: 'exterior' },
  { id: 'humo', label: 'Humo/Olor', icon: 'cloud', cat: 'mecanica' },
  { id: 'limpia_p', label: 'Limpia Parab.', icon: 'waves', cat: 'exterior' },
];

const NovedadesChoferForm = () => {
  const navigation = useNavigation<any>();
  const user = useSelector((state: RootState) => state.login.user);
  const route = useRoute<any>();

  const [km, setKm] = useState<number>(0);
  const [fuel, setFuel] = useState(50);
  const [sintomas, setSintomas] = useState<string[]>([]);
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

  const toggleSintoma = (id: string) => {
    setSintomas(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
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
        sintomas: sintomas,
        comentariosChofer: notas || null,
        estadoGeneral: sintomas.length > 0 ? 'alert' : 'ok',
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
        <ScrollView showsVerticalScrollIndicator={false} className="pt-6">

          <View className="mb-8">
            <Text className="text-white text-3xl font-black italic uppercase">Novedades</Text>
            <Text className="text-primary text-[10px] font-bold tracking-[3px]">REPORTE DE FIN DE JORNADA</Text>
          </View>

          {/* DATOS DUROS: KM Y NAFTA */}
          <View className="flex-row space-x-4 mb-6">
            <View className="flex-1 bg-card border border-white/10 rounded-[30px] p-4 items-center">
              <Text className="text-gray-500 text-[8px] font-bold uppercase mb-2">Kilometraje</Text>
              <NumberInput
                className="text-white text-2xl font-black text-center"
                value={km}
                onChangeText={(val: string) => setKm(Number(val) || 0)}
                decimalPlaces={0}
              />
            </View>
            <View className="flex-1 bg-card border border-white/10 rounded-[30px] p-4">
              <Text className="text-gray-500 text-[8px] font-bold uppercase mb-2 text-center">Diesel</Text>
              <View className="flex-row justify-between">
                {[0, 50, 100].map(v => (
                  <TouchableOpacity key={v} onPress={() => setFuel(v)} className={`px-2 py-1 rounded-lg ${fuel === v ? 'bg-primary' : 'bg-white/5'}`}>
                    <Text className="text-[10px] text-white font-bold">{v}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* BOTONERA DE SÍNTOMAS (NUEVO: Cero fricción) */}
          <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px] mb-4 ml-2">¿Cómo sentiste el camión?</Text>
          <View className="flex-row flex-wrap justify-between mb-6">
            {SINTOMAS_PREDEFINIDOS.map((s) => {
              const isSelected = sintomas.includes(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => toggleSintoma(s.id)}
                  style={{ width: '23%' }}
                  className={`aspect-square mb-3 rounded-2xl items-center justify-center border ${isSelected ? 'bg-primary border-primary' : 'bg-card border-white/5'}`}
                >
                  <MaterialIcons name={s.icon as any} size={24} color={isSelected ? 'white' : '#444'} />
                  <Text className={`text-[7px] font-bold mt-2 text-center uppercase ${isSelected ? 'text-white' : 'text-gray-600'}`}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* EVIDENCIA Y NOTAS */}
          <View className="flex-row space-x-4 mb-8">
            <TouchableOpacity onPress={takePhoto} className="flex-1 h-32 bg-card rounded-[30px] border border-dashed border-white/10 items-center justify-center overflow-hidden">
              {photo ? <Image source={{ uri: photo }} className="w-full h-full" /> : (
                <>
                  <MaterialIcons name="camera-alt" size={24} color="#60A5FA" />
                  <Text className="text-gray-600 text-[8px] font-bold mt-2">FOTO TABLERO</Text>
                </>
              )}
            </TouchableOpacity>

            <View className="flex-[1.5] bg-card rounded-[30px] border border-white/10 p-4">
              <Text className="text-gray-600 text-[8px] font-bold uppercase mb-2">Otras Notas</Text>
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
            className="mb-12 overflow-hidden rounded-[30px] shadow-2xl shadow-primary/40"
            disabled={saving}
          >
            <LinearGradient colors={['#60A5FA', '#2563EB']} className="py-6 items-center">
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