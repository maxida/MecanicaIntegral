import React from 'react';
import { View, Text, Modal, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type ActionModalType = 'success' | 'error' | 'warning';

interface ActionModalProps {
	visible: boolean;
	type: ActionModalType;
	title: string;
	description?: string;
	buttonText?: string;
	onConfirm: () => void;
}

const CONFIG = {
	success: {
		icon: CheckCircle,
		color: '#10B981', // Emerald 500
		gradient: ['#059669', '#047857'] as const,
		bg: 'bg-emerald-500/10',
		border: 'border-emerald-500/50',
	},
	error: {
		icon: XCircle,
		color: '#EF4444', // Red 500
		gradient: ['#DC2626', '#991B1B'] as const,
		bg: 'bg-red-500/10',
		border: 'border-red-500/50',
	},
	warning: {
		icon: AlertTriangle,
		color: '#F59E0B', // Amber 500
		gradient: ['#D97706', '#B45309'] as const,
		bg: 'bg-amber-500/10',
		border: 'border-amber-500/50',
	},
};

const ActionModal = ({ visible, type, title, description, buttonText = "Continuar", onConfirm }: ActionModalProps) => {
	if (!visible) return null;

	const theme = CONFIG[type];
	const Icon = theme.icon;

	return (
		<Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
			<View className="flex-1 justify-center items-center px-6 bg-black/80">
				{Platform.OS === 'ios' && (
					<BlurView intensity={20} tint="dark" style={{ position: 'absolute', width: '100%', height: '100%' }} />
				)}

				<Animated.View
					entering={FadeInUp.springify().damping(18)}
					className={`w-full max-w-md bg-[#121212] rounded-[30px] border ${theme.border} overflow-hidden shadow-2xl p-6 items-center`}
				>
					{/* ICONO ANIMADO */}
					<View className={`w-20 h-20 rounded-full ${theme.bg} justify-center items-center mb-6 border ${theme.border}`}>
						<Icon size={40} color={theme.color} strokeWidth={2.5} />
					</View>

					{/* TEXTOS */}
					<Text className="text-white text-2xl font-black text-center italic uppercase mb-2">
						{title}
					</Text>

					{description && (
						<Text className="text-gray-400 text-center text-sm mb-8 leading-5 font-medium">
							{description}
						</Text>
					)}

					{/* BOTÓN DE ACCIÓN */}
					<TouchableOpacity
						activeOpacity={0.9}
						onPress={onConfirm}
						className="w-full rounded-2xl overflow-hidden shadow-lg"
						style={{ shadowColor: theme.color, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
					>
						<LinearGradient
							colors={theme.gradient as any}
							start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
							className="py-4 flex-row justify-center items-center"
						>
							<Text className="text-white font-black uppercase tracking-widest text-sm mr-2">
								{buttonText}
							</Text>
							<ArrowRight size={18} color="white" strokeWidth={3} />
						</LinearGradient>
					</TouchableOpacity>

				</Animated.View>
			</View>
		</Modal>
	);
};

export default ActionModal;