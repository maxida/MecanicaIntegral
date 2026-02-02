import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { getExpirationStatus } from '@/utils/complianceHelper';

interface Vehicle {
	id: string;
	numeroPatente: string;
	vtvVencimiento?: string;
	seguroVencimiento?: string;
	rutaVencimiento?: string;
}

interface ComplianceWidgetProps {
	vehicles: Vehicle[];
	onPress: () => void;
}

const ComplianceWidget = ({ vehicles, onPress }: ComplianceWidgetProps) => {
	// Calculamos estadísticas al vuelo
	let criticalCount = 0;
	let warningCount = 0;

	vehicles.forEach(v => {
		const vtv = getExpirationStatus(v.vtvVencimiento);
		const seguro = getExpirationStatus(v.seguroVencimiento);
		const ruta = getExpirationStatus(v.rutaVencimiento);

		if (vtv.status === 'expired' || vtv.status === 'critical' ||
			seguro.status === 'expired' || seguro.status === 'critical' ||
			ruta.status === 'expired' || ruta.status === 'critical') {
			criticalCount++;
		} else if (vtv.status === 'warning' || seguro.status === 'warning' || ruta.status === 'warning') {
			warningCount++;
		}
	});

	const isAllGood = criticalCount === 0 && warningCount === 0;

	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.9}
			className={`rounded-2xl p-4 mb-6 border ${criticalCount > 0 ? 'bg-red-900/20 border-red-500/50' :
				warningCount > 0 ? 'bg-yellow-900/20 border-yellow-500/50' :
					'bg-emerald-900/20 border-emerald-500/50'
				}`}
		>
			<View className="flex-row justify-between items-center mb-2">
				<View className="flex-row items-center gap-2">
					<FontAwesome5
						name={criticalCount > 0 ? "exclamation-circle" : isAllGood ? "check-circle" : "exclamation-triangle"}
						size={18}
						color={criticalCount > 0 ? "#EF4444" : isAllGood ? "#34D399" : "#F59E0B"}
					/>
					<Text className="text-white font-bold uppercase text-xs tracking-widest">
						Estado de Flota (Legal)
					</Text>
				</View>
				<MaterialIcons name="chevron-right" size={20} color="#666" />
			</View>

			{isAllGood ? (
				<View>
					<Text className="text-white text-lg font-black">DOCUMENTACIÓN AL DÍA</Text>
					<Text className="text-emerald-400 text-xs mt-1">Toda la flota habilitada para circular.</Text>
				</View>
			) : (
				<View className="flex-row gap-4">
					{criticalCount > 0 && (
						<View>
							<Text className="text-red-500 text-3xl font-black">{criticalCount}</Text>
							<Text className="text-red-200 text-[10px] font-bold uppercase">Críticos / Vencidos</Text>
						</View>
					)}
					{warningCount > 0 && (
						<View>
							<Text className="text-yellow-500 text-3xl font-black">{warningCount}</Text>
							<Text className="text-yellow-200 text-[10px] font-bold uppercase">Vencen en 30 días</Text>
						</View>
					)}
				</View>
			)}
		</TouchableOpacity>
	);
};

export default ComplianceWidget;