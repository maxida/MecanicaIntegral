import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import { Turno } from '@/redux/slices/turnosSlice';

const TURNOS_COLLECTION = 'turnos';

// Obtener todos los turnos
export const obtenerTurnos = async (): Promise<Turno[]> => {
  try {
    const q = query(collection(db, TURNOS_COLLECTION), orderBy('fechaReparacion', 'asc'));
    const querySnapshot = await getDocs(q);
    const turnos: Turno[] = [];
    
    querySnapshot.forEach((doc) => {
      turnos.push({
        id: doc.id,
        ...doc.data(),
      } as Turno);
    });
    
    return turnos;
  } catch (error) {
    console.error('Error obteniendo turnos:', error);
    throw error;
  }
};

// Agregar nuevo turno
export const agregarNuevoTurno = async (turno: Omit<Turno, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, TURNOS_COLLECTION), {
      ...turno,
      fechaCreacion: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error agregando turno:', error);
    throw error;
  }
};

// Alias más claro para el servicio de creación
export const crearTurnoService = async (payload: Record<string, any>): Promise<string> => {
  // Permitimos payload flexible y añadimos fechaCreacion
  try {
    const docRef = await addDoc(collection(db, TURNOS_COLLECTION), {
      ...payload,
      fechaCreacion: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creando turno:', error);
    throw error;
  }
};

// Actualizar turno
export const actualizarTurnoService = async (id: string, turno: Partial<Turno>): Promise<void> => {
  try {
    const turnoRef = doc(db, TURNOS_COLLECTION, id);
    await updateDoc(turnoRef, turno);
  } catch (error) {
    console.error('Error actualizando turno:', error);
    throw error;
  }
};

// Eliminar turno
export const eliminarTurnoService = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, TURNOS_COLLECTION, id));
  } catch (error) {
    console.error('Error eliminando turno:', error);
    throw error;
  }
};

// Crear turnos de prueba (para demo)
export const crearTurnosPrueba = async (): Promise<void> => {
  try {
    const hoy = new Date();
    const ahora = new Date().toISOString();
    
    const turnosPrueba = [
      {
        numeroPatente: 'ABC-123',
        fechaReparacion: new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        horaReparacion: '09:00',
        descripcion: 'Cambio de aceite y filtros',
        estado: 'pending' as const,
        fechaCreacion: ahora,
        prioridad: 1,
        clienteId: 'cliente1',
        chofer: 'Juan García',
        tipo: 'reparacion',
      },
      {
        numeroPatente: 'XYZ-789',
        fechaReparacion: new Date(hoy.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        horaReparacion: '14:30',
        descripcion: 'Revisión de frenos y suspensión',
        estado: 'scheduled' as const,
        fechaCreacion: ahora,
        prioridad: 2,
        clienteId: 'cliente2',
        chofer: 'Carlos López',
        tipo: 'mantenimiento',
      },
      {
        numeroPatente: 'DEF-456',
        fechaReparacion: new Date(hoy.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        horaReparacion: '11:00',
        descripcion: 'Reparación de motor',
        estado: 'in_progress' as const,
        fechaCreacion: ahora,
        prioridad: 1,
        clienteId: 'cliente3',
        chofer: 'María Silva',
        tipo: 'reparacion',
        mecanico: 'Juan M.',
      },
    ];

    for (const turno of turnosPrueba) {
      await agregarNuevoTurno(turno);
    }
  } catch (error) {
    console.error('Error creando turnos de prueba:', error);
    throw error;
  }
};

// Configurar listener en tiempo real para turnos
export const suscribirseATurnos = (callback: (turnos: Turno[]) => void) => {
  const q = query(collection(db, TURNOS_COLLECTION), orderBy('fechaReparacion', 'asc'));

  return onSnapshot(q, (querySnapshot) => {
    const turnos: Turno[] = [];
    querySnapshot.forEach((doc) => {
      turnos.push({
        id: doc.id,
        ...doc.data(),
      } as Turno);
    });
    callback(turnos);
  }, (error) => {
    console.error('Error en listener de turnos:', error);
  });
};

// Suscribirse únicamente a turnos en estado 'pending_triage'
export const suscribirseAPendingTriage = (callback: (turnos: Turno[]) => void) => {
  try {
    const { query: qFn, where } = require('firebase/firestore');
    const q = qFn(collection(db, TURNOS_COLLECTION), where('estado', '==', 'pending_triage'), orderBy('fechaCreacion', 'desc'));
    return onSnapshot(q, (querySnapshot: any) => {
      const turnos: Turno[] = [];
      querySnapshot.forEach((doc: any) => {
        turnos.push({ id: doc.id, ...doc.data() } as Turno);
      });
      callback(turnos);
    }, (error: any) => {
      console.error('Error en listener pending_triage:', error);
    });
  } catch (error) {
    console.error('Error creando suscripción pending_triage:', error);
    return () => {};
  }
};
