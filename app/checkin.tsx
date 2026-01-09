import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { crearTurnoService } from '@/services/turnosService';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

const ITEMS_CHECKLIST = [
  { nombre: 'Neumáticos', icono: 'adjust', descripcion: 'Verificar presión y desgaste', completado: false },
  { nombre: 'Frenos', icono: 'stop-circle', descripcion: 'Revisar pastillas y sistema de frenado', completado: false },
  { nombre: 'Luces', icono: 'highlight', descripcion: 'Delanteras, traseras e intermitentes', completado: false },
  { nombre: 'Retrovisores', icono: 'mirrors', descripcion: 'Estado general y funcionalidad', completado: false },
  { nombre: 'Limpiaparabrisas', icono: 'waves', descripcion: 'Funcionamiento y desgaste', completado: false },
  { nombre: 'Batería', icono: 'battery-charging-full', descripcion: 'Conexiones y estado', completado: false },
  { nombre: 'Aceite', icono: 'opacity', descripcion: 'Nivel y condición', completado: false },
  { nombre: 'Refrigerante', icono: 'ac-unit', descripcion: 'Nivel y condición', completado: false },
  { nombre: 'Dirección', icono: 'explore', descripcion: 'Funcionalidad y holgura', completado: false },
  { nombre: 'Suspensión', icono: 'keyboard-arrow-up', descripcion: 'Amortiguadores y muelles', completado: false },
];

