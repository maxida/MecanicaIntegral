import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

export const loadLogoAsBase64 = async (imageRequire: any): Promise<string> => {
  try {
    const asset = Asset.fromModule(imageRequire);
    await asset.downloadAsync();

    if (Platform.OS === 'web') {
      // WEB: Fetch directo al uri del asset
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // MOBILE: FileSystem
      const localUri = asset.localUri || asset.uri;
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64.startsWith('data:image') 
        ? base64 
        : `data:image/jpeg;base64,${base64}`;
    }
  } catch (error) {
    console.warn('Error cargando imagen:', error);
    return '';
  }
};