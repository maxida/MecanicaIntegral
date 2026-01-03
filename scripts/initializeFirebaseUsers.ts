/**
 * Script para inicializar usuarios en Firebase Auth y Firestore
 * Ejecutar: npx ts-node scripts/initializeFirebaseUsers.ts
 * 
 * IMPORTANTE: Debes tener las credenciales de Firebase Admin SDK configuradas
 */

import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Cargar serviceAccountKey.json (necesario para admin SDK)
// Descargarlo desde Firebase Console > Proyecto > Configuración > Cuentas de Servicio
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ ERROR: No se encontró serviceAccountKey.json');
  console.log('📝 Para crear esta clave:');
  console.log('1. Ve a Firebase Console (console.firebase.google.com)');
  console.log('2. Selecciona el proyecto "mit-app-9fed5"');
  console.log('3. Ve a Configuración > Cuentas de Servicio');
  console.log('4. Click "Generar nueva clave privada" > Descarga JSON');
  console.log('5. Guarda el archivo como "serviceAccountKey.json" en la raíz del proyecto');
  process.exit(1);
}

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath))
});

const auth = admin.auth();
const db = admin.firestore();

interface Usuario {
  email: string;
  password: string;
  nombre: string;
  rol: 'admin' | 'supervisor' | 'mecanico' | 'cliente';
}

const usuarios: Usuario[] = [
  {
    email: 'santiago@mecanicaintegral.com',
    password: '123456',
    nombre: 'Santiago',
    rol: 'admin'
  },
  {
    email: 'ana@mecanicaintegral.com',
    password: '123456',
    nombre: 'Ana',
    rol: 'supervisor'
  },
  {
    email: 'juan@mecanicaintegral.com',
    password: '123456',
    nombre: 'Juan',
    rol: 'mecanico'
  },
  {
    email: 'carlos@transportes.com',
    password: '123456',
    nombre: 'Carlos',
    rol: 'cliente'
  }
];

async function initializeUsers() {
  try {
    console.log('🚀 Inicializando usuarios en Firebase Auth y Firestore...\n');

    for (const usuario of usuarios) {
      try {
        // Crear usuario en Firebase Auth
        const userRecord = await auth.createUser({
          email: usuario.email,
          password: usuario.password,
          displayName: usuario.nombre
        });

        // Guardar información adicional en Firestore
        await db.collection('usuarios').doc(userRecord.uid).set({
          uid: userRecord.uid,
          email: usuario.email,
          nombre: usuario.nombre,
          rol: usuario.rol,
          createdAt: new Date(),
          estado: 'activo'
        });

        console.log(`✅ Usuario creado: ${usuario.nombre} (${usuario.email}) - ${usuario.rol}`);
      } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
          console.log(`⚠️  Usuario ya existe: ${usuario.email}`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✨ Inicialización completada!');
    console.log('\n📝 Usuarios disponibles:');
    usuarios.forEach(u => {
      console.log(`   ${u.nombre}: ${u.email} / ${u.password}`);
    });
  } catch (error) {
    console.error('❌ Error durante inicialización:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

initializeUsers();
