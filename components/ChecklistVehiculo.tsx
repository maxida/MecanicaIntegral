import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
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
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { crearChecklist, Checklist, ItemChecklist, ITEMS_CHECKLIST_DEFECTO, actualizarChecklist } from '@/services/checklistService';
import { createSolicitud } from '@/services/solicitudService';

const ChecklistVehiculo = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const numeroPatente = route.params?.numeroPatente || '';
  const mecanico = route.params?.mecanico || 'Sin asignar';

  const [items, setItems] = useState<ItemChecklist[]>(ITEMS_CHECKLIST_DEFECTO);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [adjuntando, setAdjuntando] = useState(false);
  const [solicitudLoading, setSolicitudLoading] = useState(false);
  const [solicitudError, setSolicitudError] = useState<string | null>(null);
  const [solicitudSuccess, setSolicitudSuccess] = useState(false);

  const [savedChecklistId, setSavedChecklistId] = useState<string | null>(null);

  const user = useSelector((state: RootState) => state.login.user);
  const role = useSelector((state: RootState) => state.login.rol);

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

      const id = await crearChecklist(checklistData);
      setSavedChecklistId(id);
      setGuardado(true);
      Alert.alert('Éxito', 'Checklist guardado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el checklist');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickPhoto = async () => {
    setAdjuntando(true);
    try {
      // Intentar usar expo-image-picker si está disponible
      const ImagePicker = await import('expo-image-picker').catch(() => null);
      if (ImagePicker && ImagePicker.launchImageLibraryAsync) {
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
        if (!res.canceled && res.assets && res.assets.length > 0) {
          setPhotoUri(res.assets[0].uri);
        }
      } else {
        // Fallback: pedir al usuario pegar una URL
        Alert.prompt?.('Adjuntar foto', 'Pega la URL de la foto si la tienes disponible', (text) => {
          if (text) setPhotoUri(text);
        });
      }
    } catch (err) {
      console.warn('Error pick photo', err);
      Alert.alert('Error', 'No se pudo adjuntar la foto');
    } finally {
      setAdjuntando(false);
    }
  };

  const handleCrearSolicitud = async () => {
    const clienteId = route.params?.clienteId || route.params?.cliente || null;
    const supervisorId = user?.id || route.params?.supervisorId || null;

    if (!clienteId) {
      Alert.alert('Falta información', 'No se encontró el cliente asociado a este checklist');
      return;
    }

    setSolicitudLoading(true);
    setSolicitudError(null);
    try {
      const checklistId = savedChecklistId || route.params?.checklistId || undefined;

      const payload: any = {
        clienteId,
        supervisorId: supervisorId || 'unknown-supervisor',
        numeroPatente,
        descripcion: notas,
        photoUri: photoUri || undefined,
        prioridad: 'medium',
      };

      if (checklistId) payload.checklistId = checklistId;
      else payload.checklistData = {
        items,
        notas,
        completado: items.every(i => i.completado),
      };

      const res = await createSolicitud(payload);

      setSolicitudSuccess(true);
      Alert.alert('Solicitud creada', 'La solicitud fue creada correctamente');
      // Navegar a la pantalla de la solicitud creada (fallback a home si no hay id)
      const solicitudId = res?.id;
      if (solicitudId) {
        navigation.navigate('solicitud', { id: solicitudId });
      } else {
        navigation.navigate('home');
      }
    } catch (err: any) {
      console.error('Error creando solicitud', err);
      setSolicitudError(err?.message || 'Error creando solicitud');
      Alert.alert('Error', 'No se pudo crear la solicitud');
    } finally {
      setSolicitudLoading(false);
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

          {/* Botones de acciones */}
          <View style={{ marginBottom: 16 }}>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleGuardarChecklist}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color="#000" />
                  <Text style={styles.saveButtonText}>Guardar Checklist</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 12 }} />

            <TouchableOpacity
              style={[styles.saveButton, solicitudLoading && styles.saveButtonDisabled, { backgroundColor: '#60A5FA' }]}
              onPress={handlePickPhoto}
              disabled={adjuntando}
            >
              {adjuntando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="photo" size={20} color="#000" />
                  <Text style={styles.saveButtonText}>Adjuntar Foto</Text>
                </>
              )}
            </TouchableOpacity>

            {photoUri && (
              <View style={{ marginTop: 10, alignItems: 'center' }}>
                <Image source={{ uri: photoUri }} style={{ width: 200, height: 120, borderRadius: 8 }} />
                <Text style={{ color: '#888', marginTop: 6 }}>Foto adjunta</Text>
              </View>
            )}

            <View style={{ height: 12 }} />

            {role === 'supervisor' && (
              <>
                <TouchableOpacity
                  style={[styles.saveButton, solicitudLoading && styles.saveButtonDisabled, { backgroundColor: '#4ADE80' }]}
                  onPress={handleCrearSolicitud}
                  disabled={solicitudLoading}
                >
                  {solicitudLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="send" size={20} color="#000" />
                      <Text style={styles.saveButtonText}>Crear Solicitud (Supervisor)</Text>
                    </>
                  )}
                </TouchableOpacity>

                {solicitudError && (
                  <Text style={{ color: '#FF4C4C', marginTop: 8 }}>{solicitudError}</Text>
                )}

                {solicitudSuccess && (
                  <View style={styles.guardadoMessage}>
                    <MaterialIcons name="check-circle" size={20} color="#4ADE80" />
                    <Text style={styles.guardadoText}>Solicitud creada correctamente</Text>
                  </View>
                )}
              </>
            )}
          </View>

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
    paddingTop: 40,
    paddingBottom: 60,
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
