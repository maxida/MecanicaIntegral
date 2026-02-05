import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import generateAndSharePDF from './pdfUtils';
import generatePresupuestoHTML from '@/utils/pdfTemplates';
import { loadLogoAsBase64 } from './imageUtils';

interface Props { visible: boolean; onClose: () => void; prefill?: any }

export default function PresupuestoModal({ visible, onClose, prefill }: Props) {
  const [descripcion, setDescripcion] = useState(prefill?.descripcion || '');
  const [costoMano, setCostoMano] = useState(String(prefill?.costoMano || ''));
  const [costoRepuestos, setCostoRepuestos] = useState(String(prefill?.costoRepuestos || ''));
  const [cliente, setCliente] = useState(prefill?.cliente || '');
  const [vehiculo, setVehiculo] = useState(prefill?.vehiculo || '');
  const [busy, setBusy] = useState(false);

  const handleGenerate = async () => {
    try {
      setBusy(true);
      // Load logo as base64 (works on web & mobile)
      let logoBase64 = '';
      try {
        logoBase64 = await loadLogoAsBase64(require('../assets/images/logo-mecanica-integral.jpeg'));
      } catch (e) {
        console.warn('No se pudo cargar logo para presupuesto', e);
      }

      const data = {
        cliente,
        patente: vehiculo,
        descripcion,
        costoMano: Number(costoMano || 0),
        costoRepuestos: Number(costoRepuestos || 0),
        fecha: new Date().toLocaleDateString(),
        logo: logoBase64
      };
      const html = generatePresupuestoHTML(data);
      await generateAndSharePDF(html);
      onClose();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', 'No se pudo generar el presupuesto.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{flex:1, justifyContent:'flex-end'}}>
        <BlurView intensity={90} tint="dark" style={{position:'absolute', width:'100%', height:'100%'}} />
        <View style={{backgroundColor:'#111', borderTopLeftRadius:25, borderTopRightRadius:25, padding:20, height:'85%'}}>
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
            <Text style={{color:'#fff', fontSize:20, fontWeight:'bold'}}>Generar Presupuesto</Text>
            <TouchableOpacity onPress={onClose} style={{padding:10, backgroundColor:'#333', borderRadius:10}}>
              <Text style={{color:'#fff'}}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{color:'#888', marginBottom:5}}>Cliente</Text>
            <TextInput value={cliente} onChangeText={setCliente} placeholder="Nombre Cliente" placeholderTextColor="#555" style={{backgroundColor:'#222', color:'#fff', padding:15, borderRadius:10, marginBottom:15}} />

            <Text style={{color:'#888', marginBottom:5}}>Vehículo / Patente</Text>
            <TextInput value={vehiculo} onChangeText={setVehiculo} placeholder="Ej: AA 123 BB" placeholderTextColor="#555" style={{backgroundColor:'#222', color:'#fff', padding:15, borderRadius:10, marginBottom:15}} />

            <Text style={{color:'#888', marginBottom:5}}>Detalle de Trabajos / Repuestos</Text>
            <TextInput value={descripcion} onChangeText={setDescripcion} placeholder="Descripción..." multiline numberOfLines={6} placeholderTextColor="#555" style={{backgroundColor:'#222', color:'#fff', padding:15, borderRadius:10, marginBottom:15, height:120, textAlignVertical:'top'}} />

            <Text style={{color:'#888', marginBottom:5}}>Costo Mano de Obra ($)</Text>
            <TextInput value={costoMano} onChangeText={setCostoMano} placeholder="0" keyboardType="numeric" placeholderTextColor="#555" style={{backgroundColor:'#222', color:'#fff', padding:15, borderRadius:10, marginBottom:15}} />

            <Text style={{color:'#888', marginBottom:5}}>Costo Repuestos ($)</Text>
            <TextInput value={costoRepuestos} onChangeText={setCostoRepuestos} placeholder="0" keyboardType="numeric" placeholderTextColor="#555" style={{backgroundColor:'#222', color:'#fff', padding:15, borderRadius:10, marginBottom:25}} />

            <TouchableOpacity onPress={handleGenerate} disabled={busy} style={{backgroundColor: busy ? '#555' : '#10B981', padding:18, borderRadius:12, alignItems:'center', marginBottom:30}}>
              {busy ? <ActivityIndicator color="#fff"/> : <Text style={{color:'#fff', fontWeight:'bold', fontSize:16}}>GENERAR PDF</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
