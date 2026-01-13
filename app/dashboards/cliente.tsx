import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { LogOut, ClipboardList, Gauge, Fuel, TriangleAlert, History, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '@/redux/store';
import { setTurnos } from '@/redux/slices/turnosSlice';
import { obtenerTurnos, suscribirseATurnos } from '@/services/turnosService';
import LoadingOverlay from '@/components/LoadingOverlay';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';

const ClienteDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.login.user);
  const turnos = useSelector((state: RootState) => state.turnos.turnos);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = suscribirseATurnos((data) => dispatch(setTurnos(data)));
    return () => unsubscribe();
  }, [dispatch]);

  // Simulamos la vinculación del camión según el usuario logueado
  const camionAsignado = {
    patente: 'AE-744-GT',
    modelo: 'Scania R500 V8',
    kmActual: '45.200 km',
    combustible: '75%',
    ultimoCheckin: 'Ayer, 18:30 hs'
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <LinearGradient colors={['#0b0b0b', '#000']} className="flex-1 px-6">
        <ScrollView showsVerticalScrollIndicator={false} className="pt-8">
          
          {/* HEADER CHOFER */}
          <View className="flex-row justify-between items-center mb-10">
            <View>
              <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px]">Unidad Asignada</Text>
              <Text className="text-white text-3xl font-black italic">{camionAsignado.patente}</Text>
              <Text className="text-primary/80 font-bold text-xs">Chofer: {user?.nombre || 'Operador'}</Text>
            </View>
              <TouchableOpacity 
              onPress={onLogout}
              className="w-12 h-12 rounded-2xl bg-danger/10 border border-danger/20 items-center justify-center"
            >
              <LogOut size={18} color="#FF4C4C" />
            </TouchableOpacity>
          </View>

          {/* BOTÓN DE ACCIÓN PRINCIPAL: CHECK-IN AL GALPÓN */}
          <Animated.View entering={FadeInUp.delay(200)}>
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => navigation.navigate('checkin')}
              className="mb-8 overflow-hidden rounded-[40px] border border-primary/30 shadow-2xl shadow-primary/20"
            >
              <LinearGradient colors={['#60A5FA', '#2563EB']} start={{x:0, y:0}} end={{x:1, y:1}} className="p-8 flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-white text-2xl font-black italic uppercase">Ingreso al Galpón</Text>
                  <Text className="text-white/80 text-xs font-bold mt-1">INICIAR CHECKLIST DE ENTRADA</Text>
                </View>
                <View className="bg-white/20 p-4 rounded-full">
                  <ClipboardList size={28} color="white" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* STATUS ACTUAL DEL CAMIÓN */}
          <View className="flex-row justify-between mb-8">
            <BlurView intensity={10} tint="dark" className="flex-1 mr-2 rounded-3xl border border-white/5 overflow-hidden">
              <View className="p-5 bg-card/40 items-center">
                <Gauge size={18} color="#60A5FA" />
                <Text className="text-white font-black text-lg mt-2">{camionAsignado.kmActual}</Text>
                <Text className="text-gray-600 text-[9px] uppercase font-bold">Odómetro</Text>
              </View>
            </BlurView>

            <BlurView intensity={10} tint="dark" className="flex-1 ml-2 rounded-3xl border border-white/5 overflow-hidden">
              <View className="p-5 bg-card/40 items-center">
                <Fuel size={18} color="#4ADE80" />
                <Text className="text-white font-black text-lg mt-2">{camionAsignado.combustible}</Text>
                <Text className="text-gray-600 text-[9px] uppercase font-bold">Tanque</Text>
              </View>
            </BlurView>
          </View>

          {/* ACCIONES SECUNDARIAS */}
          <View className="flex-row space-x-4 mb-10">
            <TouchableOpacity 
              onPress={() => navigation.navigate('solicitud')}
              className="flex-1 bg-card border border-white/5 p-6 rounded-[35px] items-center"
            >
                <View className="bg-danger/10 p-3 rounded-2xl mb-3">
                <TriangleAlert size={22} color="#FF4C4C" />
              </View>
              <Text className="text-white font-bold text-xs uppercase text-center">Reportar Falla</Text>
            </TouchableOpacity>

            <TouchableOpacity className="flex-1 bg-card border border-white/5 p-6 rounded-[35px] items-center">
                <View className="bg-primary/10 p-3 rounded-2xl mb-3">
                <History size={20} color="#60A5FA" />
              </View>
              <Text className="text-white font-bold text-xs uppercase text-center">Mis Viajes</Text>
            </TouchableOpacity>
          </View>

          {/* HISTORIAL TÉCNICO (Compacto) */}
          <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Últimas Intervenciones</Text>
          {turnos.filter(t => t.estado === 'completed').slice(0, 2).map((turno, idx) => (
            <Animated.View key={turno.id} entering={FadeInRight.delay(idx * 100)}>
              <BlurView intensity={5} tint="dark" className="mb-3 rounded-2xl border border-white/5 overflow-hidden">
                <View className="p-4 bg-card/40 flex-row items-center">
                    <View className="bg-success/10 p-2 rounded-lg mr-4">
                    <Check size={14} color="#4ADE80" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-sm">{turno.descripcion}</Text>
                    <Text className="text-gray-500 text-[10px]">{new Date(turno.fechaCreacion).toLocaleDateString()}</Text>
                  </View>
                </View>
              </BlurView>
            </Animated.View>
          ))}

        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default ClienteDashboard;