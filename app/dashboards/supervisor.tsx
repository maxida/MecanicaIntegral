import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, useWindowDimensions, Image, Modal } from 'react-native';
import { MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LayoutDashboard, Truck, Users, User, Settings, LogOut, Menu, ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { collection, query, orderBy, limit, onSnapshot, getDocs, where, doc, updateDoc } from 'firebase/firestore';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '@/firebase/firebaseConfig';
import TurnoDetailModal from '@/components/TurnoDetailModal';
import AdminTallerTurnoModal from '@/components/AdminTallerTurnoModal';
import WorkshopOrderModal from '@/components/WorkshopOrderModal';
import ComplianceWidget from '@/components/ComplianceWidget';
import { getExpirationStatus } from '@/utils/complianceHelper';
import { RootState } from '@/redux/store';
import { login } from '@/redux/slices/loginSlice';

type TabType = 'alerta' | 'viaje' | 'taller' | 'todos' | 'vencimientos';

const SuperadminDashboard = ({ onLogout }: { onLogout?: () => void }) => {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.login.user);
  const dispatch = useDispatch();

  // --- ESTADOS ---
  const [turnos, setTurnos] = useState<any[]>([]);
  const [vehiclesData, setVehiclesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('alerta');

  const [selectedTurno, setSelectedTurno] = useState<any>(null);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [mechanicModalVisible, setMechanicModalVisible] = useState(false);

  // --- ESTADOS PERFIL ---
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState((user as any)?.name || user?.nombre || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>((user as any)?.fotoPerfil || null);
  const [feedbackModal, setFeedbackModal] = useState<{ visible: boolean; title: string; message: string; isConfirm?: boolean; onConfirm?: () => void }>({ visible: false, title: '', message: '' });

  const showFeedback = (title: string, message: string, isConfirm = false, onConfirm?: () => void) => {
    setFeedbackModal({ visible: true, title, message, isConfirm, onConfirm });
  };

  useEffect(() => {
    if (isEditingProfile) return;
    setEditName((user as any)?.name || user?.nombre || '');
    setProfilePhotoUri((user as any)?.fotoPerfil || null);
  }, [user, isEditingProfile]);

  // --- NAVEGACIÓN Y RESPONSIVE ---
  const [currentSection, setCurrentSection] = useState<'operaciones' | 'flota' | 'equipo' | 'perfil'>('operaciones');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const NAV_ITEMS = [
    { id: 'operaciones', icon: LayoutDashboard, label: 'Operaciones' },
    { id: 'flota', icon: Truck, label: 'Mi Flota' },
    { id: 'equipo', icon: Users, label: 'Equipo' },
    { id: 'perfil', icon: User, label: 'Perfil' },
  ];

  // 1. Cargar Vehículos filtrados por empresa
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const userEmpresaId = user?.empresaId || 'oasis';
        let q: ReturnType<typeof query> | ReturnType<typeof collection>;
        if (userEmpresaId !== 'TALLER') {
          q = query(collection(db, 'vehiculo'), where('empresaId', '==', userEmpresaId));
        } else {
          q = collection(db, 'vehiculo');
        }
        const snap = await getDocs(q as any);
        const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, any>) }));
        setVehiclesData(list);
      } catch (e: any) { console.error(e); }
    };
    fetchVehicles();
  }, [user]);

  // 2. Suscripción a Turnos filtrados por empresa
  useEffect(() => {
    const userEmpresaId = user?.empresaId || 'oasis';
    let q;
    if (userEmpresaId !== 'TALLER') {
      q = query(collection(db, 'turnos'), where('empresaId', '==', userEmpresaId), orderBy('fechaCreacion', 'desc'), limit(50));
    } else {
      q = query(collection(db, 'turnos'), orderBy('fechaCreacion', 'desc'), limit(50));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTurnos(data);
      setLoading(false);
    }, (error: any) => { setLoading(false); });
    return () => unsubscribe();
  }, [user]);

  // 3. KPIs Turnos
  const kpis = useMemo(() => {
    let alerta = 0; let viaje = 0; let taller = 0; let disponible = 0;
    turnos.forEach((t) => {
      const est = t.estado || 'pending';
      const general = t.estadoGeneral || 'ok';
      if (est === 'en_viaje') viaje++;
      else if (est === 'scheduled' || est === 'in_progress' || est === 'taller_pendiente') taller++;
      else if (est === 'pending_triage' || (general === 'alert' && est !== 'completed')) alerta++;
      else if (est === 'completed') disponible++;
    });
    return { alerta, viaje, taller, disponible };
  }, [turnos]);

  // 4. LÓGICA DE FILTRADO
  const isVehicleMode = activeTab === 'vencimientos';
  const listToRender = isVehicleMode
    ? vehiclesData.filter(v => {
      const vtv = getExpirationStatus(v.vtvVencimiento);
      const seguro = getExpirationStatus(v.seguroVencimiento);
      const ruta = getExpirationStatus(v.rutaVencimiento);
      const hasIssue = vtv.status !== 'ok' || seguro.status !== 'ok' || ruta.status !== 'ok';
      const matchText = v.numeroPatente.toLowerCase().includes(filterText.toLowerCase());
      return hasIssue && matchText;
    })
    : turnos.filter((t) => {
      const searchStr = `${t.numeroPatente} ${t.chofer}`.toLowerCase();
      if (filterText && !searchStr.includes(filterText.toLowerCase())) return false;
      const est = t.estado || 'pending';
      switch (activeTab) {
        case 'alerta': return est === 'pending_triage' || (t.estadoGeneral === 'alert' && est !== 'scheduled' && est !== 'in_progress' && est !== 'completed' && est !== 'taller_pendiente');
        case 'viaje': return est === 'en_viaje';
        case 'taller': return est === 'scheduled' || est === 'in_progress' || est === 'taller_pendiente';
        case 'todos': return true;
        default: return true;
      }
    });

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleOpenTurno = (turno: any) => {
    setSelectedTurno(turno);
    const role = user?.rol?.toLowerCase();
    if (role === 'admin' || role === 'admin_taller') {
      if (turno.estado === 'taller_pendiente') { setAdminModalVisible(true); setDetailModalVisible(false); }
      else { setDetailModalVisible(true); setAdminModalVisible(false); }
      setMechanicModalVisible(false);
    } else if (role === 'mecanico') {
      setMechanicModalVisible(true); setAdminModalVisible(false); setDetailModalVisible(false);
    } else {
      setDetailModalVisible(true); setAdminModalVisible(false); setMechanicModalVisible(false);
    }
  };

  // --- COMPONENTES UI ---
  const Sidebar = () => {
    // Extraemos los datos del usuario asegurando fallbacks
    const userName = (user as any)?.name || user?.nombre || 'Usuario';
    const userEmail = user?.email || (user as any)?.correo || '';
    const userPhoto = (user as any)?.fotoPerfil;
    const userEmpresa = user?.empresaId || 'OASIS';
    const userInitial = userName.charAt(0).toUpperCase();

    return (
      <Animated.View layout={Layout.springify()} className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-zinc-950 border-r border-white/5 pt-8 flex-col justify-between h-full`}>
        <View>
          {/* BOTÓN COLAPSAR */}
          <TouchableOpacity onPress={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`mb-8 p-2 bg-white/5 rounded-xl self-end ${isSidebarCollapsed ? 'mx-auto' : 'mx-4'} hover:bg-white/10`}>
            {isSidebarCollapsed ? <Menu size={20} color="#60A5FA" /> : <ChevronLeft size={20} color="#60A5FA" />}
          </TouchableOpacity>

          {/* LOGO */}
          {!isSidebarCollapsed && (
            <View className="mb-10 px-6">
              <Text className="text-white text-2xl font-black italic tracking-tighter">MIT SYSTEM</Text>
              <Text className="text-gray-500 text-[10px] font-bold tracking-[4px] uppercase mt-1">Fleet Control</Text>
            </View>
          )}

          {/* NAVEGACIÓN */}
          <View className="px-3">
            {NAV_ITEMS.map((item) => (
              <TouchableOpacity key={item.id} onPress={() => setCurrentSection(item.id as any)} className={`flex-row items-center py-4 px-3 rounded-2xl mb-2 ${currentSection === item.id ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-white/5'} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <item.icon size={20} color={currentSection === item.id ? '#60A5FA' : '#666'} />
                {!isSidebarCollapsed && <Text className={`ml-4 font-bold text-xs ${currentSection === item.id ? 'text-blue-400' : 'text-zinc-400'}`}>{item.label}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FOOTER (USUARIO + LOGOUT) */}
        <View className="px-3 pb-8">
          {/* TARJETA DE USUARIO */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setCurrentSection('perfil')}
            className={`flex-row items-center mb-3 bg-zinc-900/50 border border-white/5 rounded-2xl ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3'}`}
          >
            <View className="w-10 h-10 rounded-full bg-blue-600 border border-blue-400/50 items-center justify-center overflow-hidden shrink-0">
              {userPhoto ? (
                <Image source={{ uri: userPhoto }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <Text className="text-white font-black text-lg">{userInitial}</Text>
              )}
            </View>

            {!isSidebarCollapsed && (
              <View className="ml-3 flex-1 justify-center">
                {/* Fila 1: Nombre y Empresa alineados a los extremos */}
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-white text-sm font-bold flex-1 mr-2" numberOfLines={1}>{userName}</Text>
                  <View className="bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30">
                    <Text className="text-indigo-400 text-[8px] font-black uppercase">{userEmpresa}</Text>
                  </View>
                </View>

                {/* Fila 2: Email completo */}
                {!!userEmail && (
                  <Text className="text-zinc-500 text-[10px]" numberOfLines={1}>{userEmail}</Text>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* BOTÓN LOGOUT */}
          {onLogout && (
            <TouchableOpacity onPress={onLogout} className={`flex-row items-center py-3 px-3 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <LogOut size={20} color="#FF4C4C" />
              {!isSidebarCollapsed && <Text className="ml-4 font-bold text-xs text-red-500">Cerrar Sesión</Text>}
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  const BottomTabs = () => (
    <View className="flex-row items-center justify-around bg-zinc-950/95 border-t border-white/5 pb-8 pt-4 px-4 absolute bottom-0 left-0 right-0 z-50">
      {NAV_ITEMS.map((item) => (
        <TouchableOpacity key={item.id} onPress={() => setCurrentSection(item.id as any)} className="items-center flex-1">
          <item.icon size={24} color={currentSection === item.id ? '#60A5FA' : '#666'} />
          <Text className={`text-[10px] font-bold mt-1 ${currentSection === item.id ? 'text-blue-400' : 'text-zinc-500'}`}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const sendReset = async (email: string) => {
    try {
      const auth = getAuth();
      auth.languageCode = 'es';
      await sendPasswordResetEmail(auth, email);
      showFeedback('¡Enlace Enviado!', 'Revisa tu bandeja de entrada o la carpeta de SPAM para cambiar tu contraseña.');
    } catch (error) {
      console.error('Error al enviar reset:', error);
      showFeedback('Error', 'Hubo un problema al intentar enviar el correo. Intenta nuevamente más tarde.');
    }
  };

  const handleResetPassword = () => {
    const emailToUse = user?.email || (user as any)?.correo;
    if (!emailToUse) {
      showFeedback('Error', 'No se encontró el email del usuario en la sesión actual.');
      return;
    }
    showFeedback(
      'Seguridad de la Cuenta',
      `Te enviaremos un enlace oficial a:\n\n${emailToUse}\n\n¿Deseas recibir el enlace para cambiar tu contraseña?`,
      true,
      () => sendReset(emailToUse)
    );
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        showFeedback('Permiso denegado', 'Se requiere acceso a la galería para cambiar la foto.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets.length > 0) {
        setProfilePhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al abrir galería:', error);
    }
  };

  const handleSaveProfile = async () => {
    const emailToSearch = user?.email || (user as any)?.correo;
    if (!emailToSearch || !editName.trim()) {
      showFeedback('Atención', 'El nombre no puede estar vacío.');
      return;
    }

    setIsSavingProfile(true);
    try {
      let finalPhotoUrl = (user as any)?.fotoPerfil || null;

      // 1. Subir foto
      if (profilePhotoUri && profilePhotoUri !== (user as any)?.fotoPerfil && !profilePhotoUri.startsWith('http')) {
        const response = await fetch(profilePhotoUri);
        const blob = await response.blob();
        const filename = `perfiles/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        finalPhotoUrl = await getDownloadURL(storageRef);
      }

      // 2. Buscar el documento real (intenta por 'email', luego por 'correo')
      let q = query(collection(db, 'usuarios'), where('email', '==', emailToSearch));
      let querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        q = query(collection(db, 'usuarios'), where('correo', '==', emailToSearch));
        querySnapshot = await getDocs(q);
      }

      if (querySnapshot.empty) {
        showFeedback('Error', 'No se encontró el registro del usuario en la base de datos.');
        setIsSavingProfile(false);
        return;
      }

      // 3. Actualizar Firestore usando 'name'
      const userDocId = querySnapshot.docs[0].id;
      const userRef = doc(db, 'usuarios', userDocId);
      await updateDoc(userRef, {
        name: editName.trim(),
        fotoPerfil: finalPhotoUrl,
      });

      // 4. Actualizar Redux usando 'name'
      dispatch(login({
        usuario: { ...(user as any), id: userDocId, name: editName.trim(), fotoPerfil: finalPhotoUrl },
        rol: user?.rol || (user as any)?.role,
      }));

      showFeedback('¡Éxito!', 'Tus datos han sido actualizados correctamente.');

      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error guardando perfil:', error);
      showFeedback('Error', 'Hubo un problema de conexión al actualizar tu perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const renderPerfil = () => {
    const displayPhotoUri = profilePhotoUri || (user as any)?.fotoPerfil || null;

    return (
      <Animated.View entering={FadeInUp.duration(400)} className="flex-1 pb-32">
        <Text className="text-white text-3xl font-black italic mb-6">MI PERFIL</Text>

        <View className="items-center mb-8">
          <TouchableOpacity
            activeOpacity={isEditingProfile ? 0.8 : 1}
            onPress={isEditingProfile ? pickImage : undefined}
            className="w-24 h-24 bg-blue-600 rounded-full items-center justify-center border-4 border-zinc-900 shadow-xl mb-4 relative overflow-hidden"
          >
            {displayPhotoUri ? (
              <Image source={{ uri: displayPhotoUri }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text className="text-white text-4xl font-black">{((user as any)?.name || user?.nombre || 'U').charAt(0).toUpperCase()}</Text>
            )}

            {isEditingProfile && (
              <View className="absolute inset-0 bg-black/50 items-center justify-center">
                <MaterialIcons name="photo-camera" size={24} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          {isEditingProfile ? (
            <View className="w-full max-w-sm items-center">
              <TextInput
                value={editName}
                onChangeText={setEditName}
                className="text-white text-2xl font-bold text-center border-b border-blue-500 pb-1 mb-2 min-w-[200px]"
                placeholderTextColor="#666"
              />
              <Text className="text-zinc-500 text-xs mb-4 text-center px-4">Toca tu foto para cambiarla. Puedes editar tu nombre de visualización.</Text>

              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity onPress={() => { setIsEditingProfile(false); setProfilePhotoUri((user as any)?.fotoPerfil || null); setEditName((user as any)?.name || user?.nombre || ''); }} className="bg-zinc-800 px-6 py-3 rounded-xl border border-zinc-700 flex-1 items-center">
                  <Text className="text-white font-bold">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveProfile} disabled={isSavingProfile} className="bg-blue-600 px-6 py-3 rounded-xl flex-row items-center justify-center flex-1">
                  {isSavingProfile ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-bold">Guardar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text className="text-white text-2xl font-bold">{(user as any)?.name || user?.nombre || 'Usuario'}</Text>
              <Text className="text-zinc-400 text-sm">{user?.username || user?.email}</Text>
              <View className="bg-indigo-500/20 px-3 py-1 rounded-full mt-3 border border-indigo-500/30">
                <Text className="text-indigo-400 text-xs font-black uppercase">Empresa: {user?.empresaId || 'OASIS'}</Text>
              </View>
            </>
          )}
        </View>

        {!isEditingProfile && (
          <View className="bg-zinc-900/80 rounded-3xl p-2 border border-white/5 mb-6 max-w-2xl mx-auto w-full">
            <TouchableOpacity activeOpacity={0.7} onPress={() => setIsEditingProfile(true)} className="flex-row items-center p-4 border-b border-white/5 hover:bg-white/5 rounded-t-2xl">
              <View className="bg-white/5 p-2 rounded-xl mr-4"><User size={20} color="#60A5FA" /></View>
              <Text className="text-white font-bold flex-1">Editar Datos Personales</Text>
              <MaterialIcons name="chevron-right" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} onPress={handleResetPassword} className="flex-row items-center p-4 hover:bg-white/5 rounded-b-2xl">
              <View className="bg-white/5 p-2 rounded-xl mr-4"><Settings size={20} color="#60A5FA" /></View>
              <Text className="text-white font-bold flex-1">Cambiar Contraseña (Seguro)</Text>
              <MaterialIcons name="chevron-right" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {!isDesktop && onLogout && !isEditingProfile && (
          <TouchableOpacity onPress={onLogout} className="bg-red-500/10 border border-red-500/20 py-4 rounded-2xl flex-row items-center justify-center max-w-2xl mx-auto w-full">
            <LogOut size={20} color="#FF4C4C" />
            <Text className="text-red-500 font-black uppercase ml-2">Cerrar Sesión</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050505]">
      <View className="flex-1 flex-row">
        {isDesktop && <Sidebar />}

        <LinearGradient colors={['#1a1a1a', '#000000']} className="flex-1 relative">
          <View className={`flex-1 ${isDesktop ? 'px-8 pt-8' : 'px-4 pt-6 pb-24'}`}>

            {currentSection === 'operaciones' && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {/* HEADER OPERACIONES */}
                <View className="flex-row justify-between items-start mb-6">
                  <View>
                    <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[4px]">Fleet Command Center</Text>
                    <Text className="text-white text-3xl font-black italic">TORRE DE CONTROL</Text>
                  </View>
                  {!isDesktop && onLogout && (
                    <TouchableOpacity onPress={onLogout} className="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10">
                      <MaterialIcons name="logout" size={20} color="#FF4C4C" />
                    </TouchableOpacity>
                  )}
                </View>

                <ComplianceWidget vehicles={vehiclesData} onPress={() => { setActiveTab('vencimientos'); setFilterText(''); }} />

                {/* PESTAÑAS */}
                {activeTab === 'vencimientos' ? (
                  <View className="flex-row items-center mb-6">
                    <TouchableOpacity onPress={() => setActiveTab('alerta')} className="bg-white/10 px-4 py-3 rounded-2xl flex-row items-center border border-white/10">
                      <MaterialIcons name="arrow-back" size={18} color="white" />
                      <Text className="text-white ml-2 font-bold text-xs uppercase">Volver a Operaciones</Text>
                    </TouchableOpacity>
                    <View className="ml-4">
                      <Text className="text-red-500 font-black uppercase tracking-widest text-xs">MODO VENCIMIENTOS</Text>
                      <Text className="text-gray-500 text-[10px]">Vehículos con documentación crítica</Text>
                    </View>
                  </View>
                ) : (
                  <View className="mb-6 flex-row w-full justify-between gap-2 md:gap-3">
                    <TouchableOpacity
                      onPress={() => setActiveTab('alerta')}
                      className={`flex-1 p-3 md:p-4 rounded-2xl border ${activeTab === 'alerta' ? 'bg-red-900/20 border-red-500' : 'bg-zinc-900/50 border-white/5'}`}
                    >
                      <Text className={`text-xl md:text-3xl font-black ${activeTab === 'alerta' ? 'text-red-500' : 'text-gray-400'}`}>{kpis.alerta}</Text>
                      <Text className="text-gray-500 text-[8px] md:text-[9px] font-bold uppercase mt-1" numberOfLines={1}>ALERTAS</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setActiveTab('viaje')}
                      className={`flex-1 p-3 md:p-4 rounded-2xl border ${activeTab === 'viaje' ? 'bg-blue-900/20 border-blue-500' : 'bg-zinc-900/50 border-white/5'}`}
                    >
                      <Text className={`text-xl md:text-3xl font-black ${activeTab === 'viaje' ? 'text-blue-500' : 'text-gray-400'}`}>{kpis.viaje}</Text>
                      <Text className="text-gray-500 text-[8px] md:text-[9px] font-bold uppercase mt-1" numberOfLines={1}>EN RUTA</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setActiveTab('taller')}
                      className={`flex-1 p-3 md:p-4 rounded-2xl border ${activeTab === 'taller' ? 'bg-yellow-900/20 border-yellow-500' : 'bg-zinc-900/50 border-white/5'}`}
                    >
                      <Text className={`text-xl md:text-3xl font-black ${activeTab === 'taller' ? 'text-yellow-500' : 'text-gray-400'}`}>{kpis.taller}</Text>
                      <Text className="text-gray-500 text-[8px] md:text-[9px] font-bold uppercase mt-1" numberOfLines={1}>TALLER</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setActiveTab('todos')}
                      className={`flex-1 p-3 md:p-4 rounded-2xl border ${activeTab === 'todos' ? 'bg-emerald-900/20 border-emerald-500' : 'bg-zinc-900/50 border-white/5'}`}
                    >
                      <Text className={`text-xl md:text-3xl font-black ${activeTab === 'todos' ? 'text-emerald-500' : 'text-gray-400'}`}>{turnos.length}</Text>
                      <Text className="text-gray-500 text-[8px] md:text-[9px] font-bold uppercase mt-1" numberOfLines={1}>TOTAL</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* BARRA DE BÚSQUEDA */}
                <View className="flex-row items-center bg-zinc-900/80 border border-white/10 rounded-2xl px-4 py-3 mb-6">
                  <MaterialIcons name="search" size={20} color="#666" />
                  <TextInput value={filterText} onChangeText={setFilterText} placeholder="Buscar por Patente o Chofer..." placeholderTextColor="#666" className="flex-1 ml-3 text-white font-medium" />
                  {filterText.length > 0 && (
                    <TouchableOpacity onPress={() => setFilterText('')}><MaterialIcons name="close" size={18} color="#666" /></TouchableOpacity>
                  )}
                </View>

                {/* LISTA RENDER EXACTA COMO EL ORIGINAL */}
                {loading ? (
                  <ActivityIndicator size="large" color="#60A5FA" className="mt-10" />
                ) : (
                  <View className="pb-20">
                    {listToRender.length === 0 ? (
                      <View className="items-center py-20 opacity-30">
                        <MaterialCommunityIcons name="clipboard-text-off-outline" size={64} color="white" />
                        <Text className="text-gray-500 mt-4 font-bold uppercase">Sin registros en esta vista</Text>
                      </View>
                    ) : (
                      listToRender.map((item, index) => {
                        if (isVehicleMode) {
                          return (
                            <Animated.View key={item.id} entering={FadeInUp.delay(index * 50).springify()}>
                              <TouchableOpacity onPress={() => router.push({ pathname: '/historial-unidad', params: { patente: item.numeroPatente } })} className="bg-[#111] mb-4 rounded-2xl border border-red-500/30 overflow-hidden flex-row">
                                <View className="w-1.5 bg-red-500" />
                                <View className="p-4 flex-1">
                                  <View className="flex-row justify-between items-center mb-2">
                                    <Text className="text-white font-black text-xl">{item.numeroPatente}</Text>
                                    <MaterialIcons name="error" size={20} color="#EF4444" />
                                  </View>
                                  <Text className="text-red-400 text-xs font-bold uppercase">Documentación Crítica</Text>
                                  <Text className="text-zinc-500 text-[10px] mt-2">Toca para ver hoja de vida.</Text>
                                </View>
                              </TouchableOpacity>
                            </Animated.View>
                          );
                        } else {
                          const t = item;
                          const isAlert = t.estadoGeneral === 'alert' || t.estado === 'pending_triage';
                          const isViaje = t.estado === 'en_viaje';
                          const isTaller = t.estado === 'scheduled' || t.estado === 'in_progress' || t.estado === 'taller_pendiente';

                          let borderColor = 'border-white/5'; let statusText = 'FINALIZADO'; let statusColor = 'text-gray-500'; let iconName = 'check-circle';
                          if (isTaller) {
                            borderColor = 'border-yellow-500/50'; statusColor = 'text-yellow-500'; iconName = 'build';
                            statusText = t.estado === 'taller_pendiente' ? 'EN COLA DE TALLER' : 'MANTENIMIENTO';
                            if (t.estado === 'taller_pendiente') { statusColor = 'text-orange-400'; borderColor = 'border-orange-500/50'; }
                          } else if (isAlert) {
                            borderColor = 'border-red-500/50'; statusText = 'REVISIÓN REQUERIDA'; statusColor = 'text-red-500'; iconName = 'error';
                          } else if (isViaje) {
                            borderColor = 'border-blue-500/50'; statusText = 'EN TRÁNSITO'; statusColor = 'text-blue-500'; iconName = 'local-shipping';
                          }

                          return (
                            <Animated.View key={t.id || index} entering={FadeInUp.delay(index * 50).springify()}>
                              <TouchableOpacity activeOpacity={0.95} onPress={() => handleOpenTurno(t)} className={`bg-[#111] mb-4 rounded-2xl border ${borderColor} overflow-hidden`}>

                                <View className="p-4 flex-row justify-between items-start bg-white/5">
                                  <View>
                                    <Text className="text-white font-black text-lg">{t.numeroPatente}</Text>
                                    <Text className="text-zinc-400 text-xs font-bold uppercase">{t.chofer || 'SIN CHOFER'}</Text>
                                  </View>
                                  <View className="items-end">
                                    <View className="flex-row items-center gap-1">
                                      <Text className={`text-[10px] font-black uppercase ${statusColor}`}>{statusText}</Text>
                                      <MaterialIcons name={iconName as any} size={14} color={statusColor.includes('red') ? '#EF4444' : statusColor.includes('blue') ? '#3B82F6' : statusColor.includes('yellow') || statusColor.includes('orange') ? '#EAB308' : '#666'} />
                                    </View>
                                    <Text className="text-zinc-600 text-[10px] mt-1 font-mono">{formatTime(t.fechaCreacion)} hs</Text>
                                  </View>
                                </View>

                                {/* ESTA ES LA PARTE QUE FALTABA (EL FOOTER DE LA CARD) */}
                                <View className="p-4 flex-row justify-between items-center">
                                  <View className="flex-1 pr-3">
                                    <Text className="text-zinc-500 text-[10px] font-bold uppercase mb-1">Último Evento</Text>
                                    <Text className="text-zinc-300 text-xs font-medium">
                                      {t.tipo === 'salida' ? '📤 Salida Registrada' : t.tipo === 'ingreso' ? '📥 Ingreso a Galpón' : '📝 Reporte'}
                                    </Text>
                                    {t.estado === 'completed' && (
                                      <Text className="text-zinc-400 text-[11px] mt-2" numberOfLines={2}>
                                        {t.diagnosticoMecanico || 'Sin diagnóstico registrado.'}
                                      </Text>
                                    )}
                                  </View>
                                  <View className="bg-white/10 px-3 py-2 rounded-lg">
                                    <Text className="text-white text-[10px] font-bold">VER FICHA</Text>
                                  </View>
                                </View>

                              </TouchableOpacity>
                            </Animated.View>
                          );
                        }
                      })
                    )}
                  </View>
                )}
              </ScrollView>
            )}

            {currentSection === 'flota' && <View className="flex-1 items-center justify-center"><Text className="text-white font-bold text-xl">Flota en Construcción 🚧</Text></View>}
            {currentSection === 'equipo' && <View className="flex-1 items-center justify-center"><Text className="text-white font-bold text-xl">Equipo en Construcción 🚧</Text></View>}
            {currentSection === 'perfil' && renderPerfil()}

          </View>

          {!isDesktop && <BottomTabs />}

        </LinearGradient>
      </View>

      {/* MODALES */}
      <AdminTallerTurnoModal visible={adminModalVisible} turno={selectedTurno} onClose={() => { setAdminModalVisible(false); setSelectedTurno(null); }} />
      <TurnoDetailModal visible={detailModalVisible} turno={selectedTurno} onClose={() => { setDetailModalVisible(false); setSelectedTurno(null); }} adminContext={true} />
      <WorkshopOrderModal visible={mechanicModalVisible} turno={selectedTurno} onClose={() => { setMechanicModalVisible(false); setSelectedTurno(null); }} readOnly />

      {/* FEEDBACK MODAL SEGURO */}
      <Modal visible={feedbackModal.visible} transparent animationType="fade">
        <View className="flex-1 bg-black/80 justify-center items-center px-6">
          <View className="bg-zinc-900 border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl items-center">
            <Text className="text-white text-xl font-black mb-2 text-center">{feedbackModal.title}</Text>
            <Text className="text-zinc-400 text-sm text-center mb-6">{feedbackModal.message}</Text>

            <View className="flex-row gap-3 w-full">
              {feedbackModal.isConfirm && (
                <TouchableOpacity
                  onPress={() => setFeedbackModal(prev => ({ ...prev, visible: false }))}
                  className="flex-1 bg-zinc-800 py-3 rounded-xl items-center border border-zinc-700"
                >
                  <Text className="text-white font-bold">Cancelar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  setFeedbackModal(prev => ({ ...prev, visible: false }));
                  if (feedbackModal.onConfirm) feedbackModal.onConfirm();
                }}
                className={`flex-1 py-3 rounded-xl items-center ${feedbackModal.title.includes('Error') ? 'bg-red-600' : 'bg-blue-600'}`}
              >
                <Text className="text-white font-bold">Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SuperadminDashboard;