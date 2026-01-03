/**
 * Test de verificación de Firebase Auth
 * Ejecutar: npx ts-node testFirebaseAuth.ts
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB0CJ7ldjCaiHnwmgdmVtoJMU3ZdSM1E6s",
  authDomain: "mit-app-9fed5.firebaseapp.com",
  projectId: "mit-app-9fed5",
  storageBucket: "mit-app-9fed5.firebasestorage.app",
  messagingSenderId: "549562133574",
  appId: "1:549562133574:web:f41825ca579f8e847b2e47",
  measurementId: "G-EGCFSDGGXT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testLogin() {
  console.log('\n🧪 Iniciando test de Firebase Auth...\n');

  try {
    // Test 1: Intentar login
    console.log('📝 Test 1: Intentando login con santiago@mecanicaintegral.com...');
    const userCredential = await signInWithEmailAndPassword(
      auth,
      'santiago@mecanicaintegral.com',
      '123456'
    );
    console.log('✅ Login exitoso!');
    console.log(`   UID: ${userCredential.user.uid}`);
    console.log(`   Email: ${userCredential.user.email}`);

    // Test 2: Verificar documento en Firestore
    console.log('\n📝 Test 2: Buscando documento del usuario en Firestore...');
    const q = query(
      collection(db, 'usuarios'),
      where('uid', '==', userCredential.user.uid)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      console.log('✅ Documento encontrado en Firestore!');
      console.log(`   Nombre: ${userData.nombre}`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Rol: ${userData.rol}`);
      console.log(`   Estado: ${userData.estado}`);
    } else {
      console.log('❌ Documento NO encontrado en Firestore');
      console.log('   SOLUCIÓN: Crea el documento manualmente en Firebase Console');
    }

    console.log('\n✨ Test completado exitosamente!');
  } catch (error: any) {
    console.error('\n❌ Error durante el test:');
    console.error(`   Código: ${error.code}`);
    console.error(`   Mensaje: ${error.message}`);

    if (error.code === 'auth/user-not-found') {
      console.log('\n💡 SOLUCIÓN: El usuario no existe en Firebase Auth');
      console.log('   Ve a Firebase Console > Autenticación > Usuarios');
      console.log('   y crea el usuario santiago@mecanicaintegral.com');
    } else if (error.code === 'auth/wrong-password') {
      console.log('\n💡 SOLUCIÓN: Contraseña incorrecta');
      console.log('   Verifica que la contraseña sea: 123456');
    }
  }

  process.exit(0);
}

testLogin();
