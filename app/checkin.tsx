import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Image, ActivityIndicator } from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import * as ImagePicker from 'expo-image-picker';
import LoadingOverlay from '@/components/LoadingOverlay';
import NumberInput from '@/components/NumberInput';
import ActionModal, { ActionModalType } from '@/components/ActionModal'; // <--- IMPORTAR
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy, limit, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';

const VEHICLE_CHECKLIST_ITEMS = [
  // ... (Mismo array de items, no lo cambio)
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
  const router = useRouter();
  const user = useSelector((state: RootState) => state.login.user);
  const params = useLocalSearchParams();
  const { numeroPatente, choferName } = params;

  // ESTADOS
  const [km, setKm] = useState<string | number>('');
  const [fuel, setFuel] = useState(50);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingTrip, setLoadingTrip] = useState(true);

  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [startKm, setStartKm] = useState<number | null>(null);

  // MODAL STATE
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

  const showModal = (type: ActionModalType, title: string, desc: string, action: () => void = () => setModal(prev => ({ ...prev, visible: false }))) => {
    setModal({ visible: true, type, title, desc, action });
  };

  // Buscar viaje activo
  useEffect(() => {
    const findActiveTrip = async () => {
      if (!numeroPatente) return;
      try {
        const col = collection(db, 'turnos');
        const q = query(
          col,
          where('numeroPatente', '==', numeroPatente),
          where('estado', '==', 'en_viaje'),
          orderBy('fechaCreacion', 'desc'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const tripDoc = snap.docs[0];
          const tripData = tripDoc.data();
          setActiveTripId(tripDoc.id);
          setStartKm(Number(tripData.kilometrajeSalida) || 0);
        }
      } catch (error) {
        console.error("Error buscando viaje activo:", error);
      } finally {
        setLoadingTrip(false);
      }
    };
    findActiveTrip();
  }, [numeroPatente]);

  const kmNum = Number(km);
  const distanceTraveled = (startKm && kmNum > startKm) ? kmNum - startKm : 0;

  const toggleIssue = (id: string) => {
    setSelectedIssues(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        showModal('warning', 'Permiso', 'Se requiere acceso a la cámara.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets.length) {
        setPhoto(result.assets[0].uri);
      }
    } catch (e) { console.error(e); }
  };

  const handleFinalizarIngreso = async () => {
    const kmValue = Number(km);
    if (!numeroPatente) return showModal('error', 'Error', 'No se identificó la patente.');
    if (!km || isNaN(kmValue) || kmValue <= 0) return showModal('warning', 'Kilometraje', 'Ingresa el KM de llegada.');
    if (startKm && kmValue < startKm) return showModal('warning', 'Error KM', `El KM (${kmValue}) no puede ser menor a la salida (${startKm}).`);
    if (!photo) return showModal('warning', 'Foto', 'Debes tomar una foto del tablero.');

    setSaving(true);
    try {
      const issuesFound = selectedIssues.length > 0;

      const closureData = {
        tipo: 'ingreso',
        estado: issuesFound ? 'pending_triage' : 'completed',

        kilometrajeIngreso: kmValue,
        nivelNaftaIngreso: fuel,
        fotoTableroIngreso: photo,
        fotoTablero: photo,

        sintomas: selectedIssues,
        comentariosChofer: notas || null,

        fechaIngreso: serverTimestamp(),
        distanciaRecorrida: distanceTraveled,
      };

      if (activeTripId) {
        const tripRef = doc(db, 'turnos', activeTripId);
        await updateDoc(tripRef, closureData);
      } else {
        const newPayload = {
          ...closureData,
          numeroPatente,
          chofer: choferName,
          fechaCreacion: new Date().toISOString(),
          origen: 'ingreso_sin_salida'
        };
        await addDoc(collection(db, 'turnos'), newPayload);
      }

      // --- ÉXITO ---
      showModal(
        'success',
        'Viaje Finalizado',
        `Se registraron ${distanceTraveled > 0 ? distanceTraveled + ' km recorridos.' : 'los datos correctamente.'}`,
        () => {
          if (router.canDismiss()) router.dismissAll();
          router.replace('/home');
        }
      );

    } catch (err) {
      console.error('Error cerrando viaje:', err);
      showModal('error', 'Error', 'No se pudo guardar el ingreso.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingTrip) return <View className="flex-1 bg-black justify-center items-center"><ActivityIndicator size="large" color="#60A5FA" /></View>;

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <LinearGradient colors={['#0b0b0b', '#000']} className="flex-1 px-6">
        <ScrollView showsVerticalScrollIndicator={false} className="pt-6" contentContainerStyle={{ paddingBottom: 80 }}>

          {/* HEADER */}
          <View className="mb-6 flex-row justify-between items-start">
            <View>
              <Text className="text-white text-3xl font-black italic uppercase">Finalizar Viaje</Text>
              <Text className="text-blue-400 text-[10px] font-bold tracking-[3px]">INGRESO A GALPÓN</Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-400 text-xs font-bold">{numeroPatente}</Text>
              {startKm ? (
                <View className="bg-emerald-900/40 px-2 py-1 rounded mt-1 border border-emerald-500/30">
                  <Text className="text-emerald-400 text-[10px] font-bold">SALIDA: {startKm.toLocaleString('es-ES')} km</Text>
                </View>
              ) : (
                <Text className="text-gray-600 text-[9px] mt-1">SIN SALIDA REGISTRADA</Text>
              )}
            </View>
          </View>

          {/* INPUT KILOMETRAJE */}
          <View className="flex-row space-x-4 mb-4">
            <View className="flex-1 bg-card border border-white/10 rounded-[30px] p-4 items-center relative overflow-hidden">
              <Text className="text-gray-500 text-[8px] font-bold uppercase mb-2">Kilometraje Llegada</Text>

              <NumberInput
                className="text-white text-2xl font-black text-center z-10"
                value={km}
                onChangeText={(val: any) => {
                  if (val === '' || val === null) setKm('');
                  else setKm(Number(val));
                }}
                decimalPlaces={0}
                placeholder={startKm ? String(startKm + 50) : "0"}
              />

              {distanceTraveled > 0 && (
                <View className="absolute bottom-2 bg-blue-500/10 px-3 py-1 rounded-full">
                  <Text className="text-blue-400 text-[10px] font-bold">+{distanceTraveled} km</Text>
                </View>
              )}
            </View>

            <View className="flex-1 bg-card border border-white/10 rounded-[30px] p-4">
              <Text className="text-gray-500 text-[8px] font-bold uppercase mb-2 text-center">Combustible</Text>
              <View className="flex-row justify-between h-full items-center pb-2">
                {[0, 25, 50, 75, 100].map(v => (
                  (v === 0 || v === 50 || v === 100) && (
                    <TouchableOpacity key={v} onPress={() => setFuel(v)} className={`w-8 h-8 rounded-full items-center justify-center ${fuel === v ? 'bg-primary border-2 border-white' : 'bg-white/5'}`}>
                      <Text className={`text-[9px] font-bold ${fuel === v ? 'text-white' : 'text-gray-400'}`}>{v}</Text>
                    </TouchableOpacity>
                  )
                ))}
              </View>
            </View>
          </View>

          {/* CHECKLIST */}
          <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px] mb-3 ml-2 mt-4">Reporte de Novedades</Text>
          <View className="mb-4">
            {VEHICLE_CHECKLIST_ITEMS.map((group) => (
              <View key={group.category} className="mb-4">
                <Text className="text-gray-400 text-[10px] font-bold mb-2 uppercase border-b border-white/5 pb-1">{group.category}</Text>
                <View className="flex-row flex-wrap">
                  {group.items.map((it) => {
                    const isSelected = selectedIssues.includes(it.id);
                    return (
                      <TouchableOpacity
                        key={it.id}
                        onPress={() => toggleIssue(it.id)}
                        style={{ width: '31%' }}
                        className={`px-2 py-3 mb-2 mr-2 rounded-xl flex-col items-center justify-center border ${isSelected ? 'bg-red-900/40 border-red-500' : 'bg-zinc-900 border-zinc-800'}`}
                      >
                        <MaterialIcons name={it.icon as any} size={20} color={isSelected ? '#fff' : '#555'} />
                        <Text className={`text-[9px] mt-2 text-center font-bold ${isSelected ? 'text-white' : 'text-gray-500'}`}>{it.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {/* EVIDENCIA Y NOTAS */}
          <View className="flex-row space-x-4 mt-2 mb-6">
            <TouchableOpacity onPress={takePhoto} className="flex-1 h-32 bg-card rounded-[20px] border border-dashed border-white/10 items-center justify-center overflow-hidden">
              {photo ? (
                <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <>
                  <Ionicons name="camera" size={28} color="#60A5FA" />
                  <Text className="text-gray-600 text-[9px] font-bold mt-2 uppercase">FOTO KILOMETRAJE</Text>
                </>
              )}
            </TouchableOpacity>

            <View className="flex-[1.5] bg-card rounded-[20px] border border-white/10 p-3">
              <Text className="text-gray-600 text-[9px] font-bold uppercase mb-1">Comentarios</Text>
              <TextInput
                multiline
                className="text-white text-xs flex-1 text-top"
                placeholder="Detalle de fallas..."
                placeholderTextColor="#444"
                value={notas}
                onChangeText={setNotas}
              />
            </View>
          </View>

          {/* CONFIRM BUTTON */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleFinalizarIngreso}
            className="mb-8 overflow-hidden rounded-[30px] shadow-2xl shadow-blue-500/30"
            disabled={saving}
          >
            <LinearGradient colors={['#3B82F6', '#1D4ED8']} className="py-5 items-center">
              <Text className="text-white text-lg font-black italic uppercase">Cerrar Viaje</Text>
              {activeTripId && <Text className="text-blue-200 text-[10px] font-bold mt-1">ACTUALIZANDO ORDEN #{activeTripId.slice(0, 5)}</Text>}
            </LinearGradient>
          </TouchableOpacity>

          {saving && <LoadingOverlay message="Cerrando viaje..." />}

        </ScrollView>

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
};

export default NovedadesChoferForm;