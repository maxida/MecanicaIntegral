import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import { initializeAuth, browserLocalPersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getStorage } from 'firebase/storage';

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB0CJ7ldjCaiHnwmgdmVtoJMU3ZdSM1E6s",
  authDomain: "mit-app-9fed5.firebaseapp.com",
  projectId: "mit-app-9fed5",
  storageBucket: "mit-app-9fed5.firebasestorage.app",
  messagingSenderId: "549562133574",
  appId: "1:549562133574:web:f41825ca579f8e847b2e47",
  measurementId: "G-EGCFSDGGXT"
};

// Inicializar (singleton) Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firestore
const db = getFirestore(app);

// Auth con persistencia condicional según plataforma
let auth: Auth;
if (Platform.OS === 'web') {
  // En web usamos persistencia local del navegador
  auth = initializeAuth(app, { persistence: browserLocalPersistence }) as Auth;
} else {
  // En nativo usamos AsyncStorage para persistencia.
  // Ocultamos el require para que el bundler web no intente resolver este módulo nativo durante el build.
  let getReactNativePersistence: any = undefined;
  try {
    // eslint-disable-next-line no-eval, @typescript-eslint/no-unsafe-assignment
    const req: any = eval('require');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const mod = req('firebase/auth/react-native');
    getReactNativePersistence = mod && (mod.getReactNativePersistence || mod.default?.getReactNativePersistence);
  } catch (e) {
    // Si no está disponible, procederemos sin persistencia específica (Firebase usará su default)
    getReactNativePersistence = undefined;
  }

  if (getReactNativePersistence) {
    auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }) as Auth;
  } else {
    // Fallback: inicializar sin persistencia específica para evitar fallos en bundles donde
    // 'firebase/auth/react-native' no está disponible.
    auth = initializeAuth(app) as Auth;
  }
}

const storage = getStorage(app);

export { app, db, auth, storage };