import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import generateAndSharePDF from './pdfUtils';
import { loadLogoAsBase64 } from './imageUtils'; // Asegúrate de tener este archivo creado como te dije antes

type DocType = 'asistencia' | 'reparacion' | 'presupuesto';

interface Props {
  visible: boolean;
  onClose: () => void;
  docType: DocType;
}

const prettyTitle = (t: DocType) => {
  if (t === 'asistencia') return 'Asistencia en Ruta';
  if (t === 'reparacion') return 'Informe de Reparación';
  return 'Presupuesto';
};

export async function generatePDF(type: DocType, data: any) {
  // 1. Cargar Logo (Blindado para Web y Móvil)
  // Usamos un try/catch silencioso para que si falla el logo, al menos genere el PDF
  let base64Image = '';
  try {
    base64Image = await loadLogoAsBase64(require('../assets/images/logo-mecanica-integral.jpeg'));
  } catch (e) {
    console.warn("No se pudo cargar el logo, se generará sin imagen", e);
  }

  const titulo = type === 'reparacion' ? 'INFORME DE REPARACIÓN' : (type === 'presupuesto' ? 'PRESUPUESTO' : 'ASISTENCIA EN RUTA');
  const ordenId = Math.floor(100000 + Math.random() * 900000).toString();
  const fechaHoy = new Date().toLocaleDateString();

  // 2. CSS Anti-fallo (Web + Print)
  const cssStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
    
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 0; background-color: #555; font-family: 'Roboto', sans-serif; }
    
    @page { size: A4; margin: 0; }
    
    .page-container {
      width: 210mm; min-height: 297mm; 
      margin: 20px auto; background-color: white !important; 
      padding: 15mm; position: relative;
      border: 1px solid #ccc; /* Solo visible en pantalla */
    }
    
    @media print {
      body { background-color: white; }
      .page-container { margin: 0; border: none; width: 100%; min-height: 100vh; }
    }
    /* HEADER & LOGO */
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 4px solid #000; padding-bottom: 5px; }
    .main-title { font-size: 32px; font-weight: 900; color: #000; text-transform: uppercase; font-family: Impact, sans-serif; letter-spacing: 1px; line-height: 1; }
    .logo-img { width: 120px; height: auto; object-fit: contain; }
    .order-badge { text-align: right; font-weight: bold; font-size: 14px; margin-top: 5px; }
    /* TABLAS TIPO EXCEL (Bordes Negros Finos) */
    table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 12px; }
    th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
    th { background-color: #f0f0f0 !important; color: #D32F2F !important; font-weight: 900; text-transform: uppercase; font-size: 10px; }
    td { color: #000; background-color: #fff !important; height: 35px; }
    /* SECCIONES */ .section-header { margin-top: 20px; margin-bottom: 5px; font-size: 14px; font-weight: 900; text-transform: uppercase; color: #000; }

    /* RENGLONES PARA ESCRIBIR */ .ruled-line { border-bottom: 1px solid #000; height: 22px; width: 100%; margin-bottom: 2px; } .text-content { font-size: 12px; margin-bottom: 5px; line-height: 1.5; min-height: 50px; }

    /* TOTALES */
    .totals-section { margin-top: 15px; border-top: 2px solid #000; padding-top: 5px; }
    .total-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; }
    .total-final { font-size: 18px; font-weight: 900; color: #D32F2F; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
    .footer { margin-top: 40px; text-align: right; font-size: 10px; color: #000; line-height: 1.4; }
  `;

  // 3. ESTRUCTURA HTML
  const cliente = data.cliente || 'Consumidor Final';
  const patente = data.patente || data.vehiculo || 'S/D';
  const marca = data.marca || '';
  const ubicacionOperacion = type === 'asistencia'
    ? (data.ubicacion || 'En Ruta')
    : (data.tipoOperacion || 'REPARACIÓN EN TALLER');
  const horariosOrden = type === 'asistencia'
    ? `Llegada: ${data.horaLlegada || '--:--'} | Salida: ${data.horaSalida || '--:--'}`
    : `Orden: ${ordenId}`;
  const costoTrabajo = Number(data.costo || data.costoTrabajo || 0);
  const costoTraslado = Number(data.costoTraslado || 0);
  const costoRepuestos = Number(data.costoRepuestos || data.montoRepuestos || 0);
  const totalFinal = type === 'presupuesto'
    ? costoTrabajo + costoRepuestos
    : type === 'asistencia'
      ? costoTrabajo + costoTraslado
      : costoTrabajo;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${titulo} - ${ordenId}</title>
        <style>${cssStyles}</style>
      </head>
      <body>
        <div class="page-container">
          <div class="header-top">
            <div>
              <div class="main-title">${titulo}</div>
            </div>
            <div>
              ${base64Image ? `<img src="${base64Image}" class="logo-img" />` : ''}
              <div class="order-badge">ORDEN DE TRABAJO: ${ordenId}</div>
            </div>
          </div>

          <table>
            <tr>
              <td><strong>Concesionario:</strong><br/>MECÁNICA INTEGRAL</td>
              <td><strong>Nombre del cliente:</strong><br/>${cliente}</td>
            </tr>
            <tr>
              <td><strong>Fecha:</strong> ${data.fecha || fechaHoy}</td>
              <td><strong>Vehículo:</strong> ${patente} ${marca ? `- ${marca}` : ''}</td>
            </tr>
            <tr>
              <td><strong>${type === 'asistencia' ? 'Ubicación' : 'Tipo de operación'}:</strong> ${ubicacionOperacion}</td>
              <td><strong>${type === 'asistencia' ? 'Horarios' : 'Orden'}:</strong> ${horariosOrden}</td>
            </tr>
          </table>

          <div class="section-header">TRABAJOS REALIZADOS</div>
          <div class="text-content">${data.descripcion || 'Sin descripción detallada.'}</div>

          <div class="section-header">OBSERVACIONES</div>
          ${Array.from({ length: 8 }).map(() => '<div class="ruled-line"></div>').join('')}

          <div class="totals-section">
            <div class="total-row"><span>COSTO DE TRABAJO:</span><span>$ ${costoTrabajo.toLocaleString('es-AR')}</span></div>
            ${type === 'presupuesto' ? `<div class="total-row"><span>COSTO REPUESTOS:</span><span>$ ${costoRepuestos.toLocaleString('es-AR')}</span></div>` : ''}
            ${type === 'asistencia' ? `<div class="total-row"><span>COSTO DE TRASLADO:</span><span>$ ${costoTraslado.toLocaleString('es-AR')}</span></div>` : ''}
            <div class="total-row total-final"><span>TOTAL FINAL:</span><span>$ ${totalFinal.toLocaleString('es-AR')}</span></div>
            ${type === 'presupuesto' ? `<div class="text-content" style="margin-top:4px;">(ABONANDO EN EFECTIVO 10% DESCUENTO)</div>` : ''}
          </div>

          <div class="footer">
            Datos bancarios: CBU: 0200302111000018656558<br/>
            ALIAS: marcote.ban.cor<br/>
            CUIT: 23-39575400-9<br/>
            SANTIAGO RAFAEL MARCOTE
          </div>
        </div>
      </body>
    </html>
  `;

  return htmlContent;
}

export default function DocumentGenerator({ visible, onClose, docType }: Props) {
  const [cliente, setCliente] = useState('');
  const [vehiculo, setVehiculo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [costo, setCosto] = useState('');
  const [busy, setBusy] = useState(false);

  const handleGenerateAndShare = async () => {
    try {
      setBusy(true);
      const formData = { 
        cliente, 
        vehiculo, 
        descripcion, 
        costo, 
        fecha: new Date().toLocaleDateString() 
      };
      
      const html = await generatePDF(docType, formData);
      await generateAndSharePDF(html);
      onClose();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', 'No se pudo generar el documento. ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={{flex:1, justifyContent:'flex-end'}}>
        <BlurView intensity={90} tint="dark" style={{position:'absolute', width:'100%', height:'100%'}} />
        <View style={{backgroundColor:'#111', borderTopLeftRadius:25, borderTopRightRadius:25, padding:20, height:'85%'}}>
          
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
            <Text style={{color:'#fff', fontSize:20, fontWeight:'bold'}}>{prettyTitle(docType)}</Text>
            <TouchableOpacity onPress={onClose} style={{padding:10, backgroundColor:'#333', borderRadius:10}}>
              <Text style={{color:'#fff'}}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{color:'#888', marginBottom:5}}>Cliente</Text>
            <TextInput value={cliente} onChangeText={setCliente} placeholder="Nombre Cliente" placeholderTextColor="#555" style={{backgroundColor:'#222', color:'#fff', padding:15, borderRadius:10, marginBottom:15}} />

            <Text style={{color:'#888', marginBottom:5}}>Vehículo / Patente</Text>
            <TextInput value={vehiculo} onChangeText={setVehiculo} placeholder="Ej: AA 123 BB" placeholderTextColor="#555" style={{backgroundColor:'#222', color:'#fff', padding:15, borderRadius:10, marginBottom:15}} />

            <Text style={{color:'#888', marginBottom:5}}>Detalle del Trabajo</Text>
            <TextInput value={descripcion} onChangeText={setDescripcion} placeholder="Descripción..." multiline numberOfLines={4} placeholderTextColor="#555" style={{backgroundColor:'#222', color:'#fff', padding:15, borderRadius:10, marginBottom:15, height:100, textAlignVertical:'top'}} />

            <Text style={{color:'#888', marginBottom:5}}>Costo ($)</Text>
            <TextInput value={costo} onChangeText={setCosto} placeholder="0.00" keyboardType="numeric" placeholderTextColor="#555" style={{backgroundColor:'#222', color:'#fff', padding:15, borderRadius:10, marginBottom:25}} />

            <TouchableOpacity 
              onPress={handleGenerateAndShare} 
              disabled={busy}
              style={{backgroundColor: busy ? '#555' : '#ff4c4c', padding:18, borderRadius:12, alignItems:'center', marginBottom:30}}
            >
              {busy ? <ActivityIndicator color="#fff"/> : <Text style={{color:'#fff', fontWeight:'bold', fontSize:16}}>GENERAR PDF</Text>}
            </TouchableOpacity>
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}