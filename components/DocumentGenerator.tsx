import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

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

/**
 * generatePDF
 * Genera el HTML para la plantilla oficial "Asistencia en Ruta" y convierte
 * el logo local a Base64 para incrustarlo en el HTML (funciona con expo-print).
 *
 * @param type - tipo de documento (solo usado para título)
 * @param data - datos del formulario: cliente, vehiculo, descripcion, costo, patente, fecha, ubicacion, horaLlegada, horaSalida, costoTraslado
 * @returns html string
 */
export async function generatePDF(type: DocType, data: any) {
  // Cargar y convertir logo a base64
  const asset = Asset.fromModule(require('../assets/images/logo-mecanica-integral.jpeg'));
  await asset.downloadAsync();
  const localUri = asset.localUri || asset.uri;
  let base64Image = '';
  try {
    const b = await FileSystem.readAsStringAsync(localUri!, { encoding: FileSystem.EncodingType.Base64 });
    base64Image = `data:image/jpeg;base64,${b}`;
  } catch (e) {
    console.warn('No se pudo leer imagen como base64:', e);
    base64Image = '';
  }

  // Determinar título según tipo
  const titulo = type === 'reparacion' ? 'INFORME DE REPARACIÓN' : 'ASISTENCIA EN RUTA';
  const ordenId = Math.floor(100000 + Math.random() * 900000).toString();

  if (type === 'reparacion') {
    const fechaIngreso = data.fechaIngreso || data.fecha || '';
    const fechaEntrega = data.fechaEntrega || '';
    const patente = data.patente || data.vehiculo || '';
    const marca = data.marca || data.vehiculo || '';
    const tipoOperacion = data.tipoOperacion || 'REPARACIÓN EN TALLER';
    const ordenMantenimiento = data.ordenMantenimiento || '';
    const trabajos = data.descripcion || '';
    const costoTrabajo = data.costoTrabajo || data.costo || '0';

    const observationLines = Array.from({ length: 8 }).map(() => '<div style="border-bottom:1px solid #000;margin-top:8px;height:14px"></div>').join('');

    const htmlReparacion = `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body { font-family: 'Arial', 'Helvetica', sans-serif; color: #000; background: #fff; margin: 0; padding: 24px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; }
        .title { font-family: Impact, 'Arial Black', sans-serif; font-size: 28px; font-weight: 900; }
        .logo { text-align: right; }
        .logo img { width: 100px; }
        .header-sep { border-bottom: 3px solid #000; margin-top: 12px; padding-bottom: 8px; }
        .subheader { text-align: right; font-size: 12px; margin-top: 6px; }
        table.info { width: 100%; border-collapse: collapse; margin-top: 12px; }
        table.info td, table.info th { border: 1px solid #000; padding: 8px; vertical-align: top; }
        .trabajos-title { font-weight:700; margin-top:18px; }
        .trabajos { margin-top: 8px; }
        .observaciones { margin-top: 12px; }
        .costos { margin-top: 18px; font-weight:700; }
        .bank { text-align: right; margin-top: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${titulo}</div>
        <div class="logo">${base64Image ? `<img src="${base64Image}" alt="logo" />` : ''}</div>
      </div>
      <div class="header-sep">
        <div class="subheader">ORDEN DE TRABAJO:${ordenId}</div>
      </div>

      <table class="info">
        <tr>
          <td style="width:50%"><strong>Concesionario:</strong><br/>MECÁNICA INTEGRAL</td>
          <td style="width:50%"><strong>Nombre del cliente:</strong><br/>${data.cliente || ''}</td>
        </tr>
        <tr>
          <td style="width:50%"><strong>Fecha Ingreso:</strong><br/>${fechaIngreso}<br/><strong>Fecha Entrega:</strong><br/>${fechaEntrega}</td>
          <td style="width:50%"><strong>N.º de matrícula:</strong><br/>${patente}<br/><strong>Marca:</strong><br/>${marca}</td>
        </tr>
        <tr>
          <td style="width:50%"><strong>Tipo de operación:</strong><br/>${tipoOperacion}</td>
          <td style="width:50%"><strong>ORDEN DE MANTENIMIENTO:</strong><br/>${ordenMantenimiento}</td>
        </tr>
      </table>

      <div class="trabajos-title">TRABAJOS REALIZADOS:</div>
      <div class="trabajos">${trabajos}</div>
      ${observationLines}

      <div class="observaciones">
        <div style="font-weight:700;margin-top:12px;">OBSERVACIONES:</div>
        ${Array.from({ length: 8 }).map(() => '<div style="border-bottom:1px solid #000;margin-top:8px;height:14px"></div>').join('')}
      </div>

      <div class="costos">COSTO DE TRABAJO: $${Number(costoTrabajo || 0).toLocaleString('en-US')}</div>

      <div class="bank">
        <div>Datos bancarios: CBU: 0200302111000018656558</div>
        <div>ALIAS: marcote.ban.cor</div>
        <div>CUIT: 23-39575400-9</div>
        <div>SANTIAGO RAFAEL MARCOTE</div>
      </div>

    </body>
    </html>
    `;

    return htmlReparacion;
  }

  if (type === 'presupuesto') {
    const fechaHoy = new Date();
    const fechaHoyStr = fechaHoy.toLocaleDateString();
    const fechaValida = new Date(fechaHoy.getTime() + 10 * 24 * 60 * 60 * 1000);
    const fechaValidaStr = fechaValida.toLocaleDateString();

    const patente = data.patente || data.vehiculo || '';
    const marca = data.marca || data.vehiculo || '';
    const tipoOperacion = data.tipoOperacion || 'REPARACIÓN EN TALLER';
    const ordenMantenimiento = data.ordenMantenimiento || '';
    const trabajos = data.descripcion || '';
    const montoManoObra = Number(data.montoManoObra || data.costo || 0);
    const montoRepuestos = Number(data.montoRepuestos || 0);
    const total = (montoManoObra + montoRepuestos).toFixed(2);

    const observationLines = Array.from({ length: 6 }).map(() => '<div style="border-bottom:1px solid #000;margin-top:8px;height:14px"></div>').join('');

    const htmlPresupuesto = `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body { font-family: 'Arial', 'Helvetica', sans-serif; color: #000; background: #fff; margin: 0; padding: 24px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; }
        .title { font-family: Impact, 'Arial Black', sans-serif; font-size: 30px; font-weight: 900; }
        .logo { text-align: right; }
        .logo img { width: 100px; }
        .header-sep { border-bottom: 3px solid #000; margin-top: 12px; padding-bottom: 8px; }
        .subheader { text-align: right; font-size: 12px; margin-top: 6px; }
        table.info { width: 100%; border-collapse: collapse; margin-top: 12px; }
        table.info td, table.info th { border: 1px solid #000; padding: 8px; vertical-align: top; }
        .trabajos-title { font-weight:700; margin-top:18px; }
        .trabajos { margin-top: 8px; }
        .costos { margin-top: 18px; font-weight:700; }
        .observaciones { margin-top: 12px; }
        .bank { text-align: right; margin-top: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">PRESUPUESTO DE REPARACIÓN</div>
        <div class="logo">${base64Image ? `<img src="${base64Image}" alt="logo" />` : ''}</div>
      </div>
      <div class="header-sep">
        <div class="subheader">ORDEN DE TRABAJO: ${ordenId}</div>
      </div>

      <table class="info">
        <tr>
          <td style="width:50%"><strong>Concesionario:</strong><br/>MECÁNICA INTEGRAL</td>
          <td style="width:50%"><strong>Nombre del cliente:</strong><br/>${data.cliente || ''}</td>
        </tr>
        <tr>
          <td style="width:50%"><strong>Fecha cotización:</strong><br/>${fechaHoyStr}<br/><strong>Presupuesto válido hasta:</strong><br/>${fechaValidaStr}</td>
          <td style="width:50%"><strong>N.º de matrícula:</strong><br/>${patente}<br/><strong>Marca:</strong><br/>${marca}</td>
        </tr>
        <tr>
          <td style="width:50%"><strong>Tipo de operación:</strong><br/>${tipoOperacion}</td>
          <td style="width:50%"><strong>ORDEN DE MANTENIMIENTO:</strong><br/>${ordenMantenimiento}</td>
        </tr>
      </table>

      <div class="trabajos-title">TRABAJOS A REALIZAR:</div>
      <div class="trabajos">${trabajos}</div>
      ${Array.from({ length: 6 }).map(() => '<div style="border-bottom:1px solid #000;margin-top:8px;height:14px"></div>').join('')}

      <div class="costos">
        <div>COSTO DE TRABAJO: $${montoManoObra.toLocaleString('en-US')}</div>
        <div>COSTO REPUESTOS: $${montoRepuestos.toLocaleString('en-US')}</div>
        <div>COSTO TOTAL: $${Number(total).toLocaleString('en-US')} (ABONANDO EN EFECTIVO 10% DESCUENTO)</div>
      </div>

      <div class="observaciones">
        <div style="font-weight:700;margin-top:12px;">OBSERVACIONES:</div>
        ${observationLines}
      </div>

      <div class="bank">
        <div>Datos bancarios: CBU: 0200302111000018656558</div>
        <div>ALIAS: marcote.ban.cor</div>
        <div>CUIT: 23-39575400-9</div>
        <div>SANTIAGO RAFAEL MARCOTE</div>
      </div>

    </body>
    </html>
    `;

    return htmlPresupuesto;
  }

  // Default: asistencia (existing template)
  const fecha = data.fecha || new Date().toLocaleDateString();
  const patente = data.patente || data.vehiculo || '';
  const marca = data.marca || data.vehiculo || '';
  const ubicacion = data.ubicacion || '';
  const horaLlegada = data.horaLlegada || '';
  const horaSalida = data.horaSalida || '';
  const trabajos = data.descripcion || '';
  const costoTrabajo = data.costoTrabajo || data.costo || '0';
  const costoTraslado = data.costoTraslado || '0';
  const total = (Number(costoTrabajo || 0) + Number(costoTraslado || 0)).toFixed(2);

  // Generar líneas de observaciones (5 líneas)
  const observationLines = Array.from({ length: 6 }).map(() => '<div style="border-bottom:1px solid #000;margin-top:8px;height:18px"></div>').join('');

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: 'Arial', 'Helvetica', sans-serif; color: #000; background: #fff; margin: 0; padding: 24px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; }
      .title { font-family: Impact, 'Arial Black', sans-serif; font-size: 28px; font-weight: 900; }
      .logo { text-align: right; }
      .logo img { width: 100px; }
      .header-sep { border-bottom: 3px solid #000; margin-top: 12px; padding-bottom: 8px; }
      .subheader { text-align: right; font-size: 12px; margin-top: 6px; }
      table.info { width: 100%; border-collapse: collapse; margin-top: 12px; }
      table.info td, table.info th { border: 1px solid #000; padding: 6px; vertical-align: top; }
      .centered-title { text-align: left; font-weight: 700; margin-top: 18px; margin-bottom: 6px; }
      .trabajos { margin-top: 8px; }
      .observaciones { margin-top: 12px; }
      .costos { margin-top: 18px; font-weight:700; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">${titulo}</div>
      <div class="logo">${base64Image ? `<img src="${base64Image}" alt="logo" />` : ''}</div>
    </div>
    <div class="header-sep">
      <div class="subheader">ORDEN DE TRABAJO: ${ordenId}</div>
    </div>

    <table class="info">
      <tr>
        <td style="width:50%"><strong>Concesionario:</strong><br/>MECÁNICA INTEGRAL</td>
        <td style="width:50%"><strong>Nombre del cliente:</strong><br/>${data.cliente || ''}</td>
      </tr>
      <tr>
        <td style="width:33%"><strong>Fecha:</strong><br/>${fecha}</td>
        <td style="width:33%"><strong>N.º de matrícula:</strong><br/>${patente}</td>
        <td style="width:34%"><strong>Marca:</strong><br/>${marca}</td>
      </tr>
      <tr>
        <td style="width:33%"><strong>Lugar:</strong><br/>${ubicacion}</td>
        <td style="width:33%"><strong>Hora de Llegada:</strong><br/>${horaLlegada}</td>
        <td style="width:34%"><strong>Hora de salida:</strong><br/>${horaSalida}</td>
      </tr>
    </table>

    <div class="centered-title">TRABAJOS REALIZADOS</div>
    <div class="trabajos">${trabajos}</div>

    <div class="observaciones">
      <div style="font-weight:700;margin-top:12px;">OBSERVACIONES:</div>
      ${observationLines}
    </div>

    <div class="costos">
      <div>COSTO DE TRABAJO: $${Number(costoTrabajo || 0).toLocaleString('en-US')}</div>
      <div>COSTO DE TRASLADO: $${Number(costoTraslado || 0).toLocaleString('en-US')}</div>
      <div>COSTO TOTAL: $${Number(total).toLocaleString('en-US')}</div>
    </div>

  </body>
  </html>
  `;

  return html;
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

      const formData = { cliente, vehiculo, descripcion, costo, fecha: new Date().toLocaleDateString() };
      // Usar la nueva función generatePDF que convierte logo a base64
      const html = await generatePDF(docType, formData as any);

      const { uri } = await Print.printToFileAsync({ html });
      if (!uri) throw new Error('No se generó el PDF');

      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message || 'Ocurrió un error generando el documento');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View className="flex-1 justify-end">
        <BlurView intensity={80} tint="dark" className="absolute inset-0" />
        <View className="bg-surface rounded-t-3xl p-6 h-[85%]">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-lg font-bold">{prettyTitle(docType)}</Text>
            <TouchableOpacity onPress={onClose} className="px-3 py-1 rounded bg-white/5">
              <Text className="text-white">Cerrar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            <Text className="text-gray-400 text-sm mb-2">Cliente</Text>
            <TextInput value={cliente} onChangeText={setCliente} placeholder="Nombre del cliente" className="bg-card/40 rounded-md p-3 text-white mb-3" placeholderTextColor="#9ca3af" />

            <Text className="text-gray-400 text-sm mb-2">Vehículo</Text>
            <TextInput value={vehiculo} onChangeText={setVehiculo} placeholder="Marca / Modelo / Patente" className="bg-card/40 rounded-md p-3 text-white mb-3" placeholderTextColor="#9ca3af" />

            <Text className="text-gray-400 text-sm mb-2">Descripción</Text>
            <TextInput value={descripcion} onChangeText={setDescripcion} placeholder="Detalle del servicio / diagnóstico" multiline numberOfLines={4} className="bg-card/40 rounded-md p-3 text-white mb-3 h-28" placeholderTextColor="#9ca3af" />

            <Text className="text-gray-400 text-sm mb-2">Costo</Text>
            <TextInput value={costo} onChangeText={setCosto} placeholder="0.00" keyboardType="numeric" className="bg-card/40 rounded-md p-3 text-white mb-6" placeholderTextColor="#9ca3af" />
          </ScrollView>

          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose} className="flex-1 mr-3 bg-white/5 py-3 rounded-lg items-center">
              <Text className="text-white">Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity disabled={busy} onPress={handleGenerateAndShare} className="flex-1 ml-3 bg-primary py-3 rounded-lg items-center">
              {busy ? <ActivityIndicator color="#000" /> : <Text className="text-black font-bold">GENERAR Y COMPARTIR PDF</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
