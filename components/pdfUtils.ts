import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default async function generateAndSharePDF(html: string) {
  if (Platform.OS === 'web') {
    // TRUCO DEPURACIÓN: Abrir en pestaña nueva en lugar de iframe oculto
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Esperar un poco a que cargue el logo y fuentes
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        // NO cerramos la ventana automáticamente para que puedas inspeccionar el HTML si falla
        // printWindow.close(); 
      }, 1000);
    } else {
      alert("Por favor, permite las ventanas emergentes (popups) para generar el PDF.");
    }
    return;
  }

  // Lógica Móvil (sin cambios)
  try {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (err) {
    console.error('Error generando PDF móvil:', err);
  }
}