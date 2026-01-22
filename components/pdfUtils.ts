import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * generateAndSharePDF
 * - En web: usa Print.printAsync({ html }) para imprimir SOLO el HTML en un iframe oculto.
 * - En mobile: genera archivo con printToFileAsync y lo comparte con Sharing.shareAsync.
 */
export async function generateAndSharePDF(htmlContent: string) {
  try {
    if (Platform.OS === 'web') {
      await Print.printAsync({ html: htmlContent });
      return;
    }

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    if (uri) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } else {
      console.warn('generateAndSharePDF: no uri returned from printToFileAsync');
    }
  } catch (err) {
    console.error('generateAndSharePDF error:', err);
    throw err;
  }
}

export default generateAndSharePDF;
