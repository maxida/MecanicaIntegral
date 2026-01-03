/**
 * Script para crear usuarios en Firebase Auth usando REST API
 * Ejecutar: node createFirebaseUsers.js
 * 
 * No requiere Service Account Key - usa la API REST de Firebase
 */

const https = require('https');

const FIREBASE_PROJECT = 'mit-app-9fed5';
const FIREBASE_API_KEY = 'AIzaSyB0CJ7ldjCaiHnwmgdmVtoJMU3ZdSM1E6s';

const usuarios = [
  {
    email: 'santiago@mit.com',
    password: '123456',
    nombre: 'Santiago',
    rol: 'admin'
  },
  {
    email: 'oasis@mit.com',
    password: '123456',
    nombre: 'Ana',
    rol: 'supervisor'
  },
  {
    email: 'mecanico@mit.com',
    password: '123456',
    nombre: 'Juan',
    rol: 'mecanico'
  },
  {
    email: 'camion1@mit.com',
    password: '123456',
    nombre: 'Carlos',
    rol: 'cliente'
  }
];

async function createUser(email, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: email,
      password: password,
      returnSecureToken: true
    });

    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          const parsed = JSON.parse(responseData);
          resolve({
            uid: parsed.localId,
            email: parsed.email
          });
        } else {
          const error = JSON.parse(responseData);
          reject(new Error(error.error?.message || 'Error creating user'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function createFirestoreDocument(uid, email, nombre, rol) {
  const admin = await import('firebase-admin');
  // Este es un fallback - solo si firebase-admin está disponible
  // Si no, devolvemos el documento que debe crearse manualmente
  return {
    uid,
    email,
    nombre,
    rol,
    estado: 'activo',
    createdAt: new Date().toISOString()
  };
}

async function main() {
  console.log('\n🚀 Iniciando creación de usuarios en Firebase Auth...\n');

  const createdUsers = [];

  for (const usuario of usuarios) {
    try {
      console.log(`📝 Creando usuario: ${usuario.email}...`);
      const createdUser = await createUser(usuario.email, usuario.password);
      console.log(`✅ Usuario creado exitosamente!`);
      console.log(`   UID: ${createdUser.uid}`);
      console.log(`   Email: ${createdUser.email}\n`);

      createdUsers.push({
        ...usuario,
        uid: createdUser.uid
      });
    } catch (error) {
      if (error.message.includes('EMAIL_EXISTS')) {
        console.log(`⚠️  Usuario ya existe: ${usuario.email}\n`);
        // Intentar obtener el UID - en Firebase no podemos, así que asumimos que existe
        createdUsers.push({
          ...usuario,
          uid: 'EXISTE_YA' // Placeholder
        });
      } else {
        console.error(`❌ Error creando ${usuario.email}: ${error.message}\n`);
      }
    }

    // Esperar un poco entre creaciones para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📋 Documentos a crear en Firestore:\n');
  console.log('Colección: "usuarios"\n');

  for (const user of createdUsers) {
    if (user.uid !== 'EXISTE_YA') {
      console.log(`📄 Documento ${user.uid}:`);
      console.log(JSON.stringify({
        uid: user.uid,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        estado: 'activo',
        createdAt: new Date().toISOString()
      }, null, 2));
      console.log('---\n');
    }
  }

  console.log('✨ Creación de usuarios completada!');
  console.log('\n⚠️  PRÓXIMO PASO: Crear los documentos en Firestore');
  console.log('Ve a Firebase Console > Firestore > Nueva Colección "usuarios"');
  console.log('y copia-pega los documentos JSON mostrados arriba.\n');

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
