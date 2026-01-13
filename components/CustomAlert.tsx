import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';

type ButtonSpec = { text: string; onPress?: () => void; style?: any };

let subscriber: ((payload: { title: string; message?: string; buttons?: ButtonSpec[] }) => void) | null = null;

export function alert(title: string, message?: string, buttons?: ButtonSpec[]) {
	if (subscriber) {
		subscriber({ title, message, buttons });
	} else {
		// fallback: console
		console.warn('Alert fallback:', title, message);
	}
}

export const CustomAlertProvider = ({ children }: { children: React.ReactNode }) => {
	const [visible, setVisible] = useState(false);
	const [payload, setPayload] = useState<{ title: string; message?: string; buttons?: ButtonSpec[] } | null>(null);

	useEffect(() => {
		subscriber = (p) => {
			setPayload(p);
			setVisible(true);
		};
		return () => { subscriber = null; };
	}, []);

	const close = () => { setVisible(false); setPayload(null); };

	return (
		<>
			{children}
			<Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
				<View className="flex-1 justify-center items-center">
					<BlurView intensity={60} tint="dark" className="absolute inset-0" />
					<View className="w-[90%] bg-[#0b0b0b] rounded-2xl p-6 border border-white/10">
						<Text className="text-white text-lg font-bold mb-2">{payload?.title}</Text>
						{payload?.message ? <Text className="text-gray-300 mb-4">{payload.message}</Text> : null}
						<View className="flex-row justify-end space-x-3">
							{(payload?.buttons && payload.buttons.length > 0) ? (
								payload.buttons.map((b, i) => (
									<TouchableOpacity key={i} onPress={() => { b.onPress?.(); close(); }} className="px-4 py-2 rounded-xl bg-white/5">
										<Text className="text-white">{b.text}</Text>
									</TouchableOpacity>
								))
							) : (
								<TouchableOpacity onPress={close} className="px-4 py-2 rounded-xl bg-white/5">
									<Text className="text-white">OK</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>
				</View>
			</Modal>
		</>
	);
};

export default { alert } as const;
