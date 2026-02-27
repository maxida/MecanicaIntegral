import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, AlertTriangle, CheckCircle, ShieldCheck, Route, Wrench, Info, Pencil, Fuel, Calendar, ChevronDown, ChevronUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, orderBy, getDocs, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getExpirationStatus } from '@/utils/complianceHelper'; // IMPORTAR HELPER
import TurnoDetailModal from '@/components/TurnoDetailModal';
import AdminTallerTurnoModal from '@/components/AdminTallerTurnoModal';
import WorkshopOrderModal from '@/components/WorkshopOrderModal';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

// Helper de fechas
const formatDate = (ts: any) => {
	if (!ts) return '-';
	const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
	return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' });
};

const formatDateInput = (ts: any) => {
	if (!ts) return '';
	const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
	if (isNaN(d.getTime())) return '';
	return d.toISOString().split('T')[0];
};

const parseDate = (ts: any): Date | null => {
	if (!ts) return null;
	if (typeof ts.toDate === 'function') return ts.toDate();
	if (ts.seconds) return new Date(ts.seconds * 1000);
	const d = new Date(ts);
	return isNaN(d.getTime()) ? null : d;
};

const SINTOMAS_LABELS: Record<string, string> = {
	aceite: 'Nivel/Presión Aceite',
	fugas: 'Fugas',
	frenos: 'Sistema de Frenos',
	freno_mano: 'Freno de Mano',
	vibracion: 'Vibración Anormal',
	luz_quemada: 'Luces Quemadas',
	luces_delanteras: 'Luces Delanteras',
	luces_traseras: 'Luces Traseras',
	guinos: 'Guiños',
	humo: 'Humo o Mal Olor',
	aire_ac: 'Falla A/A',
	bateria: 'Batería/Arranque',
	neumaticos: 'Neumáticos/Presión',
	vidrios: 'Parabrisas/Vidrios',
	ruido_motor: 'Ruido en Motor',
	cubiertas_dano: 'Daño en Cubierta',
	tablero: 'Falla en Tablero',
	limpiaparabrisas: 'Limpiaparabrisas',
	refrigerante: 'Nivel Refrigerante',
};

