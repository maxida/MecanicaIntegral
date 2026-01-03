import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import ChecklistVehiculo from '@/components/ChecklistVehiculo';

const ChecklistListScreen = () => {
  const navigation = useNavigation<any>();
  const [numeroPatente, setNumeroPatente] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleAbrirChecklist = () => {
    if (!numeroPatente.trim()) {
      Alert.alert('Error', 'Ingresa el número de patente del vehículo');
      return;
    }

    // Navegar al componente de checklist
    navigation.navigate('checklist/checklistitems', {
      numeroPatente: numeroPatente.toUpperCase(),
      mecanico: 'Administrador',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#000000', '#121212']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checklist de Vehículos</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Contenido */}
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <MaterialIcons name="checklist" size={48} color="#60A5FA" />
            </View>
            <Text style={styles.cardTitle}>Nuevo Checklist</Text>
            <Text style={styles.cardDescription}>
              Registra la inspección de ingreso de un vehículo al taller
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Número de Patente</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: ABC-123"
                placeholderTextColor="#666"
                value={numeroPatente}
                onChangeText={setNumeroPatente}
                maxLength={10}
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleAbrirChecklist}
            >
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              <Text style={styles.buttonText}>Iniciar Checklist</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <MaterialIcons name="info" size={20} color="#FACC15" />
              <Text style={styles.infoText}>
                El checklist incluye 10 puntos de inspección esenciales para verificar el estado del vehículo
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#60A5FA',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#aaa',
    lineHeight: 18,
  },
});

export default ChecklistListScreen;