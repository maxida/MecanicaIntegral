import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import * as ImagePicker from 'expo-image-picker';
import LoadingOverlay from '@/components/LoadingOverlay';
import NumberInput from '@/components/NumberInput';
import ActionModal, { ActionModalType } from '@/components/ActionModal';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy, limit, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/firebaseConfig';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  Battery,
  Brush,
  Camera,
  Check,
  CircleDot,
  Disc,
  Droplet,
  Eye,
  Fuel,
  Gauge,
  Hand,
  Lightbulb,
  Lock,
  Snowflake,
  Thermometer,
  Sparkles,
  Square,
  Tent,
  Toolbox,
  Volume2,
  Wind,
  Wrench,
} from 'lucide-react-native';

type ChecklistItem = { id: string; label: string; icon: React.ComponentType<{ size?: number; color?: string }> };

const VEHICLE_CHECKLIST_ITEMS: { category: string; items: ChecklistItem[] }[] = [
  {
    category: 'Motor y Fluidos',
    items: [
      { id: 'aceite', label: 'Aceite', icon: Droplet },
      { id: 'refrigerante', label: 'Refrigerante', icon: Snowflake },
      { id: 'fugas', label: 'Fugas', icon: AlertTriangle },
      { id: 'correas', label: 'Correas', icon: Wrench },
      { id: 'ruido_motor', label: 'Ruido Motor', icon: Volume2 },
    ],
  },
  {
    category: 'Rodamiento',
    items: [
      { id: 'neumaticos_presion', label: 'Neumáticos (Presión)', icon: CircleDot },
      { id: 'cubiertas_dano', label: 'Cubiertas (Daño)', icon: AlertTriangle },
      { id: 'direccion', label: 'Dirección', icon: ArrowLeftRight },
      { id: 'frenos', label: 'Frenos', icon: Disc },
      { id: 'freno_mano', label: 'Freno Mano', icon: Hand },
    ],
  },
  {
    category: 'Electricidad',
    items: [
      { id: 'luces_delanteras', label: 'Luces Delanteras', icon: Lightbulb },
      { id: 'luces_traseras', label: 'Luces Traseras', icon: Lightbulb },
      { id: 'guinos', label: 'Guiños', icon: ArrowLeftRight },
      { id: 'bateria', label: 'Batería', icon: Battery },
      { id: 'tablero', label: 'Tablero', icon: Gauge },
    ],
  },
  {
    category: 'Carrocería / Cabina',
    items: [
      { id: 'aire_ac', label: 'Aire Acond.', icon: Snowflake },
      { id: 'limpiaparabrisas', label: 'Limpiaparabrisas', icon: Droplet },
      { id: 'espejos', label: 'Espejos', icon: Eye },
      { id: 'vidrios', label: 'Vidrios', icon: Square },
      { id: 'chapa_pintura', label: 'Chapa/Pintura', icon: Brush },
    ],
  },
];

const ITEMS_CISTERNA: ChecklistItem[] = [
  { id: 'valvulas', label: 'Válvulas Cerradas', icon: Lock },
  { id: 'tapas_domo', label: 'Tapas Domo', icon: Disc },
  { id: 'precintos', label: 'Precintos Seguridad', icon: Lock },
  { id: 'mangueras', label: 'Mangueras/Acoples', icon: Toolbox },
  { id: 'limpieza', label: 'Limpieza Exterior', icon: Sparkles },
  { id: 'descarga', label: 'Bocas Descarga', icon: ArrowDownCircle },
];

const ITEMS_SEMIREMOLQUE: ChecklistItem[] = [
  { id: 'perdida_aire', label: 'Pérdida de aire', icon: Wind },
  { id: 'levante_eje', label: 'Levante eje neumático', icon: ArrowUpCircle },
  { id: 'fueyes_estado', label: 'Fueyes / Estado', icon: Disc },
  { id: 'luces', label: 'Luces', icon: Lightbulb },
  { id: 'neumaticos', label: 'Neumáticos', icon: Disc },
  { id: 'carpa', label: 'Estado de carpa', icon: Tent },
  { id: 'cajones', label: 'Cajones de herramientas', icon: Toolbox },
  { id: 'auxilio', label: 'Ruedas de auxilio', icon: Disc },
];

const ITEMS_REFRIGERADO: ChecklistItem[] = [
  { id: 'temp_equipo', label: 'Temperatura Equipo', icon: Thermometer },
  { id: 'burletes', label: 'Burletes y Puertas', icon: Lock },
  { id: 'combustible_frio', label: 'Diésel Equipo Frío', icon: Fuel },
  { id: 'limpieza_senasa', label: 'Permiso / Desinfección', icon: Sparkles },
];

