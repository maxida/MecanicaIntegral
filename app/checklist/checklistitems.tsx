import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { 
    ScrollView, 
    StyleSheet, 
    Text, 
    TouchableOpacity, 
    View, 
    Alert, 
    ActivityIndicator,
    Platform,
    StatusBar 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// --- 1. BASE DE DATOS MAESTRA DE ÍTEMS ---
// Centralizamos todo aquí para no tener switchs gigantes
const CHECKLIST_DATA: { [key: number]: { title: string, desc: string } } = {
  // PÁGINA 1: Prueba de conducción
  1: { title: "Volante", desc: "Compruebe la posición de marcha en línea recta y el ajuste del volante." },
  2: { title: "Embrague y caja", desc: "Realizar una comprobación del funcionamiento." },
  3: { title: "Frenos", desc: "Realizar una comprobación del funcionamiento." },
  4: { title: "Ruido", desc: "Escuche el ruido procedente del vehículo." },
  5: { title: "Sist. Combustible (Gas)", desc: "Compruebe que no haya fugas de gas antes de trabajar." },
  6: { title: "Sist. Combustible (Fugas)", desc: "Compruebe fugas de combustible antes de entrar al taller." },
  7: { title: "Start/Stop Auto", desc: "Asegúrese que la función esté desactivada." },
  8: { title: "Híbridos (Inicio)", desc: "Realizar proc. de seguridad para híbridos antes de comenzar." },

  // PÁGINA 2: Cabina y Exterior
  9: { title: "Frenos de disco", desc: "Compruebe el grosor de los forros de freno." },
  10: { title: "Parabrisas/Limpias", desc: "Comprobar parabrisas, limpias y función de lavado." },
  11: { title: "Retrovisores", desc: "Compruebe daños, ajuste y calefacción." },
  12: { title: "Interior Cabina", desc: "Compruebe el estado del interior de la cabina." },
  13: { title: "Iluminación ext.", desc: "Compruebe daños y funcionamiento." },
  14: { title: "Ruedas", desc: "Comprobar llantas, neumáticos y patrones de desgaste." },
  15: { title: "Carrocería", desc: "Comprobar si hay daños." },
  16: { title: "Cabina (Ext)", desc: "Compruebe si hay daños externos." },
  17: { title: "Motor", desc: "Comprobar nivel de aceite y si hay fugas." },

  // PÁGINA 3: Basculamiento
  18: { title: "Sist. Basculamiento", desc: "Prueba de func. y fugas en bomba/cilindro." },
  19: { title: "Fugas Fluidos", desc: "Aceite, refrigerante, combustible, aire o gases." },
  20: { title: "Sist. Refrigeración", desc: "Correas, tensor y poleas locas." },
  21: { title: "Techo Cabina", desc: "Daños en techo y equipo de techo." },
  22: { title: "Insonorización", desc: "Estado de pantallas insonorizantes. Componentes faltantes." },
  23: { title: "Frenos tambor", desc: "Compruebe el grosor de los forros." },
  24: { title: "Tubos de freno", desc: "Compruebe los latiguillos de freno." },

  // PÁGINA 4: Mecánica y Bajada
  25: { title: "Calderines aire", desc: "Vaciar agua. Comprobar corrosión o daños." },
  26: { title: "Sistema escape", desc: "Compruebe daños y holgura." },
  27: { title: "Suspensión", desc: "Compruebe daños y fugas." },
  28: { title: "Diferencial Del.", desc: "Comprobar si hay fugas." },
  29: { title: "Caja de cambios", desc: "Comprobar si hay fugas." },
  30: { title: "Caja de reenvío", desc: "Comprobar si hay fugas." },
  31: { title: "Ralentizador", desc: "Comprobar si hay fugas." },
  32: { title: "Árboles transm.", desc: "Compruebe daños y holgura." },
  33: { title: "Diferencial Tras.", desc: "Comprobar si hay fugas." },
  34: { title: "Bogle doble eje", desc: "Comprobar si hay daños." },
  35: { title: "Bastidor chasis", desc: "Compruebe daños y holgura." },
  36: { title: "Cables/Conductos", desc: "Compruebe daños y holgura." },
  37: { title: "Híbridos (Final)", desc: "Proc. de seguridad antes de trabajar (Bajada de cabina)." },
};

// --- Interfaces ---
interface FormData {
  [key: string]: { [key: number]: boolean };
}
interface CheckItemProps {
  number: number;
  title: string;
  description: string;
  checked?: boolean;
  onChange: () => void;
}

const VehicleCheckScreen = () => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [formData, setFormData] = useState<FormData>({});
  const [isGenerating, setIsGenerating] = useState(false);
  
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const vehicleData = route.params?.vehicleData || {};

  // Helpers optimizados usando el objeto maestro
  const getTitle = (num: number) => CHECKLIST_DATA[num]?.title || `Ítem ${num}`;
  const getDesc = (num: number) => CHECKLIST_DATA[num]?.desc || "Verificar estado.";

  const handleCheckboxChange = (section: string, item: number) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [item]: !prev[section]?.[item]
      }
    }));
  };

  // --- GENERACIÓN PDF ---
  const generateAndSharePDF = async () => {
    setIsGenerating(true);
    try {
      let itemsListHtml = '';

      const addRowIfChecked = (section: string, id: number) => {
        if (formData[section]?.[id]) {
          itemsListHtml += `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">${id}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                <strong>${getTitle(id)}</strong><br>
                <small style="color: #666;">${getDesc(id)}</small>
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #D32F2F; text-align: center; font-weight: bold;">
                ✘ DAÑO
              </td>
            </tr>
          `;
        }
      };

      // Iteramos rangos según páginas
      for (let i = 1; i <= 8; i++) addRowIfChecked('conduccion', i);
      for (let i = 9; i <= 17; i++) addRowIfChecked('cabina', i);
      for (let i = 18; i <= 24; i++) addRowIfChecked('basculada', i);
      for (let i = 25; i <= 37; i++) addRowIfChecked('mecanicos', i);

      if (itemsListHtml === '') {
        itemsListHtml = `<tr><td colspan="3" style="padding: 20px; text-align: center; color: #4CAF50;">✓ Vehículo ingresa sin daños reportados en el checklist.</td></tr>`;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #D32F2F; padding-bottom: 15px; }
            .brand { font-size: 28px; font-weight: 900; color: #000; letter-spacing: -1px; }
            .subtitle { font-size: 14px; color: #666; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px;}
            
            .info-box { background: #f4f4f4; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; flex-wrap: wrap; }
            .info-item { width: 50%; margin-bottom: 10px; box-sizing: border-box; padding-right: 10px; }
            .label { font-size: 10px; color: #888; text-transform: uppercase; font-weight: bold; }
            .val { font-size: 14px; font-weight: bold; color: #000; }

            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { text-align: left; background: #333; color: white; padding: 10px; }
            
            .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">CHECKLIST DE INGRESO</div>
            <div class="subtitle">${vehicleData.concesionario || 'TALLER MECÁNICO'}</div>
          </div>

          <div class="info-box">
            <div class="info-item"><div class="label">Cliente</div><div class="val">${vehicleData.cliente}</div></div>
            <div class="info-item"><div class="label">Matrícula</div><div class="val">${vehicleData.matricula}</div></div>
            <div class="info-item"><div class="label">Fecha</div><div class="val">${vehicleData.fecha}</div></div>
            <div class="info-item"><div class="label">Orden Nº</div><div class="val">${vehicleData.orden || '-'}</div></div>
            <div class="info-item"><div class="label">Modelo</div><div class="val">${vehicleData.motor || '-'}</div></div>
            <div class="info-item"><div class="label">Técnico</div><div class="val">${vehicleData.tecnico || '-'}</div></div>
            <div class="info-item" style="width: 100%; margin-top: 5px;"><div class="label">Nota Gral</div><div class="val">${vehicleData.nota ? 'CON OBSERVACIONES' : 'SIN OBSERVACIONES'}</div></div>
          </div>

          <h3>Detalle de Inspección</h3>
          <table>
            <thead>
              <tr><th width="10%">ID</th><th width="70%">Descripción</th><th width="20%">Estado</th></tr>
            </thead>
            <tbody>
              ${itemsListHtml}
            </tbody>
          </table>

          <div class="footer">
            Documento generado digitalmente • Mecánica Integral App
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

    } catch (error) {
      Alert.alert("Error", "No se pudo generar el PDF");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => currentPage < 4 && setCurrentPage(p => p + 1);
  const handlePrevious = () => currentPage > 1 && setCurrentPage(p => p - 1);

  // --- RENDERIZADO DE PÁGINAS ---
  const renderPage = (start: number, end: number, sectionKey: string, title: string) => (
    <View style={styles.pageContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {Array.from({ length: end - start + 1 }, (_, i) => start + i).map(num => (
        <CheckItem 
          key={num} 
          number={num} 
          title={getTitle(num)} 
          description={getDesc(num)}
          checked={formData[sectionKey]?.[num]} 
          onChange={() => handleCheckboxChange(sectionKey, num)} 
        />
      ))}
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <LinearGradient colors={['#000000', '#121212']} style={styles.gradient}>
        
        {/* HEADER CON SAFE AREA CORREGIDA */}
        <View style={styles.headerWrapper}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Inspección {currentPage}/4</Text>
                    <Text style={styles.headerSubtitle}>{vehicleData.matricula || 'Sin Patente'}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <MaterialIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {currentPage === 1 && renderPage(1, 8, 'conduccion', '1. Prueba de Conducción')}
          {currentPage === 2 && renderPage(9, 17, 'cabina', '2. Cabina y Exterior')}
          {currentPage === 3 && renderPage(18, 24, 'basculada', '3. Basculamiento')}
          {currentPage === 4 && renderPage(25, 37, 'mecanicos', '4. Mecánica y Chasis')}
        </ScrollView>

        {/* FOOTER BAR ELEVADO */}
        <View style={styles.footerBar}>
          <TouchableOpacity 
            style={[styles.navButton, styles.secondaryBtn, currentPage === 1 && styles.disabledBtn]}
            onPress={handlePrevious}
            disabled={currentPage === 1}
          >
            <MaterialIcons name="chevron-left" size={32} color={currentPage === 1 ? "#333" : "#fff"} />
          </TouchableOpacity>

          <View style={styles.pageIndicator}>
            {[1, 2, 3, 4].map(p => (
                <View key={p} style={[styles.dot, currentPage === p && styles.activeDot]} />
            ))}
          </View>

          {currentPage < 4 ? (
            <TouchableOpacity style={[styles.navButton, styles.primaryBtn]} onPress={handleNext}>
                <MaterialIcons name="chevron-right" size={32} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
                style={[styles.navButton, styles.successBtn]} 
                onPress={generateAndSharePDF}
                disabled={isGenerating}
            >
                {isGenerating ? <ActivityIndicator color="#fff" /> : <MaterialIcons name="print" size={28} color="#fff" />}
            </TouchableOpacity>
          )}
        </View>

      </LinearGradient>
    </View>
  );
};

// --- COMPONENTE ITEM ---
const CheckItem: React.FC<CheckItemProps> = ({ number, title, description, checked = false, onChange }) => (
  <TouchableOpacity style={[styles.itemContainer, checked && styles.itemActive]} onPress={onChange} activeOpacity={0.7}>
    <View style={styles.checkCol}>
        <View style={[styles.checkbox, checked && styles.checkedBox]}>
            {checked && <MaterialIcons name="check" size={18} color="#fff" />}
        </View>
    </View>
    <View style={styles.textCol}>
        <Text style={[styles.itemNumber, checked && {color: '#FF4C4C'}]}>#{number} - {title}</Text>
        <Text style={styles.itemDesc}>{description}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1 },
  
  // HEADER
  headerWrapper: {
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1, 
    borderBottomColor: '#333',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 0, 
  },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#FF4C4C', fontSize: 14 },
  closeBtn: { padding: 5 },

  // SCROLL
  scrollContainer: { padding: 16, paddingBottom: 120 }, 
  pageContainer: { marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#FF4C4C', paddingLeft: 12, marginTop: 10 },
  
  // ITEMS
  itemContainer: { flexDirection: 'row', backgroundColor: '#141414', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#2A2A2A' },
  itemActive: { borderColor: '#FF4C4C', backgroundColor: '#1E1010' },
  checkCol: { marginRight: 15, justifyContent: 'center' },
  textCol: { flex: 1 },
  checkbox: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: '#555', alignItems: 'center', justifyContent: 'center' },
  checkedBox: { backgroundColor: '#FF4C4C', borderColor: '#FF4C4C' },
  itemNumber: { color: '#ddd', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  itemDesc: { color: '#888', fontSize: 13, lineHeight: 18 },

  // FOOTER
  footerBar: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    height: Platform.OS === 'ios' ? 100 : 120, 
    paddingBottom: Platform.OS === 'ios' ? 20 : 40,
    backgroundColor: '#1E1E1E', 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30, 
    borderTopWidth: 1, borderTopColor: '#333', elevation: 20
  },
  navButton: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: '#333', borderWidth: 1, borderColor: '#555' },
  secondaryBtn: { backgroundColor: 'transparent' },
  successBtn: { backgroundColor: '#FF4C4C', width: 64, height: 64, borderRadius: 32, elevation: 8, shadowColor: '#FF4C4C', shadowOpacity: 0.4 },
  disabledBtn: { opacity: 0.2 },
  pageIndicator: { flexDirection: 'row', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
  activeDot: { backgroundColor: '#FF4C4C', width: 12 }
});

export default VehicleCheckScreen;