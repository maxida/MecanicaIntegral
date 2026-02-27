import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Image, ActivityIndicator, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import {
	X,
	UserCog,
	Clock,
	FileText,
	ChevronDown,
	Ambulance,
	Hash,
	Play,
	Save,
	CheckCircle,
	CheckCircle2,
	CheckSquare,
	ClipboardCheck,
	Pencil,
	Receipt,
	Square,
	Wrench
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import PresupuestoModal from '@/components/PresupuestoModal';

interface WorkshopOrderModalProps {
	visible: boolean;
	turno: any;
	onClose: () => void;
	readOnly?: boolean;
	onStart?: (turno: any) => void;
	onFinish?: (turno: any) => void;
	onEditComplete?: (turno: any) => void;
	tareasCompletadas?: Record<number, boolean>;
	setTareasCompletadas?: any;
}

const WorkshopOrderModal = ({ visible, turno, onClose, readOnly = false, onStart, onFinish, onEditComplete, tareasCompletadas, setTareasCompletadas }: WorkshopOrderModalProps) => {
	const router = useRouter();
	if (!turno) return null;

	const [loading, setLoading] = useState(false);
	const [mecanicos, setMecanicos] = useState<any[]>([]);

	// Estados principales
	const [mecanicoId, setMecanicoId] = useState(turno.mecanicoId || '');
	const [mecanicoNombre, setMecanicoNombre] = useState(turno.mecanicoNombre || '');
	const [horasEstimadas, setHorasEstimadas] = useState(turno.horasEstimadas || '');
	const [numeroOT, setNumeroOT] = useState(turno.numeroOT || '');
	const [instrucciones, setInstrucciones] = useState(turno.instruccionesAdmin || '');

	// Estados de Auditoría (Admin)
	const [horasReales, setHorasReales] = useState(turno.horasReales?.toString() || '');
	const [informeTecnico, setInformeTecnico] = useState(turno.informeTecnico || '');
	const [diagnosticoMecanico, setDiagnosticoMecanico] = useState(turno.diagnosticoMecanico || '');
	const [repuestosTexto, setRepuestosTexto] = useState(turno.repuestosTexto || (Array.isArray(turno.repuestosUtilizados) ? turno.repuestosUtilizados.join(', ') : ''));

	const [showMecanicoPicker, setShowMecanicoPicker] = useState(false);
	const [docModalVisible, setDocModalVisible] = useState(false);
	const [docType, setDocType] = useState<'asistencia' | 'reparacion' | null>(null);
	const [DocGen, setDocGen] = useState<any>(null);
	const [presupuestoModalVisible, setPresupuestoModalVisible] = useState(false);

	// Sincronizar datos al abrir modal
	useEffect(() => {
		if (!turno) return;
		setMecanicoId(turno.mecanicoId || '');
		setMecanicoNombre(turno.mecanicoNombre || '');
		setHorasEstimadas(turno.horasEstimadas || '');
		setNumeroOT(turno.numeroOT || '');
		setInstrucciones(turno.instruccionesAdmin || '');
		setHorasReales(turno.horasReales?.toString() || '');
		setInformeTecnico(turno.informeTecnico || '');
		setDiagnosticoMecanico(turno.diagnosticoMecanico || '');
		setRepuestosTexto(turno.repuestosTexto || (Array.isArray(turno.repuestosUtilizados) ? turno.repuestosUtilizados.join(', ') : ''));
	}, [turno]);

	const isEditable = !readOnly && (turno.estado === 'taller_pendiente' || turno.estado === 'scheduled');
	const isFinished = turno.estado === 'completed';
	const isInProgress = turno.estado === 'in_progress';
	const isAssigned = turno.estado === 'scheduled';

	// Cargar lista de mecánicos (Solo Admin)
	useEffect(() => {
		if (visible && !readOnly) {
			const fetchMecanicos = async () => {
				try {
					const snap = await getDocs(collection(db, 'usuarios'));
					setMecanicos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
				} catch (error) { console.error("Error cargando mecánicos", error); }
			};
			fetchMecanicos();
		}
	}, [visible, readOnly]);

	// Cargar Generador de PDF
	const openDoc = async (type: 'asistencia' | 'reparacion') => {
		setDocType(type);
		setDocModalVisible(true);
		if (!DocGen) {
			try {
				const mod = await import('@/components/DocumentGenerator');
				setDocGen(() => mod.default || mod);
			} catch (e) { console.error(e); }
		}
	};

	// Guardar Cambios (Admin)
	const handleUpdateOrder = async () => {
		if (readOnly) return;
		setLoading(true);
		try {
			const ref = doc(db, 'turnos', turno.id);
			const payload: any = {
				mecanicoId,
				mecanicoNombre,
				horasEstimadas,
				instruccionesAdmin: instrucciones,
				horasReales: horasReales ? Number(horasReales) : null,
				informeTecnico,
				diagnosticoMecanico,
				repuestosTexto,
				estado: (turno.estado === 'taller_pendiente' && mecanicoId) ? 'scheduled' : turno.estado
			};

			if (turno.estado !== 'scheduled') {
				payload.numeroOT = numeroOT;
			}

			await updateDoc(ref, payload);
			onClose();
		} catch (e) {
			console.error(e);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Modal visible={visible} transparent animationType="slide">
			<View className="flex-1 bg-black/90 justify-end md:justify-center items-center">
				{!!(Platform.OS === 'ios') && <BlurView intensity={20} tint="dark" className="absolute fill-none" />}

				<Animated.View
					entering={FadeInUp}
					className="w-full h-[95%] md:w-[850px] bg-[#0c0c0e] rounded-t-[40px] md:rounded-[32px] border-t border-white/10 overflow-hidden"
				>
					{/* HEADER */}
					<View className="px-6 py-6 border-b border-white/5 flex-row justify-between items-center bg-zinc-900/50">
						<View>
							<View className="flex-row items-center bg-orange-500/10 self-start px-2 py-0.5 rounded mb-1">
								<Hash size={10} color="#F97316" />
								<Text className="text-orange-500 text-[10px] font-black uppercase ml-1">Orden de Trabajo</Text>
							</View>
							<Text className="text-white text-3xl font-black italic">{turno.numeroPatente}</Text>
						</View>
						<TouchableOpacity onPress={onClose} className="bg-white/5 p-3 rounded-full">
							<X color="#666" size={24} />
						</TouchableOpacity>
					</View>

					<ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>

						{/* SECCIÓN 0: NÚMERO DE ORDEN */}
						<View className="mb-8">
							<Text className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] mb-3">Orden de trabajo</Text>
							<View className="bg-zinc-900 rounded-2xl border border-white/10 flex-row items-center px-4">
								<FileText size={18} color="#F97316" />
								{readOnly ? (
									<Text className="flex-1 p-4 text-white font-black text-xl">{numeroOT || 'Sin OT'}</Text>
								) : (
									<TextInput
										value={numeroOT}
										onChangeText={setNumeroOT}
										placeholder="N° de Orden (Ej: OT-001)"
										placeholderTextColor="#444"
										className="flex-1 p-4 text-white font-black text-lg"
										editable={!readOnly && turno.estado !== 'scheduled'}
										selectTextOnFocus={!readOnly && turno.estado !== 'scheduled'}
									/>
								)}
							</View>
						</View>

						{/* SECCIÓN 1: REPORTE INICIAL */}
						<View className="flex-row gap-4 mb-8">
							<View className="flex-1 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
								<Text className="text-zinc-500 text-[10px] font-bold uppercase mb-2">Falla Reportada</Text>
								<Text className="text-zinc-300 text-sm italic">"{turno.reporteSupervisor || turno.comentariosChofer || 'Sin comentarios'}"</Text>

								{!!(turno.sintomasReportados || turno.sintomas)?.length && (
									<View className="flex-row flex-wrap gap-2 mt-3">
										{(turno.sintomasReportados || turno.sintomas).map((s: string, i: number) => (
											<View key={i} className="bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
												<Text className="text-red-400 text-[9px] font-bold uppercase">{s}</Text>
											</View>
										))}
									</View>
								)}
							</View>

							<View className="w-32 h-32 bg-zinc-900 rounded-2xl overflow-hidden border border-white/10">
								{(turno.fotoTableroIngreso || turno.fotoTablero) ? (
									<Image source={{ uri: turno.fotoTableroIngreso || turno.fotoTablero }} className="w-full h-full" resizeMode="cover" />
								) : (
									<View className="flex-1 items-center justify-center opacity-10"><FileText size={32} color="white" /></View>
								)}
							</View>
						</View>

						{/* SECCIÓN 2: PLANIFICACIÓN */}
						<Text className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Planificación Técnica</Text>

						<View className="space-y-4 mb-8">
							{/* Selector Mecánico */}
							{readOnly ? (
								<View className="bg-zinc-900 p-4 rounded-xl border border-white/10 flex-row justify-between items-center">
									<View className="flex-row items-center">
										<UserCog size={18} color={mecanicoNombre ? "#3B82F6" : "#444"} />
										<Text className={`ml-3 font-bold ${mecanicoNombre ? 'text-white' : 'text-zinc-600'}`}>
											{mecanicoNombre || "Sin mecánico asignado"}
										</Text>
									</View>
								</View>
							) : (
								<TouchableOpacity
									onPress={() => setShowMecanicoPicker(!showMecanicoPicker)}
									className="bg-zinc-900 p-4 rounded-xl border border-white/10 flex-row justify-between items-center"
								>
									<View className="flex-row items-center">
										<UserCog size={18} color={mecanicoNombre ? "#3B82F6" : "#444"} />
										<Text className={`ml-3 font-bold ${mecanicoNombre ? 'text-white' : 'text-zinc-600'}`}>
											{mecanicoNombre || "Asignar Mecánico Responsable"}
										</Text>
									</View>
									<ChevronDown size={20} color="#666" />
								</TouchableOpacity>
							)}

							{!!(showMecanicoPicker && !readOnly) && (
								<View className="bg-zinc-800 rounded-xl border border-white/10 mt-1 mb-2">
									{mecanicos.map(m => (
										<TouchableOpacity key={m.id} className="p-4 border-b border-white/5" onPress={() => { setMecanicoId(m.id); setMecanicoNombre(m.name || m.nombre); setShowMecanicoPicker(false); }}>
											<Text className="text-white font-medium">{m.name || m.nombre}</Text>
										</TouchableOpacity>
									))}
								</View>
							)}

							{/* Horas Estimadas */}
							<View className="bg-zinc-900 rounded-xl border border-white/10 flex-row items-center px-4">
								<Clock size={18} color="#666" />
								{readOnly ? (
									<Text className="flex-1 p-4 text-white font-bold">{String(horasEstimadas || 'Sin horas')}</Text>
								) : (
									<TextInput
										value={String(horasEstimadas)}
										onChangeText={setHorasEstimadas}
										keyboardType="numeric"
										placeholder="Horas estimadas de trabajo"
										placeholderTextColor="#444"
										className="flex-1 p-4 text-white font-bold"
										editable={!readOnly}
									/>
								)}
							</View>

							{/* Instrucciones / Checklist */}
							{readOnly ? (
								<View className="mb-4">
									<Text className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-2">Checklist de Tareas</Text>
									{(() => {
										const listaTareas = turno.instruccionesMecanico && turno.instruccionesMecanico.length > 0
											? turno.instruccionesMecanico
											: (turno.instruccionesAdmin ? turno.instruccionesAdmin.split('\n') : []);

										if (listaTareas.length === 0) return <Text className="text-zinc-600 text-xs">Sin tareas asignadas.</Text>;

										return listaTareas.map((tarea: string, index: number) => {
											const checked = isFinished ? true : !!(tareasCompletadas && tareasCompletadas[index]);
											return (
												<TouchableOpacity
													key={index}
													disabled={!isInProgress}
													onPress={() => setTareasCompletadas && setTareasCompletadas((prev: any) => ({ ...prev, [index]: !prev[index] }))}
													className={`p-3 rounded-xl mb-2 flex-row items-center border ${checked ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-zinc-800/50 border-zinc-700'}`}
												>
													{checked ? <CheckSquare size={18} color="#10B981" /> : <Square size={18} color="#6B7280" />}
													<Text className={`ml-3 text-sm flex-1 ${checked ? 'text-emerald-400' : 'text-zinc-300'}`}>{tarea}</Text>
												</TouchableOpacity>
											);
										});
									})()}
									{!!(!isInProgress) && <Text className="text-yellow-500 text-[10px] mt-2 italic">Debes Iniciar el trabajo para poder tildar las tareas.</Text>}
								</View>
							) : (
								<TextInput
									multiline numberOfLines={4}
									value={instrucciones}
									onChangeText={setInstrucciones}
									placeholder="Instrucciones específicas..."
									placeholderTextColor="#444"
									textAlignVertical="top"
									className="bg-zinc-900 p-4 rounded-xl border border-white/10 text-white min-h-[100px]"
									editable={!readOnly}
								/>
							)}

							{/* BOTÓN CHECK-IN GLOBAL */}
							<TouchableOpacity 
								onPress={() => { onClose(); router.push({ pathname: '/taller/checkin', params: { id: turno.id } }); }}
								className="bg-orange-500/10 py-3 rounded-xl border border-orange-500/30 flex-row items-center justify-center mb-6 mt-4"
							>
								<ClipboardCheck size={16} color="#F97316" />
								<Text className="text-orange-500 font-bold ml-2 uppercase text-[10px] tracking-widest">Ver / Editar Check-in del Vehículo</Text>
							</TouchableOpacity>

							{/* SECCIÓN RESUMEN Y EDICIÓN PARA EL MECÁNICO */}
							{readOnly && turno.estado === 'completed' && (
								<View className="mb-8 border-t border-white/10 pt-6">
									<Text className="text-emerald-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Tu Resumen de Trabajo</Text>
								
									<View className="flex-row gap-4 mb-4">
										<View className="flex-1 bg-black/40 p-4 rounded-xl border border-white/5">
											<Text className="text-zinc-500 text-[10px] font-bold uppercase mb-1">Horas Reales</Text>
											<Text className="text-white font-bold">{turno.horasReales ? `${turno.horasReales} hrs` : '--'}</Text>
										</View>
										<View className="flex-[2] bg-black/40 p-4 rounded-xl border border-white/5">
											<Text className="text-zinc-500 text-[10px] font-bold uppercase mb-1">Repuestos Utilizados</Text>
											<Text className="text-zinc-300 text-xs">
												{turno.repuestosTexto || (Array.isArray(turno.repuestosUtilizados) ? turno.repuestosUtilizados.join(', ') : 'Ninguno registrado')}
											</Text>
										</View>
									</View>

									{turno.informeTecnico && (
										<View className="bg-blue-900/10 p-4 rounded-xl border border-blue-500/20 mb-4">
											<Text className="text-blue-400 text-[10px] font-bold uppercase mb-1">Tu Informe Técnico</Text>
											<Text className="text-blue-100 text-sm leading-5">{turno.informeTecnico}</Text>
										</View>
									)}

									{turno.diagnosticoMecanico && (
										<View className="bg-emerald-900/10 p-4 rounded-xl border border-emerald-500/20 mb-4">
											<Text className="text-emerald-400 text-[10px] font-bold uppercase mb-1">Diagnóstico para el Cliente</Text>
											<Text className="text-emerald-100 text-sm leading-5 italic">"{turno.diagnosticoMecanico}"</Text>
										</View>
									)}

									<TouchableOpacity 
										onPress={() => { onClose(); onEditComplete && onEditComplete(turno); }}
										className="bg-blue-600/20 py-3 rounded-xl border border-blue-500/30 flex-row items-center justify-center mt-2"
									>
										<Pencil size={14} color="#60A5FA" />
										<Text className="text-blue-400 font-bold ml-2 uppercase text-[10px] tracking-widest">Editar Informe / Repuestos</Text>
									</TouchableOpacity>
								</View>
							)}
						</View>

						{/* SECCIÓN 3: AUDITORÍA (SOLO ADMIN) */}
						{!readOnly && (turno.estado === 'completed' || turno.estado === 'in_progress' || turno.estado === 'asignado_mecanico') && (
							<View className="mb-8 border-t border-white/10 pt-6">

								<Text className="text-emerald-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Resolución del Mecánico (Editable)</Text>

								{/* Checklist (Lectura) */}
								{turno.instruccionesMecanico && turno.instruccionesMecanico.length > 0 && (
									<View className="bg-black/40 p-4 rounded-xl border border-white/5 mb-4">
										<Text className="text-zinc-500 text-[10px] font-bold uppercase mb-3">Plan de Tareas</Text>
										{turno.instruccionesMecanico.map((tarea: string, idx: number) => (
											<View key={idx} className="flex-row items-center mb-2">
												<CheckCircle size={14} color="#10B981" />
												<Text className="text-zinc-300 text-xs ml-2">{tarea}</Text>
											</View>
										))}
									</View>
								)}

								{/* Edición de Horas y Repuestos */}
								<View className="flex-row gap-4 mb-4">
									<View className="flex-1">
										<Text className="text-zinc-400 text-[10px] font-bold uppercase mb-2">Horas Reales</Text>
										<TextInput value={String(horasReales)} onChangeText={setHorasReales} keyboardType="numeric" className="bg-zinc-900 p-4 rounded-xl border border-white/10 text-white font-bold" />
									</View>
									<View className="flex-[2]">
										<Text className="text-zinc-400 text-[10px] font-bold uppercase mb-2">Repuestos Utilizados</Text>
										<TextInput multiline numberOfLines={2} value={repuestosTexto} onChangeText={setRepuestosTexto} className="bg-zinc-900 p-4 rounded-xl border border-white/10 text-white" />
									</View>
								</View>

								{/* Edición de Informes */}
								<Text className="text-blue-400 text-[10px] font-bold uppercase mb-2">Informe Técnico (Uso Interno)</Text>
								<TextInput multiline numberOfLines={3} value={informeTecnico} onChangeText={setInformeTecnico} className="bg-zinc-900 p-4 rounded-xl border border-blue-500/20 text-white mb-4 min-h-[80px]" textAlignVertical="top" />

								<Text className="text-emerald-400 text-[10px] font-bold uppercase mb-2">Diagnóstico para Cliente / Presupuesto</Text>
								<TextInput multiline numberOfLines={3} value={diagnosticoMecanico} onChangeText={setDiagnosticoMecanico} className="bg-zinc-900 p-4 rounded-xl border border-emerald-500/20 text-white min-h-[80px]" textAlignVertical="top" />
							</View>
						)}

						{/* SECCIÓN 4: DOCUMENTACIÓN TÉCNICA (SOLO ADMIN) */}
						{!readOnly && (
							<>
								<Text className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Documentación y Certificados</Text>
								<View className="flex-row gap-3 mb-10">
									<TouchableOpacity onPress={() => openDoc('asistencia')} className="flex-1 bg-orange-500/10 p-4 rounded-2xl border border-orange-500/20 items-center">
										<Ambulance size={24} color="#F97316" />
										<Text className="text-orange-200 text-[10px] font-bold mt-2 uppercase">Asistencia</Text>
									</TouchableOpacity>
									<TouchableOpacity onPress={() => openDoc('reparacion')} className="flex-1 bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 items-center">
										<FileText size={24} color="#3B82F6" />
										<Text className="text-blue-200 text-[10px] font-bold mt-2 uppercase">Informe</Text>
									</TouchableOpacity>
									<TouchableOpacity onPress={() => setPresupuestoModalVisible(true)} className="flex-1 bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 items-center">
										<Receipt size={24} color="#10B981" />
										<Text className="text-emerald-200 text-[10px] font-bold mt-2 uppercase">Presupuesto</Text>
									</TouchableOpacity>
								</View>
							</>
						)}

					</ScrollView>

					{/* FOOTER ACCIONES */}
					<View className="p-6 border-t border-white/5 bg-[#0c0c0e] flex-row gap-3">
						<TouchableOpacity
							onPress={onClose}
							className={`py-4 rounded-2xl bg-zinc-800 items-center flex-1`}
						>
							<Text className="text-zinc-400 font-black uppercase text-xs">Cerrar</Text>
						</TouchableOpacity>

						{/* Acciones para Mecánico (ReadOnly) */}
						{!!readOnly && (
							<>
								{isFinished ? (
									<View className="flex-[2] py-4 rounded-2xl bg-emerald-900/50 border border-emerald-500/30 items-center flex-row justify-center">
										<CheckCircle2 size={16} color="#10B981" style={{ marginRight: 8 }} />
										<Text className="text-emerald-500 font-black uppercase text-xs">Trabajo Finalizado</Text>
									</View>
								) : isInProgress ? (
									<TouchableOpacity
										onPress={() => { onClose(); onFinish && onFinish(turno); }}
										className="flex-[2] py-4 rounded-2xl bg-emerald-600 items-center flex-row justify-center shadow-lg shadow-emerald-900/40"
									>
										<CheckCircle2 size={16} color="white" style={{ marginRight: 8 }} />
										<Text className="text-white font-black uppercase text-xs">Finalizar Trabajo</Text>
									</TouchableOpacity>
								) : isAssigned ? (
									<TouchableOpacity
										onPress={() => { onClose(); onStart && onStart(turno); }}
										className="flex-[2] py-4 rounded-2xl bg-blue-600 items-center flex-row justify-center shadow-lg shadow-blue-900/40"
									>
										<Play size={16} color="white" style={{ marginRight: 8 }} />
										<Text className="text-white font-black uppercase text-xs">Iniciar Trabajo</Text>
									</TouchableOpacity>
								) : null}
							</>
						)}

						{/* Acción de Guardar para Admin (!readOnly) */}
						{!readOnly && (
							<TouchableOpacity
								onPress={handleUpdateOrder}
								disabled={loading}
								className="flex-[2] py-4 rounded-2xl bg-blue-600 items-center flex-row justify-center shadow-lg shadow-blue-900/40"
							>
								{loading ? (
									<ActivityIndicator color="white" />
								) : (
									<View className="flex-row items-center">
										<Save size={16} color="white" style={{ marginRight: 8 }} />
										<Text className="text-white font-black uppercase text-xs">Guardar Cambios</Text>
									</View>
								)}
							</TouchableOpacity>
						)}
					</View>
				</Animated.View>
			</View>

			{/* COMPONENTES SECUNDARIOS */}
			{!!docType && !!DocGen && (
				<DocGen visible={docModalVisible} onClose={() => { setDocModalVisible(false); setDocType(null); }} docType={docType} turno={turno} />
			)}
			{!!presupuestoModalVisible && (
				<PresupuestoModal visible={presupuestoModalVisible} onClose={() => setPresupuestoModalVisible(false)} prefill={turno} />
			)}
		</Modal>
	);
};

export default WorkshopOrderModal;