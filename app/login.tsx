import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Modal,
  Animated as RNAnimated,
} from 'react-native';
import { User, Lock, Eye, EyeOff, Fingerprint, Power, AlertCircle } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { login, loginFailure } from '../redux/slices/loginSlice';
import { loginWithEmail } from '@/services/authService';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Animated, { FadeInUp, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from 'react-native-reanimated';

const logoImg = require('../assets/images/logo-mecanica-integral.jpeg');

const PremiumInput = ({ icon: Icon, label, ...props }: any) => (
  <View className="my-2">
    <Text className="text-gray-500 text-[10px] uppercase font-black tracking-[2px] ml-4 mb-2">{label}</Text>
    <View className="flex-row items-center bg-white/5 rounded-2xl px-4 py-4 border border-white/10 focus:border-primary/50">
      <Icon size={18} color="#60A5FA" />
      <TextInput className="flex-1 text-white text-base ml-4" placeholderTextColor="#444" autoCapitalize="none" {...props} />
    </View>
  </View>
);

const LoginScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [biometricModalVisible, setBiometricModalVisible] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);

  const glowAnim = useSharedValue(0);
  const fingerPrintAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    glowAnim.value = withRepeat(withTiming(1, { duration: 3000 }), -1, true);
    checkStoredCredentials();
  }, []);

  const animatedGlow = useAnimatedStyle(() => ({
    opacity: interpolate(glowAnim.value, [0, 1], [0.4, 0.8]),
    transform: [{ scale: interpolate(glowAnim.value, [0, 1], [1, 1.1]) }],
  }));

  // SecureStore helpers
  const checkStoredCredentials = async () => {
    try {
      if (Platform.OS === 'web') return setHasStoredCredentials(false);
      const raw = await SecureStore.getItemAsync('user_credentials');
      if (raw) {
        setHasStoredCredentials(true);
      } else {
        setHasStoredCredentials(false);
      }
    } catch (err) {
      console.warn('Error reading stored creds', err);
      setHasStoredCredentials(false);
    }
  };

  const saveCredentials = async (emailToSave: string, passwordToSave: string) => {
    try {
      if (Platform.OS === 'web') return;
      await SecureStore.setItemAsync('user_credentials', JSON.stringify({ email: emailToSave, password: passwordToSave }), { keychainAccessible: SecureStore.ALWAYS_THIS_DEVICE_ONLY });
      setHasStoredCredentials(true);
    } catch (err) {
      console.error('Error saving creds', err);
    }
  };

  // Manual login
  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const usuarioAuth = await loginWithEmail(username.trim().toLowerCase(), password);

      const rawRol = usuarioAuth.role || (usuarioAuth as any).rol;
      const rol = typeof rawRol === 'string' ? rawRol.toLowerCase().trim() : rawRol;

      dispatch(
        login({
          usuario: {
            username: usuarioAuth.email,
            email: usuarioAuth.email,
            rol,
            id: usuarioAuth.uid,
            nombre: usuarioAuth.name || (usuarioAuth as any).displayName || usuarioAuth.email.split('@')[0],
          },
          rol,
        })
      );

      // Ask to enable biometric (mobile only)
      try {
        if (Platform.OS !== 'web') {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          if (hasHardware && isEnrolled) {
            Alert.alert('Habilitar ingreso con huella', '¿Deseas habilitar el ingreso con huella/FaceID para la próxima vez?', [
              { text: 'No', style: 'cancel' },
              { text: 'Sí', onPress: () => saveCredentials(username.trim().toLowerCase(), password) },
            ]);
          }
        }
      } catch (err) {
        // ignore
      }

      setTimeout(() => router.push('/home'), 0);
    } catch (err: any) {
      const msg = err.message || 'Error al iniciar sesión';
      setError(msg);
      dispatch(loginFailure({ error: msg }));
    } finally {
      setIsLoading(false);
    }
  };

  // Biometric auth
  const handleBiometricAuth = async () => {
    if (Platform.OS === 'web') return;
    setBiometricModalVisible(true);
    setBiometricLoading(true);

    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(fingerPrintAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        RNAnimated.timing(fingerPrintAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert('Biometría no disponible', 'Su dispositivo no soporta autenticación biométrica o no tiene datos biométricos configurados.');
        setBiometricLoading(false);
        setBiometricModalVisible(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Ingresar con huella' });
      if (!result.success) {
        Alert.alert('Autenticación fallida', 'No se pudo verificar la identidad.');
        setBiometricLoading(false);
        setBiometricModalVisible(false);
        return;
      }

      const raw = await SecureStore.getItemAsync('user_credentials');
      if (!raw) {
        Alert.alert('Sin credenciales', 'No se encontraron credenciales guardadas.');
        setBiometricLoading(false);
        setBiometricModalVisible(false);
        setHasStoredCredentials(false);
        return;
      }

      const creds = JSON.parse(raw);
      const email = creds.email;
      const pwd = creds.password;

      const usuarioAuth = await loginWithEmail(email, pwd);

      const rawRol = usuarioAuth.role || (usuarioAuth as any).rol;
      const rol = typeof rawRol === 'string' ? rawRol.toLowerCase().trim() : rawRol;

      dispatch(
        login({
          usuario: {
            username: usuarioAuth.email,
            email: usuarioAuth.email,
            rol,
            id: usuarioAuth.uid,
            nombre: usuarioAuth.name || (usuarioAuth as any).displayName || usuarioAuth.email.split('@')[0],
          },
          rol,
        })
      );

      setBiometricLoading(false);
      setBiometricModalVisible(false);
      setTimeout(() => router.push('/home'), 0);
    } catch (err: any) {
      console.error('Error biometric login:', err);
      Alert.alert('Error', 'No se pudo iniciar sesión con biometría.');
      setBiometricLoading(false);
      setBiometricModalVisible(false);
    }
  };

  return (
    <View className="flex-1 bg-black justify-center items-center">
      <View className="absolute inset-0 overflow-hidden">
        <View className="absolute -top-20 -left-20 w-80 h-80 bg-danger/20 rounded-full blur-[100px]" />
        <View className="absolute top-1/2 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-[80px]" />
      </View>

      <LinearGradient colors={["transparent", "#000"]} className="flex-1 w-full">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-center items-center">
          <Animated.View entering={FadeInUp.delay(200).duration(1000)} className="w-[85%] max-w-xs">
            <View className="items-center mb-6">
              <Animated.View style={animatedGlow} className="absolute w-32 h-32 bg-danger rounded-full blur-[50px]" />
              <View className="bg-black p-6 rounded-[35px] border border-white/10 shadow-2xl">
                <Image source={logoImg} style={{ width: 220, height: 140 }} resizeMode="contain" borderRadius={20} />
              </View>
              <View className="mt-3 items-center">
                <Text className="text-white text-5xl font-black tracking-tighter italic">MIT</Text>
                <View className="h-[2px] w-10 bg-danger my-1" />
                <Text className="text-gray-500 font-bold tracking-[5px] uppercase text-[10px]">Industrial Systems</Text>
              </View>
            </View>

            <Animated.View entering={FadeInDown.delay(400).duration(800)}>
              <BlurView intensity={20} tint="dark" className="rounded-[45px] overflow-hidden border border-white/10 shadow-2xl">
                <View className="p-6 bg-black/40">
                  <Text className="text-white text-2xl font-bold mb-6 tracking-tight">Acceso de Personal</Text>

                  <PremiumInput label="Email Corporativo" icon={User} placeholder="santiago@mit.com" value={username} onChangeText={setUsername} />

                  <View className="my-2">
                    <Text className="text-gray-500 text-[10px] uppercase font-black tracking-[2px] ml-4 mb-2">Clave de Seguridad</Text>
                    <View className="flex-row items-center bg-white/5 rounded-2xl px-4 py-4 border border-white/10 relative">
                      <Lock size={18} color="#60A5FA" />
                      <TextInput className="flex-1 text-white text-base ml-4 pr-12" placeholderTextColor="#444" autoCapitalize="none" secureTextEntry={!isPasswordVisible} placeholder="••••••••" value={password} onChangeText={setPassword} />
                      <TouchableOpacity onPress={() => setPasswordVisible(v => !v)} className="absolute right-4" accessibilityLabel={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                        {isPasswordVisible ? <Eye size={20} color="#94A3B8" /> : <EyeOff size={20} color="#94A3B8" />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {error && (
                    <View className="bg-danger/10 border border-danger/20 p-3 rounded-xl mb-6 flex-row items-center">
                      <AlertCircle size={16} color="#FF4C4C" />
                      <Text className="text-danger text-[11px] font-bold ml-2">{error}</Text>
                    </View>
                  )}

                  <TouchableOpacity onPress={handleLogin} disabled={isLoading} activeOpacity={0.8} className="bg-danger py-5 rounded-2xl flex-row justify-center items-center shadow-lg shadow-danger/50 mt-2">
                    {isLoading ? <ActivityIndicator color="white" /> : (
                      <>
                        <Text className="text-white font-black text-lg mr-2 uppercase italic">Conectar</Text>
                        <Power size={20} color="white" />
                      </>
                    )}
                  </TouchableOpacity>

                  {Platform.OS !== 'web' && hasStoredCredentials && (
                    <TouchableOpacity onPress={handleBiometricAuth} activeOpacity={0.8} className="mt-4 bg-white/5 py-3 rounded-2xl flex-row justify-center items-center border border-white/10">
                      <Fingerprint size={20} color="#60A5FA" />
                      <Text className="text-white font-bold ml-2">Ingresar con Huella</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity className="mt-6 items-center">
                    <Text className="text-primary/60 font-bold text-[11px] uppercase tracking-widest">¿Olvidaste tu acceso?</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </Animated.View>

            <View className="mt-8 flex-row justify-center items-center opacity-30">
              <View className="h-[1px] w-8 bg-white" />
              <Text className="text-white text-[9px] font-mono mx-3 tracking-tighter">Deployment by Ing. Quinteros  |  v1.1</Text>
              <View className="h-[1px] w-8 bg-white" />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </LinearGradient>

      <Modal visible={biometricModalVisible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/90">
          <View className="bg-card border border-white/10 rounded-[40px] p-10 items-center w-[80%] max-w-[320px]">
            <Text className="text-white text-lg font-black mb-8 text-center">Verificando Identidad</Text>
            <RNAnimated.View style={{ transform: [{ scale: fingerPrintAnim }] }}>
              <Fingerprint size={80} color="#60A5FA" />
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