const CheckInFullForm = () => {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.login.user);

  // Estados del Reporte
  const [km, setKm] = useState('');
  const [fuel, setFuel] = useState(50);
  const [status, setStatus] = useState<'ok' | 'obs' | 'crit' | null>(null);
  const [checklist, setChecklist] = useState(ITEMS_CHECKLIST);
  const [photo, setPhoto] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState('');

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const toggleItem = (index: number) => {
    const newChecklist = [...checklist];
    newChecklist[index].completado = !newChecklist[index].completado;
    setChecklist(newChecklist);
  };

  const handleSubmit = async () => {
    if (!km || !status || !photo) {
      Alert.alert("Atención", "KM, Foto del tablero y Veredicto son obligatorios.");
      return;
    }

    try {
      // ESTOS SON LOS DATOS QUE VIAJAN AL SUPER ADMIN
      const dataFinal = {
        clienteId: user?.id,            // ID único del Chofer/Cliente
        chofer: user?.nombre,           // Nombre que firma
        numeroPatente: 'AE-744-GT',     // Vinculado automáticamente
        kilometraje: km,
        nivelNafta: fuel,
        fotoTablero: photo,             // Validación visual
        estadoGeneral: status,          // OK / OBS / CRIT
        checklistIngreso: checklist,    // Los 10 puntos técnicos
        comentariosChofer: observaciones, // Texto libre de ruidos/fallas
        estado: 'pending',              // Entra directo al Backlog del Admin
        fechaCreacion: new Date().toISOString(),
      };

      await crearTurnoService(dataFinal);
      Alert.alert("¡Enviado!", "El reporte llegó al Centro de Mando.");
      router.replace('/home');
    } catch (error) {
      Alert.alert("Error", "No se pudo sincronizar el reporte.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <LinearGradient colors={['#0b0b0b', '#000']} className="flex-1 px-6">
        <ScrollView showsVerticalScrollIndicator={false} className="pt-6">
          
          <View className="mb-8">
            <Text className="text-white text-3xl font-black italic uppercase">Inspección</Text>
            <Text className="text-primary text-[10px] font-bold tracking-[3px]">REGISTRO DE INGRESO - TERMINAL LOGÍSTICA</Text>
          </View>

          {/* 1. KM Y COMBUSTIBLE (0, 25, 50, 75, 100) */}
          <View className="flex-row space-x-4 mb-6">
             <View className="flex-1 bg-card border border-white/10 rounded-3xl p-4">
                <Text className="text-gray-500 text-[8px] font-bold uppercase mb-2 ml-1">Kilometraje</Text>
                <TextInput className="text-white text-2xl font-black" keyboardType="numeric" placeholder="000" placeholderTextColor="#222" value={km} onChangeText={setKm} />
             </View>
             <View className="flex-1 bg-card border border-white/10 rounded-3xl p-4">
                <Text className="text-gray-500 text-[8px] font-bold uppercase mb-2 ml-1">Combustible</Text>
                <View className="flex-row justify-between mt-1">
                  {[0, 25, 50, 75, 100].map(v => (
                    <TouchableOpacity key={v} onPress={() => setFuel(v)} className={`px-1.5 py-1 rounded-md ${fuel === v ? 'bg-primary' : 'bg-white/5'}`}>
                      <Text className={`text-[8px] font-black ${fuel === v ? 'text-white' : 'text-gray-600'}`}>{v}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
             </View>
          </View>

          {/* 2. FOTO DEL TABLERO */}
          <TouchableOpacity onPress={takePhoto} activeOpacity={0.9} className="mb-8 w-full h-40 bg-card rounded-[35px] border-2 border-dashed border-white/10 overflow-hidden items-center justify-center">
            {photo ? <Image source={{ uri: photo }} className="w-full h-full" /> : (
              <>
                <MaterialIcons name="photo-camera" size={30} color="#60A5FA" />
                <Text className="text-gray-500 text-[9px] font-bold mt-2 uppercase tracking-widest">Validar con foto de tablero</Text>
              </>
            )}
          </TouchableOpacity>

          {/* 3. CHECKLIST DETALLADO */}
          <View className="mb-8">
            <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px] mb-4 ml-2">Puntos de Control</Text>
            {checklist.map((item, index) => (
              <TouchableOpacity key={index} onPress={() => toggleItem(index)} className={`mb-3 p-5 rounded-[30px] border flex-row items-center ${item.completado ? 'bg-success/20 border-success' : 'bg-card border-white/5'}`}>
                <View className={`p-3 rounded-2xl mr-4 ${item.completado ? 'bg-success/20' : 'bg-white/5'}`}><MaterialIcons name={item.icono as any} size={20} color={item.completado ? '#4ADE80' : '#444'} /></View>
                <View className="flex-1">
                  <Text className={`text-sm font-bold ${item.completado ? 'text-white' : 'text-gray-400'}`}>{item.nombre}</Text>
                  <Text className="text-gray-600 text-[10px]">{item.descripcion}</Text>
                </View>
                {item.completado && <MaterialIcons name="verified" size={20} color="#4ADE80" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* 4. VERDICTO FINAL + OBSERVACIONES */}
          <View className="mb-10">
            <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px] mb-4 ml-2">Veredicto del Chofer</Text>
            <View className="flex-row space-x-2 mb-4">
              <VeredictoBtn active={status === 'ok'} color="#4ADE80" label="TODO BIEN" icon="check" onPress={() => setStatus('ok')} />
              <VeredictoBtn active={status === 'obs'} color="#FACC15" label="REVISIÓN" icon="visibility" onPress={() => setStatus('obs')} />
              <VeredictoBtn active={status === 'crit'} color="#FF4C4C" label="FALLA CRÍTICA" icon="error" onPress={() => setStatus('crit')} />
            </View>

            <View className="bg-card border border-white/10 rounded-[30px] p-5">
              <Text className="text-gray-500 text-[8px] font-bold uppercase mb-2">Notas u Observaciones del Chofer</Text>
              <TextInput 
                multiline numberOfLines={4} 
                className="text-white text-sm" 
                placeholder="Ej: Siento un ruido en la suspensión delantera derecha..." 
                placeholderTextColor="#333"
                value={observaciones}
                onChangeText={setObservaciones}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* 5. BOTÓN CONFIRMAR */}
          <TouchableOpacity onPress={handleSubmit} activeOpacity={0.8} className="mb-12 overflow-hidden rounded-[30px] shadow-2xl shadow-primary/40">
            <LinearGradient colors={['#60A5FA', '#2563EB']} className="py-6 items-center flex-row justify-center">
              <Text className="text-white text-xl font-black italic uppercase">Confirmar Ingreso</Text>
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const VeredictoBtn = ({ active, color, label, icon, onPress }: any) => (
  <TouchableOpacity onPress={onPress} className={`flex-1 p-4 rounded-[25px] border items-center ${active ? '' : 'bg-card border-transparent'}`} style={active ? { backgroundColor: `${color}20`, borderColor: color } : {}}>
    <MaterialIcons name={icon} size={20} color={active ? color : '#444'} />
    <Text style={{ color: active ? color : '#444' }} className="text-[8px] font-black mt-1 text-center">{label}</Text>
  </TouchableOpacity>
);

export default CheckInFullForm;