import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import NumberInput from '@/components/NumberInput';
import ActionModal, { ActionModalType } from '@/components/ActionModal'; // <--- IMPORTAR

const ITEMS_CHECKOUT = [
  { id: 'papeles', label: 'Documentación', icon: 'file-document-outline', library: MaterialCommunityIcons },
  { id: 'luces', label: 'Luces', icon: 'lightbulb-on-outline', library: MaterialCommunityIcons },
  { id: 'fluidos', label: 'Fluidos', icon: 'oil', library: MaterialCommunityIcons },
  { id: 'neumaticos', label: 'Neumáticos', icon: 'car-tire-alert', library: MaterialCommunityIcons },
  { id: 'seguridad', label: 'Seguridad', icon: 'fire-extinguisher', library: FontAwesome5 },
  { id: 'espejos', label: 'Espejos', icon: 'mirror', library: MaterialCommunityIcons },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { numeroPatente, choferName } = params;

  // --- ESTADOS ---
  const [kmSalida, setKmSalida] = useState<string | number>('');
  const [lastKm, setLastKm] = useState<number | null>(null);
  const [fuel, setFuel] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // --- ESTADO DEL MODAL GENÉRICO ---
  const [modal, setModal] = useState<{
    visible: boolean;
    type: ActionModalType;
    title: string;
    desc: string;
    action: () => void;
  }>({
    visible: false,
    type: 'success',
    title: '',
    desc: '',
    action: () => { },
  });

  // Helper para mostrar modal
  const showModal = (type: ActionModalType, title: string, desc: string, action: () => void = () => setModal(prev => ({ ...prev, visible: false }))) => {
    setModal({ visible: true, type, title, desc, action });
  };

  // 1. OBTENER ÚLTIMO KILOMETRAJE
  useEffect(() => {
    const fetchLastMileage = async () => {
      try {
        const q = query(
          collection(db, 'turnos'),
          where('numeroPatente', '==', numeroPatente),
          orderBy('fechaCreacion', 'desc'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          const ultimoKm = data.kilometrajeIngreso || data.kilometrajeLlegada || data.kilometrajeSalida || 0;
          setLastKm(ultimoKm);
        }
      } catch (error) {
        console.log("Error fetching history", error);
      } finally {
        setFetchingData(false);
      }
    };
    fetchLastMileage();
  }, [numeroPatente]);

  const toggleCheck = (id: string) => {
    setChecks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        showModal('warning', 'Permiso Requerido', 'Necesitamos acceso a la cámara para validar el tablero.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      showModal('error', 'Error de Cámara', 'No se pudo abrir la cámara.');
    }
  };

  const isFormValid = () => {
    const kmNum = Number(kmSalida);
    if (!kmSalida || isNaN(kmNum) || kmNum <= 0) return false;
    if (fuel === null) return false;
    if (!photo) return false;
    return ITEMS_CHECKOUT.every(item => checks[item.id] === true);
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      showModal('warning', 'Faltan Datos', 'Por favor verificá: Kilometraje, Combustible, Foto y Checklist completo.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tipo: 'salida',
        estado: 'en_viaje',
        numeroPatente,
        chofer: choferName,

        kilometrajeSalida: Number(kmSalida),
        nivelNaftaSalida: fuel,
        fotoTableroSalida: photo,
        fotoTablero: photo,

        checklistSalida: checks,
        fechaSalida: serverTimestamp(),
        fechaCreacion: new Date().toISOString(),

        kilometrajeIngreso: null,
        nivelNaftaIngreso: null,
        fotoTableroIngreso: null,
      };

      await addDoc(collection(db, 'turnos'), payload);

      // --- AQUÍ EL ÉXITO ---
      showModal('success', '¡Buen Viaje!', 'Salida registrada correctamente en el sistema.', () => {
        // Esta función se ejecuta al presionar "Continuar" en el modal
        if (router.canDismiss()) router.dismissAll();
        router.replace('/home');
      });

    } catch (error) {
      console.error(error);
      showModal('error', 'Error de Conexión', 'No se pudo registrar la salida. Intenta nuevamente.');
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

        <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false}>
          <View className="bg-zinc-900/80 p-4 rounded-3xl border border-white/10 mb-6">

            {/* INPUT KM */}
            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <Ionicons name="speedometer" size={18} color="#34D399" />
                <Text className="text-gray-300 font-bold ml-2 text-xs uppercase">Kilometraje Tablero</Text>
              </View>

              {fetchingData ? (
                <ActivityIndicator size="small" color="#34D399" />
              ) : (
                <View>
                  <NumberInput
                    value={kmSalida}
                    onChangeText={(val: any) => {
                      if (val === '' || val === null) setKmSalida('');
                      else setKmSalida(Number(val));
                    }}
                    decimalPlaces={0}
                    placeholder={lastKm ? String(lastKm) : "0"}
                    className="bg-black text-white text-4xl font-black p-3 rounded-xl text-center border border-zinc-700 tracking-widest"
                  />
                  {lastKm && (
                    <Text className="text-zinc-500 text-[10px] text-center mt-2 italic">
                      Último registro: {lastKm.toLocaleString('es-ES')} km
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* COMBUSTIBLE */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <FontAwesome5 name="gas-pump" size={16} color="#34D399" />
                <Text className="text-gray-300 font-bold ml-2 text-xs uppercase">Nivel de Combustible</Text>
              </View>
              <View className="flex-row justify-between bg-black p-2 rounded-xl border border-zinc-700">
                {[0, 25, 50, 75, 100].map((level) => (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setFuel(level)}
                    className={`h-10 w-[18%] items-center justify-center rounded-lg ${fuel === level ? 'bg-emerald-600' : 'bg-zinc-800'}`}
                  >
                    <Text className={`font-bold text-xs ${fuel === level ? 'text-white' : 'text-gray-500'}`}>{level}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* CÁMARA */}
            <TouchableOpacity onPress={takePhoto} className="w-full h-40 bg-black rounded-xl border border-dashed border-zinc-600 items-center justify-center overflow-hidden relative">
              {photo ? (
                <>
                  <Image source={{ uri: photo }} className="w-full h-full opacity-80" resizeMode="cover" />
                  <View className="absolute bottom-2 bg-black/60 px-3 py-1 rounded-full">
                    <Text className="text-white text-[10px] font-bold">FOTO CARGADA</Text>
                  </View>
                </>
              ) : (
                <>
                  <Ionicons name="camera" size={32} color="#34D399" />
                  <Text className="text-emerald-500 text-xs font-bold mt-2 uppercase">Tomar Foto Tablero</Text>
                  <Text className="text-zinc-600 text-[10px] mt-1">(Obligatorio)</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1">Inspección Visual</Text>
          <View className="flex-row flex-wrap justify-between">
            {ITEMS_CHECKOUT.map((item) => {
              const isChecked = checks[item.id];
              const IconLib = item.library;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  onPress={() => toggleCheck(item.id)}
                  className={`w-[48%] mb-3 p-3 rounded-2xl border flex-row items-center ${isChecked ? 'bg-emerald-900/30 border-emerald-500/50' : 'bg-zinc-900 border-zinc-800'}`}
                >
                  <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${isChecked ? 'bg-emerald-500' : 'bg-zinc-800 border border-zinc-600'}`}>
                    {isChecked ? <MaterialIcons name="check" size={16} color="black" /> : <IconLib name={item.icon as any} size={16} color="#666" />}
                  </View>
                  <Text className={`text-xs font-bold ${isChecked ? 'text-white' : 'text-gray-500'}`}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View className="h-32" />
        </ScrollView>

        <View className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !isFormValid()}
            className={`py-4 rounded-2xl flex-row items-center justify-center shadow-lg ${isFormValid() ? 'bg-emerald-600 shadow-emerald-900/50' : 'bg-zinc-800 opacity-50'}`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text className={`text-lg font-black uppercase ${isFormValid() ? 'text-white' : 'text-zinc-500'}`}>Confirmar Salida</Text>
                {isFormValid() && <MaterialIcons name="chevron-right" size={24} color="#fff" style={{ marginLeft: 8 }} />}
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* MODAL GENÉRICO */}
        <ActionModal
          visible={modal.visible}
          type={modal.type}
          title={modal.title}
          description={modal.desc}
          onConfirm={modal.action}
        />

      </LinearGradient>
    </SafeAreaView>
  );
}