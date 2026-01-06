import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import LoadingOverlay from '@/components/LoadingOverlay';
import { useDispatch, useSelector } from 'react-redux';
import { agregarNuevoTurno } from '@/services/turnosService';
import { agregarTurno } from '@/redux/slices/turnosSlice';
import { RootState } from '@/redux/store';

const SolicitudScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.login.user);

  const [formData, setFormData] = useState({
    patente: '',
    descripcion: '',
    chofer: '',
    tipo: 'reparacion', // reparacion, mantenimiento, asistencia
  });


  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.patente.trim() || !formData.descripcion.trim()) {
      Alert.alert('Error', 'Por favor completa la patente y descripción');
      return;
    }

    setLoading(true);
    try {
      const nuevoTurno = {
        numeroPatente: formData.patente,
        fechaReparacion: new Date().toISOString().split('T')[0], // Hoy por defecto
        horaReparacion: '09:00', // Hora por defecto
        descripcion: formData.descripcion,
        estado: 'pending' as const,
        clienteId: user?.id,
        chofer: formData.chofer || user?.nombre || '',
        tipo: formData.tipo,
        prioridad: 3, // Baja por defecto
      };

      const id = await agregarNuevoTurno(nuevoTurno);
      dispatch(agregarTurno({ ...nuevoTurno, id }));

      Alert.alert('Éxito', 'Solicitud creada exitosamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error creando solicitud:', error);
      Alert.alert('Error', 'No se pudo crear la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#000000', '#121212']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.content}>
          {loading && <LoadingOverlay message="Creando solicitud..." />}
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#60A5FA" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Nueva Solicitud</Text>
              <Text style={styles.headerSubtitle}>Describe la reparación necesaria</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Patente del Camión *</Text>
              <TextInput
                style={styles.input}
                value={formData.patente}
                onChangeText={(text) => setFormData({ ...formData, patente: text.toUpperCase() })}
                placeholder="ABC-123"
                placeholderTextColor="#666"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Chofer</Text>
              <TextInput
                style={styles.input}
                value={formData.chofer}
                onChangeText={(text) => setFormData({ ...formData, chofer: text })}
                placeholder="Nombre del chofer"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tipo de Servicio</Text>
              <View style={styles.pickerContainer}>
                {['reparacion', 'mantenimiento', 'asistencia'].map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      styles.pickerOption,
                      formData.tipo === tipo && styles.pickerOptionSelected
                    ]}
                    onPress={() => setFormData({ ...formData, tipo })}
                  >
                    <Text style={[
                      styles.pickerText,
                      formData.tipo === tipo && styles.pickerTextSelected
                    ]}>
                      {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descripción del Problema *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.descripcion}
                onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
                placeholder="Describe detalladamente el problema o servicio requerido..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Checklist de ingreso se completa en el check-in al llegar el camión */}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitText}>
              {loading ? 'Creando...' : 'Enviar Solicitud'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 60 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#888', marginTop: 4 },

  form: { marginBottom: 30 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 8 },
  input: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: { height: 100, textAlignVertical: 'top' },

  pickerContainer: { flexDirection: 'row', gap: 10 },
  pickerOption: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  pickerOptionSelected: { borderColor: '#60A5FA', backgroundColor: '#60A5FA10' },
  pickerText: { color: '#888', fontSize: 14 },
  pickerTextSelected: { color: '#60A5FA', fontWeight: '600' },

  submitButton: {
    backgroundColor: '#60A5FA',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default SolicitudScreen;