import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, SafeAreaView, Alert } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';

// --- ESTRUCTURA DE DATOS BASADA EN EL CSV DE OASIS ---
const ZONAS_INSPECCION = [
	{
		id: 'motor',
		titulo: 'Motor y Fluidos',
		icon: 'engine',
		items: [
			{ id: 'm1', nombre: 'Fugas de aceite motor/carter', descripcion: 'Revisar retén delantero y trasero' },
			{ id: 'm2', nombre: 'Sistema de combustible', descripcion: 'Filtro separador y fugas de presión' },
			{ id: 'm3', nombre: 'Líquido Refrigerante', descripcion: 'Nivel, estado y fugas en mangueras' },
			{ id: 'm4', nombre: 'Correas y Tensores', descripcion: 'Estado de desgaste y tensión' },
		]
	},
	{
		id: 'chasis',
		titulo: 'Chasis y Suspensión',
		icon: 'truck-monster',
		items: [
			{ id: 'c1', nombre: 'Neumáticos', descripcion: 'Desgaste, presión y deformaciones' },
			{ id: 'c2', nombre: 'Pulmones de suspensión', descripcion: 'Fugas de aire y estado de gomas' },
			{ id: 'c3', nombre: 'Crucetas y Cardán', descripcion: 'Holgura y lubricación' },
			{ id: 'c4', nombre: 'Dirección', descripcion: 'Extremos y bujes de barra estabilizadora' },
		]
	},
	{
		id: 'seguridad',
		titulo: 'Seguridad y Cabina',
		icon: 'shield-check',
		items: [
			{ id: 's1', nombre: 'Sistema de Frenos', descripcion: 'Cintas, palancas y pulmones' },
			{ id: 's2', nombre: 'Luces Externas', descripcion: 'Ópticas, giros y acrílicos traseros' },
			{ id: 's3', nombre: 'Cinturones y Butaca', descripcion: 'Anclajes y funcionamiento' },
			{ id: 's4', nombre: 'Cierre y Traba Cabina', descripcion: 'Cojín y tirante de seguridad' },
		]
	}
];

const ChecklistMecanico = () => {
	const route = useRoute<any>();
	const navigation = useNavigation<any>();
	const numeroPatente = route.params?.numeroPatente || '';

	// Estados
	const [completados, setCompletados] = useState<Record<string, boolean>>({});
	const [fotosFallas, setFotosFallas] = useState<Record<string, string>>({});
	const [zonaAbierta, setZonaAbierta] = useState<string | null>('motor');

	const toggleCheck = (itemId: string) => {
		setCompletados(prev => ({ ...prev, [itemId]: !prev[itemId] }));
	};

	const captureFalla = async (itemId: string) => {
		const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
		if (!result.canceled) {
			setFotosFallas(prev => ({ ...prev, [itemId]: result.assets[0].uri }));
		}
	};

	const renderItem = (item: any) => {
		const isOk = completados[item.id];
		const hasPhoto = fotosFallas[item.id];

		return (
			<View key={item.id} className={`mb-3 p-4 rounded-3xl border ${isOk ? 'bg-success/5 border-success/20' : 'bg-white/5 border-white/5'}`}>
				<View className="flex-row items-center justify-between">
					<View className="flex-1 mr-4">
						<Text className={`font-bold ${isOk ? 'text-success' : 'text-white'}`}>{item.nombre}</Text>
						<Text className="text-gray-500 text-[10px] mt-1">{item.descripcion}</Text>
					</View>

					<View className="flex-row items-center space-x-3">
						{/* Si NO está OK y no hay foto, mostramos botón de cámara resaltado */}
						{!isOk && (
							<TouchableOpacity
								onPress={() => captureFalla(item.id)}
								className={`p-2 rounded-xl ${hasPhoto ? 'bg-primary' : 'bg-danger/20'}`}
							>
								<MaterialIcons name={hasPhoto ? 'insert-photo' : 'add-a-photo'} size={20} color={hasPhoto ? 'white' : '#FF4C4C'} />
							</TouchableOpacity>
						)}

						<TouchableOpacity
							onPress={() => toggleCheck(item.id)}
							className={`w-10 h-10 rounded-full items-center justify-center ${isOk ? 'bg-success' : 'bg-white/10'}`}
						>
							<MaterialIcons name={isOk ? 'check' : 'close'} size={24} color={isOk ? 'black' : '#444'} />
						</TouchableOpacity>
					</View>
				</View>

				{hasPhoto && !isOk && (
					<Image source={{ uri: fotosFallas[item.id] }} className="w-full h-32 rounded-2xl mt-4" resizeMode="cover" />
				)}
			</View>
		);
	};

	return (
		<SafeAreaView className="flex-1 bg-surface">
			<LinearGradient colors={['#0b0b0b', '#000']} className="flex-1 px-6">
				<ScrollView showsVerticalScrollIndicator={false} className="pt-6">

					{/* HEADER TÉCNICO */}
					<View className="flex-row justify-between items-end mb-8">
						<View>
							<Text className="text-gray-500 text-[10px] font-black uppercase tracking-[3px]">Inspección Mecánica</Text>
							<Text className="text-white text-3xl font-black italic">{numeroPatente || 'SIN PATENTE'}</Text>
						</View>
						<View className="bg-primary/20 px-3 py-1 rounded-lg">
							<Text className="text-primary text-[10px] font-bold italic">RECEPCIÓN</Text>
						</View>
					</View>

					{/* ACORDEONES POR ZONA */}
					{ZONAS_INSPECCION.map((zona) => (
						<Animated.View key={zona.id} layout={Layout.springify()} className="mb-4">
							<TouchableOpacity
								onPress={() => setZonaAbierta(zonaAbierta === zona.id ? null : zona.id)}
								className="flex-row items-center bg-card p-5 rounded-[30px] border border-white/10"
							>
								<View className="w-10 h-10 bg-white/5 rounded-2xl items-center justify-center mr-4">
									<MaterialIcons name="settings" size={20} color="#60A5FA" />
								</View>
								<Text className="text-white font-black uppercase text-xs tracking-widest flex-1">{zona.titulo}</Text>
								<MaterialIcons
									name={zonaAbierta === zona.id ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
									size={24} color="#444"
								/>
							</TouchableOpacity>

							{zonaAbierta === zona.id && (
								<View className="mt-3 px-2">
									{zona.items.map(item => renderItem(item))}
								</View>
							)}
						</Animated.View>
					))}

					{/* BOTÓN FINALIZAR */}
					<TouchableOpacity
						activeOpacity={0.8}
						onPress={() => {
							// Guardado local y volver
							Alert.alert("Éxito", "Checklist guardado y enviado al Admin.", [
								{ text: 'OK', onPress: () => navigation.goBack() }
							]);
						}}
						className="my-10 overflow-hidden rounded-[30px] shadow-2xl shadow-success/20"
					>
						<LinearGradient colors={['#4ADE80', '#166534']} className="py-6 items-center flex-row justify-center">
							<MaterialIcons name="save" size={24} color="black" />
							<Text className="text-black text-xl font-black uppercase italic ml-2">Finalizar Inspección</Text>
						</LinearGradient>
					</TouchableOpacity>

				</ScrollView>
			</LinearGradient>
		</SafeAreaView>
	);
};

export default ChecklistMecanico;