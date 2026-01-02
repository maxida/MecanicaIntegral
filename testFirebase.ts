import { db } from './firebase/firebaseConfig';
import { addDoc, collection } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  try {
    console.log('Intentando conectar con Firebase...');
    
    // 1. Prueba de conexión básica
    const testDoc = {
      test: 'Conexión exitosa',
      timestamp: new Date().toISOString(),
      proyecto: 'MIT-APP'
    };
    
    // 2. Intentar escribir en Firestore
    const docRef = await addDoc(collection(db, 'pruebasConexion'), testDoc);
    
    console.log('✅ Conexión exitosa! Documento creado con ID:', docRef.id);
    console.log('Puedes verificar en Firebase Console > Firestore > pruebasConexion');
    
  } catch (error) {
    console.error('❌ Error en la conexión:', error);
    console.log('Revisa:');
    console.log('1. Tu configuración en firebaseConfig.js');
    console.log('2. Que Firestore esté habilitado en Firebase Console');
    console.log('3. Las reglas de seguridad de Firestore');
  } finally {
    // Opcional: Cierra la conexión si es necesario
    // (Normalmente no es necesario en React Native)
  }
};

// Ejecutar la prueba
// testFirebaseConnection();