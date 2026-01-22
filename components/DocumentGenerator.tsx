import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import generateAndSharePDF from './pdfUtils';
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

  // Estilos comunes para todas las plantillas (dark, con color exacto en impresión)
  const baseStyles = `
    * { box-sizing: border-box; }
    :root {
      --bg: #0b0b0f;
      --card: #11131a;
      --panel: #0f1117;
      --text: #e5e7eb;
      --muted: #9ca3af;
      --border: #1f2937;
      --accent: #ff4c4c;
      --accent-2: #8b5cf6;
    }
    body {
      margin: 0;
      padding: 24px;
      font-family: 'Inter', 'Helvetica', 'Arial', sans-serif;
      background: var(--bg);
      color: var(--text);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 900px;
      margin: 0 auto;
      background: var(--card);
      border-radius: 16px;
      padding: 28px;
      border: 1px solid var(--border);
      box-shadow: 0 20px 60px rgba(0,0,0,0.45);
    }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .title { font-size: 26px; font-weight: 900; letter-spacing: 0.6px; color: var(--text); }
    .logo img { width: 110px; border-radius: 10px; box-shadow: 0 10px 30px rgba(255,76,76,0.25); }
    .badge { background: var(--accent); color: #fff; padding: 6px 10px; border-radius: 10px; font-weight: 700; font-size: 11px; letter-spacing: 0.5px; }
    .meta { color: var(--muted); font-size: 12px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th { background: var(--accent); color: #fff; padding: 10px; text-align: left; font-size: 12px; letter-spacing: 0.3px; }
    td { border: 1px solid var(--border); padding: 10px; font-size: 12px; color: var(--text); background: var(--panel); }
    .section-title { margin-top: 18px; margin-bottom: 8px; font-weight: 800; font-size: 14px; letter-spacing: 0.5px; color: var(--text); }
    .text-muted { color: var(--muted); font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
    .chip { background: rgba(255,76,76,0.12); color: var(--accent); padding: 8px 10px; border-radius: 10px; font-weight: 700; font-size: 12px; border: 1px solid rgba(255,76,76,0.35); }
    .obs-line { border-bottom: 1px dashed var(--border); height: 18px; margin-top: 8px; opacity: 0.85; }
    .cost-row { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 10px 12px; background: #0c0e14; border: 1px solid var(--border); border-radius: 10px; }
    .cost-label { color: var(--muted); font-size: 12px; }
    .cost-value { color: var(--text); font-weight: 800; font-size: 14px; }
    .footer { margin-top: 26px; text-align: right; color: var(--muted); font-size: 11px; }
  `;

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
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div>
            <div class="title">${titulo}</div>
            <div class="meta">Orden de Trabajo: <span class="badge">${ordenId}</span></div>
          </div>
          <div class="logo">${base64Image ? `<img src="${base64Image}" alt="logo" />` : ''}</div>
        </div>

        <table>
          <tr>
            <td><strong>Concesionario</strong><br/><span class="text-muted">Mecánica Integral</span></td>
            <td><strong>Cliente</strong><br/><span class="text-muted">${data.cliente || ''}</span></td>
          </tr>
          <tr>
            <td><strong>Fecha Ingreso</strong><br/><span class="text-muted">${fechaIngreso}</span><br/><strong>Fecha Entrega</strong><br/><span class="text-muted">${fechaEntrega}</span></td>
            <td><strong>N.º matrícula</strong><br/><span class="text-muted">${patente}</span><br/><strong>Marca</strong><br/><span class="text-muted">${marca}</span></td>
          </tr>
          <tr>
            <td><strong>Tipo de operación</strong><br/><span class="text-muted">${tipoOperacion}</span></td>
            <td><strong>Orden de mantenimiento</strong><br/><span class="text-muted">${ordenMantenimiento}</span></td>
          </tr>
        </table>

        <div class="section-title">TRABAJOS REALIZADOS</div>
        <div class="text-muted" style="line-height:1.5">${trabajos}</div>
        ${Array.from({ length: 4 }).map(() => '<div class="obs-line"></div>').join('')}

        <div class="section-title">OBSERVACIONES</div>
        ${Array.from({ length: 6 }).map(() => '<div class="obs-line"></div>').join('')}

        <div class="cost-row" style="margin-top:20px;">
          <div class="cost-label">Costo de trabajo</div>
          <div class="cost-value">$${Number(costoTrabajo || 0).toLocaleString('es-AR')}</div>
        </div>

        <div class="footer">
          CBU: 0200302111000018656558 · ALIAS: marcote.ban.cor · CUIT: 23-39575400-9
        </div>
      </div>
    </body>
    </html>`;

    return htmlReparacion;
  }

  if (type === 'presupuesto') {
    const fechaHoy = new Date();
    const fechaHoyStr = fechaHoy.toLocaleDateString();
    const fechaValida = new Date(fechaHoy.getTime() + 15 * 24 * 60 * 60 * 1000);
    const fechaValidaStr = fechaValida.toLocaleDateString();

    const patente = data.patente || data.vehiculo || '';
    const marca = data.marca || data.vehiculo || '';
    const tipoOperacion = 'REPARACIÓN EN TALLER';
    const trabajos = data.descripcion || '';
    const montoManoObra = Number(data.montoManoObra || data.costo || 0);
    const montoRepuestos = Number(data.montoRepuestos || 0);
    const totalNumber = montoManoObra + montoRepuestos;
    const total = totalNumber.toFixed(2);

    const observationLines = Array.from({ length: 6 }).map(() => '<div style="border-bottom:1px solid #000;margin-top:8px;height:14px"></div>').join('');

    const htmlPresupuesto = `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        ${baseStyles}
        /* Presupuesto: hoja blanca y tablas con bordes negros para impresión */
        body { background: #ffffff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 6px; padding: 28px; border: 1px solid #000; box-shadow: none; }
        .header { display:flex; justify-content:space-between; align-items:center; }
        .title { font-family: Impact, Charcoal, sans-serif; font-size:34px; font-weight:900; color:#000; }
        .logo img { width:110px; height:auto; }
        .subheader { border-bottom:6px solid #000; margin-top:14px; padding:6px 0; font-weight:800; }
        table { width:100%; border-collapse:collapse; margin-top:16px; }
        th, td { border:1px solid #000; padding:10px; vertical-align:top; }
        .section-title { margin-top:18px; margin-bottom:8px; font-weight:900; font-size:14px; color:#000; }
        .obs-line { height:14px; margin-top:8px; border-bottom:1px solid #000; }
        .cost-large { margin-top:12px; font-size:18px; font-weight:900; color:#000; text-align:left; }
        .bank { text-align:right; font-size:12px; color:#000; }
        .footer { margin-top:20px; display:flex; justify-content:space-between; align-items:flex-start; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="title">PRESUPUESTO DE REPARACIÓN</div>
          <div class="logo">${base64Image ? `<img src="${base64Image}" alt="logo" />` : ''}</div>
        </div>

        <div class="subheader">ORDEN DE TRABAJO: <span style="padding-left:8px;">${ordenId}</span></div>

        <table>
          <tr>
            <td><strong>Concesionario</strong><br/>Mecánica Integral (MIT)</td>
            <td><strong>Cliente</strong><br/>${data.cliente || ''}</td>
          </tr>
          <tr>
            <td>
              <strong>Fecha cotización:</strong><br/>${fechaHoyStr}
              <br/>
              <strong>Presupuesto válido hasta:</strong><br/>${fechaValidaStr}
            </td>
            <td>
              <strong>N.º de matrícula:</strong><br/>${patente}
              <br/>
              <strong>Marca:</strong><br/>${marca}
            </td>
          </tr>
          <tr>
            <td colspan="2"><strong>Tipo operación:</strong> ${tipoOperacion}</td>
          </tr>
        </table>

        <div class="section-title">TRABAJOS A REALIZAR / REPUESTOS</div>
        <div style="line-height:1.4; color:#000;">${trabajos}</div>
        ${Array.from({ length: 4 }).map(() => '<hr style="border:none;border-top:1px solid #000;margin:8px 0;"/>').join('')}

        <div class="section-title">SECCIÓN ECONÓMICA</div>
        <div class="cost-large">COSTO MANO DE OBRA: $${montoManoObra.toLocaleString('es-AR')}</div>
        <div class="cost-large">COSTO REPUESTOS: $${montoRepuestos.toLocaleString('es-AR')}</div>
        <div class="cost-large">TOTAL: $${Number(total).toLocaleString('es-AR')} <span style="font-weight:700; font-size:12px; display:block; margin-top:6px;">(ABONANDO EN EFECTIVO 10% DESCUENTO)</span></div>

        <div class="section-title">OBSERVACIONES</div>
        ${observationLines}

        <div class="footer">
          <div></div>
          <div class="bank">
            CBU: 0200302111000018656558<br/>
            ALIAS: marcote.ban.cor<br/>
            CUIT: 23-39575400-9<br/>
            SANTIAGO RAFAEL MARCOTE
          </div>
        </div>
      </div>
    </body>
    </html>`;

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
    <style>${baseStyles}</style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <div>
          <div class="title">${titulo}</div>
          <div class="meta">Orden de Trabajo: <span class="badge">${ordenId}</span></div>
        </div>
        <div class="logo">${base64Image ? `<img src="${base64Image}" alt="logo" />` : ''}</div>
      </div>

      <table>
        <tr>
          <td><strong>Concesionario</strong><br/><span class="text-muted">Mecánica Integral</span></td>
          <td><strong>Cliente</strong><br/><span class="text-muted">${data.cliente || ''}</span></td>
        </tr>
        <tr>
          <td><strong>Fecha</strong><br/><span class="text-muted">${fecha}</span></td>
          <td><strong>N.º Matrícula</strong><br/><span class="text-muted">${patente}</span></td>
        </tr>
        <tr>
          <td><strong>Marca</strong><br/><span class="text-muted">${marca}</span></td>
          <td><strong>Ubicación</strong><br/><span class="text-muted">${ubicacion}</span></td>
        </tr>
        <tr>
          <td><strong>Hora de llegada</strong><br/><span class="text-muted">${horaLlegada}</span></td>
          <td><strong>Hora de salida</strong><br/><span class="text-muted">${horaSalida}</span></td>
        </tr>
      </table>

      <div class="section-title">TRABAJOS REALIZADOS</div>
      <div class="text-muted" style="line-height:1.5">${trabajos}</div>
      ${Array.from({ length: 4 }).map(() => '<div class="obs-line"></div>').join('')}

      <div class="section-title">OBSERVACIONES</div>
      ${observationLines}

      <div class="section-title">COSTOS</div>
      <div class="cost-row"><div class="cost-label">Trabajo</div><div class="cost-value">$${Number(costoTrabajo || 0).toLocaleString('es-AR')}</div></div>
      <div class="cost-row"><div class="cost-label">Traslado</div><div class="cost-value">$${Number(costoTraslado || 0).toLocaleString('es-AR')}</div></div>
      <div class="cost-row"><div class="cost-label">Total</div><div class="cost-value">$${Number(total).toLocaleString('es-AR')}</div></div>

      <div class="footer">Mecánica Integral Tucumán — Servicio 24/7</div>
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

      // Usar util compartido que diferencia Web vs Mobile
      await generateAndSharePDF(html);
      // Cerrar modal después de la operación (printAsync resuelve cuando termina el flujo de impresión en web)
      onClose();
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

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1 pb-20">
            <Text className="text-gray-400 text-sm mb-2">Cliente</Text>
            <TextInput value={cliente} onChangeText={setCliente} placeholder="Nombre del cliente" className="bg-card/40 rounded-md p-3 text-white mb-3" placeholderTextColor="#9ca3af" />

            <Text className="text-gray-400 text-sm mb-2">Vehículo</Text>
            <TextInput value={vehiculo} onChangeText={setVehiculo} placeholder="Marca / Modelo / Patente" className="bg-card/40 rounded-md p-3 text-white mb-3" placeholderTextColor="#9ca3af" />

            <Text className="text-gray-400 text-sm mb-2">Descripción</Text>
            <TextInput value={descripcion} onChangeText={setDescripcion} placeholder="Detalle del servicio / diagnóstico" multiline numberOfLines={4} className="bg-card/40 rounded-md p-3 text-white mb-3 h-28" placeholderTextColor="#9ca3af" />

            <Text className="text-gray-400 text-sm mb-2">Costo</Text>
            <TextInput value={costo} onChangeText={setCosto} placeholder="0.00" keyboardType="numeric" className="bg-card/40 rounded-md p-3 text-white mb-6" placeholderTextColor="#9ca3af" />
            {/* Action buttons moved inside scrollable area to avoid footer cut-off */}
            <View className="flex-row items-center justify-between mt-8">
              <TouchableOpacity onPress={onClose} className="flex-1 mr-3 bg-white/5 py-3 rounded-lg items-center">
                <Text className="text-white">Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity disabled={busy} onPress={handleGenerateAndShare} className="flex-1 ml-3 bg-primary py-3 rounded-lg items-center">
                {busy ? <ActivityIndicator color="#000" /> : <Text className="text-black font-bold">GENERAR Y COMPARTIR PDF</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
