import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Plus, Trash2, Save, DollarSign, Printer, FileText } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/firebaseConfig';

// LOGO ORIGINAL (El engranaje rojo/negro)
const LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAAbFBMVEUAAABmaWs2NjYAAAD/AAAAAAD////6+vr39/fw8PDX19fExMTp6enPz8/c3NyCgoJvb298fHz/8/P/5eX/1NT/xMT/tLT/oKD/iYn/c3P/ZGT/T0//ODj/JSX/Dw//+/v/6+v/zMz/ubmhG64qAAAAEHRSTlMABgcICQ4PEBITFBcZHiMsq42qAAAEIUlEQVRo3u2aa3uiOhCGRUCgUBAFFOUiVlG0tXv//z94E0ySPSa2t66H9c5jPwwJk5nMJJMEg8H/6GNj8/jPwwJk5nMJJMEg8H/6GNj8/jP/y3/2zK2LWM1jK3s653u8T2gq9Pq1u4u1+n09Pj4W7+fE022x+n6+Gk4rG0P9c7u29rT+XQ43bY3Q2+3hL+n6/J8bW/u/b3Vj8vp253dE53t+dIen0V297R8uU7bW6O7t/b2tHza3g4Z+vH9vGxvjp7+uSybI2JtT5fmCBn7uizNAbI/NsfF2h4u88U4x8h0MZjHh198i+5u8d157C/E1d4yXyDGXp+XqLHOx36BGE91XpC/29NlgRgf6xwxnpaIsbHOC2P05gUx3pZz67y6/bxcIMZtnRfF+FggYJ3DInu8VohY2+PFIkLWOUSMp3mBEGuFhKzzwhj3c4FYz/MCQdZ5YYwXiwBZZ78Y93OEzHeLAFlnyxi3c4H4N1YIWedFMRbzhIRZZ7+A8T5PiL91XhTjbo6QuXVeFOPWImDWOUSMmznC1d4uAtR6yM8RMtd6gGAtR4ha54Ux7iwCVp0XxbiZI2RtnRdgLEdE3DonjPFrjoC1HBIx1jkpYJ0jAmadE2KszRHQdVaIsTRHiLV1QozyHAFjba4Q/2qOCFjnxTHWcyRjrA/FWJkj4FvPCzHWVoiwPlAIWudEMV4tAsbaPCFGzSKk1jkhYO1oBKyNE0KsHywC1sYJMVYWCbXWCQG7mREja6OEUGuFFGL9oBGwNk4KsX6wCFi7U4R8u04IsDZKCLF+MAkY6wQZt3OEvHXCBFjbU4RkO0fA2mkhxNohIWTtTpHx5xAh2+2EBLs5QrYdEjLWKTL+5AhZ+y2EqM7OEcG6+yQZt0PCrF0ixlM7If7WKRJm/ZAQY50kxDo5ImadkLB2p8hYa0fEmC2SkGufIqFvnRRh3SAh2w4JmXVaxFj9iJD1Dgl51s6KGGtHhKz7ISFjnRQx284IsfZDIq7bQSEh3w0IcWqHhIhdo8SszhAx6yEhxjopItaOEDHe5kUE2M4I2V9t7Qhx25tFBNkZEnbrFBm37ZCQ29ohIt4OCgnZzhBwOyUkXNshoW+dJOTXzgoRW/2YiO0cIWG2U0LAdoyMsfZDIrZzJOS6QSI+q+NEnLYzJPTtkJDrnBKx+jFR2wkiYru7RMRqR4g4P0yKuO1tElFrh4gI/ZCI24+K+LZDImL1QyKiO0FEdIeI2M4REdpJIkL3QyI+/ZiA2ykSojtDRHT7RMRoZ4gI7RSIiN6tEfH7URFhP90QoX86IiL/dEbErj/XROifLgj57x0iInQ/3RBR+3NEjH46J+S/d4i4Xn/YItA+qG4Sce/bLSJWv8yJsL59mYj/YZOI+7G/SUy7/0BM/P8HhP4D9b8hA38B/QcK/AX0v1n/B6B/w/7fE4S/KAAAAABJRU5ErkJggg==";

