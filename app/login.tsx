import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useDispatch } from 'react-redux';
import { login, loginFailure } from '../redux/slices/loginSlice';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const dispatch = useDispatch();
  const navigation = useNavigation<any>();

  const handleLogin = () => {
    setError('');
    if (!username.trim() || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const user = username.toLowerCase().trim();
      if ((user === 'santiago' && password === '159753') || (user === 'ana' && password === '654987')) {
        dispatch(login({ username: user }));
        navigation.reset({ index: 0, routes: [{ name: 'home' }] });
      } else {
        dispatch(loginFailure({ error: 'Credenciales inválidas' }));
        setError('Usuario o contraseña incorrectos');
      }
      setIsLoading(false);
    }, 1500);
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
              <MaterialIcons name="person-outline" size={20} color="#666" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Usuario"
                placeholderTextColor="#666"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
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
          </View>

          <Text style={styles.footerText}>v1.0.2 - Dev by Santiago</Text>
        </KeyboardAvoidingView>
      </LinearGradient>
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
  footerText: { color: '#444', textAlign: 'center', marginTop: 30, fontSize: 12 },
});

export default LoginScreen;