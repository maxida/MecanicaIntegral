import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getExpirationStatus } from '@/utils/complianceHelper'; // IMPORTAR HELPER

// Helper de fechas
const formatDate = (ts: any) => {
	if (!ts) return '-';
	const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
	return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' });
};

export default function HistorialUnidadScreen() {
	const router = useRouter();
	const { patente } = useLocalSearchParams();
	const [historial, setHistorial] = useState<any[]>([]);
	const [vehiculoInfo, setVehiculoInfo] = useState<any>(null); // Info del vehículo (vencimientos)
	const [loading, setLoading] = useState(true);

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
					setVehiculoInfo(snapVehiculo.docs[0].data());
				}

			} catch (error) {
				console.error(error);
			} finally {
				setLoading(false);
			}
		};
		if (patente) fetchData();
	}, [patente]);

	// CÁLCULO DE KPIs
	const stats = useMemo(() => {
		if (historial.length === 0) return null;

		let totalViajes = historial.length;
		let totalKmRecorridos = 0;
		let incidentes = 0;
		const choferesMap: Record<string, number> = {};

		historial.forEach(t => {
			const inicio = Number(t.kilometrajeSalida || 0);
			const fin = Number(t.kilometrajeIngreso || t.kilometraje || 0);
			if (fin > inicio && inicio > 0) {
				totalKmRecorridos += (fin - inicio);
			}

			if (t.estadoGeneral === 'alert' || (t.sintomas && t.sintomas.length > 0)) {
				incidentes++;
			}

			const ch = t.chofer || 'Desconocido';
			choferesMap[ch] = (choferesMap[ch] || 0) + 1;
		});

		const topChofer = Object.entries(choferesMap).sort((a, b) => b[1] - a[1])[0];
		const saludScore = Math.round(((totalViajes - incidentes) / totalViajes) * 100);

		return {
			totalViajes,
			totalKmRecorridos,
			saludScore,
			topChoferName: topChofer ? topChofer[0] : 'N/A',
			topChoferCount: topChofer ? topChofer[1] : 0,
		};
	}, [historial]);

	// Render Fila de Vencimiento
	const RenderExpirationRow = ({ label, date }: { label: string, date?: any }) => {
		// El helper ahora se encarga de parsear el Timestamp
		const status = getExpirationStatus(date);

		return (
			<View className="flex-row justify-between items-center mb-3 border-b border-white/5 pb-2">
				<View className="flex-row items-center">
					<MaterialIcons
						name={status.status === 'ok' ? 'check-circle' : 'error'}
						size={16}
						color={status.color}
					/>
					<Text className="text-gray-400 text-xs ml-2 uppercase">{label}</Text>
				</View>
				<View className="items-end">
					{/* Usamos la fecha ya formateada por el helper */}
					<Text className="text-white text-xs font-bold">{status.formattedDate}</Text>

					<Text style={{ color: status.color }} className="text-[10px] font-bold">
						{/* Lógica visual para días vencidos vs restantes */}
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

	return (
		<SafeAreaView className="flex-1 bg-[#050505]">
			<LinearGradient colors={['#1e1e24', '#000000']} className="flex-1">
				<ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

					{/* HEADER */}
					<View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
						<TouchableOpacity onPress={() => router.back()} className="p-2 bg-white/10 rounded-full">
							<MaterialIcons name="arrow-back" size={24} color="white" />
						</TouchableOpacity>
						<View className="items-end">
							<Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px]">Hoja de Vida</Text>
							<Text className="text-white text-3xl font-black italic">{patente}</Text>
						</View>
					</View>

					{/* --- BLOQUE 0: HABILITACIONES LEGALES (NUEVO) --- */}
					{vehiculoInfo && (
						<View className="px-6 mb-6">
							<Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px] mb-3">Habilitaciones</Text>
							<View className="bg-zinc-900/80 p-4 rounded-2xl border border-white/10">
								<RenderExpirationRow label="VTV / RTO" date={vehiculoInfo.vtvVencimiento} />
								<RenderExpirationRow label="Seguro Carga" date={vehiculoInfo.seguroVencimiento} />
								<RenderExpirationRow label="RUTA" date={vehiculoInfo.rutaVencimiento} />
							</View>
						</View>
					)}

					{/* --- BLOQUE 1: KPIs --- */}
					{stats && (
						<View className="px-4 mb-6">
							<ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
								<View className="w-40 h-40 bg-zinc-900/80 rounded-3xl p-4 mr-3 border border-white/5 justify-between">
									<View className="flex-row justify-between">
										<MaterialIcons name="health-and-safety" size={24} color={stats.saludScore > 80 ? '#4ADE80' : '#EF4444'} />
										<Text className={`font-bold ${stats.saludScore > 80 ? 'text-green-500' : 'text-red-500'}`}>{stats.saludScore}%</Text>
									</View>
									<View>
										<Text className="text-white text-3xl font-black">{stats.saludScore > 90 ? 'A+' : stats.saludScore > 70 ? 'B' : 'C'}</Text>
										<Text className="text-gray-500 text-[10px] font-bold uppercase">Calificación Salud</Text>
									</View>
								</View>

								<View className="w-40 h-40 bg-zinc-900/80 rounded-3xl p-4 mr-3 border border-white/5 justify-between">
									<View className="flex-row justify-between">
										<FontAwesome5 name="road" size={20} color="#60A5FA" />
									</View>
									<View>
										<Text className="text-white text-2xl font-black">+{stats.totalKmRecorridos.toLocaleString()}</Text>
										<Text className="text-blue-400 text-[10px] font-bold uppercase">KM Recorridos</Text>
									</View>
								</View>

								<View className="w-40 h-40 bg-zinc-900/80 rounded-3xl p-4 mr-3 border border-white/5 justify-between">
									<View className="flex-row justify-between">
										<FontAwesome5 name="trophy" size={20} color="#F59E0B" />
										<Text className="text-yellow-500 font-bold">#{stats.topChoferCount}</Text>
									</View>
									<View>
										<Text className="text-white text-lg font-black uppercase leading-5" numberOfLines={2}>{stats.topChoferName}</Text>
										<Text className="text-gray-500 text-[10px] font-bold uppercase mt-1">Conductor Top</Text>
									</View>
								</View>
							</ScrollView>
						</View>
					)}

					{/* --- BLOQUE 2: HISTORIAL --- */}
					<View className="px-6">
						<Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Registro de Actividad</Text>

						{historial.map((item, index) => {
							const isAlert = item.estadoGeneral === 'alert' || (item.sintomas && item.sintomas.length > 0);
							const fecha = formatDate(item.fechaIngreso || item.fechaCreacion);

							return (
								<Animated.View key={item.id} entering={FadeInDown.delay(index * 50).springify()}>
									<View className="flex-row mb-6">
										<View className="items-center mr-4">
											<View className={`w-3 h-3 rounded-full ${isAlert ? 'bg-red-500' : 'bg-emerald-500'}`} />
											{index < historial.length - 1 && <View className="w-[1px] flex-1 bg-white/10 mt-1" />}
										</View>

										<View className="flex-1 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
											<View className="flex-row justify-between items-start mb-2">
												<Text className="text-white font-bold uppercase text-sm">{item.chofer}</Text>
												<Text className="text-gray-500 text-xs font-mono">{fecha}</Text>
											</View>

											<View className="flex-row items-center justify-between">
												<View>
													<Text className="text-gray-400 text-[10px] uppercase">Evento</Text>
													<Text className={`text-xs font-bold ${isAlert ? 'text-red-400' : 'text-emerald-400'}`}>
														{isAlert ? '⚠️ REPORTE FALLAS' : '✅ NORMAL'}
													</Text>
												</View>
												<View className="items-end">
													<Text className="text-gray-400 text-[10px] uppercase">Odómetro</Text>
													<Text className="text-white text-xs font-mono">
														{Number(item.kilometrajeIngreso || item.kilometrajeSalida || 0).toLocaleString()} km
													</Text>
												</View>
											</View>

											{isAlert && item.sintomas && (
												<View className="mt-3 flex-row flex-wrap gap-2">
													{item.sintomas.map((s: string) => (
														<View key={s} className="bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
															<Text className="text-red-300 text-[9px] uppercase font-bold">{s}</Text>
														</View>
													))}
												</View>
											)}
										</View>
									</View>
								</Animated.View>
							);
						})}
					</View>

				</ScrollView>
			</LinearGradient>
		</SafeAreaView>
	);
}