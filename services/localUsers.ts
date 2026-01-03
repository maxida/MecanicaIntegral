/**
 * Base de datos local de usuarios para desarrollo
 * Mientras se configura Firebase properly
 */

export const LOCAL_USERS = {
  'santiago@mit.com': {
    password: '123456',
    uid: 'user_santiago_001',
    nombre: 'Santiago',
    email: 'santiago@mit.com',
    rol: 'admin'
  },
  'oasis@mit.com': {
    password: '123456',
    uid: 'user_ana_001',
    nombre: 'Ana',
    email: 'oasis@mit.com',
    rol: 'supervisor'
  },
  'mecanico@mit.com': {
    password: '123456',
    uid: 'user_juan_001',
    nombre: 'Juan',
    email: 'mecanico@mit.com',
    rol: 'mecanico'
  },
  'camion1@mit.com': {
    password: '123456',
    uid: 'user_carlos_001',
    nombre: 'Carlos',
    email: 'camion1@mit.com',
    rol: 'cliente'
  }
};

export function validateLocalUser(email: string, password: string) {
  const key = (email || '').toString().trim().toLowerCase();

  // Intentar lookup directo
  let user = LOCAL_USERS[key as keyof typeof LOCAL_USERS];

  // Si user no encontrado y el input no contiene '@', intentar agregar @mit.com
  if (!user && !key.includes('@')) {
    user = LOCAL_USERS[`${key}@mit.com` as keyof typeof LOCAL_USERS];
  }

  // Si no encontrado, intentar normalizar dominios comunes (por si se usó el dominio antiguo)
  if (!user && key.includes('@')) {
    const localPart = key.split('@')[0];
    user = LOCAL_USERS[`${localPart}@mit.com` as keyof typeof LOCAL_USERS] || null;
  }

  if (user && user.password === password) {
    return {
      uid: user.uid,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol
    };
  }
  return null;
}