const NovedadesChoferForm = () => {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.login.user);
  const params = useLocalSearchParams();
  const { numeroPatente, choferName } = params;

  const [km, setKm] = useState<string | number>('');
  const [fuel, setFuel] = useState(50);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null); // Visualización local
  const [photoUri, setPhotoUri] = useState<string | null>(null); // URI real para subir
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingTrip, setLoadingTrip] = useState(true);

  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [startKm, setStartKm] = useState<number | null>(null);

  const [tipoCargaViaje, setTipoCargaViaje] = useState<'cisterna' | 'semiremolque' | 'refrigerado' | null>(null);
  const [checksCisterna, setChecksCisterna] = useState<Record<string, boolean>>({});
  const [checksSemiremolque, setChecksSemiremolque] = useState<Record<string, boolean>>({});
  const [checksRefrigerado, setChecksRefrigerado] = useState<Record<string, boolean>>({});

  const [modal, setModal] = useState<{ visible: boolean; type: ActionModalType; title: string; desc: string; action: () => void }>({
    visible: false, type: 'success', title: '', desc: '', action: () => { },
  });

  const showModal = (type: ActionModalType, title: string, desc: string, action: () => void = () => setModal(prev => ({ ...prev, visible: false }))) => {
    setModal({ visible: true, type, title, desc, action });
  };

  useEffect(() => {
    const findActiveTrip = async () => {
      if (!numeroPatente) return;
      try {
        const col = collection(db, 'turnos');
        const q = query(col, where('numeroPatente', '==', numeroPatente), where('estado', '==', 'en_viaje'), orderBy('fechaCreacion', 'desc'), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const tripDoc = snap.docs[0];
          const tripData = tripDoc.data();
          setActiveTripId(tripDoc.id);
          setStartKm(Number(tripData.kilometrajeSalida) || 0);
          setTipoCargaViaje(prev => prev ?? tripData.tipoCarga ?? null);
        } else {
          setActiveTripId(null);
          setStartKm(null);
          setTipoCargaViaje(null);
        }
      } catch (error) { console.error(error); } finally { setLoadingTrip(false); }
    };
    findActiveTrip();
  }, [numeroPatente]);

  const kmNum = Number(km);
  const distanceTraveled = (startKm && kmNum > startKm) ? kmNum - startKm : 0;

  const toggleIssue = (id: string) => setSelectedIssues(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  const toggleCheckCisterna = (id: string) => setChecksCisterna(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleCheckSemiremolque = (id: string) => setChecksSemiremolque(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleCheckRefrigerado = (id: string) => setChecksRefrigerado(prev => ({ ...prev, [id]: !prev[id] }));

  const cargaItems = tipoCargaViaje
    ? (tipoCargaViaje === 'semiremolque'
      ? ITEMS_SEMIREMOLQUE
      : tipoCargaViaje === 'refrigerado'
        ? ITEMS_REFRIGERADO
        : ITEMS_CISTERNA)
    : [];
  const checksCarga = tipoCargaViaje
    ? (tipoCargaViaje === 'semiremolque'
      ? checksSemiremolque
      : tipoCargaViaje === 'refrigerado'
        ? checksRefrigerado
        : checksCisterna)
    : {};
  const tipoCargaLabel = tipoCargaViaje === 'semiremolque'
    ? 'Semiremolque'
    : tipoCargaViaje === 'refrigerado'
      ? 'Cámara de Frío'
      : tipoCargaViaje === 'cisterna'
        ? 'Cisterna'
        : null;

  // Cambiado: ahora adjuntar desde GALERÍA en lugar de abrir la cámara
  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') return showModal('warning', 'Permiso', 'Se requiere acceso a la galería.');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets.length) {
        setPhoto(result.assets[0].uri);
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e) { console.error(e); }
  };

  const uploadImageToStorage = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `tableros/${numeroPatente}_ingreso_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Upload error:", error);
      throw new Error("Fallo al subir imagen");
    }
  };

  const handleFinalizarIngreso = async () => {
    const kmValue = Number(km);
    if (!numeroPatente) return showModal('error', 'Error', 'No se identificó la patente.');
    if (!km || isNaN(kmValue) || kmValue <= 0) return showModal('warning', 'Kilometraje', 'Ingresa el KM de llegada.');
    if (startKm && kmValue < startKm) return showModal('warning', 'Error KM', `El KM (${kmValue}) no puede ser menor a la salida (${startKm}).`);
    if (!photoUri) return showModal('warning', 'Foto', 'Debes tomar una foto del tablero.');
    if (!tipoCargaViaje) return showModal('warning', 'Tipo de Carga', 'Selecciona el tipo de carga.');

    const cargaOk = cargaItems.length > 0 ? cargaItems.every(item => checksCarga[item.id] === true) : true;
    const fallasCarga = cargaItems.filter(item => checksCarga[item.id] !== true).map(item => item.id);

    setSaving(true);
    try {
      const photoUrl = await uploadImageToStorage(photoUri);
      const issuesFound = selectedIssues.length > 0;

      const closureData = {
        tipo: 'ingreso',
        estado: issuesFound ? 'pending_triage' : 'completed',
        empresaId: user?.empresaId || 'oasis',
        kilometrajeIngreso: kmValue,
        nivelNaftaIngreso: fuel,
        fotoTableroIngreso: photoUrl,
        fotoTablero: photoUrl, // Legacy support
        tipoCarga: tipoCargaViaje,

        ...(tipoCargaViaje === 'semiremolque'
          ? { checklistSemiremolqueIngreso: checksSemiremolque }
          : tipoCargaViaje === 'refrigerado'
            ? { checklistRefrigeradoIngreso: checksRefrigerado }
            : { checklistCisternaIngreso: checksCisterna }),

        sintomas: selectedIssues,
        controlCargaOk: cargaOk,
        fallasCargaIngreso: fallasCarga,
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

      showModal('success', 'Viaje Finalizado', `Se registraron ${distanceTraveled > 0 ? distanceTraveled + ' km recorridos.' : 'los datos correctamente.'}`, () => {
        if (router.canDismiss()) router.dismissAll();
        router.replace('/home');
      });

    } catch (err) {
      showModal('error', 'Error', 'No se pudo guardar el ingreso.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingTrip) return <View className="flex-1 bg-black justify-center items-center"><ActivityIndicator size="large" color="#60A5FA" /></View>;

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <LinearGradient colors={['#0b0b0b', '#000']} className="flex-1 px-6">
        <ScrollView showsVerticalScrollIndicator={false} className="pt-6" contentContainerStyle={{ paddingBottom: 100 }}>

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

          <View className="flex-row space-x-4 mb-4">
            <View className="flex-1 bg-card border border-white/10 rounded-[30px] p-4 items-center relative overflow-hidden">
              <Text className="text-gray-500 text-[8px] font-bold uppercase mb-2">Kilometraje Llegada</Text>
              <NumberInput
                className="text-white text-2xl font-black text-center z-10"
                value={typeof km === 'number' ? km : 0}
                onChangeText={(val: any) => { if (val === '' || val === null) setKm(''); else setKm(Number(val)); }}
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



          <Text className="text-gray-500 text-l font-black uppercase tracking-[3px] mb-3 mt-4">Reporte de Novedades</Text>
          <View className="mb-1">
            {VEHICLE_CHECKLIST_ITEMS.map((group) => (
              <View key={group.category} className="mb-4">
                <Text className="text-gray-400 text-[10px] font-bold mb-2 uppercase border-b border-white/5 pb-1">{group.category}</Text>
                <View className="flex-row flex-wrap">
                  {group.items.map((it) => {
                    const isSelected = selectedIssues.includes(it.id);
                    const Icon = it.icon;
                    return (
                      <TouchableOpacity
                        key={it.id}
                        onPress={() => toggleIssue(it.id)}
                        style={{ width: '31%' }}
                        className={`px-2 py-3 mb-2 mr-2 rounded-xl flex-col items-center justify-center border ${isSelected ? 'bg-red-900/40 border-red-500' : 'bg-zinc-900 border-zinc-800'}`}
                      >
                        <Icon size={20} color={isSelected ? '#fff' : '#555'} />
                        <Text className={`text-[9px] mt-2 text-center font-bold ${isSelected ? 'text-white' : 'text-gray-500'}`}>{it.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          <View className="mb-6">
            <Text className="text-gray-600 text-[10px] font-bold uppercase mb-2">Foto Tablero</Text>
            <TouchableOpacity onPress={takePhoto} className="w-full h-32 bg-card rounded-[20px] border border-dashed border-white/10 items-center justify-center overflow-hidden">
              {photo ? (
                <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <>
                  <Camera size={28} color="#60A5FA" />
                  <Text className="text-gray-600 text-[9px] font-bold mt-2 uppercase">ADJUNTAR FOTO TABLERO</Text>
                </>
              )}
            </TouchableOpacity>

            <Text className="text-gray-600 text-[10px] font-bold uppercase mt-4 mb-2">Comentarios</Text>
            <View className="w-full bg-card rounded-[20px] border border-white/10 p-3">
              <TextInput
                multiline
                className="text-white text-xs min-h-[90px] text-top"
                placeholder="Detalle de fallas..."
                placeholderTextColor="#444"
                value={notas}
                onChangeText={setNotas}
              />
            </View>
          </View>
          {/* TIPO DE CARGA */}
          <View className="mb-3">
            <Text className="text-emerald-400 text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1">Tipo de carga</Text>
            {tipoCargaViaje ? (
              <View className="bg-emerald-900/20 border border-emerald-500/40 rounded-2xl p-4">
                <Text className="text-white text-sm font-black uppercase">{tipoCargaLabel}</Text>
                <Text className="text-emerald-300 text-[10px] mt-1 font-bold uppercase">Definido en salida</Text>
              </View>
            ) : (
              <View className="flex-row gap-3">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setTipoCargaViaje('cisterna')}
                  className={`flex-1 p-4 rounded-2xl border ${tipoCargaViaje === 'cisterna' ? 'bg-emerald-900/30 border-emerald-500/60' : 'bg-zinc-900 border-zinc-800'}`}
                >
                  <View className="flex-row items-center">
                    <ArrowDownCircle size={18} color={tipoCargaViaje === 'cisterna' ? '#34D399' : '#666'} />
                    <Text className={`ml-2 text-xs font-bold ${tipoCargaViaje === 'cisterna' ? 'text-white' : 'text-gray-500'}`}>Cisterna</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setTipoCargaViaje('semiremolque')}
                  className={`flex-1 p-4 rounded-2xl border ${tipoCargaViaje === 'semiremolque' ? 'bg-blue-900/30 border-blue-500/60' : 'bg-zinc-900 border-zinc-800'}`}
                >
                  <View className="flex-row items-center">
                    <ArrowUpCircle size={18} color={tipoCargaViaje === 'semiremolque' ? '#60A5FA' : '#666'} />
                    <Text className={`ml-2 text-xs font-bold ${tipoCargaViaje === 'semiremolque' ? 'text-white' : 'text-gray-500'}`}>Semiremolque</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setTipoCargaViaje('refrigerado')}
                  className={`flex-1 p-4 rounded-2xl border ${tipoCargaViaje === 'refrigerado' ? 'bg-cyan-900/30 border-cyan-500/60' : 'bg-zinc-900 border-zinc-800'}`}
                >
                  <View className="flex-row items-center">
                    <Thermometer size={18} color={tipoCargaViaje === 'refrigerado' ? '#22D3EE' : '#666'} />
                    <Text className={`ml-2 text-xs font-bold ${tipoCargaViaje === 'refrigerado' ? 'text-white' : 'text-gray-500'}`}>Cámara de Frío</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
          {/* CHECKLIST CARGA */}
          <View className="mb-16 mt-4">
            {tipoCargaViaje ? (
              <>
                <Text className="text-blue-400 text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1">Control {tipoCargaLabel} (Ingreso)</Text>
                <View className="bg-blue-900/10 p-4 rounded-3xl border border-blue-500/30">
                  <View className="flex-row flex-wrap justify-between">
                    {cargaItems.map((item) => {
                      const isChecked = checksCarga[item.id as keyof typeof checksCarga];
                      const Icon = item.icon;
                      return (
                        <TouchableOpacity key={item.id} activeOpacity={0.7} onPress={() => (tipoCargaViaje === 'semiremolque' ? toggleCheckSemiremolque(item.id) : tipoCargaViaje === 'refrigerado' ? toggleCheckRefrigerado(item.id) : toggleCheckCisterna(item.id))} className={`w-[48%] mb-3 p-3 rounded-2xl border flex-row items-center ${isChecked ? 'bg-blue-600/30 border-blue-400' : 'bg-black border-zinc-800'}`}>
                          <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${isChecked ? 'bg-blue-500' : 'bg-zinc-800 border border-zinc-600'}`}>
                            {isChecked ? <Check size={16} color="white" /> : <Icon size={16} color="#666" />}
                          </View>
                          <Text className={`text-xs font-bold ${isChecked ? 'text-white' : 'text-gray-500'}`}>{item.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </>
            ) : (
              <View className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
                <Text className="text-zinc-400 text-xs font-bold uppercase">Selecciona el tipo de carga para continuar</Text>
              </View>
            )}
          </View>

        </ScrollView>

        {/* BOTÓN CONFIRMAR */}
        <View className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleFinalizarIngreso}
            className="mb-8 overflow-hidden rounded-[30px] shadow-2xl shadow-blue-500/30"
            disabled={saving}
          >
            <LinearGradient colors={['#3B82F6', '#1D4ED8']} className="py-5 items-center">
              <Text className="text-white text-lg font-black italic uppercase">Cerrar Viaje</Text>
              {!!activeTripId && <Text className="text-blue-200 text-[10px] font-bold mt-1">ACTUALIZANDO ORDEN #{activeTripId.slice(0, 5)}</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {!!saving && <LoadingOverlay message="Cerrando viaje..." />}

        <ActionModal visible={modal.visible} type={modal.type} title={modal.title} description={modal.desc} onConfirm={modal.action} />

      </LinearGradient>
    </SafeAreaView>
  );
};

export default NovedadesChoferForm;