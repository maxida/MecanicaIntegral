import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import { initializeAuth, browserLocalPersistence, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
  // En nativo usamos AsyncStorage para persistencia
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }) as Auth;
}

export { app, db, auth };