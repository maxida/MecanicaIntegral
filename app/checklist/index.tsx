import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { 
  KeyboardAvoidingView, 
  Platform, 
  SafeAreaView, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  Alert,
  StatusBar // Importante importar esto
} from 'react-native';

const StaticFormScreen = () => {
  const navigation = useNavigation<any>();

  // ESTADO
  const [vehicleData, setVehicleData] = useState({
    concesionario: 'SCANIA - TUCUMÁN', 
    cliente: '',
    fecha: new Date().toLocaleDateString('es-AR'),
    km: '',
    matricula: '',
    orden: '',
    motor: '',
    chasis: '',
    operacion: '',
    tecnico: '',
    nota: false 
  });

  const handleChange = (key: string, value: string | boolean) => {
    setVehicleData(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (!vehicleData.matricula || !vehicleData.cliente) {
      Alert.alert("Faltan datos", "Por favor completa al menos el Cliente y la Matrícula.");
      return;
    }
    navigation.navigate('checklist/checklistitems', { vehicleData });
  };

  return (
    <View style={styles.mainContainer}>
      <LinearGradient colors={['#000000', '#121212']} style={styles.gradient}>
        {/* SafeAreaView con padding manual para Android */}
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.title}>Recepción de Unidad</Text>

                <View style={styles.formContainer}>
                <Text style={styles.sectionTitle}>Datos Generales</Text>

                <Text style={styles.label}>Concesionario</Text>
                <TextInput
                    style={styles.input}
                    value={vehicleData.concesionario}
                    onChangeText={(t) => handleChange('concesionario', t)}
                    placeholderTextColor="#666"
                />

                <Text style={styles.label}>Nombre del Cliente *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej: Transporte Los Andes"
                    placeholderTextColor="#666"
                    value={vehicleData.cliente}
                    onChangeText={(t) => handleChange('cliente', t)}
                />

                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.label}>Fecha</Text>
                    <TextInput
                        style={styles.input}
                        value={vehicleData.fecha}
                        onChangeText={(t) => handleChange('fecha', t)}
                        placeholderTextColor="#666"
                    />
                    </View>
                    <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Kilometraje</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: 150000"
                        keyboardType="numeric"
                        placeholderTextColor="#666"
                        value={vehicleData.km}
                        onChangeText={(t) => handleChange('km', t)}
                    />
                    </View>
                </View>

                <Text style={styles.label}>Dominio (Patente) *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="AA 123 BB"
                    placeholderTextColor="#666"
                    autoCapitalize="characters"
                    value={vehicleData.matricula}
                    onChangeText={(t) => handleChange('matricula', t)}
                />

                <Text style={styles.label}>Nro. Orden de Trabajo</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Nº ORDEN"
                    keyboardType="numeric"
                    placeholderTextColor="#666"
                    value={vehicleData.orden}
                    onChangeText={(t) => handleChange('orden', t)}
                />

                <Text style={styles.label}>Modelo / Motor</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej: R450 / DC13"
                    placeholderTextColor="#666"
                    value={vehicleData.motor}
                    onChangeText={(t) => handleChange('motor', t)}
                />

                <Text style={styles.label}>Nro. Chasis (Últimos 7)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej: 1234567"
                    keyboardType="numeric"
                    placeholderTextColor="#666"
                    value={vehicleData.chasis}
                    onChangeText={(t) => handleChange('chasis', t)}
                />

                <Text style={styles.label}>Técnico Responsable</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Nombre del técnico"
                    placeholderTextColor="#666"
                    value={vehicleData.tecnico}
                    onChangeText={(t) => handleChange('tecnico', t)}
                />

                <Text style={styles.sectionTitle}>Estado de Ingreso</Text>

                <View style={styles.checkboxContainer}>
                    <TouchableOpacity 
                    style={styles.checkboxRow} 
                    onPress={() => handleChange('nota', false)}
                    >
                    <View style={[styles.checkbox, !vehicleData.nota && styles.checkedBox]} />
                    <Text style={styles.checkboxLabel}>Ingresa SIN observaciones</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                    style={styles.checkboxRow} 
                    onPress={() => handleChange('nota', true)}
                    >
                    <View style={[styles.checkbox, vehicleData.nota && styles.checkedBox]} />
                    <Text style={styles.checkboxLabel}>Ingresa CON daños/notas</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.navigationButtons}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                    style={styles.nextButton}
                    onPress={handleNext}
                    >
                    <Text style={styles.navButtonText}>Siguiente &gt;</Text>
                    </TouchableOpacity>
                </View>
                </View>
            </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1 },
  safeArea: { 
    flex: 1, 
    // AJUSTE CRÍTICO: Espacio para la StatusBar en Android
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 10 : 0 
  },
  scrollContainer: { paddingVertical: 20, paddingHorizontal: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  formContainer: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  sectionTitle: { color: '#FF4C4C', fontSize: 18, fontWeight: '600', borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 10, marginBottom: 20, marginTop: 10 },
  label: { color: '#aaa', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: '#121212', color: '#fff', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#333', marginBottom: 16, fontSize: 16 },
  row: { flexDirection: 'row' },
  checkboxContainer: { marginVertical: 10 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 10, backgroundColor: '#121212', borderRadius: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#FF4C4C', marginRight: 12 },
  checkedBox: { backgroundColor: '#FF4C4C' },
  checkboxLabel: { color: '#fff', fontSize: 14 },
  navigationButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, alignItems: 'center' },
  cancelButton: { padding: 10 },
  cancelButtonText: { color: '#666' },
  nextButton: { backgroundColor: '#FF4C4C', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 10, shadowColor: '#FF4C4C', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 5 },
  navButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default StaticFormScreen;