export default function PresupuestoScreen() {
	const router = useRouter();
	const { turnoId } = useLocalSearchParams();

	const [loadingData, setLoadingData] = useState(true);
	const [savingPdf, setSavingPdf] = useState(false);
	const [turnoData, setTurnoData] = useState<any>(null);

	// Estado del Presupuesto
	const [items, setItems] = useState<any[]>([]);
	const [observaciones, setObservaciones] = useState('');

	// Inputs temporales (Estado Visual)
	const [tempDesc, setTempDesc] = useState('');
	const [tempCosto, setTempCosto] = useState('');
	const [tempTipo, setTempTipo] = useState<'mano_obra' | 'repuesto'>('mano_obra');

	// Carga Inicial
	useEffect(() => {
		const fetchTurno = async () => {
			if (!turnoId) return;
			try {
				const docRef = doc(db, 'turnos', turnoId as string);
				const snap = await getDoc(docRef);
				if (snap.exists()) {
					setTurnoData({ id: snap.id, ...snap.data() });
				}
			} catch (e) {
				console.error(e);
			} finally {
				setLoadingData(false);
			}
		};
		fetchTurno();
	}, [turnoId]);

	// Lógica de Items
	const addItem = () => {
		if (!tempDesc || !tempCosto) return;
		setItems([...items, { id: Date.now().toString(), descripcion: tempDesc, costo: tempCosto, tipo: tempTipo }]);
		setTempDesc(''); setTempCosto('');
	};

	const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));

	const calculateTotals = () => {
		const manoObra = items.filter(i => i.tipo === 'mano_obra').reduce((acc, curr) => acc + Number(curr.costo), 0);
		const repuestos = items.filter(i => i.tipo === 'repuesto').reduce((acc, curr) => acc + Number(curr.costo), 0);
		const total = manoObra + repuestos;
		const totalEfectivo = total * 0.90;
		return { manoObra, repuestos, total, totalEfectivo };
	};

	const totals = calculateTotals();

	// --- FUNCIÓN GENERADORA DEL PDF (Diseño Papel Blanco) ---
	const generateAndSavePdf = async () => {
		if (!turnoData) return;
		setSavingPdf(true);

		const fechaHoy = new Date().toLocaleDateString('es-AR');
		const formatMoney = (amount: number) => amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });

		// ESTE HTML ES EL QUE SE IMPRIME (FONDO BLANCO, TABLAS NEGRAS)
		const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@700&display=swap');
          body { font-family: 'Arial', sans-serif; padding: 40px; color: #000; background-color: #fff; width: 100%; max-width: 800px; margin: auto; }
          
          .main-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid #000; padding-bottom: 5px; margin-bottom: 5px; }
          .main-title { font-family: 'Roboto Condensed', sans-serif; font-size: 32px; font-weight: 900; text-transform: uppercase; margin: 0; }
          .logo-img { width: 80px; height: 80px; object-fit: contain; }
          
          .ot-row { text-align: right; font-size: 11px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
          
          table { width: 100%; border-collapse: collapse; border: 2px solid #000; margin-bottom: 20px; font-size: 12px; }
          td { border: 1px solid #000; padding: 8px; vertical-align: top; width: 50%; }
          .label { font-weight: bold; display: block; margin-bottom: 2px; }
          
          .section-header { font-weight: bold; margin-bottom: 10px; font-size: 13px; text-transform: uppercase; margin-top: 20px; }
          
          .work-item { border-bottom: 1px solid #000; padding: 5px 0; display: flex; justify-content: space-between; font-size: 12px; }
          
          .grand-total-row { border: 2px solid #000; padding: 10px; text-align: center; font-size: 14px; margin-top: 15px; font-weight: 900; background-color: #f0f0f0; }
          
          .obs-box { border: 2px solid #000; padding: 5px; min-height: 80px; font-size: 11px; margin-bottom: 20px; }
          
          .bank-data { text-align: right; font-size: 10px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="main-header">
          <div class="main-title">PRESUPUESTO</div>
          <img src="${LOGO_BASE64}" class="logo-img" />
        </div>
        <div class="ot-row">ORDEN: ${turnoData.numeroOT || 'PEND'}</div>
        
        <table>
          <tr>
            <td><span class="label">Cliente:</span> ${turnoData.clienteNombre || 'CLIENTE FINAL'}</td>
            <td><span class="label">Fecha:</span> ${fechaHoy}</td>
          </tr>
          <tr>
            <td><span class="label">Vehículo:</span> ${turnoData.numeroPatente}</td>
            <td><span class="label">Modelo:</span> ${turnoData.modelo || 'S/D'}</td>
          </tr>
        </table>

        <div class="section-header">DETALLE DE TRABAJO</div>
        <div style="min-height: 200px;">
          ${items.map(item => `
            <div class="work-item">
              <span>${item.descripcion}</span>
              <span>${formatMoney(Number(item.costo))}</span>
            </div>
          `).join('')}
        </div>

        <div class="grand-total-row">
          TOTAL FINAL (EFECTIVO): ${formatMoney(totals.totalEfectivo)}
        </div>

        <div class="section-header">OBSERVACIONES</div>
        <div class="obs-box">
            ${observaciones || 'Sin observaciones.'}
        </div>

        <div class="bank-data">
          <b>MECÁNICA INTEGRAL S.A.</b><br>
          CUIT: 20-33445566-9
        </div>
      </body>
      </html>
    `;

		try {
			// --- LÓGICA WEB (SOLO IMPRIMIR) ---
			if (Platform.OS === 'web') {
				await Print.printAsync({ html: htmlContent });
				setSavingPdf(false);
				return;
			}

			// --- LÓGICA MÓVIL (GUARDAR Y SUBIR) ---
			const { uri } = await Print.printToFileAsync({ html: htmlContent });

			const blob = await new Promise<Blob>((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.onload = function () { resolve(xhr.response); };
				xhr.onerror = function () { reject(new TypeError('Error de red')); };
				xhr.responseType = 'blob';
				xhr.open('GET', uri, true);
				xhr.send(null);
			});

			const fileName = `presupuestos/${turnoData.numeroPatente}_${Date.now()}.pdf`;
			const storageRef = ref(storage, fileName);
			await uploadBytes(storageRef, blob);
			blob.close();

			const downloadURL = await getDownloadURL(storageRef);
			await updateDoc(doc(db, 'turnos', turnoId as string), {
				presupuestoUrl: downloadURL,
				presupuestoTotal: totals.totalEfectivo,
				estadoPresupuesto: 'generado'
			});

			Alert.alert("Guardado", "Presupuesto subido a la nube.");
			await Sharing.shareAsync(uri);

		} catch (error: any) {
			Alert.alert("Error", error.message);
		} finally {
			setSavingPdf(false);
		}
	};

	if (loadingData) return <View className="flex-1 bg-black justify-center items-center"><ActivityIndicator color="white" /></View>;

	return (
		<SafeAreaView className="flex-1 bg-black">
			{/* FONDO OSCURO PARA LA APP */}
			<LinearGradient colors={['#09090b', '#000000']} className="flex-1 px-4 pt-4">

				{/* HEADER */}
				<View className="flex-row items-center mb-6 border-b border-white/10 pb-4">
					<TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-zinc-800 rounded-full border border-white/10">
						<ArrowLeft size={20} color="white" />
					</TouchableOpacity>
					<View>
						<Text className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px]">Gestión Comercial</Text>
						<Text className="text-white text-2xl font-black italic">COTIZADOR OFICIAL</Text>
					</View>
				</View>

				<ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

					{/* TARJETA DE CARGA (OSCURA) */}
					<View className="bg-zinc-900 p-5 rounded-3xl border border-white/5 mb-6">
						<Text className="text-zinc-400 font-bold mb-4 uppercase text-xs tracking-wider">Nuevo Ítem</Text>

						<TextInput
							placeholder="Descripción del trabajo..."
							placeholderTextColor="#555"
							value={tempDesc}
							onChangeText={setTempDesc}
							className="bg-black text-white p-4 rounded-xl border border-zinc-800 mb-3 font-medium"
						/>

						<View className="flex-row gap-3 mb-4">
							<View className="flex-1 flex-row items-center bg-black rounded-xl border border-zinc-800 px-4">
								<DollarSign size={16} color="#555" />
								<TextInput
									placeholder="Monto"
									placeholderTextColor="#555"
									keyboardType="numeric"
									value={tempCosto}
									onChangeText={setTempCosto}
									className="flex-1 p-4 text-white font-mono font-bold"
								/>
							</View>

							<TouchableOpacity
								onPress={() => setTempTipo(tempTipo === 'mano_obra' ? 'repuesto' : 'mano_obra')}
								className={`flex-1 justify-center items-center rounded-xl border ${tempTipo === 'mano_obra' ? 'bg-blue-600/20 border-blue-500/50' : 'bg-orange-600/20 border-orange-500/50'}`}
							>
								<Text className={`font-black text-xs uppercase ${tempTipo === 'mano_obra' ? 'text-blue-400' : 'text-orange-400'}`}>
									{tempTipo === 'mano_obra' ? 'Mano de Obra' : 'Repuesto'}
								</Text>
							</TouchableOpacity>
						</View>

						<TouchableOpacity onPress={addItem} className="bg-white py-4 rounded-xl flex-row justify-center items-center">
							<Plus size={20} color="black" />
							<Text className="text-black font-black ml-2 uppercase text-xs">Agregar a la lista</Text>
						</TouchableOpacity>
					</View>

					{/* LISTA PRELIMINAR (ESTILO FACTURA OSCURA) */}
					<View className="bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden mb-6">
						<View className="bg-zinc-800/50 p-4 flex-row justify-between border-b border-white/5">
							<Text className="text-zinc-500 font-black uppercase text-[10px] tracking-widest">Detalle</Text>
							<Text className="text-zinc-500 font-black uppercase text-[10px] tracking-widest">Subtotal</Text>
						</View>

						{items.length === 0 ? (
							<View className="p-10 items-center justify-center">
								<FileText size={40} color="#222" />
								<Text className="text-zinc-600 text-xs mt-3 font-bold uppercase">Lista vacía</Text>
							</View>
						) : (
							items.map((item) => (
								<View key={item.id} className="p-4 border-b border-white/5 flex-row justify-between items-center">
									<View className="flex-1 mr-4">
										<Text className="text-white font-bold text-sm">{item.descripcion}</Text>
										<Text className={`text-[9px] uppercase font-bold mt-1 ${item.tipo === 'mano_obra' ? 'text-blue-500' : 'text-orange-500'}`}>
											{item.tipo.replace('_', ' ')}
										</Text>
									</View>
									<View className="flex-row items-center">
										<Text className="text-white font-mono font-bold mr-4">${Number(item.costo).toLocaleString()}</Text>
										<TouchableOpacity onPress={() => removeItem(item.id)} className="bg-red-500/10 p-2 rounded-lg">
											<Trash2 size={14} color="#EF4444" />
										</TouchableOpacity>
									</View>
								</View>
							))
						)}

						{/* TOTALES */}
						<View className="p-5 bg-black border-t border-white/10">
							<View className="flex-row justify-between mb-2">
								<Text className="text-zinc-500 font-bold text-xs uppercase">Mano de Obra</Text>
								<Text className="text-zinc-300 font-mono">${totals.manoObra.toLocaleString()}</Text>
							</View>
							<View className="flex-row justify-between mb-4">
								<Text className="text-zinc-500 font-bold text-xs uppercase">Repuestos</Text>
								<Text className="text-zinc-300 font-mono">${totals.repuestos.toLocaleString()}</Text>
							</View>
							<View className="h-[1px] bg-white/10 mb-4" />
							<View className="flex-row justify-between items-center">
								<View>
									<Text className="text-emerald-500 font-black text-xs uppercase">Total Efectivo</Text>
									<Text className="text-zinc-600 text-[10px] font-bold">INCLUYE 10% OFF</Text>
								</View>
								<Text className="text-white font-black text-2xl tracking-tighter">${totals.totalEfectivo.toLocaleString()}</Text>
							</View>
						</View>
					</View>

					{/* OBSERVACIONES */}
					<View className="bg-zinc-900 p-5 rounded-3xl border border-white/5 mb-20">
						<Text className="text-zinc-400 font-bold mb-3 uppercase text-xs tracking-wider">Notas Adicionales</Text>
						<TextInput
							multiline
							value={observaciones}
							onChangeText={setObservaciones}
							className="text-white text-sm min-h-[100px] bg-black p-4 rounded-xl border border-zinc-800 leading-5"
							textAlignVertical="top"
							placeholder="Escribe aquí las observaciones que saldrán en el PDF..."
							placeholderTextColor="#333"
						/>
					</View>

				</ScrollView>

				{/* FAB ACCIÓN (FLOTANTE) */}
				<View className="absolute bottom-8 left-6 right-6">
					<TouchableOpacity
						onPress={generateAndSavePdf}
						disabled={savingPdf || items.length === 0}
						className={`py-4 rounded-2xl flex-row justify-center items-center shadow-2xl ${savingPdf ? 'bg-zinc-800' : 'bg-emerald-500'}`}
					>
						{savingPdf ? (
							<>
								<ActivityIndicator color="white" style={{ marginRight: 10 }} />
								<Text className="text-zinc-400 font-black uppercase text-xs">Procesando...</Text>
							</>
						) : (
							<>
								{Platform.OS === 'web' ? <Printer size={20} color="black" style={{ marginRight: 10 }} /> : <Save size={20} color="black" style={{ marginRight: 10 }} />}
								<Text className="text-black font-black uppercase text-sm">
									{Platform.OS === 'web' ? 'Imprimir PDF Oficial' : 'Guardar y Finalizar'}
								</Text>
							</>
						)}
					</TouchableOpacity>
				</View>

			</LinearGradient>
		</SafeAreaView>
	);
}