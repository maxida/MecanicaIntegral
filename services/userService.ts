import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import { Usuario, UserRole, ClienteDuenoCamion, Camion } from '@/types/user';

const USUARIOS_COLLECTION = 'usuarios';
const CLIENTES_COLLECTION = 'clientes';
const CAMIONES_COLLECTION = 'camiones';

// Obtener usuario por email
export const obtenerUsuarioPorEmail = async (email: string): Promise<Usuario | null> => {
  try {
    const q = query(collection(db, USUARIOS_COLLECTION), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return null;
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Usuario;
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    throw error;
  }
};

// Obtener usuario por ID
export const obtenerUsuarioPorId = async (id: string): Promise<Usuario | null> => {
  try {
    const docRef = doc(db, USUARIOS_COLLECTION, id);
    const docSnap = await getDocs(query(collection(db, USUARIOS_COLLECTION), where('__name__', '==', id)));
    
    if (docSnap.empty) return null;
    
    return {
      id: docSnap.docs[0].id,
      ...docSnap.docs[0].data(),
    } as Usuario;
  } catch (error) {
    console.error('Error obteniendo usuario por ID:', error);
    throw error;
  }
};

// Validar credenciales (para admin)
export const validarCredenciales = (email: string, password: string): boolean => {
  // Credenciales hardcodeadas temporalmente
  const credenciales = [
    { email: 'admin@mecanicaintegral.com', password: '159753' },
    { email: 'supervisor@mecanicaintegral.com', password: '654987' },
  ];
  
  return credenciales.some(c => c.email === email && c.password === password);
};

// Obtener rol por email
export const obtenerRolPorEmail = (email: string): UserRole | null => {
  const usuarios = [
    { email: 'admin@mecanicaintegral.com', rol: 'admin' as UserRole },
    { email: 'supervisor@mecanicaintegral.com', rol: 'supervisor' as UserRole },
  ];
  
  const usuario = usuarios.find(u => u.email === email);
  return usuario?.rol || null;
};

// Crear usuario (para registro de clientes)
export const crearUsuarioCliente = async (clienteData: {
  nombre: string;
  email: string;
  telefono: string;
  empresa: string;
}): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, CLIENTES_COLLECTION), {
      ...clienteData,
      rol: 'cliente',
      estado: 'activo',
      createdAt: new Date().toISOString(),
      camiones: [],
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creando usuario cliente:', error);
    throw error;
  }
};

// Obtener cliente por ID
export const obtenerClientePorId = async (id: string): Promise<ClienteDuenoCamion | null> => {
  try {
    const q = query(collection(db, CLIENTES_COLLECTION), where('__name__', '==', id));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return null;
    
    return {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data(),
    } as ClienteDuenoCamion;
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    throw error;
  }
};

// Obtener todos los usuarios por rol
export const obtenerUsuariosPorRol = async (rol: UserRole): Promise<Usuario[]> => {
  try {
    const q = query(collection(db, USUARIOS_COLLECTION), where('rol', '==', rol));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Usuario[];
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    throw error;
  }
};

// Agregar camión al cliente
export const agregarCamionAlCliente = async (clienteId: string, camionData: Omit<Camion, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, CAMIONES_COLLECTION), {
      ...camionData,
      propietario_id: clienteId,
      createdAt: new Date().toISOString(),
    });
    
    // Actualizar array de camiones en el cliente
    const clienteRef = doc(db, CLIENTES_COLLECTION, clienteId);
    await updateDoc(clienteRef, {
      camiones: [...((await obtenerClientePorId(clienteId))?.camiones || []), docRef.id],
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error agregando camión:', error);
    throw error;
  }
};

// Obtener camiones del cliente
export const obtenerCamionesDelCliente = async (clienteId: string): Promise<Camion[]> => {
  try {
    const q = query(collection(db, CAMIONES_COLLECTION), where('propietario_id', '==', clienteId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Camion[];
  } catch (error) {
    console.error('Error obteniendo camiones:', error);
    throw error;
  }
};

// Datos iniciales de usuarios para demo
export const crearUsuariosDemo = async (): Promise<void> => {
  try {
    const usuariosDemo = [
      {
        email: 'admin@mecanicaintegral.com',
        nombre: 'Santiago (Admin)',
        rol: 'admin' as UserRole,
        telefono: '+54 9 1234-5678',
        estado: 'activo' as const,
        createdAt: new Date().toISOString(),
      },
      {
        email: 'supervisor@mecanicaintegral.com',
        nombre: 'Ana (Supervisor)',
        rol: 'supervisor' as UserRole,
        telefono: '+54 9 8765-4321',
        estado: 'activo' as const,
        createdAt: new Date().toISOString(),
      },
      {
        email: 'mecanico1@mecanicaintegral.com',
        nombre: 'Juan (Mecánico)',
        rol: 'mecanico' as UserRole,
        telefono: '+54 9 1111-2222',
        estado: 'activo' as const,
        createdAt: new Date().toISOString(),
      },
    ];

    for (const usuario of usuariosDemo) {
      try {
        const q = query(collection(db, USUARIOS_COLLECTION), where('email', '==', usuario.email));
        const exists = await getDocs(q);
        
        if (!exists.empty) {
          console.log(`Usuario ${usuario.email} ya existe`);
          continue;
        }
        
        await addDoc(collection(db, USUARIOS_COLLECTION), usuario);
      } catch (error) {
        console.error(`Error creando usuario ${usuario.email}:`, error);
      }
    }
  } catch (error) {
    console.error('Error en demo de usuarios:', error);
  }
};
