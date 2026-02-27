import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { AlertTriangle, CheckCircle2, Calendar, FileText, Plus, Trash2, UserCog, X } from 'lucide-react-native';
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import CustomAlert from '@/components/CustomAlert';

interface AdminTallerTurnoModalProps {
	visible: boolean;
	turno: any;
	onClose: () => void;
}

const getInitialInstrucciones = (t: any) => {
	if (t?.instruccionesMecanico && t.instruccionesMecanico.length > 0) {
		return t.instruccionesMecanico;
	}

	const defaultList: string[] = [];

	const procesarTextos = (texto: string, verboBase: string) => {
		let textoLimpio = texto.replace(/Síntomas reportados:/gi, '').trim();
		const items = textoLimpio.split(/,|\n/);

		items.forEach((item) => {
			let itemLimpio = item.trim().replace(/_/g, ' ');
			if (itemLimpio) {
				itemLimpio = itemLimpio.charAt(0).toUpperCase() + itemLimpio.slice(1);
				defaultList.push(`${verboBase}: ${itemLimpio}`);
			}
		});
	};

	if (t?.comentariosChofer) {
		procesarTextos(t.comentariosChofer, 'Revisar (Chofer)');
	}

	if (t?.reporteSupervisor) {
		procesarTextos(t.reporteSupervisor, 'Verificar');
	}

	return defaultList.length > 0 ? defaultList : ['Inspección general de la unidad'];
};

