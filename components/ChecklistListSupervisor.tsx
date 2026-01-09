import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { obtenerTodosChecklists, Checklist } from '@/services/checklistService';
import { createSolicitud } from '@/services/solicitudService';
import { MaterialIcons } from '@expo/vector-icons';

const ChecklistListSupervisor = () => {
  const navigation = useNavigation<any>();
  const role = useSelector((state: RootState) => state.login.rol);
  const user = useSelector((state: RootState) => state.login.user);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Checklist[]>([]);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await obtenerTodosChecklists();
        setItems(data);
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'No se pudieron cargar los checklists');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCrearSolicitud = async (checklist: Checklist) => {
    if (role !== 'supervisor') {
      Alert.alert('Acceso denegado', 'Solo supervisores pueden crear solicitudes');
      return;
    }

    setCreatingId(checklist.id || null);
    try {
      const res = await createSolicitud({
        clienteId: checklist.numeroPatente, // assuming clienteId mapping exists; adjust if needed
        supervisorId: user?.id || 'unknown',
        numeroPatente: checklist.numeroPatente,
        descripcion: checklist.notas || '',
        checklistId: checklist.id,
        prioridad: 'medium',
      });

      const solicitudId = res?.id;
      Alert.alert('Solicitud creada', 'Se creó la solicitud correctamente');
      if (solicitudId) navigation.navigate('solicitud', { id: solicitudId });
    } catch (err) {
      console.error('Error creando solicitud desde lista:', err);
      Alert.alert('Error', 'No se pudo crear la solicitud');
    } finally {
      setCreatingId(null);
    }
  };

  if (loading) return <View style={{ padding: 20 }}><ActivityIndicator /></View>;

  return (
    <View style={{ padding: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Checklists</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id || JSON.stringify(i)}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderRadius: 10, backgroundColor: '#0b0b0b', marginBottom: 10, borderWidth: 1, borderColor: '#333' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{item.numeroPatente}</Text>
                <Text style={{ color: '#888', marginTop: 4 }}>{item.mecanico} • {item.fechaCreacion || item.fecha}</Text>
              </View>
              <View style={{ marginLeft: 8 }}>
                {creatingId === item.id ? (
                  <ActivityIndicator />
                ) : (
                  <TouchableOpacity onPress={() => handleCrearSolicitud(item)} style={{ padding: 8, backgroundColor: '#4ADE80', borderRadius: 8 }}>
                    <MaterialIcons name="send" size={18} color="#000" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
};

export default ChecklistListSupervisor;
