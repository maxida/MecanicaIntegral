import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import { validateLocalUser } from './localUsers';

const USUARIOS_COLLECTION = 'usuarios';

export interface UsuarioAuth {
  uid: string;
  email: string;
  displayName: string;
  rol: 'admin' | 'supervisor' | 'mecanico' | 'cliente';
  id: string;
}

// Obtener rol del usuario desde Firestore
export const obtenerRolUsuario = async (uid: string): Promise<string | null> => {
  try {
    const q = query(collection(db, USUARIOS_COLLECTION), where('uid', '==', uid));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data().rol;
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo rol:', error);
    return null;
  }
};

// Login con email y contraseña
export const loginWithEmail = async (email: string, password: string): Promise<UsuarioAuth> => {
  try {
    // Intentar login con Firebase primero
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Obtener rol del usuario
    const rol = await obtenerRolUsuario(user.uid);

    if (!rol) {
      console.warn(`⚠️ Usuario ${email} no tiene rol asignado en Firestore. Verifica la colección 'usuarios'.`);
      throw new Error('Usuario no tiene rol asignado. Contacta al administrador.');
    }

    return {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || email.split('@')[0],
      rol: rol as 'admin' | 'supervisor' | 'mecanico' | 'cliente',
      id: user.uid,
    };
  } catch (firebaseError: any) {
    // Si Firebase falla, intentar con usuarios locales (para desarrollo)
    console.log('ℹ️ Firebase Auth no disponible, usando usuarios locales...');
    
    const localUser = validateLocalUser(email, password);
    if (localUser) {
      console.log(`✅ Login exitoso (modo local) para ${email}`);
      return {
        uid: localUser.uid,
        email: localUser.email,
        displayName: localUser.nombre,
        rol: localUser.rol as 'admin' | 'supervisor' | 'mecanico' | 'cliente',
        id: localUser.uid,
      };
    }

    // Mejorar mensajes de error
    let mensajeError = 'Error al iniciar sesión';
    
    if (firebaseError.code === 'auth/user-not-found') {
      mensajeError = 'Usuario no encontrado. Verifica tu email.';
    } else if (firebaseError.code === 'auth/wrong-password') {
      mensajeError = 'Contraseña incorrecta.';
    } else if (firebaseError.code === 'auth/invalid-email') {
      mensajeError = 'Email inválido.';
    } else if (firebaseError.code === 'auth/configuration-not-found') {
      mensajeError = 'Configuración de Firebase no encontrada. Usando base de datos local.';
    } else if (firebaseError.message?.includes('no tiene rol asignado')) {
      mensajeError = firebaseError.message;
    }
    
    console.error('Error en login:', firebaseError);
    throw new Error(mensajeError);
  }
};

// Logout
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error en logout:', error);
    throw error;
  }
};

// Obtener usuario actual
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Escuchar cambios de autenticación
export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return auth.onAuthStateChanged(callback);
};
