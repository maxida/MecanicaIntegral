import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
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
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricModalVisible, setBiometricModalVisible] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [fingerPrintAnim] = useState(new Animated.Value(1));

  const dispatch = useDispatch();
  const navigation = useNavigation<any>();

  const handleLogin = async () => {
    setError('');
    
    if (!username.trim() || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    setIsLoading(true);
    try {
      // Autenticarse con Firebase
      const usuarioAuth = await loginWithEmail(username.trim().toLowerCase(), password);
      
      // Login exitoso
      dispatch(login({ 
        usuario: {
          username: usuarioAuth.email,
          email: usuarioAuth.email,
          rol: usuarioAuth.rol,
          id: usuarioAuth.uid,
          nombre: usuarioAuth.displayName,
        },
        rol: usuarioAuth.rol,
      }));
      
      navigation.reset({ index: 0, routes: [{ name: 'home' }] });
    } catch (err: any) {
      dispatch(loginFailure({ error: err.message }));
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  // Biometría - login como Santiago (admin) por defecto
  const handleBiometricLogin = async () => {
    setBiometricModalVisible(true);
    setBiometricLoading(true);

    // Simular animación de escaneo
    Animated.loop(
      Animated.sequence([
        Animated.timing(fingerPrintAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(fingerPrintAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Simular escaneo de 2.5 segundos
    setTimeout(() => {
      setBiometricLoading(false);
      
      // Simular éxito de autenticación (80% de probabilidad)
      const isSuccess = Math.random() > 0.2;
      
      if (isSuccess) {
        // Login con huella - usar Santiago (Admin)
        const defaultEmail = 'santiago@mit.com';
        const defaultPassword = '123456';
        
        loginWithEmail(defaultEmail, defaultPassword)
          .then((usuarioAuth) => {
            dispatch(login({ 
              usuario: {
                username: usuarioAuth.email,
                email: usuarioAuth.email,
                rol: usuarioAuth.rol,
                id: usuarioAuth.uid,
                nombre: usuarioAuth.displayName,
              },
              rol: usuarioAuth.rol,
            }));
            setBiometricModalVisible(false);
            navigation.reset({ index: 0, routes: [{ name: 'home' }] });
          })
          .catch((err) => {
            Alert.alert('Error', err.message || 'Error al iniciar sesión');
            setBiometricModalVisible(false);
          });
      } else {
        // Mostrar error
        Alert.alert('Error', 'Huella no reconocida. Por favor intenta de nuevo.');
        setBiometricModalVisible(false);
      }
    }, 2500);
  };

  return (
    <View style={styles.mainContainer}>
      <LinearGradient
        colors={['#000000', '#1a0505']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/logo-mecanica-integral.jpeg')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Bienvenido</Text>
            <Text style={styles.subtitle}>Gestión Integral de Taller</Text>

            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={20} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#666"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="lock-outline" size={20} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#666"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={16} color="#FF4C4C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              style={[styles.button, isLoading && styles.buttonDisabled]}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>INGRESAR</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>O</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              onPress={handleBiometricLogin}
              disabled={isLoading}
              style={[styles.biometricButton, isLoading && styles.buttonDisabled]}
            >
              <MaterialIcons name="fingerprint" size={24} color="#fff" />
              <Text style={styles.biometricButtonText}>Usar huella digital</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>v1.0.4 - Mecánica Integral</Text>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* Modal de escaneo de huella */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={biometricModalVisible}
        onRequestClose={() => !biometricLoading && setBiometricModalVisible(false)}
      >
        <View style={styles.biometricOverlay}>
          <View style={styles.biometricModal}>
            <Text style={styles.biometricTitle}>Escanea tu huella digital</Text>
            
            <Animated.View style={{ transform: [{ scale: fingerPrintAnim }] }}>
              <MaterialIcons name="fingerprint" size={80} color="#60A5FA" />
            </Animated.View>
            
            {biometricLoading ? (
              <>
                <Text style={styles.biometricSubtitle}>Escaneando...</Text>
                <ActivityIndicator size="large" color="#60A5FA" style={{ marginTop: 20 }} />
              </>
            ) : (
              <Text style={styles.biometricSubtitle}>Coloca tu dedo en el sensor</Text>
            )}

            {!biometricLoading && (
              <TouchableOpacity
                onPress={() => setBiometricModalVisible(false)}
                style={styles.biometricCloseButton}
              >
                <Text style={styles.biometricCloseButtonText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1 },
  keyboardView: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 250, height: 160 },
  card: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    padding: 30,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#888', textAlign: 'center', marginBottom: 30 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  icon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 16 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: 'rgba(255, 76, 76, 0.1)', padding: 10, borderRadius: 8 },
  errorText: { color: '#FF4C4C', fontSize: 14, marginLeft: 8, fontWeight: '600' },
  button: {
    backgroundColor: '#FF4C4C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#FF4C4C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#444' },
  dividerText: { marginHorizontal: 12, color: '#666', fontSize: 14 },
  biometricButton: {
    backgroundColor: '#60A5FA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  biometricButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  changeRoleButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  changeRoleButtonText: { color: '#60A5FA', fontSize: 14, fontWeight: '600' },
  biometricOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometricModal: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    width: '85%',
  },
  biometricTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  biometricSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 20,
    textAlign: 'center',
  },
  biometricCloseButton: {
    marginTop: 30,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
  },
  biometricCloseButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  footerText: { color: '#444', textAlign: 'center', marginTop: 30, fontSize: 12 },
});

export default LoginScreen;