const AdminTallerTurnoModal = ({ visible, turno, onClose }: AdminTallerTurnoModalProps) => {
	if (!turno) return null;

	const [tareaInput, setTareaInput] = useState('');
	const [instrucciones, setInstrucciones] = useState<string[]>(getInitialInstrucciones(turno));
	const [horas, setHoras] = useState(turno?.horasEstimadas?.toString() || '');
	const [mecanicosDisponibles, setMecanicosDisponibles] = useState<any[]>([]);
	const [selectedMecanico, setSelectedMecanico] = useState<any>(
		turno?.mecanicoId ? { id: turno.mecanicoId, nombre: turno.mecanicoNombre || 'Mecánico Asignado' } : null
	);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		setInstrucciones(getInitialInstrucciones(turno));
		setHoras(turno?.horasEstimadas?.toString() || '');
		setSelectedMecanico(null);
		setTareaInput('');
	}, [turno]);

	useEffect(() => {
		if (visible && turno) {
			setInstrucciones(getInitialInstrucciones(turno));
		}
	}, [turno, visible]);

	useEffect(() => {
		if (!visible) return;
		const fetchMecanicos = async () => {
			try {
				const col = collection(db, 'usuarios');

				// Hacemos dos consultas por las dudas (por si en la DB dice "rol" o "role")
				const qRole = query(col, where('role', '==', 'mecanico'));
				const qRol = query(col, where('rol', '==', 'mecanico'));

				// Ejecutamos ambas al mismo tiempo
				const [snapRole, snapRol] = await Promise.all([getDocs(qRole), getDocs(qRol)]);

				// Usamos un Map para evitar duplicados si por casualidad un usuario tiene ambos campos
				const mecanicosMap = new Map();

				snapRole.docs.forEach(doc => mecanicosMap.set(doc.id, { id: doc.id, ...doc.data() }));
				snapRol.docs.forEach(doc => mecanicosMap.set(doc.id, { id: doc.id, ...doc.data() }));

				const list = Array.from(mecanicosMap.values());

				console.log("🛠️ Mecánicos encontrados:", list); // Para ver en consola qué trae
				setMecanicosDisponibles(list);

			} catch (e) {
				console.error("Error al buscar mecánicos:", e);
				CustomAlert.alert('Error', 'No se pudieron cargar los mecánicos.');
			}
		};
		fetchMecanicos();
	}, [visible, turno]);

	useEffect(() => {
		if (!turno?.mecanicoId || mecanicosDisponibles.length === 0) return;
		const found = mecanicosDisponibles.find((m) => m.id === turno.mecanicoId);
		if (found) setSelectedMecanico(found);
	}, [turno, mecanicosDisponibles]);
	const isAsignado = turno?.estado === 'scheduled' || turno?.estado === 'in_progress';

	const sintomas = useMemo(() => turno?.sintomas || [], [turno]);
	const isAlert = turno?.estadoGeneral === 'alert' || sintomas.length > 0;
	const fechaLabel = turno?.fechaCreacion?.seconds
		? new Date(turno.fechaCreacion.seconds * 1000).toLocaleDateString('es-AR')
		: turno?.fechaCreacion
			? new Date(turno.fechaCreacion).toLocaleDateString('es-AR')
			: '--/--';

	const addTarea = () => {
		const value = tareaInput.trim();
		if (!value) return;
		setInstrucciones((prev) => [...prev, value]);
		setTareaInput('');
	};

	const removeTarea = (index: number) => {
		setInstrucciones((prev) => prev.filter((_, i) => i !== index));
	};

	const handleSave = async () => {
		if (!selectedMecanico) {
			CustomAlert.alert('Atención', 'Debes seleccionar un mecánico.');
			return;
		}
		if (!horas.trim()) {
			CustomAlert.alert('Atención', 'Debes ingresar las horas estimadas.');
			return;
		}

		setIsSaving(true);
		try {
			const nuevaSolicitud = {
				createdAt: new Date().toISOString(),
				horasEstimadas: horas.toString(),
				instruccionesAdmin: instrucciones.join('\n'),
				mecanicoId: selectedMecanico.id,
				mecanicoNombre: selectedMecanico.nombre || selectedMecanico.name || 'Mecánico',
				numeroPatente: turno.numeroPatente,
				status: 'pendiente',
				turnoData: turno,
				turnoId: turno.id
			};
			await addDoc(collection(db, 'solicitudes'), nuevaSolicitud);

			const turnoRef = doc(db, 'turnos', turno.id);
			await updateDoc(turnoRef, {
				estado: 'asignado_mecanico',
				mecanicoId: selectedMecanico.id,
				mecanicoNombre: selectedMecanico.nombre || selectedMecanico.name,
				instruccionesAdmin: instrucciones.join('\n'),
				instruccionesMecanico: instrucciones,
				horasEstimadas: horas.toString()
			});

			CustomAlert.alert('Éxito', `Orden creada y asignada a ${selectedMecanico.nombre || 'Mecánico'}.`);
			onClose();
		} catch (error) {
			console.error('Error al asignar:', error);
			CustomAlert.alert('Error', 'Hubo un problema al procesar la asignación.');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<View className="flex-1 bg-black/90 justify-center items-center p-4">
				<View className="w-full bg-zinc-900 rounded-3xl border border-white/10 overflow-hidden">
					<View className="p-5 border-b border-white/10">
						<View className="flex-row justify-between items-start">
							<View>
								<View className="flex-row items-center">
									{isAlert ? <AlertTriangle size={16} color="#EF4444" /> : <CheckCircle2 size={16} color="#10B981" />}
									<Text className={`ml-2 text-[10px] font-black uppercase ${isAlert ? 'text-red-400' : 'text-emerald-400'}`}>
										{isAlert ? 'REPORTE CON NOVEDADES' : 'OPERATIVO NORMAL'}
									</Text>
								</View>
								<Text className="text-white text-2xl font-black italic mt-2">{turno?.numeroPatente || 'S/D'}</Text>
								<View className="flex-row items-center mt-2">
									<Calendar size={12} color="#A1A1AA" />
									<Text className="text-zinc-400 text-xs ml-2">{fechaLabel}</Text>
								</View>
								<Text className="text-zinc-500 text-xs mt-1 font-bold uppercase">Estado: {turno?.estado || 'S/D'}</Text>
							</View>
							<TouchableOpacity onPress={onClose} className="p-2 bg-white/5 rounded-full">
								<X size={18} color="white" />
							</TouchableOpacity>
						</View>

						{!!sintomas.length && (
							<View className="mt-4 flex-row flex-wrap gap-2">
								{sintomas.map((s: string) => (
									<View key={s} className="bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
										<Text className="text-red-300 text-[9px] uppercase font-bold">{s}</Text>
									</View>
								))}
							</View>
						)}
					</View>

					<ScrollView className="max-h-[520px]" contentContainerStyle={{ padding: 20 }}>
						<Text className="text-zinc-400 text-[10px] font-black uppercase tracking-[3px] mb-3">Reporte del Chofer</Text>
						<View className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
							<Text className="text-zinc-200 text-sm italic">
								"{turno?.comentariosChofer || turno?.reporteSupervisor || 'Sin comentarios.'}"
							</Text>
						</View>

						<Text className="text-zinc-400 text-[10px] font-black uppercase tracking-[3px] mb-3">Check-in y Recepción</Text>
						<TouchableOpacity
							disabled={!turno?.checkinTaller}
							className={`mb-6 rounded-2xl p-4 border ${turno?.checkinTaller ? 'bg-blue-600/20 border-blue-500/40' : 'bg-zinc-800 border-zinc-700'}`}
							onPress={() => Alert.alert('Recepción', 'Abrirá la hoja de check-in (PDF).')}
						>
							<View className="flex-row items-center justify-between">
								<View className="flex-row items-center">
									<FileText size={18} color={turno?.checkinTaller ? '#60A5FA' : '#71717A'} />
									<Text className={`ml-2 text-xs font-black uppercase ${turno?.checkinTaller ? 'text-blue-300' : 'text-zinc-400'}`}>
										{turno?.checkinTaller ? 'Ver Hoja de Recepción (Check-in)' : 'Falta realizar Check-in de ingreso'}
									</Text>
								</View>
							</View>
						</TouchableOpacity>

						<Text className="text-zinc-400 text-[10px] font-black uppercase tracking-[3px] mb-3">Plan de Trabajo / Tareas para el Mecánico</Text>
						<View className="flex-row items-center mb-3">
							<TextInput
								value={tareaInput}
								onChangeText={setTareaInput}
								placeholder="Agregar tarea..."
								placeholderTextColor="#666"
								className="flex-1 bg-black/50 text-white p-3 rounded-xl border border-zinc-700"
							/>
							<TouchableOpacity onPress={addTarea} className="ml-3 bg-blue-600 p-3 rounded-xl">
								<Plus size={16} color="white" />
							</TouchableOpacity>
						</View>
						<View className="mb-6">
							{instrucciones.length === 0 ? (
								<Text className="text-zinc-500 text-xs">Sin tareas agregadas.</Text>
							) : (
								instrucciones.map((t, i) => (
									<View key={`${t}-${i}`} className="py-2 border-b border-white/5 flex-row items-center justify-between">
										<Text className="text-white text-sm">• {t}</Text>
										<TouchableOpacity onPress={() => removeTarea(i)} className="p-2">
											<Trash2 size={16} color="#EF4444" />
										</TouchableOpacity>
									</View>
								))
							)}
						</View>

						<Text className="text-zinc-400 text-[10px] font-black uppercase tracking-[3px] mb-3">Horas Estimadas de Trabajo</Text>
						<View className="mb-6">
							<TextInput
								value={horas}
								onChangeText={setHoras}
								placeholder="Ej: 3.5"
								placeholderTextColor="#666"
								keyboardType="numeric"
								className="bg-black/50 text-white p-3 rounded-xl border border-zinc-700"
							/>
						</View>

						<Text className="text-zinc-400 text-[10px] font-black uppercase tracking-[3px] mb-3">Acciones Administrativas</Text>
						<TouchableOpacity
							onPress={() => CustomAlert.alert('Próximamente', 'Abrirá modal de presupuesto')}
							className="mb-6 bg-zinc-800 border border-white/10 rounded-2xl p-4 items-center"
						>
							<Text className="text-zinc-300 font-black uppercase text-xs">Generar Presupuesto</Text>
						</TouchableOpacity>

						<Text className="text-zinc-400 text-[10px] font-black uppercase tracking-[3px] mb-3">Asignación de Mecánico</Text>
						{(isAsignado || !!turno?.mecanicoId) ? (
							<View className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 mb-6 flex-row items-center">
								<CheckCircle2 size={24} color="#10B981" />
								<View className="ml-3">
									<Text className="text-emerald-400 font-bold text-xs uppercase">Mecánico Asignado</Text>
									<Text className="text-white text-lg font-bold">
										{turno?.mecanicoNombre || selectedMecanico?.nombre || selectedMecanico?.name || selectedMecanico?.email || 'Mecánico'}
									</Text>
								</View>
							</View>
						) : (
							<View className="flex-row flex-wrap gap-2 mb-6">
								{mecanicosDisponibles.map((m) => {
									const selected = m.id === selectedMecanico?.id;
									return (
										<TouchableOpacity
											key={m.id}
											onPress={() => setSelectedMecanico(m)}
											className={`px-3 py-2 rounded-full border ${selected ? 'bg-emerald-600/20 border-emerald-500/50' : 'bg-zinc-800 border-white/10'}`}
										>
											<View className="flex-row items-center">
												<UserCog size={14} color={selected ? '#10B981' : '#A1A1AA'} />
												{/* AQUÍ ESTÁ LA CLAVE PARA QUE SE VEA EL BOTÓN */}
												<Text className={`ml-2 text-xs font-bold ${selected ? 'text-emerald-300' : 'text-zinc-400'}`}>
													{m.nombre || m.name || m.email}
												</Text>
											</View>
										</TouchableOpacity>
									);
								})}
							</View>
						)}
					</ScrollView>

					<View className="p-5 border-t border-white/10">
						<TouchableOpacity
							onPress={handleSave}
							disabled={isSaving || isAsignado}
							className={`w-full py-4 rounded-xl items-center ${isSaving || isAsignado ? 'bg-zinc-700' : 'bg-emerald-600'}`}
						>
							{isSaving ? (
								<ActivityIndicator color="white" />
							) : (
								<Text className="text-white font-black uppercase text-xs">
									{isAsignado ? 'Mecánico Ya Asignado' : 'Guardar y Asignar Mecánico'}
								</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
};

export default AdminTallerTurnoModal;
