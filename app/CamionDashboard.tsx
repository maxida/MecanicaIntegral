import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import CustomAlert from '@/components/CustomAlert';
import { useGlobalLoading } from '@/components/GlobalLoading';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  getDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { Truck, ServiceRequest, ServiceRequestType, ServiceRequestStatus, UserProfile } from '@/types/index';

export default function CamionDashboard() {
  const [loading, setLoading] = useState<boolean>(true);
  const [truck, setTruck] = useState<Truck | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Form state for truck registration
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [driverName, setDriverName] = useState('');
  const [year, setYear] = useState<string>('');

  // Modal & service request state
  const [modalVisible, setModalVisible] = useState(false);
  const [requestType, setRequestType] = useState<ServiceRequestType>('mantenimiento');
  const [requestDescription, setRequestDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Active request real-time
  const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null);
  // History (real-time)
  const [requestsHistory, setRequestsHistory] = useState<ServiceRequest[]>([]);
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [requestUpdates, setRequestUpdates] = useState<any[]>([]);

  const uid = auth.currentUser?.uid;
  const globalLoading = useGlobalLoading();

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    // Cargar perfil del usuario
    const userDocRef = doc(db, 'users', uid);
    getDoc(userDocRef)
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setProfile({
            hasRegisteredTruck: !!data.hasRegisteredTruck,
            ...data.profile,
          });
          // si tiene truckId, cargar truck
          if (data.truckId) {
            const truckRef = doc(db, 'trucks', data.truckId);
            getDoc(truckRef).then((tSnap) => {
              if (tSnap.exists()) {
                setTruck({ id: tSnap.id, ...(tSnap.data() as any) } as Truck);
              }
              setLoading(false);
            }).catch(() => setLoading(false));
          } else {
            setLoading(false);
          }
        } else {
          setProfile({ hasRegisteredTruck: false });
          setLoading(false);
        }
      })
      .catch(() => {
        setProfile({ hasRegisteredTruck: false });
        setLoading(false);
      });
  }, [uid]);

  // Listener en tiempo real para la "Solicitud Activa" del camión
  useEffect(() => {
    if (!truck) {
      setActiveRequest(null);
      return;
    }
    const q = query(
      collection(db, 'turnos'),
      where('truckId', '==', truck.id),
      where('status', 'in', ['por_hacer', 'haciendo']), // solo activas
      orderBy('createdAt', 'desc'),
      limit(1),
    );
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setActiveRequest({ id: docSnap.id, ...(docSnap.data() as any) } as ServiceRequest);
      } else {
        setActiveRequest(null);
      }
    }, (err) => {
      console.warn('listener error', err);
    });

    return () => unsub();
  }, [truck]);

  // Listener real-time para historial de solicitudes del camión
  useEffect(() => {
    if (!truck) {
      setRequestsHistory([]);
      return;
    }
    const q = query(
      collection(db, 'turnos'),
      where('truckId', '==', truck.id),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const items: ServiceRequest[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as ServiceRequest));
      setRequestsHistory(items);
    }, (err) => console.warn('history listener error', err));
    return () => unsub();
  }, [truck]);

  // Listener para updates de la solicitud activa
  useEffect(() => {
    if (!activeRequest) {
      setRequestUpdates([]);
      return;
    }
    const updatesCol = collection(db, 'turnos', activeRequest.id, 'updates');
    const q = query(updatesCol, orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const upd = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setRequestUpdates(upd);
    }, (err) => console.warn('updates listener error', err));
    return () => unsub();
  }, [activeRequest]);

  const registerTruck = async () => {
    if (!uid) {
      CustomAlert.alert('Error', 'Usuario no autenticado');
      return;
    }
    if (!plate || !brand || !model || !driverName) {
      CustomAlert.alert('Completa todos los campos');
      return;
    }
    setCreating(true);
    globalLoading.show('Registrando camión...');
    try {
      const trucksCol = collection(db, 'trucks');
      const newTruck = {
        plate,
        brand,
        model,
        driverName,
        year: year ? Number(year) : undefined,
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(trucksCol, newTruck);
      // actualizar usuario con hasRegisteredTruck y truckId
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        hasRegisteredTruck: true,
        truckId: docRef.id,
        updatedAt: serverTimestamp(),
      });
      setTruck({ id: docRef.id, ...(newTruck as any) } as Truck);
      setProfile((p: UserProfile | null) => ({ ...(p || {}), hasRegisteredTruck: true }));
      CustomAlert.alert('Camión registrado');
    } catch (err) {
      console.warn(err);
      CustomAlert.alert('Error al registrar el camión');
    } finally {
      setCreating(false);
      globalLoading.hide();
    }
  };

  const createSampleTruck = async () => {
    if (!uid) {
      CustomAlert.alert('Error', 'Usuario no autenticado');
      return;
    }
    setCreating(true);
    globalLoading.show('Creando camión de ejemplo...');
    try {
      const sampleId = 'camion1';
      const sampleData = {
        plate: 'CAMION-1',
        brand: 'MarcaEjemplo',
        model: 'ModeloEjemplo',
        driverName: auth.currentUser?.displayName || 'Chofer Ejemplo',
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const truckRef = doc(db, 'trucks', sampleId);
      await setDoc(truckRef, sampleData);
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        hasRegisteredTruck: true,
        truckId: sampleId,
        updatedAt: serverTimestamp(),
      });
      setTruck({ id: sampleId, ...(sampleData as any) } as Truck);
      setProfile((p: UserProfile | null) => ({ ...(p || {}), hasRegisteredTruck: true }));
      CustomAlert.alert('Camión de ejemplo creado (camion1)');
    } catch (err) {
      console.warn(err);
      CustomAlert.alert('Error al crear camión de ejemplo');
    } finally {
      setCreating(false);
      globalLoading.hide();
    }
  };

  const openNewRequestModal = (type: ServiceRequestType) => {
    setRequestType(type);
    setRequestDescription('');
    setModalVisible(true);
  };

  const createRequest = async () => {
    if (!truck || !uid) {
      CustomAlert.alert('Error', 'No hay camión o usuario no autenticado');
      return;
    }
    if (!requestDescription.trim()) {
      CustomAlert.alert('Escribe una descripción');
      return;
    }
    setCreating(true);
    globalLoading.show('Creando solicitud...');
    try {
      const turnosCol = collection(db, 'turnos');
      const payload = {
        truckId: truck.id,
        type: requestType,
        description: requestDescription.trim(),
        status: 'por_hacer' as ServiceRequestStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: uid,
      };
      await addDoc(turnosCol, payload);
      setModalVisible(false);
      CustomAlert.alert('Solicitud creada');
    } catch (err) {
      console.warn(err);
      CustomAlert.alert('Error al crear la solicitud');
    } finally {
      setCreating(false);
      globalLoading.hide();
    }
  };

  const renderProgressBar = (status?: ServiceRequestStatus) => {
    const percent = status === 'por_hacer' ? 0 : status === 'haciendo' ? 50 : 100;
    return (
      <View className="h-3 bg-gray-200 rounded-full overflow-hidden justify-center">
        <View className="h-full bg-blue-600" style={{ width: `${percent}%` }} />
        <Text className="absolute self-center text-[11px] font-semibold text-white">{percent}%</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Si el usuario no tiene camión registrado -> formulario
  if (!profile?.hasRegisteredTruck || !truck) {
    return (
      <ScrollView contentContainerStyle={{ paddingVertical: 16 }} className="px-4 pb-10">
        <Text className="text-2xl font-bold mb-3">Registrar Camión</Text>
        <TextInput placeholder="Patente" value={plate} onChangeText={setPlate} className="border border-gray-200 rounded-lg p-3 mb-3 bg-white" />
        <TextInput placeholder="Marca" value={brand} onChangeText={setBrand} className="border border-gray-200 rounded-lg p-3 mb-3 bg-white" />
        <TextInput placeholder="Modelo" value={model} onChangeText={setModel} className="border border-gray-200 rounded-lg p-3 mb-3 bg-white" />
        <TextInput placeholder="Año (opcional)" value={year} onChangeText={setYear} className="border border-gray-200 rounded-lg p-3 mb-3 bg-white" keyboardType="numeric" />
        <TextInput placeholder="Nombre del Chofer" value={driverName} onChangeText={setDriverName} className="border border-gray-200 rounded-lg p-3 mb-3 bg-white" />
        <View className="flex-row space-x-3">
          <TouchableOpacity className="bg-blue-600 py-3 rounded-lg items-center flex-1" onPress={registerTruck} disabled={creating}>
            <Text className="text-white font-semibold">{creating ? 'Guardando...' : 'Guardar Camión'}</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-gray-200 py-3 rounded-lg items-center flex-1" onPress={createSampleTruck} disabled={creating}>
            <Text className="text-gray-800 font-semibold">Cargar ejemplo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Dashboard principal
  return (
    <ScrollView contentContainerStyle={{ paddingVertical: 16 }} className="px-4 pb-10">
      <Text className="text-2xl font-bold mb-3">Mi Camión</Text>
      <View className="bg-white p-3 rounded-xl mt-2">
        <Text className="font-bold text-base mb-2">{truck.plate} — {truck.brand} {truck.model}</Text>
        <Text>Chofer: {truck.driverName}</Text>
        {truck.year ? <Text>Año: {truck.year}</Text> : null}
      </View>

      <Text className="text-lg font-semibold mt-3">Nueva Solicitud</Text>
      <View className="flex-row justify-between mt-2">
        <TouchableOpacity className="bg-red-500 p-4 rounded-xl flex-1 mx-1 items-center" onPress={() => openNewRequestModal('mantenimiento')}>
          <Text className="text-white font-bold text-center">+ Nueva Solicitud</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-gray-800 p-4 rounded-xl flex-1 mx-1 items-center" onPress={() => setStateModalVisible(true)}>
          <Text className="text-white font-bold text-center">Ver Estado</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-lg font-semibold mt-4">Solicitud Activa</Text>
      <View className="bg-white p-3 rounded-xl mt-2">
        {activeRequest ? (
          <>
            <View className="flex-row justify-between items-center">
              <Text className="font-bold text-base">{activeRequest.type}</Text>
              <View className={`px-3 py-1 rounded-full ${activeRequest.status === 'haciendo' ? 'bg-red-600' : activeRequest.status === 'por_hacer' ? 'bg-yellow-500' : 'bg-green-600'}`}>
                <Text className="text-white text-sm">{activeRequest.status === 'haciendo' ? 'En Reparación' : activeRequest.status === 'por_hacer' ? 'Pendiente' : 'Completado'}</Text>
              </View>
            </View>
            <Text className="text-sm mt-2">{activeRequest.description}</Text>
            <View className="mt-3">{renderProgressBar(activeRequest.status)}</View>
            <Text className="mt-2 text-xs text-gray-500">Última actualización: {activeRequest.updatedAt ? new Date((activeRequest.updatedAt as any).toDate?.() ? (activeRequest.updatedAt as any).toDate() : (activeRequest.updatedAt as any)).toLocaleString() : '—'}</Text>
          </>
        ) : (
          <Text>No hay solicitudes activas</Text>
        )}
      </View>

      {/* Modal para ver estado detallado */}
      <Modal visible={stateModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-center p-4">
          <View className="bg-white rounded-xl p-4 max-h-3/4">
            <Text className="text-2xl font-bold mb-2">Estado de la Solicitud</Text>
            {activeRequest ? (
              <ScrollView>
                <Text className="font-semibold">{activeRequest.type} — {activeRequest.status}</Text>
                <Text className="text-sm mt-2">{activeRequest.description}</Text>
                <View className="mt-3">{renderProgressBar(activeRequest.status)}</View>
                <Text className="mt-2 text-xs text-gray-500">Última actualización: {activeRequest.updatedAt ? new Date((activeRequest.updatedAt as any).toDate?.() ? (activeRequest.updatedAt as any).toDate() : (activeRequest.updatedAt as any)).toLocaleString() : '—'}</Text>

                <Text className="text-lg font-semibold mt-4">Actualizaciones</Text>
                {requestUpdates.length === 0 ? (
                  <Text className="text-sm text-gray-500 mt-2">Sin actualizaciones aún</Text>
                ) : (
                  requestUpdates.map(u => (
                    <View key={u.id} className="border-b border-gray-100 py-2">
                      <Text className="text-sm">{u.message}</Text>
                      <Text className="text-xs text-gray-400">{u.authorId} • {u.timestamp ? new Date((u.timestamp as any).toDate?.() ? (u.timestamp as any).toDate() : (u.timestamp as any)).toLocaleString() : ''}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            ) : (
              <Text>No hay solicitud activa</Text>
            )}

            <TouchableOpacity className="mt-4 bg-gray-200 py-3 rounded-lg items-center" onPress={() => setStateModalVisible(false)}>
              <Text className="font-semibold">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Text className="text-lg font-semibold mt-4">Historial de Solicitudes</Text>
      <View className="mt-2">
        {requestsHistory.length === 0 ? (
          <Text className="text-sm text-gray-500">Aún no hay solicitudes</Text>
        ) : (
          requestsHistory.map(r => (
            <View key={r.id} className="bg-white p-3 rounded-xl mb-2">
              <Text className="font-bold">{r.type} — {r.status}</Text>
              <Text className="text-sm mt-1">{r.description}</Text>
              <Text className="text-xs text-gray-500 mt-2">Creado: {r.createdAt ? new Date((r.createdAt as any).toDate?.() ? (r.createdAt as any).toDate() : (r.createdAt as any)).toLocaleString() : '—'}</Text>
            </View>
          ))
        )}
      </View>

      {/* Modal para crear solicitud */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-center p-4">
          <View className="bg-white rounded-2xl p-4">
            <Text className="text-xl font-bold mb-2">Nueva Solicitud</Text>
            <View className="flex-row mb-3 gap-2">
              {(
                [
                  { key: 'mantenimiento', label: 'Mantenimiento' },
                  { key: 'reparacion_general', label: 'Reparación' },
                  { key: 'asistencia_24hs', label: 'Asistencia 24hs' },
                ] as { key: ServiceRequestType; label: string }[]
              ).map(({ key, label }) => {
                const active = requestType === key;
                return (
                  <TouchableOpacity
                    key={key}
                    className={`flex-1 rounded-lg px-3 py-2 border ${active ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}
                    onPress={() => setRequestType(key)}
                  >
                    <Text className={`text-center font-semibold ${active ? 'text-white' : 'text-gray-800'}`}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              placeholder="Descripción breve del problema"
              value={requestDescription}
              onChangeText={setRequestDescription}
              className="border border-gray-200 rounded-xl p-3 h-28 text-base"
              multiline
            />
            <View className="flex-row mt-4 space-x-2">
              <TouchableOpacity className="flex-1 bg-blue-600 rounded-xl py-3 items-center" onPress={createRequest} disabled={creating}>
                <Text className="text-white font-semibold">{creating ? 'Creando...' : 'Crear'}</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-gray-200 rounded-xl py-3 items-center" onPress={() => setModalVisible(false)}>
                <Text className="text-gray-800 font-semibold">Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
// Note: styling moved to NativeWind className utilities. For dynamic widths (progress) inline style is used.
