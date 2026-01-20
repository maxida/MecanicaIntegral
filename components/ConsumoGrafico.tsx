import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const ConsumoGrafico = ({ dataTurnos }: { dataTurnos: any[] }) => {
	// 1. Transformamos los datos de Firebase para el gráfico
	// Ordenamos por fecha y filtramos solo los que tienen KM y Nafta
	const chartData = dataTurnos
		.filter(t => t.kilometraje && t.nivelNafta !== undefined)
		.sort((a, b) => new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime())
		.slice(-6); // Mostramos los últimos 6 registros

	if (chartData.length < 2) {
		return (
			<View className="bg-card p-6 rounded-[30px] border border-white/5 items-center">
				<Text className="text-gray-500 text-xs italic">Se necesitan al menos 2 registros para calcular consumo</Text>
			</View>
		);
	}

	return (
		<View className="bg-card/40 p-4 rounded-[40px] border border-white/5 mb-8 overflow-hidden">
			<Text className="text-primary text-[10px] font-black uppercase tracking-[3px] mb-4 ml-4">
				Tendencia de Combustible vs KM
			</Text>

			<LineChart
				data={{
					labels: chartData.map(t => new Date(t.fechaCreacion).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })),
					datasets: [{
						data: chartData.map(t => t.nivelNafta),
						color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`, // Azul Primary
						strokeWidth: 3
					}]
				}}
				width={Dimensions.get('window').width - 60}
				height={180}
				chartConfig={{
					backgroundColor: '#000',
					backgroundGradientFrom: '#0b0b0b',
					backgroundGradientTo: '#0b0b0b',
					decimalPlaces: 0,
					color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
					labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
					propsForDots: { r: "6", strokeWidth: "2", stroke: "#60A5FA" },
					style: { borderRadius: 16 }
				}}
				bezier // Curvas suaves tipo Scania
				style={{ marginVertical: 8, borderRadius: 16 }}
			/>

			<View className="flex-row justify-around mt-2">
				<View className="items-center">
					<Text className="text-white font-black text-lg">{chartData[chartData.length - 1].kilometraje}</Text>
					<Text className="text-gray-600 text-[8px] uppercase">Último KM</Text>
				</View>
				<View className="items-center">
					<Text className="text-success font-black text-lg">{chartData[chartData.length - 1].nivelNafta}%</Text>
					<Text className="text-gray-600 text-[8px] uppercase">Nivel Actual</Text>
				</View>
			</View>
		</View>
	);
};

export default ConsumoGrafico;