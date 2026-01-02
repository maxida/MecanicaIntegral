import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Tu configuración de Firebase (la obtendrás en el paso 4)
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

export { db };