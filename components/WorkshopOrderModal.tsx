import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Image, ActivityIndicator, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import {
	X, UserCog, Clock,
 	FileText, ChevronDown, Ambulance, Hash, Save, CheckCircle, Receipt
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
}

const WorkshopOrderModal = ({ visible, turno, onClose, readOnly = false }: WorkshopOrderModalProps) => {
	const router = useRouter();
	if (!turno) return null;

	const [loading, setLoading] = useState(false);
	const [mecanicos, setMecanicos] = useState<any[]>([]);
	const [mecanicoId, setMecanicoId] = useState(turno.mecanicoId || '');
	const [mecanicoNombre, setMecanicoNombre] = useState(turno.mecanicoNombre || '');
	const [horasEstimadas, setHorasEstimadas] = useState(turno.horasEstimadas || '');
	const [instrucciones, setInstrucciones] = useState(turno.instruccionesAdmin || '');
	const [numeroOT, setNumeroOT] = useState(turno.numeroOT || '');
	const [showMecanicoPicker, setShowMecanicoPicker] = useState(false);

	// Estados para Documentos (PDF)
	const [docModalVisible, setDocModalVisible] = useState(false);
	const [docType, setDocType] = useState<'asistencia' | 'reparacion' | null>(null);
	const [DocGen, setDocGen] = useState<any>(null);

	// Presupuesto modal
	const [presupuestoModalVisible, setPresupuestoModalVisible] = useState(false);

	const isEditable = !readOnly && (turno.estado === 'taller_pendiente' || turno.estado === 'scheduled');
	const isFinished = turno.estado === 'completed';
	const isInProgress = turno.estado === 'in_progress';
	const isAssigned = turno.estado === 'scheduled';

	// 1. Cargar lista de mecánicos
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

	// 2. Cargar Generador de PDF
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
				// Si estaba pendiente y ahora tiene mecánico, pasa a scheduled
				estado: (turno.estado === 'taller_pendiente' && mecanicoId) ? 'scheduled' : turno.estado
			};

			// No permitir actualizar numeroOT si ya está en 'scheduled' (Asignadas)
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
				{Platform.OS === 'ios' && <BlurView intensity={20} tint="dark" className="absolute fill-none" />}

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
								<TextInput
									value={numeroOT}
									onChangeText={setNumeroOT}
									placeholder="N° de Orden (Ej: OT-001)"
									placeholderTextColor="#444"
									className="flex-1 p-4 text-white font-black text-lg"
									editable={!readOnly && turno.estado !== 'scheduled'}
									selectTextOnFocus={!readOnly && turno.estado !== 'scheduled'}
								/>
							</View>
						</View>

						{/* SECCIÓN 1: REPORTE INICIAL */}
						<View className="flex-row gap-4 mb-8">
							<View className="flex-1 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
								<Text className="text-zinc-500 text-[10px] font-bold uppercase mb-2">Falla Reportada</Text>
								<Text className="text-zinc-300 text-sm italic">"{turno.reporteSupervisor || turno.comentariosChofer || 'Sin comentarios'}"</Text>

								{/* Síntomas Tags */}
								{(turno.sintomasReportados || turno.sintomas)?.length > 0 && (
									<View className="flex-row flex-wrap gap-2 mt-3">
										{(turno.sintomasReportados || turno.sintomas).map((s: string, i: number) => (
											<View key={i} className="bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
												<Text className="text-red-400 text-[9px] font-bold uppercase">{s}</Text>
											</View>
										))}
									</View>
								)}
							</View>

							{/* Foto Evidencia */}
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

							{showMecanicoPicker && !readOnly && (
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
								<TextInput
									value={String(horasEstimadas)}
									onChangeText={setHorasEstimadas}
									keyboardType="numeric"
									placeholder="Horas estimadas de trabajo"
									placeholderTextColor="#444"
									className="flex-1 p-4 text-white font-bold"
									editable={!readOnly}
								/>
							</View>

							{/* Instrucciones */}
							<TextInput
								multiline numberOfLines={4}
								value={instrucciones}
								onChangeText={setInstrucciones}
								placeholder="Instrucciones específicas para el Mecanico..."
								placeholderTextColor="#444"
								textAlignVertical="top"
								className="bg-zinc-900 p-4 rounded-xl border border-white/10 text-white min-h-[100px]"
								editable={!readOnly}
							/>
						</View>

						{/* SECCIÓN 3: DOCUMENTACIÓN TÉCNICA (PDFs) */}
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

					</ScrollView>

					{/* FOOTER ACCIONES */}
					<View className="p-6 border-t border-white/5 bg-[#0c0c0e] flex-row gap-3">
						<TouchableOpacity
							onPress={onClose}
							className={`py-4 rounded-2xl bg-zinc-800 items-center ${readOnly ? 'flex-1' : 'flex-1'}`}
						>
							<Text className="text-zinc-400 font-black uppercase text-xs">Cerrar</Text>
						</TouchableOpacity>

						{!readOnly && (
							<>
								{/* LÓGICA DEL BOTÓN DE ACCIÓN */}
								{isFinished ? (
									<View className="flex-[2] py-4 rounded-2xl bg-emerald-900/50 border border-emerald-500/30 items-center flex-row justify-center">
										<CheckCircle size={16} color="#10B981" style={{ marginRight: 8 }} />
										<Text className="text-emerald-500 font-black uppercase text-xs">Trabajo Finalizado</Text>
									</View>
								) : isInProgress ? (
									<View className="flex-[2] py-4 rounded-2xl bg-yellow-900/50 border border-yellow-500/30 items-center flex-row justify-center">
										<Clock size={16} color="#EAB308" style={{ marginRight: 8 }} />
										<Text className="text-yellow-500 font-black uppercase text-xs">En Progreso...</Text>
									</View>
								) : isAssigned ? (
									<View className="flex-[2] py-4 rounded-2xl bg-zinc-800 border border-zinc-700 items-center flex-row justify-center">
										<Text className="text-zinc-400 font-black uppercase text-xs">Asignada al Mecanico</Text>
									</View>
								) : (
									<TouchableOpacity
										onPress={handleUpdateOrder}
										disabled={loading}
										className="flex-[2] py-4 rounded-2xl bg-blue-600 items-center flex-row justify-center shadow-lg shadow-blue-900/40"
									>
										{loading ? <ActivityIndicator color="white" /> : (
											<>
												<Save size={16} color="white" style={{ marginRight: 8 }} />
												<Text className="text-white font-black uppercase text-xs">Asignar y Guardar</Text>
											</>
										)}
									</TouchableOpacity>
								)}
							</>
						)}
					</View>
				</Animated.View>
			</View>

			{/* COMPONENTE GENERADOR DE PDF */}
			{docType && DocGen && (
				<DocGen
					visible={docModalVisible}
					onClose={() => { setDocModalVisible(false); setDocType(null); }}
					docType={docType}
					turno={turno}
				/>
			)}

				{/* MODAL PRESUPUESTO */}
				{presupuestoModalVisible && (
					<PresupuestoModal visible={presupuestoModalVisible} onClose={() => setPresupuestoModalVisible(false)} prefill={turno} />
				)}
		</Modal>
	);
};

export default WorkshopOrderModal;