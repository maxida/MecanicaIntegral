import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, Image, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import NumberInput from '@/components/NumberInput';
import ActionModal, { ActionModalType } from '@/components/ActionModal';

// --- ITEMS TRACTOR ---
const ITEMS_TRACTOR = [
  { id: 'papeles', label: 'Documentación', icon: 'file-document-outline', library: MaterialCommunityIcons },
  { id: 'luces', label: 'Luces', icon: 'lightbulb-on-outline', library: MaterialCommunityIcons },
  { id: 'fluidos', label: 'Fluidos', icon: 'oil', library: MaterialCommunityIcons },
  { id: 'neumaticos', label: 'Neumáticos', icon: 'car-tire-alert', library: MaterialCommunityIcons },
  { id: 'seguridad', label: 'Seguridad', icon: 'fire-extinguisher', library: FontAwesome5 },
  { id: 'espejos', label: 'Espejos', icon: 'mirror', library: MaterialCommunityIcons },
];

// --- ITEMS CISTERNA (NUEVO) ---
const ITEMS_CISTERNA = [
  { id: 'valvulas', label: 'Válvulas Cerradas', icon: 'valve', library: MaterialCommunityIcons },
  { id: 'tapas_domo', label: 'Tapas Domo', icon: 'lid_cover', library: MaterialCommunityIcons },
  { id: 'precintos', label: 'Precintos Seguridad', icon: 'lock', library: FontAwesome5 },
  { id: 'mangueras', label: 'Mangueras/Acoples', icon: 'pipe', library: MaterialCommunityIcons },
  { id: 'limpieza', label: 'Limpieza Exterior', icon: 'sparkles', library: MaterialCommunityIcons },
  { id: 'descarga', label: 'Bocas Descarga', icon: 'arrow-down-bold-circle-outline', library: MaterialCommunityIcons },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { numeroPatente, choferName } = params;

  const [kmSalida, setKmSalida] = useState<string | number>('');
  const [lastKm, setLastKm] = useState<number | null>(null);
  const [fuel, setFuel] = useState<number | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Checklists separados
  const [checksTractor, setChecksTractor] = useState<Record<string, boolean>>({});
  const [checksCisterna, setChecksCisterna] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  const [modal, setModal] = useState<{ visible: boolean; type: ActionModalType; title: string; desc: string; action: () => void }>({
    visible: false, type: 'success', title: '', desc: '', action: () => { },
  });

  const showModal = (type: ActionModalType, title: string, desc: string, action: () => void = () => setModal(prev => ({ ...prev, visible: false }))) => {
    setModal({ visible: true, type, title, desc, action });
  };

  useEffect(() => {
    const fetchLastMileage = async () => {
      try {
        const q = query(collection(db, 'turnos'), where('numeroPatente', '==', numeroPatente), orderBy('fechaCreacion', 'desc'), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          const ultimoKm = data.kilometrajeIngreso || data.kilometrajeLlegada || data.kilometrajeSalida || 0;
          setLastKm(ultimoKm);
        }
      } catch (error) { console.log("Error history", error); } finally { setFetchingData(false); }
    };
    fetchLastMileage();
  }, [numeroPatente]);

  // Manejo de Checks
  const toggleCheckTractor = (id: string) => setChecksTractor(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleCheckCisterna = (id: string) => setChecksCisterna(prev => ({ ...prev, [id]: !prev[id] }));

  // CÁMARA
  // Cambiado: adjuntar imagen desde galería en lugar de abrir cámara
  const takePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') return showModal('warning', 'Permiso', 'Se requiere acceso a la galería.');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  // FUNCIÓN DE SUBIDA
  const uploadImageToStorage = async (uri: string) => {
    try {
      let blob: Blob;

      if (Platform.OS === 'web') {
        // En web, la URI ya suele ser un blob o base64
        const response = await fetch(uri);
        blob = await response.blob();
      } else {
        // En móvil
        const response = await fetch(uri);
        blob = await response.blob();
      }

      const filename = `tableros/${numeroPatente}_salida_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      // Usamos uploadBytes, que funciona bien con Blobs en ambas plataformas
      await uploadBytes(storageRef, blob);

      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Upload error detailed:", error);
      throw new Error("Fallo al subir la imagen. Verifica tu conexión.");
    }
  };

  const isFormValid = () => {
    const kmNum = Number(kmSalida);
    if (!kmSalida || isNaN(kmNum) || kmNum <= 0) return false;
    if (fuel === null) return false;
    if (!photoUri) return false;

    const tractorOk = ITEMS_TRACTOR.every(item => checksTractor[item.id] === true);
    const cisternaOk = ITEMS_CISTERNA.every(item => checksCisterna[item.id] === true);
    return tractorOk && cisternaOk;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return showModal('warning', 'Faltan Datos', 'Verificá KM, Combustible, Foto y TODOS los checks (Tractor y Cisterna).');

    setLoading(true);
    try {
      // 1. Subir imagen primero
      const photoUrl = await uploadImageToStorage(photoUri!);

      // 2. Guardar en Firestore
      const payload = {
        tipo: 'salida',
        estado: 'en_viaje',
        numeroPatente,
        chofer: choferName,
        kilometrajeSalida: Number(kmSalida),
        nivelNaftaSalida: fuel,
        fotoTableroSalida: photoUrl, // URL visible

        checklistSalida: checksTractor,
        checklistCisternaSalida: checksCisterna,

        fechaSalida: serverTimestamp(),
        fechaCreacion: new Date().toISOString(),
        kilometrajeIngreso: null,
        nivelNaftaIngreso: null,
        fotoTableroIngreso: null,
      };

      await addDoc(collection(db, 'turnos'), payload);

      showModal('success', '¡Buen Viaje!', 'Control de Vehículo y Cisterna registrado.', () => {
        if (router.canDismiss()) router.dismissAll();
        router.replace('/home');
      });

    } catch (error) {
      showModal('error', 'Error', 'No se pudo registrar la salida.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <LinearGradient colors={['#064E3B', '#000000']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.4 }} className="flex-1">
        <View className="p-4 flex-row items-center mt-2">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-black/20 p-2 rounded-full">
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-lg font-bold">Check-out de Unidad</Text>
            <Text className="text-emerald-200 text-xs font-bold uppercase tracking-widest">{numeroPatente}</Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

          {/* TARJETA DATOS PRINCIPALES */}
          <View className="bg-zinc-900/80 p-4 rounded-3xl border border-white/10 mb-6">
            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <Ionicons name="speedometer" size={18} color="#34D399" />
                <Text className="text-gray-300 font-bold ml-2 text-xs uppercase">Kilometraje Tablero</Text>
              </View>
              {fetchingData ? <ActivityIndicator size="small" color="#34D399" /> : (
                <View>
                  <NumberInput
                    value={kmSalida}
                    onChangeText={(val: any) => setKmSalida(val ? Number(val) : '')}
                    decimalPlaces={0}
                    placeholder={lastKm ? String(lastKm) : "0"}
                    className="bg-black text-white text-4xl font-black p-3 rounded-xl text-center border border-zinc-700 tracking-widest"
                  />
                  {lastKm && <Text className="text-zinc-500 text-[10px] text-center mt-2 italic">Anterior: {lastKm.toLocaleString()} km</Text>}
                </View>
              )}
            </View>

            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <FontAwesome5 name="gas-pump" size={16} color="#34D399" />
                <Text className="text-gray-300 font-bold ml-2 text-xs uppercase">Nivel de Combustible</Text>
              </View>
              <View className="flex-row justify-between bg-black p-2 rounded-xl border border-zinc-700">
                {[0, 25, 50, 75, 100].map((level) => (
                  <TouchableOpacity key={level} onPress={() => setFuel(level)} className={`h-10 w-[18%] items-center justify-center rounded-lg ${fuel === level ? 'bg-emerald-600' : 'bg-zinc-800'}`}>
                    <Text className={`font-bold text-xs ${fuel === level ? 'text-white' : 'text-gray-500'}`}>{level}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity onPress={takePhoto} className="w-full h-40 bg-black rounded-xl border border-dashed border-zinc-600 items-center justify-center overflow-hidden relative">
              {photoUri ? (
                <>
                  <Image source={{ uri: photoUri }} className="w-full h-full opacity-80" resizeMode="cover" />
                  <View className="absolute bottom-2 bg-black/60 px-3 py-1 rounded-full"><Text className="text-white text-[10px] font-bold">FOTO LISTA</Text></View>
                </>
              ) : (
                <>
                  <Ionicons name="camera" size={32} color="#34D399" />
                  <Text className="text-emerald-500 text-xs font-bold mt-2 uppercase">ADJUNTAR FOTO TABLERO</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* CHECKLIST TRACTOR */}
          <Text className="text-emerald-500 text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1">Control Vehículo</Text>
          <View className="flex-row flex-wrap justify-between mb-6">
            {ITEMS_TRACTOR.map((item) => {
              const isChecked = checksTractor[item.id];
              const IconLib = item.library;
              return (
                <TouchableOpacity key={item.id} activeOpacity={0.7} onPress={() => toggleCheckTractor(item.id)} className={`w-[48%] mb-3 p-3 rounded-2xl border flex-row items-center ${isChecked ? 'bg-emerald-900/30 border-emerald-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
                  <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${isChecked ? 'bg-emerald-500' : 'bg-zinc-800 border border-zinc-600'}`}>
                    {isChecked ? <MaterialIcons name="check" size={16} color="black" /> : <IconLib name={item.icon as any} size={16} color="#666" />}
                  </View>
                  <Text className={`text-xs font-bold ${isChecked ? 'text-white' : 'text-gray-500'}`}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* CHECKLIST CISTERNA (NUEVO BLOQUE) */}
          <View className="mb-8">
            <Text className="text-blue-400 text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1">Control Cisterna</Text>
            <View className="bg-blue-900/10 p-4 rounded-3xl border border-blue-500/30">
              <View className="flex-row flex-wrap justify-between">
                {ITEMS_CISTERNA.map((item) => {
                  const isChecked = checksCisterna[item.id];
                  const IconLib = item.library;
                  const iconName = item.icon === 'valve' ? 'valve' : item.icon;
                  return (
                    <TouchableOpacity key={item.id} activeOpacity={0.7} onPress={() => toggleCheckCisterna(item.id)} className={`w-[48%] mb-3 p-3 rounded-2xl border flex-row items-center ${isChecked ? 'bg-blue-600/30 border-blue-400' : 'bg-black border-zinc-800'}`}>
                      <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${isChecked ? 'bg-blue-500' : 'bg-zinc-800 border border-zinc-600'}`}>
                        {isChecked ? <MaterialIcons name="check" size={16} color="white" /> : <IconLib name={iconName as any} size={16} color="#666" />}
                      </View>
                      <Text className={`text-xs font-bold ${isChecked ? 'text-white' : 'text-gray-500'}`}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

        </ScrollView>

        {/* BOTÓN FLOTANTE AL FINAL */}
        <View className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent">
          <TouchableOpacity onPress={handleSubmit} disabled={loading} className={`py-4 rounded-2xl flex-row items-center justify-center shadow-lg ${isFormValid() ? 'bg-emerald-600 shadow-emerald-900/50' : 'bg-zinc-800 opacity-50'}`}>
            {loading ? <ActivityIndicator color="#fff" /> : <><Text className={`text-lg font-black uppercase ${isFormValid() ? 'text-white' : 'text-zinc-500'}`}>Confirmar Salida</Text><MaterialIcons name="chevron-right" size={24} color="#fff" style={{ marginLeft: 8 }} /></>}
          </TouchableOpacity>
        </View>

        <ActionModal visible={modal.visible} type={modal.type} title={modal.title} description={modal.desc} onConfirm={modal.action} />
      </LinearGradient>
    </SafeAreaView>
  );
}