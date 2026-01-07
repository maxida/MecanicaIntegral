import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import LoadingOverlay from '@/components/LoadingOverlay';
import { obtenerChecklistPorPatente } from '@/services/checklistService';
import { useIsFocused } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import { actualizarTurnoService } from '@/services/turnosService';
import { MaterialIcons } from '@expo/vector-icons';

const CheckinScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { turnoId } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [turno, setTurno] = useState<any>(null);
  const [checklist, setChecklist] = useState<any>(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!turnoId) return;
    const load = async () => {
      setLoading(true);
      try {
        const ref = doc(db, 'turnos', turnoId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setTurno(data);
          setChecklist(data.checklistVehiculo || null);
        } else {
          Alert.alert('No encontrado', 'El turno solicitado no existe');
          navigation.goBack();
        }
      } catch (err) {
        console.error('Error cargando turno:', err);
        Alert.alert('Error', 'No se pudo cargar el turno');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [turnoId]);

  // When returning from Checklist screen, try to attach latest checklist to turno
  useEffect(() => {
    const attachLatestChecklist = async () => {
      if (!turno || !turno.numeroPatente) return;
      try {
        const listas = await obtenerChecklistPorPatente(turno.numeroPatente);
        if (!listas || listas.length === 0) return;
        // pick latest by fechaCreacion
        const latest = listas.sort((a: any, b: any) => (a.fechaCreacion || '').localeCompare(b.fechaCreacion || ''))[listas.length - 1];
        if (!latest) return;
        // if turno doesn't already have this checklist attached, attach it
        if (!turno.checklistVehiculo || (turno.checklistVehiculo && turno.checklistVehiculo.id !== latest.id)) {
          setLoading(true);
          await actualizarTurnoService(turnoId, { checklistVehiculo: latest, fechaCheckin: new Date().toISOString() });
          setTurno({ ...turno, checklistVehiculo: latest });
        }
      } catch (err) {
        console.error('Error adjuntando checklist:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isFocused) {
      attachLatestChecklist();
    }
  }, [isFocused, turno]);

  const handleSave = async () => {
    if (!turnoId) return;
    setLoading(true);
    try {
      await actualizarTurnoService(turnoId, {
        checklistVehiculo: checklist || null,
        fechaCheckin: new Date().toISOString(),
      });
      Alert.alert('Guardado', 'Checklist guardado correctamente', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) {
      console.error('Error guardando checklist:', err);
      Alert.alert('Error', 'No se pudo guardar el checklist');
    } finally {
      setLoading(false);
    }
  };

  if (!turnoId) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#000","#121212"]} style={styles.gradient}>
          <View style={styles.center}><Text style={styles.errorText}>ID de turno no proporcionado</Text></View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#000","#121212"]} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.content}>
          {loading && <LoadingOverlay message="Cargando..." />}

          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={22} color="#60A5FA" />
            </TouchableOpacity>
            <Text style={styles.title}>Check-in del Camión</Text>
          </View>

          {turno && (
            <View style={styles.card}>
              <Text style={styles.label}>Patente</Text>
              <Text style={styles.value}>{turno.numeroPatente}</Text>

              <Text style={styles.label}>Chofer</Text>
              <Text style={styles.value}>{turno.chofer || 'N/D'}</Text>

              <Text style={styles.label}>Descripción</Text>
              <Text style={styles.value}>{turno.descripcion}</Text>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: '#111827', borderWidth: 1, borderColor: '#333' }]}
                onPress={() => navigation.navigate('checklist/checklistitems', { numeroPatente: turno.numeroPatente, mecanico: 'Recepción' })}
              >
                <Text style={[styles.saveText, { color: '#60A5FA' }]}>Abrir Checklist de Ingreso</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                <Text style={styles.saveText}>{loading ? 'Guardando...' : 'Vincular checklist y finalizar'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { marginRight: 12 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  card: { backgroundColor: '#1E1E1E', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  label: { color: '#888', fontSize: 12, marginTop: 8 },
  value: { color: '#fff', fontSize: 14, fontWeight: '600' },
  saveButton: { marginTop: 16, backgroundColor: '#60A5FA', padding: 14, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#fff' },
});

export default CheckinScreen;