export default function HistorialUnidadScreen() {
	const router = useRouter();
	const { patente } = useLocalSearchParams();
	const user = useSelector((state: RootState) => state.login.user);
	const [historial, setHistorial] = useState<any[]>([]);
	const [vehiculoInfo, setVehiculoInfo] = useState<any>(null); // Info del vehículo (vencimientos)
	const [loading, setLoading] = useState(true);
	const [selectedTurno, setSelectedTurno] = useState<any>(null);
	const [adminModalVisible, setAdminModalVisible] = useState(false);
	const [detailModalVisible, setDetailModalVisible] = useState(false);
	const [mechanicModalVisible, setMechanicModalVisible] = useState(false);
	const [editModalVisible, setEditModalVisible] = useState(false);
	const [fechasForm, setFechasForm] = useState({ vtv: '', seguro: '', ruta: '' });
	const [habilitacionesExpanded, setHabilitacionesExpanded] = useState(false);

	useEffect(() => {
		const fetchData = async () => {
			try {
				// 1. Historial de Viajes
				const qTurnos = query(
					collection(db, 'turnos'),
					where('numeroPatente', '==', patente),
					orderBy('fechaCreacion', 'desc')
				);
				const snapTurnos = await getDocs(qTurnos);
				const dataTurnos = snapTurnos.docs.map(doc => ({ id: doc.id, ...doc.data() }));
				setHistorial(dataTurnos);

				// 2. Info del Vehículo (Para vencimientos)
				const qVehiculo = query(collection(db, 'vehiculo'), where('numeroPatente', '==', patente), limit(1));
				const snapVehiculo = await getDocs(qVehiculo);
				if (!snapVehiculo.empty) {
					const docRef = snapVehiculo.docs[0];
					setVehiculoInfo({ id: docRef.id, ...docRef.data() });
				}

			} catch (error) {
				console.error(error);
			} finally {
				setLoading(false);
			}
		};
		if (patente) fetchData();
	}, [patente]);

	// CÁLCULO DE KPIs Y MÉTRICAS
	const stats = useMemo(() => {
		if (historial.length === 0) return null;

		let totalViajes = historial.length;
		let incidentes = 0;
		let consumoSum = 0;
		let consumoCount = 0;
		let kmsUltimoMes = 0;
		let odometroMax = 0;
		const fallasMap: Record<string, number> = {};
		const choferMap: Record<string, number> = {};
		let lastTallerEventDate: Date | null = null;
		const estadoActual = historial[0]?.estado || 'pending';

		historial.forEach(t => {
			const inicio = Number(t.kilometrajeSalida || 0);
			const fin = Number(t.kilometrajeIngreso || t.kilometraje || 0);
			const kmRecorridos = fin > inicio ? (fin - inicio) : 0;
			const odometro = Math.max(inicio, fin);
			if (odometro > odometroMax) odometroMax = odometro;

			if (t.estadoGeneral === 'alert' || (t.sintomas && t.sintomas.length > 0)) {
				incidentes++;
			}

			if (t.sintomas && Array.isArray(t.sintomas)) {
				t.sintomas.forEach((s: string) => {
					fallasMap[s] = (fallasMap[s] || 0) + 1;
				});
			}

			const ch = t.chofer || 'Desconocido';
			choferMap[ch] = (choferMap[ch] || 0) + 1;

			// Consumo promedio por 100km
			const naftaSalida = Number(t.nivelNaftaSalida ?? NaN);
			const naftaIngreso = Number(t.nivelNaftaIngreso ?? NaN);
			if (!isNaN(naftaSalida) && !isNaN(naftaIngreso) && kmRecorridos > 0) {
				const diff = naftaSalida - naftaIngreso;
				if (diff >= 0) {
					const consumo = (diff / kmRecorridos) * 100;
					consumoSum += consumo;
					consumoCount += 1;
				}
			}

			// KMs en últimos 30 días (por fechaCreacion)
			const fechaCreacion = parseDate(t.fechaCreacion);
			if (fechaCreacion) {
				const diffDays = Math.floor((Date.now() - fechaCreacion.getTime()) / (1000 * 60 * 60 * 24));
				if (diffDays <= 30 && kmRecorridos > 0) kmsUltimoMes += kmRecorridos;
			}

			// Última vez en taller (diagnóstico o estado de taller)
			const isTaller = ['taller_pendiente', 'scheduled', 'in_progress'].includes(t.estado);
			if (t.diagnosticoMecanico || isTaller) {
				const fechaTaller = parseDate(t.fechaIngreso || t.fechaCreacion);
				if (fechaTaller && (!lastTallerEventDate || fechaTaller > lastTallerEventDate)) {
					lastTallerEventDate = fechaTaller;
				}
			}
		});

		const topFallaId = Object.entries(fallasMap).sort((a, b) => b[1] - a[1])[0]?.[0];
		const topFalla = topFallaId ? (SINTOMAS_LABELS[topFallaId] || topFallaId) : 'Sin fallas';
		const topChofer = Object.entries(choferMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sin datos';
		const saludScore = totalViajes > 0 ? Math.max(0, Math.round(((totalViajes - incidentes) / totalViajes) * 100)) : 100;
		const avgConsumo = consumoCount > 0 ? (consumoSum / consumoCount) : null;
		const uptimeDays = lastTallerEventDate ? Math.floor((Date.now() - lastTallerEventDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
		const lastTallerFechaStr = lastTallerEventDate ? formatDate(lastTallerEventDate) : '-';

		return {
			estadoActual,
			uptimeDays,
			odometroMax,
			topChofer,
			avgConsumo,
			kmsUltimoMes,
			topFalla,
			saludScore,
			lastTallerFechaStr,
		};
	}, [historial]);

	// Render Fila de Vencimiento
	const RenderExpirationRow = ({ label, date }: { label: string, date?: any }) => {
		// El helper ahora se encarga de parsear el Timestamp
		const status = getExpirationStatus(date);

		return (
			<View className="flex-row justify-between items-center mb-3 border-b border-white/5 pb-2">
				<View className="flex-row items-center">
					{status.status === 'ok' ? (
						<CheckCircle size={16} color={status.color} />
					) : (
						<AlertTriangle size={16} color={status.color} />
					)}
					<Text className="text-gray-400 text-xs ml-2 uppercase">{label}</Text>
				</View>
				<View className="items-end">
					<Text className="text-white text-xs font-bold">{status.formattedDate}</Text>

					<Text style={{ color: status.color }} className="text-[10px] font-bold">
						{status.daysRemaining < 0
							? `VENCIDO HACE ${Math.abs(status.daysRemaining)} DÍAS`
							: `${status.label} (${status.daysRemaining} d)`
						}
					</Text>
				</View>
			</View>
		)
	}

	if (loading) {
		return (
			<View className="flex-1 bg-black justify-center items-center">
				<ActivityIndicator size="large" color="#60A5FA" />
				<Text className="text-white mt-4 font-bold uppercase">Analizando Hoja de Vida...</Text>
			</View>
		);
	}

	const handleOpenEdit = () => {
		setFechasForm({
			vtv: formatDateInput(vehiculoInfo?.vtvVencimiento),
			seguro: formatDateInput(vehiculoInfo?.seguroVencimiento),
			ruta: formatDateInput(vehiculoInfo?.rutaVencimiento),
		});
		setEditModalVisible(true);
	};

	const handleUpdateVencimientos = async () => {
		if (!vehiculoInfo?.id) return;
		try {
			const ref = doc(db, 'vehiculo', vehiculoInfo.id);
			await updateDoc(ref, {
				vtvVencimiento: fechasForm.vtv,
				seguroVencimiento: fechasForm.seguro,
				rutaVencimiento: fechasForm.ruta,
			});
			setVehiculoInfo((prev: any) => ({
				...prev,
				vtvVencimiento: fechasForm.vtv,
				seguroVencimiento: fechasForm.seguro,
				rutaVencimiento: fechasForm.ruta,
			}));
			setEditModalVisible(false);
			Alert.alert('Actualizado', 'Vencimientos guardados correctamente.');
		} catch (error) {
			Alert.alert('Error', 'No se pudo actualizar los vencimientos.');
		}
	};

	const estadoActual = stats?.estadoActual || 'pending';
	const isEnRuta = estadoActual === 'en_viaje';
	const isEnTaller = ['taller_pendiente', 'scheduled', 'in_progress'].includes(estadoActual);
	const isAlerta = estadoActual === 'pending_triage';
	const statusLabel = isEnRuta ? 'EN RUTA' : isEnTaller ? 'TALLER' : isAlerta ? 'ALERTA' : 'DISPONIBLE';
	const statusClass = isEnRuta
		? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
		: isEnTaller
			? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
			: isAlerta
				? 'bg-red-500/20 border-red-500/40 text-red-300'
				: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';

	const handleOpenTurno = (turno: any) => {
		setSelectedTurno(turno);
		const role = (user?.rol || user?.role)?.toLowerCase();

		if (role === 'admin' || role === 'admin_taller') {
			if (turno.estado === 'taller_pendiente') {
				setAdminModalVisible(true);
				setDetailModalVisible(false);
			} else {
				setDetailModalVisible(true);
				setAdminModalVisible(false);
			}
			setMechanicModalVisible(false);
		}
		else if (role === 'mecanico') {
			setMechanicModalVisible(true);
			setAdminModalVisible(false);
			setDetailModalVisible(false);
		}
		else {
			setDetailModalVisible(true);
			setAdminModalVisible(false);
			setMechanicModalVisible(false);
		}
	};

	return (
		<>
			<SafeAreaView className="flex-1 bg-[#050505]">
				<LinearGradient colors={['#1e1e24', '#000000']} className="flex-1">
					<ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

						{/* HEADER */}
						<View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
							<TouchableOpacity onPress={() => router.back()} className="p-2 bg-white/10 rounded-full">
								<ArrowLeft size={24} color="white" />
							</TouchableOpacity>
							<View className="items-end">
								<Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px]">Panel de Inteligencia Avanzado</Text>
								<Text className="text-white text-3xl font-black italic">{patente}</Text>
								<View className={`mt-2 px-3 py-1 rounded-full border ${statusClass} flex-row items-center`}>
									{!!isEnRuta && <Route size={12} color="#93C5FD" />}
									<Text className="text-[9px] font-black uppercase tracking-[2px] ml-1">{statusLabel}</Text>
								</View>
							</View>
						</View>

						{/* BLOQUE 0: HABILITACIONES */}
						{vehiculoInfo && (
							<View className="px-6 mb-6">
								<TouchableOpacity 
									onPress={() => setHabilitacionesExpanded(!habilitacionesExpanded)}
									className="flex-row items-center justify-between bg-zinc-900/80 p-4 rounded-2xl border border-white/10"
								>
									<View>
										<Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px]">Habilitaciones y Permisos</Text>
										<Text className="text-zinc-300 text-xs mt-1">Ver estado de VTV, Seguro y RUTA</Text>
									</View>
									{habilitacionesExpanded ? <ChevronUp size={20} color="#666" /> : <ChevronDown size={20} color="#666" />}
								</TouchableOpacity>

								{habilitacionesExpanded && (
									<Animated.View entering={FadeInDown.springify()} className="bg-zinc-900/40 p-4 rounded-b-2xl border-x border-b border-white/5 -mt-2 pt-6">
										<RenderExpirationRow label="VTV / RTO" date={vehiculoInfo.vtvVencimiento} />
										<RenderExpirationRow label="Seguro Carga" date={vehiculoInfo.seguroVencimiento} />
										<RenderExpirationRow label="RUTA" date={vehiculoInfo.rutaVencimiento} />
									
										<TouchableOpacity onPress={handleOpenEdit} className="flex-row items-center justify-center mt-3 py-3 rounded-xl bg-white/5 border border-white/10">
											<Pencil size={14} color="#A1A1AA" />
											<Text className="text-gray-300 text-[10px] font-bold uppercase ml-2">Actualizar Fechas de Vencimiento</Text>
										</TouchableOpacity>
									</Animated.View>
								)}
							</View>
						)}

						{/* GRID KPI FULL WIDTH */}
						{stats && (
							<View className="px-6">
								<View className="flex-row flex-wrap justify-between gap-y-4 mb-6">
									<View className="w-full bg-zinc-900/80 rounded-2xl border border-white/5 p-4">
										<View className="flex-row items-center justify-between">
											<Text className="text-gray-400 text-[10px] font-bold uppercase">Salud y Operatividad</Text>
											<Text className={`text-xl font-black ${stats.saludScore > 80 ? 'text-emerald-400' : 'text-red-400'}`}>{stats.saludScore}%</Text>
										</View>
										<View className="w-full h-2 bg-white/5 rounded-full mt-3 overflow-hidden">
											<View className="h-2 bg-emerald-500" style={{ width: `${Math.min(stats.saludScore, 100)}%` }} />
										</View>
										<Text className="text-gray-400 text-xs mt-3">
											{stats.uptimeDays !== null ? `${stats.uptimeDays} días sin entrar a taller` : 'Sin historial de taller'}
										</Text>
									</View>

									<View className="w-[48%] bg-zinc-900/80 rounded-2xl border border-white/5 p-4">
										<Text className="text-gray-400 text-[10px] font-bold uppercase">Odómetro</Text>
										<Text className="text-white text-2xl font-black mt-2">{stats.odometroMax.toLocaleString()} km</Text>
									</View>

									<View className="w-[48%] bg-zinc-900/80 rounded-2xl border border-white/5 p-4">
										<View className="flex-row items-center justify-between">
											<Text className="text-gray-400 text-[10px] font-bold uppercase">KMs del Mes</Text>
											<Calendar size={16} color="#F59E0B" />
										</View>
										<Text className="text-white text-2xl font-black mt-2">{stats.kmsUltimoMes.toLocaleString()}</Text>
										<Text className="text-yellow-500 text-[10px] font-bold uppercase">Últimos 30 días</Text>
									</View>

									<View className="w-[48%] bg-zinc-900/80 rounded-2xl border border-white/5 p-4">
										<Text className="text-gray-400 text-[10px] font-bold uppercase">Chofer Habitual</Text>
										<Text className="text-white text-lg font-black mt-2" numberOfLines={2}>{stats.topChofer}</Text>
									</View>

									<View className="w-[48%] bg-zinc-900/80 rounded-2xl border border-white/5 p-4">
										<View className="flex-row items-center justify-between">
											<Text className="text-gray-400 text-[10px] font-bold uppercase">Consumo</Text>
											<Fuel size={16} color="#60A5FA" />
										</View>
										<Text className="text-white text-2xl font-black mt-2">
											{stats.avgConsumo !== null ? `${stats.avgConsumo.toFixed(1)}%` : '-'}
										</Text>
										<Text className="text-blue-400 text-[10px] font-bold uppercase">/ 100km</Text>
									</View>

									<View className="w-[48%] bg-zinc-900/80 rounded-2xl border border-white/5 p-4">
										<View className="flex-row items-center justify-between">
											<Text className="text-gray-400 text-[10px] font-bold uppercase">Top Falla</Text>
											<Wrench size={16} color="#F59E0B" />
										</View>
										<Text className="text-white text-sm font-black uppercase leading-5 mt-2" numberOfLines={2}>{stats.topFalla}</Text>
									</View>

									<View className="w-[48%] bg-zinc-900/80 rounded-2xl border border-white/5 p-4">
										<View className="flex-row items-center justify-between">
											<Text className="text-gray-400 text-[10px] font-bold uppercase">Último Taller</Text>
											<Info size={16} color="#34D399" />
										</View>
										<Text className="text-white text-lg font-black mt-2">
											{stats.lastTallerFechaStr}
										</Text>
										<Text className="text-emerald-400 text-[10px] font-bold uppercase">Desde el último ingreso</Text>
									</View>
								</View>
							</View>
						)}

						{/* BLOQUE 3: LÍNEA DE TIEMPO */}
						<View className="px-6">
							<Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Línea de Tiempo</Text>

							{historial.map((item, index) => {
								const isAlert = item.estadoGeneral === 'alert' || (item.sintomas && item.sintomas.length > 0);
								const fecha = formatDate(item.fechaIngreso || item.fechaCreacion);

								return (
									<Animated.View key={item.id} entering={FadeInDown.delay(index * 50).springify()}>
										<View className="flex-row mb-6">
											<View className="items-center mr-4">
												<View className={`w-3 h-3 rounded-full ${isAlert ? 'bg-red-500' : 'bg-emerald-500'}`} />
												{!!(index < historial.length - 1) && <View className="w-[1px] flex-1 bg-white/10 mt-1" />}
											</View>

											<TouchableOpacity
												activeOpacity={0.85}
												onPress={() => handleOpenTurno(item)}
												className="flex-1 bg-zinc-900/50 p-4 rounded-2xl border border-white/5"
											>
												{/* Cabecera */}
												<View className="flex-row justify-between items-start mb-3 border-b border-white/5 pb-3">
													<View>
														<Text className="text-white font-bold uppercase text-sm mb-1">{item.chofer || 'Desconocido'}</Text>
														<Text className="text-gray-500 text-[10px] uppercase tracking-widest">{item.tipoIngreso || 'Viaje Normal'}</Text>
													</View>
													<View className="items-end">
														<Text className="text-zinc-400 text-xs font-mono">{fecha}</Text>
														<Text className="text-zinc-600 text-[10px] font-mono mt-1">
															{Number(item.kilometrajeIngreso || item.kilometrajeSalida || 0).toLocaleString()} km
														</Text>
													</View>
												</View>

												{/* Estado y Fallas Reportadas (Si las hubo) */}
												<View className="mb-3">
													{isAlert ? (
														<View className="flex-row items-center mb-2">
															<AlertTriangle size={14} color="#EF4444" />
															<Text className="text-red-400 text-xs font-bold ml-2 uppercase">Fallas Reportadas:</Text>
														</View>
													) : (
														<View className="flex-row items-center">
															<CheckCircle size={14} color="#10B981" />
															<Text className="text-emerald-400 text-xs font-bold ml-2 uppercase">Operativo sin novedades iniciales</Text>
														</View>
													)}

													{isAlert && item.sintomas && (
														<View className="flex-row flex-wrap gap-2">
															{item.sintomas.map((s: string) => (
																<View key={s} className="bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
																	<Text className="text-red-300 text-[9px] uppercase font-bold">{s}</Text>
																</View>
															))}
														</View>
													)}
												</View>

												{/* Historial Clínico (Si pasó por taller) */}
												{item.estado === 'completed' && (
													<View className="mt-2 pt-3 border-t border-white/5">
														<Text className="text-emerald-500 text-[10px] font-black uppercase tracking-[2px] mb-2">Resolución de Taller</Text>

														{item.diagnosticoMecanico && (
															<View className="bg-black/40 border border-emerald-500/10 rounded-xl p-3 mb-2">
																<Text className="text-zinc-400 text-[9px] uppercase mb-1">Diagnóstico:</Text>
																<Text className="text-emerald-100 text-xs italic">"{item.diagnosticoMecanico}"</Text>
															</View>
														)}

														{item.informeTecnico && (
															<View className="bg-black/40 border border-blue-500/10 rounded-xl p-3 mb-2">
																<Text className="text-zinc-400 text-[9px] uppercase mb-1">Informe Técnico:</Text>
																<Text className="text-blue-200 text-xs">{item.informeTecnico}</Text>
															</View>
														)}

														{(item.repuestosTexto || (Array.isArray(item.repuestosUtilizados) && item.repuestosUtilizados.length > 0)) && (
															<View className="flex-row items-center mt-1">
																<Wrench size={12} color="#A1A1AA" />
																<Text className="text-zinc-400 text-[10px] ml-2 flex-1" numberOfLines={1}>
																	<Text className="font-bold">Repuestos: </Text>
																	{item.repuestosTexto || (Array.isArray(item.repuestosUtilizados) ? item.repuestosUtilizados.join(', ') : '')}
																</Text>
															</View>
														)}
													</View>
												)}
											</TouchableOpacity>
										</View>
									</Animated.View>
								);
							})}
						</View>

					</ScrollView>
				</LinearGradient>
			</SafeAreaView>

			<AdminTallerTurnoModal
				visible={adminModalVisible}
				turno={selectedTurno}
				onClose={() => { setAdminModalVisible(false); setSelectedTurno(null); }}
			/>
			<TurnoDetailModal
				visible={detailModalVisible}
				turno={selectedTurno}
				onClose={() => { setDetailModalVisible(false); setSelectedTurno(null); }}
				readOnly={true}
			/>
			<WorkshopOrderModal
				visible={mechanicModalVisible}
				turno={selectedTurno}
				onClose={() => { setMechanicModalVisible(false); setSelectedTurno(null); }}
				readOnly
			/>

			<Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
				<View className="flex-1 bg-black/80 justify-center items-center px-6">
					<View className="w-full bg-[#0c0c0e] rounded-2xl border border-white/10 p-5">
						<Text className="text-white text-lg font-black uppercase mb-4">Editar Vencimientos</Text>
						<View className="mb-3">
							<Text className="text-gray-400 text-[10px] font-bold uppercase mb-2">VTV / RTO</Text>
							<TextInput
								value={fechasForm.vtv}
								onChangeText={(text) => setFechasForm((prev) => ({ ...prev, vtv: text }))}
								placeholder="YYYY-MM-DD"
								placeholderTextColor="#555"
								className="bg-black text-white p-3 rounded-xl border border-white/10"
							/>
						</View>
						<View className="mb-3">
							<Text className="text-gray-400 text-[10px] font-bold uppercase mb-2">Seguro Carga</Text>
							<TextInput
								value={fechasForm.seguro}
								onChangeText={(text) => setFechasForm((prev) => ({ ...prev, seguro: text }))}
								placeholder="YYYY-MM-DD"
								placeholderTextColor="#555"
								className="bg-black text-white p-3 rounded-xl border border-white/10"
							/>
						</View>
						<View className="mb-5">
							<Text className="text-gray-400 text-[10px] font-bold uppercase mb-2">RUTA</Text>
							<TextInput
								value={fechasForm.ruta}
								onChangeText={(text) => setFechasForm((prev) => ({ ...prev, ruta: text }))}
								placeholder="YYYY-MM-DD"
								placeholderTextColor="#555"
								className="bg-black text-white p-3 rounded-xl border border-white/10"
							/>
						</View>
						<View className="flex-row gap-3">
							<TouchableOpacity onPress={() => setEditModalVisible(false)} className="flex-1 py-3 rounded-xl items-center bg-white/5 border border-white/10">
								<Text className="text-gray-300 font-bold uppercase text-xs">Cancelar</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={handleUpdateVencimientos} className="flex-1 py-3 rounded-xl items-center bg-emerald-600">
								<Text className="text-white font-black uppercase text-xs">Guardar</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</>
	);
}