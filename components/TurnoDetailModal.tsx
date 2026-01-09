import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, SlideInRight } from 'react-native-reanimated';

// --- SUB-COMPONENTE: CARD DE CHECKLIST EN DETALLE ---
const DetailCheckItem = ({ item }: any) => (
	<View className={`flex-row items-center p-4 mb-2 rounded-2xl border ${item.completado ? 'bg-success/5 border-success/20' : 'bg-white/5 border-transparent'}`}>
		<View className={`p-2 rounded-lg mr-4 ${item.completado ? 'bg-success/20' : 'bg-white/5'}`}>
			<MaterialIcons name={item.icono || 'check'} size={18} color={item.completado ? '#4ADE80' : '#444'} />
		</View>
		<View className="flex-1">
			<Text className={`text-sm font-bold ${item.completado ? 'text-white' : 'text-gray-500'}`}>{item.nombre}</Text>
			<Text className="text-gray-600 text-[10px]">{item.descripcion}</Text>
		</View>
		<MaterialIcons
			name={item.completado ? 'check-circle' : 'radio-button-unchecked'}
			size={20}
			color={item.completado ? '#4ADE80' : '#222'}
		/>
	</View>
);

const TurnoDetailModal = ({ visible, turno, onClose, onAction }: any) => {
	if (!turno) return null;

	return (
		<Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
			<View className="flex-1 bg-black/95">
				<SafeAreaView className="flex-1">

					{/* TOP BAR FIXA */}
					<View className="px-6 py-4 flex-row justify-between items-center border-b border-white/5 bg-black">
						<View>
							<Text className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Expediente Técnico</Text>
							<Text className="text-white text-xl font-black italic">{turno.numeroPatente || turno.patente}</Text>
						</View>
						<TouchableOpacity onPress={onClose} className="bg-white/10 p-2 rounded-full">
							<MaterialIcons name="close" size={24} color="white" />
						</TouchableOpacity>
					</View>

					<ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6 pt-6">

						{/* 1. FOTO DEL TABLERO (GIGANTE) */}
						<Animated.View entering={FadeInUp.delay(100)} className="mb-8">
							<BlurView>
								<Text className="text-primary text-[10px] font-black uppercase tracking-[3px] mb-4">Evidencia Visual (Odometer/Fuel)</Text>
								<View className="w-full h-64 bg-card rounded-[40px] overflow-hidden border border-white/10 shadow-2xl">
									{turno.fotoTablero ? (
										<Image source={{ uri: turno.fotoTablero }} className="w-full h-full" resizeMode="cover" />
									) : (
										<View className="flex-1 items-center justify-center bg-white/5">
											<MaterialIcons name="image-not-supported" size={40} color="#333" />
											<Text className="text-gray-600 text-xs mt-2 italic">Sin evidencia fotográfica</Text>
										</View>
									)}
								</View>
							</BlurView>
						</Animated.View>

						{/* 2. DATOS DE INGRESO RÁPIDOS */}
						<View className="flex-row space-x-4 mb-8">
							<View className="flex-1 bg-card/50 p-5 rounded-[30px] border border-white/5 items-center">
								<MaterialIcons name="speed" size={20} color="#60A5FA" />
								<Text className="text-white font-black text-lg mt-1">{turno.kilometraje || '---'} <Text className="text-[10px] text-gray-500 italic">KM</Text></Text>
							</View>
							<View className="flex-1 bg-card/50 p-5 rounded-[30px] border border-white/5 items-center">
								<MaterialIcons name="local-gas-station" size={20} color="#4ADE80" />
								<Text className="text-white font-black text-lg mt-1">{turno.nivelNafta || '0'}%</Text>
							</View>
						</View>

						{/* 3. OBSERVACIONES DEL CHOFER */}
						<View className="mb-8 bg-danger/5 border border-danger/10 p-6 rounded-[35px]">
							<View className="flex-row items-center mb-3">
								<MaterialIcons name="comment" size={16} color="#FF4C4C" />
								<Text className="text-danger font-black text-[10px] uppercase tracking-widest ml-2">Notas del Operador</Text>
							</View>
							<Text className="text-gray-300 text-sm leading-5 italic">
								"{turno.comentariosChofer || turno.descripcion || 'El chofer no dejó observaciones adicionales.'}"
							</Text>
						</View>

						{/* 4. CHECKLIST DE 10 PUNTOS */}
						<View className="mb-10">
							<Text className="text-primary text-[10px] font-black uppercase tracking-[3px] mb-4 ml-2">Inspección de Seguridad</Text>
							{(turno.checklistIngreso || []).map((item: any, idx: number) => (
								<DetailCheckItem key={idx} item={item} />
							))}
						</View>

						{/* ESPACIO PARA SCROLL */}
						<View className="h-20" />

					</ScrollView>

					{/* BOTONES DE ACCIÓN (COMMAND BAR) */}
					<BlurView intensity={30} tint="dark" className="absolute bottom-0 w-full p-6 border-t border-white/10 flex-row space-x-4">
						<TouchableOpacity
							onPress={() => onAction(turno.id, 'rejected')}
							className="flex-1 bg-white/5 py-5 rounded-[25px] items-center border border-white/10"
						>
							<Text className="text-gray-400 font-black text-xs uppercase tracking-widest">Rechazar</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => onAction(turno.id, 'scheduled')}
							className="flex-[2] bg-danger py-5 rounded-[25px] items-center shadow-lg shadow-danger/40"
						>
							<Text className="text-white font-black text-xs uppercase tracking-widest italic">Aprobar y Reparar</Text>
						</TouchableOpacity>
					</BlurView>

				</SafeAreaView>
			</View>
		</Modal>
	);
};

export default TurnoDetailModal;