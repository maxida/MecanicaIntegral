import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, Image, TextInput, Modal, Alert } from 'react-native';
import { CheckCircle2, Circle, Camera, PenTool, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SignatureScreen from 'react-native-signature-canvas';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, where, getDocs, updateDoc, doc, limit, orderBy, getDoc } from 'firebase/firestore';
import { db, storage } from '@/firebase/firebaseConfig';
import LoadingOverlay from '@/components/LoadingOverlay';

const INSPECCION_ZONAS = [
  { id: 'frontal', titulo: 'Vista Frontal', items: ['Paragolpes', 'Parabrisas', 'Escobillas', 'Visera/Parasol', 'Espejos (Cristal/Carcasa)'] },
  { id: 'lateral', titulo: 'Vistas Laterales', items: ['Guardabarros Delanteros', 'Guardabarros Traseros', 'Tanque Combustible y Soportes', 'Tapas de Batería', 'Manijas de Puertas'] },
  { id: 'opticas', titulo: 'Grupo Óptico', items: ['Faros Delanteros', 'Faros de Giro', 'Faros Traseros', 'Luces Antiniebla', 'Luces de Gálibo/Parasol'] },
];

export default function TallerCheckinScreen() {
  const router = useRouter();
  const { patente: paramPatente, id: turnoId } = useLocalSearchParams();

  const [turnoData, setTurnoData] = useState<any>(null);
  const [patenteState, setPatenteState] = useState<string>((paramPatente as string) || '');
  const [tipoCarga, setTipoCarga] = useState<string | null>(null);

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [observaciones, setObservaciones] = useState('');
  const [firmaChofer, setFirmaChofer] = useState<string | null>(null);
  const [firmaAsesor, setFirmaAsesor] = useState<string | null>(null);
  const [modalFirma, setModalFirma] = useState<'chofer' | 'asesor' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fotos, setFotos] = useState<{ frente: string | null; atras: string | null; latIzq: string | null; latDer: string | null }>({
    frente: null, atras: null, latIzq: null, latDer: null,
  });

  // 1. Zonas Dinámicas basadas en tipoCarga
  const zonasDinamicas = useMemo(() => {
    const zonas = [...INSPECCION_ZONAS];
    if (tipoCarga === 'refrigerado') {
      zonas.push({ id: 'refrigerado', titulo: 'Cámara de Frío', items: ['Temperatura Equipo', 'Burletes y Puertas', 'Diésel Equipo Frío', 'Permiso / Desinfección'] });
    } else if (tipoCarga === 'cisterna') {
      zonas.push({ id: 'cisterna', titulo: 'Cisterna', items: ['Válvulas Cerradas', 'Tapas Domo', 'Precintos Seguridad', 'Mangueras/Acoples', 'Bocas Descarga'] });
    } else if (tipoCarga === 'semiremolque') {
      zonas.push({ id: 'semiremolque', titulo: 'Semiremolque', items: ['Pérdida de aire', 'Levante eje', 'Fueyes / Estado', 'Estado de carpa'] });
    }
    return zonas;
  }, [tipoCarga]);

  // 2. Cargar Turno Existente (Modo Edición)
  useEffect(() => {
    const loadTurno = async () => {
      if (!turnoId) return;
      try {
        const docRef = doc(db, 'turnos', turnoId as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTurnoData({ id: docSnap.id, ...data });
          setPatenteState(data.numeroPatente || paramPatente);
          setTipoCarga(data.tipoCarga || null);
          
          if (data.checkinTaller) {
            if (data.checkinTaller.inspeccion) setChecks(data.checkinTaller.inspeccion);
            if (data.checkinTaller.observaciones) setObservaciones(data.checkinTaller.observaciones);
            if (data.checkinTaller.fotos) setFotos(data.checkinTaller.fotos);
            if (data.checkinTaller.firmas) {
              setFirmaChofer(data.checkinTaller.firmas.chofer);
              setFirmaAsesor(data.checkinTaller.firmas.asesor);
            }
          }
        }
      } catch (error) { console.error("Error cargando turno:", error); }
    };
    loadTurno();
  }, [turnoId]);

  // 3. Inicializar Checks si es nuevo
  useEffect(() => {
    if (turnoData?.checkinTaller) return; 
    const map: Record<string, boolean> = {};
    zonasDinamicas.forEach((zona) => {
      zona.items.forEach((item) => { map[`${zona.id}:${item}`] = false; });
    });
    setChecks(prev => ({...map, ...prev}));
  }, [zonasDinamicas, turnoData]);

  const toggleItem = (key: string) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const pickPhoto = async (key: 'frente' | 'atras' | 'latIzq' | 'latDer') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') return Alert.alert('Permiso', 'Se requiere acceso a la galería.');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      setFotos((prev) => ({ ...prev, [key]: result.assets[0].uri }));
    }
  };

  const uploadMediaToStorage = async (uri: string, path: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const safeUpload = async (uri: string | null, path: string) => {
    if (!uri) return null;
    if (uri.startsWith('http')) return uri; // Ya es una URL de Firebase
    return await uploadMediaToStorage(uri, path);
  };

  const handleGuardarRecepcion = async () => {
    if (!turnoId) return Alert.alert('Error', 'No se encontró el ID del turno para guardar el check-in.');
    if (!fotos.frente || !fotos.atras || !fotos.latIzq || !fotos.latDer) {
      return Alert.alert('Faltan Fotos', 'Debes adjuntar las 4 fotos del camión.');
    }
    if (!firmaChofer || !firmaAsesor) {
      return Alert.alert('Firmas', 'Debes capturar ambas firmas.');
    }

    setIsSaving(true);
    try {
      const timestamp = Date.now();
      const p = patenteState || 'UNIDAD';

      const [urlFrente, urlAtras, urlLatIzq, urlLatDer] = await Promise.all([
        safeUpload(fotos.frente, `recepciones/${p}_frente_${timestamp}.jpg`),
        safeUpload(fotos.atras, `recepciones/${p}_atras_${timestamp}.jpg`),
        safeUpload(fotos.latIzq, `recepciones/${p}_lateral_izq_${timestamp}.jpg`),
        safeUpload(fotos.latDer, `recepciones/${p}_lateral_der_${timestamp}.jpg`),
      ]);

      const [firmaChoferUrl, firmaAsesorUrl] = await Promise.all([
        safeUpload(firmaChofer, `recepciones/${p}_firma_chofer_${timestamp}.png`),
        safeUpload(firmaAsesor, `recepciones/${p}_firma_asesor_${timestamp}.png`),
      ]);

      const estadoActual = turnoData?.estado === 'taller_pendiente' ? 'en_taller' : (turnoData?.estado || 'en_taller');

      await updateDoc(doc(db, 'turnos', turnoId as string), {
        estado: estadoActual,
        checkinTaller: {
          fotos: { frente: urlFrente, atras: urlAtras, latIzq: urlLatIzq, latDer: urlLatDer },
          inspeccion: checks,
          observaciones: observaciones || null,
          firmas: { chofer: firmaChoferUrl, asesor: firmaAsesorUrl },
          fechaRecepcion: turnoData?.checkinTaller?.fechaRecepcion || new Date().toISOString(),
        }
      });

      Alert.alert('Recepción guardada', 'El check-in del taller se registró correctamente.');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la recepción.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]">
      <LinearGradient colors={['#0b0b0b', '#000']} className="flex-1 px-6">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="pt-6 pb-4">
            <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px]">Recepción Taller</Text>
            <Text className="text-white text-3xl font-black italic">Hoja de Inspección</Text>
            <Text className="text-zinc-500 text-xs mt-1">Estándar SCANIA</Text>
          </View>

          {zonasDinamicas.map((zona) => (
            <View key={zona.id} className="mb-5">
              <Text className="text-blue-400 text-[10px] font-black uppercase tracking-[3px] mb-3">{zona.titulo}</Text>
              <View className="bg-zinc-900/70 border border-white/10 rounded-2xl p-3">
                {zona.items.map((item) => {
                  const key = `${zona.id}:${item}`;
                  const isChecked = checks[key];
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => toggleItem(key)}
                      className="flex-row items-center justify-between py-3 border-b border-white/5"
                    >
                      <Text className={`text-sm font-bold ${isChecked ? 'text-white' : 'text-zinc-400'}`}>{item}</Text>
                      <View className="w-7 h-7 items-center justify-center">
                        {isChecked ? <CheckCircle2 size={20} color="#10B981" /> : <Circle size={20} color="#555" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          <View className="mb-6">
            <Text className="text-emerald-400 text-[10px] font-black uppercase tracking-[3px] mb-3">Fotos del Camión</Text>
            <View className="flex-row flex-wrap justify-between">
              {([
                { key: 'frente', label: 'Frente' },
                { key: 'atras', label: 'Atrás' },
                { key: 'latIzq', label: 'Lateral Izq' },
                { key: 'latDer', label: 'Lateral Der' },
              ] as const).map((item) => (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => pickPhoto(item.key)}
                  className="w-[48%] h-28 bg-zinc-900/70 border border-white/10 rounded-2xl mb-3 overflow-hidden items-center justify-center"
                >
                  {fotos[item.key] ? (
                    <Image source={{ uri: fotos[item.key] as string }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <View className="items-center">
                      <Camera size={20} color="#60A5FA" />
                      <Text className="text-zinc-500 text-[9px] font-bold uppercase mt-1">{item.label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-emerald-400 text-[10px] font-black uppercase tracking-[3px] mb-3">Observaciones</Text>
            <TextInput
              multiline
              numberOfLines={4}
              value={observaciones}
              onChangeText={setObservaciones}
              placeholder="Observaciones generales de recepción..."
              placeholderTextColor="#555"
              textAlignVertical="top"
              className="bg-zinc-900/70 border border-white/10 rounded-2xl p-4 text-white min-h-[100px]"
            />
          </View>

          <View className="mb-10">
            <Text className="text-emerald-400 text-[10px] font-black uppercase tracking-[3px] mb-3">Firmas</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setModalFirma('chofer')}
                className="flex-1 bg-zinc-900/70 border border-white/10 rounded-2xl p-3 items-center"
              >
                {firmaChofer ? (
                  <Image source={{ uri: firmaChofer }} className="w-full h-20" resizeMode="contain" />
                ) : (
                  <>
                    <PenTool size={18} color="#34D399" />
                    <Text className="text-zinc-400 text-[9px] font-bold uppercase mt-2">Firma Chofer</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setModalFirma('asesor')}
                className="flex-1 bg-zinc-900/70 border border-white/10 rounded-2xl p-3 items-center"
              >
                {firmaAsesor ? (
                  <Image source={{ uri: firmaAsesor }} className="w-full h-20" resizeMode="contain" />
                ) : (
                  <>
                    <PenTool size={18} color="#60A5FA" />
                    <Text className="text-zinc-400 text-[9px] font-bold uppercase mt-2">Firma Asesor</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleGuardarRecepcion}
            className="mb-10 bg-emerald-600 rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-black uppercase">Guardar Recepción</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>

      <Modal visible={!!modalFirma} transparent animationType="slide" onRequestClose={() => setModalFirma(null)}>
        <View className="flex-1 bg-black/90 justify-center">
          <View className="bg-zinc-900 rounded-2xl mx-4 border border-white/10 overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
              <Text className="text-white font-bold">Firma {modalFirma === 'chofer' ? 'Chofer' : 'Asesor'}</Text>
              <TouchableOpacity onPress={() => setModalFirma(null)} className="p-1">
                <X size={18} color="white" />
              </TouchableOpacity>
            </View>
            <View className="h-72">
              <SignatureScreen
                onOK={(sig: string) => {
                  if (modalFirma === 'chofer') setFirmaChofer(sig);
                  if (modalFirma === 'asesor') setFirmaAsesor(sig);
                  setModalFirma(null);
                }}
                onEmpty={() => Alert.alert('Firma', 'No se detectó ninguna firma.')}
                descriptionText=""
                clearText="Limpiar"
                confirmText="Guardar"
                webStyle={'.m-signature-pad--footer {display: none; margin: 0px;}'}
              />
            </View>
          </View>
        </View>
      </Modal>

      {!!isSaving && <LoadingOverlay message="Guardando recepción..." />}
    </SafeAreaView>
  );
}
