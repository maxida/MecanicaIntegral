import React from 'react';
import { View, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';

export default function VerPdfScreen() {
	const router = useRouter();
	const { url, title } = useLocalSearchParams();

	if (!url) return null;

	return (
		<SafeAreaView className="flex-1 bg-black">
			<View className="flex-row justify-between items-center p-4 bg-zinc-900 border-b border-zinc-800">
				<Text className="text-white font-bold uppercase">{title || 'Documento'}</Text>
				<TouchableOpacity onPress={() => router.back()} className="bg-black p-2 rounded-full">
					<X color="white" size={20} />
				</TouchableOpacity>
			</View>
			<WebView
				source={{ uri: url as string }}
				style={{ flex: 1 }}
				startInLoadingState={true}
			/>
		</SafeAreaView>
	);
}