import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Modal,
  Animated as RNAnimated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { login, loginFailure } from '../redux/slices/loginSlice';
import { loginWithEmail } from '@/services/authService';
import Animated, { FadeInUp, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from 'react-native-reanimated';

const logoImg = require('../assets/images/logo-mecanica-integral.jpeg');
// Sub-componente para Inputs con Efecto Premium
const PremiumInput = ({ icon, label, ...props }: any) => (
  <View className="my-2">
    <Text className="text-gray-500 text-[10px] uppercase font-black tracking-[2px] ml-4 mb-2">{label}</Text>
    <View className="flex-row items-center bg-white/5 rounded-2xl px-4 py-4 border border-white/10 focus:border-primary/50">
      <MaterialIcons name={icon} size={18} color="#60A5FA" />
      <TextInput
        className="flex-1 text-white text-base ml-4"
        placeholderTextColor="#444"
        autoCapitalize="none"
        {...props}
      />
    </View>
  </View>
);

const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const router = useRouter();
  const dispatch = useDispatch();

  // Estados de Lógica
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Estados Biométricos
  const [biometricModalVisible, setBiometricModalVisible] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  // Animaciones
  const glowAnim = useSharedValue(0);
  const fingerPrintAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    glowAnim.value = withRepeat(withTiming(1, { duration: 3000 }), -1, true);
  }, []);

  const animatedGlow = useAnimatedStyle(() => ({
    opacity: interpolate(glowAnim.value, [0, 1], [0.4, 0.8]),
    transform: [{ scale: interpolate(glowAnim.value, [0, 1], [1, 1.1]) }],
  }));

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const usuarioAuth = await loginWithEmail(username.trim().toLowerCase(), password);

      // Normalizar y guardar rol en redux
      const rawRol = usuarioAuth.role || (usuarioAuth as any).rol;
      const rol = typeof rawRol === 'string' ? rawRol.toLowerCase().trim() : rawRol;

      dispatch(login({
        usuario: {
          username: usuarioAuth.email,
          email: usuarioAuth.email,
          rol,
          id: usuarioAuth.uid,
          nombre: usuarioAuth.name || (usuarioAuth as any).displayName || usuarioAuth.email.split('@')[0],
        },
        rol,
      }));

      // Mapear roles a rutas de dashboard según especificación
      const rutaPorRol: Record<string, string> = {
        cliente: '/dashboards/supervisor', // cliente -> supervisor
        admin: '/dashboards/admin',
        chofer: '/dashboards/cliente',    // chofer -> cliente dashboard
        taller: '/dashboards/mecanico',   // taller -> mecanico dashboard
        supervisor: '/dashboards/supervisor',
        mecanico: '/dashboards/mecanico',
      };

      // Navegar al `home` centralizado; `home` renderiza el dashboard según `rol`
      const destino = '/home';
      // Usamos push con un pequeño delay para asegurarnos que el Stack esté montado
      setTimeout(() => router.push(destino), 0);
    } catch (err: any) {
      const msg = err.message || 'Error al iniciar sesión';
      setError(msg);
      dispatch(loginFailure({ error: msg }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricModalVisible(true);
    setBiometricLoading(true);

    // Animación de huella
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(fingerPrintAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        RNAnimated.timing(fingerPrintAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    // Simulación de éxito (Aquí iría tu lógica de LocalAuthentication si la agregás después)
    setTimeout(() => {
      setBiometricLoading(false);
      setBiometricModalVisible(false);
      // Por ahora solo cerramos, pero podrías disparar un login automático de Santiago
    }, 2000);
  };
  return (
    <View className="flex-1 bg-black justify-center items-center">
      {/* Fondo con Spotlights Dinámicos */}
      <View className="absolute inset-0 overflow-hidden">
        <View className="absolute -top-20 -left-20 w-80 h-80 bg-danger/20 rounded-full blur-[100px]" />
        <View className="absolute top-1/2 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-[80px]" />
      </View>

      <LinearGradient colors={["transparent", "#000"]} className="flex-1 w-full">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-center items-center">

          <Animated.View entering={FadeInUp.delay(200).duration(1000)} className="w-[85%] max-w-xs">

            {/* Logo con Aura Técnica */}
            <View className="items-center mb-6">
              <Animated.View style={animatedGlow} className="absolute w-32 h-32 bg-danger rounded-full blur-[50px]" />
              <View className="bg-black p-6 rounded-[35px] border border-white/10 shadow-2xl">
                <Image
                  source={logoImg}
                  // Ajustamos el tamaño para que entre bien en el diseño sin ser gigante
                  style={{ width: 220, height: 140 }}
                  resizeMode="contain"
                  // Redondeamos un poco la imagen misma para suavizarla
                  borderRadius={20}
                />
              </View>
              <View className="mt-3 items-center">
                <Text className="text-white text-5xl font-black tracking-tighter italic">MIT</Text>
                <View className="h-[2px] w-10 bg-danger my-1" />
                <Text className="text-gray-500 font-bold tracking-[5px] uppercase text-[10px]">Industrial Systems</Text>
              </View>
            </View>

            {/* Tarjeta Glassmorphism */}
            <Animated.View entering={FadeInDown.delay(400).duration(800)}>
              <BlurView intensity={20} tint="dark" className="rounded-[45px] overflow-hidden border border-white/10 shadow-2xl">
                <View className="p-6 bg-black/40">
                  <Text className="text-white text-2xl font-bold mb-6 tracking-tight">Acceso de Personal</Text>

                  <PremiumInput 
                    label="Email Corporativo" 
                    icon="person-outline" 
                    placeholder="santiago@mit.com"
                    value={username}
                    onChangeText={setUsername}
                  />

                  <PremiumInput 
                    label="Clave de Seguridad" 
                    icon="lock-open" 
                    placeholder="••••••••" 
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />

                  {error && (
                    <View className="bg-danger/10 border border-danger/20 p-3 rounded-xl mb-6 flex-row items-center">
                      <MaterialIcons name="error-outline" size={16} color="#FF4C4C" />
                      <Text className="text-danger text-[11px] font-bold ml-2">{error}</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    className="bg-danger py-5 rounded-2xl flex-row justify-center items-center shadow-lg shadow-danger/50 mt-2"
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Text className="text-white font-black text-lg mr-2 uppercase italic">Conectar</Text>
                        <MaterialIcons name="power-settings-new" size={20} color="white" />
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity className="mt-6 items-center">
                    <Text className="text-primary/60 font-bold text-[11px] uppercase tracking-widest">¿Olvidaste tu acceso?</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </Animated.View>

            {/* Footer Técnico */}
            <View className="mt-8 flex-row justify-center items-center opacity-30">
              <View className="h-[1px] w-8 bg-white" />
              <Text className="text-white text-[9px] font-mono mx-3 tracking-tighter">Deployment by Quinteros  |  v1.1</Text>
              <View className="h-[1px] w-8 bg-white" />
            </View>

          </Animated.View>
        </KeyboardAvoidingView>
      </LinearGradient>
    {/* Modal Biométrico */}
      <Modal visible={biometricModalVisible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/90">
          <View className="bg-card border border-white/10 rounded-[40px] p-10 items-center w-[80%] max-w-[320px]">
            <Text className="text-white text-lg font-black mb-8 text-center">Verificando Identidad</Text>
            <RNAnimated.View style={{ transform: [{ scale: fingerPrintAnim }] }}>
              <MaterialIcons name="fingerprint" size={80} color="#60A5FA" />
            </RNAnimated.View>
            {biometricLoading && <ActivityIndicator color="#60A5FA" className="mt-6" />}
            <TouchableOpacity onPress={() => setBiometricModalVisible(false)} className="mt-8">
              <Text className="text-danger font-bold text-[10px] uppercase tracking-[3px]">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default LoginScreen;