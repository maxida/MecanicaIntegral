import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  Animated,
  ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { login, loginFailure } from '../redux/slices/loginSlice';
import { loginWithEmail, obtenerRolUsuario } from '@/services/authService';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricModalVisible, setBiometricModalVisible] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const fingerPrintAnim = useRef(new Animated.Value(1)).current;
  const animRef = useRef<any>(null);

  const handleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const usuario = await loginWithEmail(username, password);
      dispatch(login({ usuario, rol: usuario.rol }));
      navigation.navigate('home');
    } catch (e: any) {
      const mensaje = e?.message || 'Error al iniciar sesión';
      setError(mensaje);
      dispatch(loginFailure({ error: mensaje }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricModalVisible(true);
    setBiometricLoading(true);
    // simulate biometric flow
    setTimeout(() => {
      setBiometricLoading(false);
      setBiometricModalVisible(false);
    }, 1500);
  };

  useEffect(() => {
    if (biometricModalVisible) {
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(fingerPrintAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(fingerPrintAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      animRef.current.start();
    } else {
      animRef.current?.stop?.();
      fingerPrintAnim.setValue(1);
    }
    return () => animRef.current?.stop?.();
  }, [biometricModalVisible]);
  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={["#000000", "#1a0505"]}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-center px-6 pt-10 pb-15"
        >
          <View className="items-center mb-10">
            <Image
              source={require('../assets/images/logo-mecanica-integral.jpeg')}
              style={{ width: 250, height: 160 }}
              resizeMode="contain"
            />
          </View>

          <View className="w-full max-w-md mx-auto">
            <View className="bg-card/95 rounded-3xl border border-[#222] p-6 shadow-lg">
              <Text className="text-3xl font-extrabold text-white text-center mb-1">Bienvenido</Text>
              <Text className="text-sm text-[#9CA3AF] text-center mb-6">Gestión Integral de Taller</Text>

              <View className="flex-row items-center bg-surface rounded-lg px-4 py-3 mb-4 border border-[#2b2b2b]">
                <MaterialIcons name="email" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
                <TextInput
                  accessibilityLabel="Email"
                  autoComplete="email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="flex-1 text-white text-base"
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>

              <View className="flex-row items-center bg-surface rounded-lg px-4 py-3 mb-4 border border-[#2b2b2b]">
                <MaterialIcons name="lock-outline" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
                <TextInput
                  accessibilityLabel="Contraseña"
                  className="flex-1 text-white text-base"
                  placeholder="Contraseña"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mostrar contraseña" onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>

              {error ? (
                <View className="flex-row items-center mb-4 p-3 rounded-md bg-[rgba(255,76,76,0.08)] border border-[rgba(255,76,76,0.12)]">
                  <MaterialIcons name="error-outline" size={16} color="#FF4C4C" />
                  <Text className="text-[#FF4C4C] text-sm font-semibold ml-2">{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity onPress={handleLogin} disabled={isLoading} activeOpacity={0.85} className="rounded-xl overflow-hidden">
                <LinearGradient colors={["#FF6B6B", "#FF4C4C"]} style={{ borderRadius: 12 }}>
                  <View className={`py-4 items-center ${isLoading ? 'opacity-60' : ''}`}>
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white text-lg font-extrabold">INGRESAR</Text>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <View className="flex-row items-center my-5">
                <View className="flex-1 h-[1px] bg-[#2b2b2b]" />
                <Text className="mx-3 text-[#9CA3AF] text-sm">O</Text>
                <View className="flex-1 h-[1px] bg-[#2b2b2b]" />
              </View>

              <TouchableOpacity
                onPress={handleBiometricLogin}
                disabled={isLoading}
                className={`rounded-lg py-3 items-center flex-row justify-center border ${isLoading ? 'opacity-60' : ''}`}
                style={{ borderColor: '#274C77', backgroundColor: 'rgba(96,165,250,0.08)' }}
              >
                <MaterialIcons name="fingerprint" size={22} color="#60A5FA" />
                <Text className="text-primary text-sm font-semibold ml-3">Usar huella digital</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text className="text-[#444] text-center mt-8 text-sm">v1.0.4 - Mecánica Integral</Text>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* Modal de escaneo de huella */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={biometricModalVisible}
        onRequestClose={() => !biometricLoading && setBiometricModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <View className="bg-card rounded-2xl p-8 items-center border border-[#333]" style={{ width: '85%' }}>
            <Text className="text-xl font-bold text-white mb-6 text-center">Escanea tu huella digital</Text>
            
            <Animated.View style={{ transform: [{ scale: fingerPrintAnim }] }}>
              <MaterialIcons name="fingerprint" size={80} color="#60A5FA" />
            </Animated.View>
            
            {biometricLoading ? (
              <>
                <Text className="text-[#888] text-base mt-5">Escaneando...</Text>
                <ActivityIndicator size="large" color="#60A5FA" style={{ marginTop: 20 }} />
              </>
            ) : (
              <Text className="text-[#888] text-base mt-5">Coloca tu dedo en el sensor</Text>
            )}

            {!biometricLoading && (
              <TouchableOpacity
                onPress={() => setBiometricModalVisible(false)}
                className="mt-6 px-5 py-2 rounded-md border border-[#666]"
              >
                <Text className="text-white font-semibold">Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default LoginScreen;