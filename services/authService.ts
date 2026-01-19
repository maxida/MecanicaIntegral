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
  name: string;
  role: 'admin' | 'supervisor' | 'mecanico' | 'cliente';
  id: string;
}

// Obtener rol del usuario desde Firestore
// Buscar usuario en Firestore por uid o email y devolver sus datos
export const obtenerUsuarioFirestore = async (params: { uid?: string; email?: string; }): Promise<{ name?: string; role?: string; uid?: string } | null> => {
  try {
    const { uid, email } = params;

    // Intentar por uid primero si está disponible
    if (uid) {
      const qUid = query(collection(db, USUARIOS_COLLECTION), where('uid', '==', uid));
      const snapUid = await getDocs(qUid);
      if (!snapUid.empty) {
        const data = snapUid.docs[0].data();
        return { name: data.name || data.nombre || '', role: data.role || data.rol || '', uid: data.uid || uid };
      }
    }

    // Fallback a búsqueda por email
    if (email) {
      const qEmail = query(collection(db, USUARIOS_COLLECTION), where('email', '==', email));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        const data = snapEmail.docs[0].data();
        return { name: data.name || data.nombre || '', role: data.role || data.rol || '', uid: data.uid || snapEmail.docs[0].id };
      }
    }

    return null;
  } catch (error) {
    console.error('Error buscando usuario en Firestore:', error);
    return null;
  }
};

// Login con email y contraseña
export const loginWithEmail = async (email: string, password: string): Promise<UsuarioAuth> => {
  try {
    // Intentar login con Firebase primero
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Obtener datos del usuario desde Firestore (por uid o email)
    const usuarioDoc = await obtenerUsuarioFirestore({ uid: user.uid, email: user.email || email });

    if (!usuarioDoc || !usuarioDoc.role) {
      console.warn(`⚠️ Usuario ${email} no encontrado o sin campo 'role' en Firestore. Verifica la colección 'usuarios'.`);
      throw new Error('Usuario no tiene rol asignado. Contacta al administrador.');
    }

    return {
      uid: user.uid,
      email: user.email || '',
      name: usuarioDoc.name || user.displayName || email.split('@')[0],
      role: usuarioDoc.role as 'admin' | 'supervisor' | 'mecanico' | 'cliente',
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
        name: localUser.name,
        role: localUser.role as 'admin' | 'supervisor' | 'mecanico' | 'cliente',
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
