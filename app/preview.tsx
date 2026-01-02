import React, { useEffect, useState } from 'react';
import {
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { db } from '@/firebase/firebaseConfig';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset'; 
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { InvoiceData, RootStackParamList } from '../types';

type PreviewScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'preview'>;

// Helper para formatear moneda
const formatNumber = (num: number) => {
    return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const PreviewScreen: React.FC = () => {
  const invoiceData = useSelector((state: any) => state.invoice.invoiceData) as InvoiceData | null;
  const flagConFactura = useSelector((state: any) => state.invoice.flagConFactura);
  const newIdPresupuesto = useSelector((state: any) => state.invoice.idPresupuesto);
  
  const navigation = useNavigation<PreviewScreenNavigationProp>();
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. CARGAR LOGO
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const asset = Asset.fromModule(require('../assets/images/logo-mecanica-integral.jpeg'));
        await asset.downloadAsync();
        if (asset.localUri) {
            const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            setLogoBase64(`data:image/jpeg;base64,${base64}`);
        }
      } catch (error) {
        console.error("Error cargando el logo:", error);
      }
    };
    loadLogo();
  }, []);

  if (!invoiceData) return null;

  const { subtotal, total, taxRate, discount, items } = invoiceData;

  // 2. GENERAR HTML PDF
  const generateInvoiceHTML = (): string => {
    const itemsHTML = items.map(item => `
      <tr>
        <td>${item.description}</td>
        <td style="text-align: center;">${item.units}</td>
        <td style="text-align: right;">$ ${formatNumber(item.price)}</td>
        <td style="text-align: right;">$ ${formatNumber(item.total)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 30px; color: #333; line-height: 1.4; }
          .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #D32F2F; padding-bottom: 20px; }
          .logo-box { width: 30%; }
          .logo-img { width: 100%; max-width: 120px; height: auto; border-radius: 8px; }
          .company-box { width: 65%; text-align: right; }
          h1 { font-size: 24px; color: #000; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px; }
          .subtitle { font-size: 16px; color: #D32F2F; font-weight: bold; margin-bottom: 10px; }
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 8px; }
          .col { width: 48%; }
          .label { font-size: 10px; color: #888; text-transform: uppercase; font-weight: bold; }
          .val { font-size: 12px; font-weight: bold; color: #000; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #333; color: white; padding: 10px; font-size: 11px; text-transform: uppercase; text-align: left; }
          td { border-bottom: 1px solid #eee; padding: 10px; font-size: 12px; }
          .totals-container { margin-top: 20px; display: flex; justify-content: flex-end; }
          .totals-box { width: 50%; text-align: right; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .total-label { font-size: 12px; color: #666; }
          .total-value { font-size: 14px; font-weight: bold; }
          .grand-total { font-size: 18px; color: #D32F2F; border-top: 1px solid #ddd; padding-top: 5px; margin-top: 5px; }
          .signature { margin-top: 60px; display: flex; justify-content: space-between; }
          .sig-box { width: 40%; border-top: 1px solid #ccc; text-align: center; padding-top: 10px; font-size: 12px; color: #666; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #aaa; }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="logo-box">
             ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" />` : '<b>SIN LOGO</b>'}
          </div>
          <div class="company-box">
            <h1>${invoiceData.companyName}</h1>
            <div class="subtitle">PRESUPUESTO #${newIdPresupuesto}</div>
            <div class="company-details">
                <p> ${invoiceData.companyAddress}</p>
                <p> CUIT: ${invoiceData.companyNIF}</p>
                <p>📞 ${invoiceData.companyPhone} | ✉️ ${invoiceData.companyEmail}</p>
            </div>
          </div>
        </div>
        <div class="info-grid">
          <div class="col">
            <div class="label">CLIENTE</div>
            <div class="val">${invoiceData.clientName}</div>
            <div class="label">CONTACTO</div>
            <div class="val">${invoiceData.Teléfono || '-'}</div>
            <div class="label">EMAIL</div>
            <div class="val">${invoiceData.Email || '-'}</div>
          </div>
          <div class="col" style="text-align: right;">
            <div class="label">FECHA EMISIÓN</div>
            <div class="val">${invoiceData.date}</div>
            <div class="label">VEHÍCULO</div>
            <div class="val">${invoiceData.Marca} ${invoiceData.Modelo}</div>
            <div class="label">PATENTE / DOMINIO</div>
            <div class="val">${invoiceData.Patente}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th width="50%">Descripción</th>
              <th width="15%" style="text-align: center;">Cant.</th>
              <th width="17%" style="text-align: right;">Precio</th>
              <th width="18%" style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        <div class="totals-container">
          <div class="totals-box">
            <div class="total-row">
                <span class="total-label">SUBTOTAL</span>
                <span class="total-value">$ ${formatNumber(subtotal)}</span>
            </div>
            <div class="total-row">
                <span class="total-label">DESCUENTO</span>
                <span class="total-value">- $ ${formatNumber(discount)}</span>
            </div>
            ${ flagConFactura ? `
            <div class="total-row">
                <span class="total-label">IVA (${taxRate}%)</span>
                <span class="total-value">$ ${formatNumber(total - subtotal + discount)}</span>
            </div>
            ` : '' }
            <div class="total-row grand-total">
                <span class="total-label">TOTAL</span>
                <span class="total-value">$ ${ flagConFactura ? formatNumber(total) : formatNumber(subtotal - discount)}</span>
            </div>
          </div>
        </div>
        <div class="signature">
            <div class="sig-box">Firma Responsable</div>
            <div class="sig-box">Conformidad Cliente</div>
        </div>
        <div class="footer">Documento válido como presupuesto no fiscal por 30 días.</div>
      </body>
      </html>
    `;
  };

  const guardarNuevaFacturaDB = async () => {
    try {
      const nuevaFactura = {
        idPresupuesto: newIdPresupuesto,
        numPatente: invoiceData.Patente,
        userId: invoiceData.clientName,
        fechaCreacion: serverTimestamp(),
        items, 
        total,
        estado: 'activa'
      };
      await addDoc(collection(db, flagConFactura ? 'conFactura' : 'sinFactura'), nuevaFactura);
    } catch (error) {
      console.error("Error al guardar en BD:", error);
      throw error;
    }
  }

  const generatePDF = async () => {
    if (!logoBase64) {
        Alert.alert("Cargando", "Espera un momento, cargando logo...");
        return;
    }
    setIsSaving(true);
    try {
      const html = generateInvoiceHTML();
      const { uri: tempUri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
      const newFileName = `${newIdPresupuesto}-${invoiceData.Patente}.pdf`;
      const newUri = `${FileSystem.cacheDirectory}${newFileName}`;
      await FileSystem.moveAsync({ from: tempUri, to: newUri });

      if (await Sharing.isAvailableAsync()) {
        const subscription = AppState.addEventListener('change', async (nextAppState) => {
          if (nextAppState === 'active') subscription.remove();
        });
        await guardarNuevaFacturaDB();
        await Sharing.shareAsync(newUri, {
          dialogTitle: `Presupuesto ${newIdPresupuesto}`,
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf'
        });
        navigation.reset({ index: 0, routes: [{ name: 'home' }] });
      }
    } catch (error) {
      Alert.alert("Error", "Error al generar PDF");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.gradient}>
        
        {/* HEADER */}
        <View style={styles.headerWrapper}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Vista Previa</Text>
                <View style={{width: 24}} /> 
            </View>
        </View>

        <SafeAreaView style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            
            <View style={styles.previewCard}>
                {/* 1. CABECERA Y CLIENTE */}
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.cardLabel}>PRESUPUESTO</Text>
                        <Text style={styles.cardValueBig}>#{newIdPresupuesto}</Text>
                    </View>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{flagConFactura ? 'FISCAL' : 'INTERNO'}</Text>
                    </View>
                </View>

                <View style={styles.divider} />
                <View style={styles.row}>
                    <View style={{flex: 1}}>
                        <Text style={styles.cardLabel}>CLIENTE</Text>
                        <Text style={styles.cardValue}>{invoiceData.clientName}</Text>
                    </View>
                    <View style={{flex: 1, alignItems: 'flex-end'}}>
                        <Text style={styles.cardLabel}>PATENTE</Text>
                        <Text style={styles.cardValue}>{invoiceData.Patente}</Text>
                    </View>
                </View>

                {/* --- NUEVA SECCIÓN: LISTADO DE ÍTEMS --- */}
                <View style={styles.itemsSection}>
                    <Text style={styles.itemsHeader}>DETALLE</Text>
                    
                    {/* Encabezados de tabla */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.th, {flex: 2}]}>DESCRIPCIÓN</Text>
                        <Text style={[styles.th, {flex: 0.5, textAlign: 'center'}]}>CANT.</Text>
                        <Text style={[styles.th, {flex: 1, textAlign: 'right'}]}>TOTAL</Text>
                    </View>

                    {/* Filas de items */}
                    {items.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                            <View style={{flex: 2}}>
                                <Text style={styles.itemDesc}>{item.description}</Text>
                                <Text style={styles.itemUnitPrice}>PU: $ {formatNumber(item.price)}</Text>
                            </View>
                            <Text style={styles.itemQty}>{item.units}</Text>
                            <Text style={styles.itemTotal}>$ {formatNumber(item.total)}</Text>
                        </View>
                    ))}
                </View>

                {/* 3. TOTALES */}
                <View style={styles.amountContainer}>
                    <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Subtotal</Text>
                        <Text style={styles.amountValue}>$ {formatNumber(subtotal)}</Text>
                    </View>
                    <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Descuento</Text>
                        <Text style={[styles.amountValue, {color: '#4ADE80'}]}>- $ {formatNumber(discount)}</Text>
                    </View>
                    {flagConFactura && (
                        <View style={styles.amountRow}>
                            <Text style={styles.amountLabel}>IVA ({taxRate}%)</Text>
                            <Text style={styles.amountValue}>$ {formatNumber(total - subtotal + discount)}</Text>
                        </View>
                    )}
                    <View style={styles.divider} />
                    <View style={styles.amountRow}>
                        <Text style={styles.totalLabelBig}>TOTAL FINAL</Text>
                        <Text style={styles.totalValueBig}>
                            $ {flagConFactura ? formatNumber(total) : formatNumber(subtotal - discount)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* BOTONES */}
            <View style={styles.actionContainer}>
                <TouchableOpacity 
                    style={[styles.btn, styles.btnCancel]} 
                    onPress={() => navigation.goBack()}
                    disabled={isSaving}
                >
                    <Text style={styles.btnTextCancel}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.btn, styles.btnConfirm]} 
                    onPress={generatePDF}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.btnTextConfirm}>CONFIRMAR</Text>
                            <MaterialIcons name="send" size={20} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            </View>

        </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1 },
  headerWrapper: {
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1, 
    borderBottomColor: '#333',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 0, 
  },
  header: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  scrollContainer: { padding: 20, paddingBottom: 50 },

  // CARD
  previewCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    elevation: 5,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLabel: { color: '#888', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  cardValueBig: { color: '#fff', fontSize: 22, fontWeight: 'bold', letterSpacing: 1 },
  cardValue: { color: '#fff', fontSize: 16, fontWeight: '600' },
  badge: { backgroundColor: '#FF4C4C', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },

  // ITEMS SECTION (NUEVO)
  itemsSection: {
    marginTop: 20,
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 15,
  },
  itemsHeader: {
    color: '#FF4C4C',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    letterSpacing: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    paddingBottom: 4,
  },
  th: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    alignItems: 'flex-start',
  },
  itemDesc: { color: '#fff', fontSize: 13, fontWeight: '500' },
  itemUnitPrice: { color: '#666', fontSize: 10, marginTop: 2 },
  itemQty: { color: '#ddd', fontSize: 13, textAlign: 'center', flex: 0.5, paddingTop: 2 },
  itemTotal: { color: '#fff', fontSize: 13, fontWeight: 'bold', textAlign: 'right', flex: 1, paddingTop: 2 },

  // TOTALS
  amountContainer: { marginTop: 10, backgroundColor: '#141414', padding: 15, borderRadius: 10 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  amountLabel: { color: '#ccc', fontSize: 14 },
  amountValue: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  totalLabelBig: { color: '#FF4C4C', fontSize: 16, fontWeight: 'bold' },
  totalValueBig: { color: '#FF4C4C', fontSize: 20, fontWeight: 'bold' },

  // BUTTONS
  actionContainer: { flexDirection: 'row', marginTop: 30, gap: 15 },
  btn: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnCancel: { backgroundColor: '#333', borderWidth: 1, borderColor: '#444' },
  btnConfirm: { backgroundColor: '#FF4C4C' },
  btnTextCancel: { color: '#fff', fontWeight: 'bold' },
  btnTextConfirm: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});

export default PreviewScreen;