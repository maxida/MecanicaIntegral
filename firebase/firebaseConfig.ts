import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
const db = getFirestore(app);

// Inicializar Firebase Authentication con persistencia en AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export { db, auth, app };