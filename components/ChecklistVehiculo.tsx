import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { crearChecklist, Checklist, ItemChecklist, ITEMS_CHECKLIST_DEFECTO, actualizarChecklist } from '@/services/checklistService';

const ChecklistVehiculo = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const numeroPatente = route.params?.numeroPatente || '';
  const mecanico = route.params?.mecanico || 'Sin asignar';

  const [items, setItems] = useState<ItemChecklist[]>(ITEMS_CHECKLIST_DEFECTO);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const toggleItem = (index: number) => {
    const nuevosItems = [...items];
    nuevosItems[index].completado = !nuevosItems[index].completado;
    setItems(nuevosItems);
    setGuardado(false);
  };

  const handleGuardarChecklist = async () => {
    if (!numeroPatente) {
      Alert.alert('Error', 'No se puede guardar sin patente de vehículo');
      return;
    }

    setLoading(true);
    try {
      const checklistData: Omit<Checklist, 'id'> = {
        numeroPatente,
        fecha: new Date().toISOString().split('T')[0],
        mecanico,
        items,
        completado: items.every(item => item.completado),
        notas,
      };

      await crearChecklist(checklistData);
      setGuardado(true);
      Alert.alert('Éxito', 'Checklist guardado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el checklist');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const itemsCompletados = items.filter(i => i.completado).length;
  const totalItems = items.length;
  const porcentaje = Math.round((itemsCompletados / totalItems) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#000000', '#121212']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Checklist de Ingreso</Text>
            <Text style={styles.headerSubtitle}>{numeroPatente}</Text>
          </View>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Información del vehículo */}
          <View style={styles.vehiculoInfo}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Patente</Text>
                <Text style={styles.infoValue}>{numeroPatente}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Mecánico</Text>
                <Text style={styles.infoValue}>{mecanico}</Text>
              </View>
            </View>
          </View>

          {/* Barra de progreso */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progreso</Text>
              <Text style={styles.progressText}>{itemsCompletados}/{totalItems}</Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${porcentaje}%`, backgroundColor: porcentaje === 100 ? '#4ADE80' : '#60A5FA' }
                ]} 
              />
            </View>
            <Text style={styles.progressPercentaje}>{porcentaje}%</Text>
          </View>

          {/* Items del checklist */}
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Revisión de Vehículo</Text>
            <FlatList
              scrollEnabled={false}
              data={items}
              keyExtractor={(item, idx) => idx.toString()}
              renderItem={({ item, index }) => (
                <View style={[styles.checklistItem, item.completado && styles.checklistItemCompleted]}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => toggleItem(index)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, item.completado && styles.checkboxChecked]}>
                      {item.completado && (
                        <MaterialIcons name="check" size={16} color="#000" />
                      )}
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemNombre, item.completado && styles.itemNombreCompleted]}>
                      {item.nombre}
                    </Text>
                    <Text style={styles.itemDescripcion}>{item.descripcion}</Text>
                  </View>

                  <View style={[styles.statusIndicator, item.completado && styles.statusIndicatorComplete]}>
                    <MaterialIcons 
                      name={item.completado ? 'check-circle' : 'radio-button-unchecked'} 
                      size={20} 
                      color={item.completado ? '#4ADE80' : '#888'} 
                    />
                  </View>
                </View>
              )}
            />
          </View>

          {/* Notas */}
          <View style={styles.notasSection}>
            <Text style={styles.sectionTitle}>Notas Adicionales</Text>
            <TextInput
              style={styles.notasInput}
              placeholder="Agrega notas sobre problemas encontrados o reparaciones necesarias..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
              value={notas}
              onChangeText={setNotas}
            />
          </View>

          {/* Botón de guardar */}
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleGuardarChecklist}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Guardar Checklist</Text>
              </>
            )}
          </TouchableOpacity>

          {guardado && (
            <View style={styles.guardadoMessage}>
              <MaterialIcons name="check-circle" size={20} color="#4ADE80" />
              <Text style={styles.guardadoText}>Checklist guardado correctamente</Text>
            </View>
          )}
        </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 24,
  },
  content: {
    padding: 20,
  },
  vehiculoInfo: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  progressSection: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ADE80',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentaje: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  itemsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  checklistItemCompleted: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderColor: '#4ADE80',
  },
  checkboxContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#60A5FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4ADE80',
    borderColor: '#4ADE80',
  },
  itemContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  itemNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  itemNombreCompleted: {
    color: '#4ADE80',
    textDecorationLine: 'line-through',
  },
  itemDescripcion: {
    fontSize: 12,
    color: '#888',
  },
  statusIndicator: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicatorComplete: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderRadius: 16,
  },
  notasSection: {
    marginBottom: 20,
  },
  notasInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#333',
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#4ADE80',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  guardadoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4ADE80',
  },
  guardadoText: {
    color: '#4ADE80',
    fontWeight: '600',
  },
});

export default ChecklistVehiculo;
