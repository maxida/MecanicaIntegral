import { getApp } from 'firebase/app';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, where, runTransaction } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '@/firebase/firebaseConfig';

type CreateSolicitudArgs = {
  clienteId: string;
  supervisorId: string;
  numeroPatente?: string;
  descripcion?: string;
  checklistData?: any;
  checklistId?: string;
  photoUri?: string;
  prioridad?: 'low' | 'medium' | 'high';
};

async function uriToBlob(uri: string) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
}

export async function createSolicitud(args: CreateSolicitudArgs) {
  const { clienteId, supervisorId, numeroPatente, descripcion, checklistData, photoUri, prioridad = 'medium' } = args;

  let checklistPhotoURL: string | null = null;

  if (photoUri) {
    try {
      const app = getApp();
      const storage = getStorage(app);
      const blob = await uriToBlob(photoUri);
      const filename = `${Date.now()}_${(photoUri.split('/').pop() || 'photo')}`;
      const storageRef = ref(storage, `solicitudes/${clienteId}/${filename}`);
      await uploadBytes(storageRef, blob);
      checklistPhotoURL = await getDownloadURL(storageRef);
    } catch (err) {
      console.warn('Error subiendo foto de checklist:', err);
      checklistPhotoURL = null;
    }
  }

  const payload: any = {
    clienteId,
    supervisorId,
    numeroPatente: numeroPatente || null,
    descripcion: descripcion || null,
    checklistPhotoURL: checklistPhotoURL,
    prioridad,
    status: 'pending',
    createdAt: serverTimestamp(),
  };

  if (args.checklistId) {
    payload.checklistId = args.checklistId;
  } else {
    payload.checklistData = checklistData || null;
  }

  const docRef = await addDoc(collection(db, 'solicitudes'), payload);

  return { id: docRef.id };
}

export function suscribirseASolicitudes(onUpdate: (data: any[]) => void) {
  const q = query(collection(db, 'solicitudes'), orderBy('createdAt', 'desc'));
  const unsub = onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(items as any[]);
  }, (err) => {
    console.error('Error suscribiéndose a solicitudes:', err);
  });

  return unsub;
}

export async function obtenerSolicitudes() {
  // Helper simple: fetch initial list (not used if subscribe)
  const q = query(collection(db, 'solicitudes'), orderBy('createdAt', 'desc'));
  const snap = await (await import('firebase/firestore')).getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ============================================================
// FUNCIÓN CRÍTICA: DERIVAR TURNO A TALLER (TRANSACCIÓN ATÓMICA)
// ============================================================
export interface DerivarATallerArgs {
  turnoId: string;
  // Datos del vehículo
  numeroPatente: string;
  modelo?: string;
  marca?: string;
  // Datos del reporte original
  sintomas?: string[];
  fotoUrl?: string;
  kilometraje?: string;
  nivelNafta?: string;
  chofer?: string;
  // Datos del Admin
  notasAdmin: string;
  mecanicoAsignado: string; // ID del mecánico
  mecanicoNombre?: string;  // Nombre para display
  tipo: string; // reparacion | mantenimiento | asistencia
  prioridad?: number; // 1=alta, 2=media, 3=baja
}

/**
 * Ejecuta una transacción atómica que:
 * 1. Actualiza el turno original a estado 'in_progress' (Admin ve columna Amarilla)
 * 2. Crea un documento en 'solicitudes' para el Mecánico asignado
 */
export async function derivarATaller(args: DerivarATallerArgs): Promise<{ solicitudId: string }> {
  const {
    turnoId,
    numeroPatente,
    modelo,
    marca,
    sintomas,
    fotoUrl,
    kilometraje,
    nivelNafta,
    chofer,
    notasAdmin,
    mecanicoAsignado,
    mecanicoNombre,
    tipo,
    prioridad = 2,
  } = args;

  const now = new Date().toISOString();
  
  // Referencia al turno original
  const turnoRef = doc(db, 'turnos', turnoId);
  
  // Crear la solicitud para el mecánico
  const solicitudData = {
    // Link al turno original
    turnoId,
    
    // Datos del vehículo
    numeroPatente,
    modelo: modelo || null,
    marca: marca || null,
    
    // Datos del reporte (contexto para el mecánico)
    sintomas: sintomas || [],
    fotoUrl: fotoUrl || null,
    kilometraje: kilometraje || null,
    nivelNafta: nivelNafta || null,
    chofer: chofer || null,
    
    // Instrucciones del Admin
    notasAdmin,
    descripcion: notasAdmin, // Alias para compatibilidad
    tipo,
    prioridad,
    
    // Asignación
    mecanicoAsignado, // ID para queries
    mecanicoNombre: mecanicoNombre || null, // Display name
    
    // Estado inicial para el Mecánico
    estado: 'pendiente_inicio', // El mecánico le dará Play
    
    // Timestamps
    createdAt: serverTimestamp(),
    fechaDerivacion: now,
    fechaInicioTrabajo: null,
    fechaFinTrabajo: null,
  };

  // Ejecutar transacción atómica
  const solicitudId = await runTransaction(db, async (transaction) => {
    // 1. Actualizar el turno original -> Admin ve Amarillo
    transaction.update(turnoRef, {
      estado: 'in_progress',
      derivadoATaller: true,
      fechaDerivacion: now,
      mecanicoAsignado,
      mecanicoNombre: mecanicoNombre || null,
    });

    // 2. Crear la solicitud -> Mecánico ve nueva Card
    const solicitudRef = doc(collection(db, 'solicitudes'));
    transaction.set(solicitudRef, solicitudData);
    
    return solicitudRef.id;
  });

  return { solicitudId };
}

// ============================================================
// SUSCRIPCIÓN FILTRADA POR MECÁNICO
// ============================================================
export function suscribirseASolicitudesMecanico(
  mecanicoId: string,
  onUpdate: (data: any[]) => void
) {
  // Query: solicitudes asignadas a este mecánico, ordenadas por fecha
  const q = query(
    collection(db, 'solicitudes'),
    where('mecanicoAsignado', '==', mecanicoId),
    orderBy('createdAt', 'desc')
  );

  const unsub = onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(items as any[]);
  }, (err) => {
    console.error('Error suscribiéndose a solicitudes del mecánico:', err);
  });

  return unsub;
}

// Suscripción a TODAS las solicitudes (para pool general o admin)
export function suscribirseATodasSolicitudes(onUpdate: (data: any[]) => void) {
  const q = query(collection(db, 'solicitudes'), orderBy('createdAt', 'desc'));
  const unsub = onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(items as any[]);
  }, (err) => {
    console.error('Error suscribiéndose a todas las solicitudes:', err);
  });
  return unsub;
}

// Actualizar estado de una solicitud
export async function actualizarSolicitud(id: string, data: Record<string, any>): Promise<void> {
  const solicitudRef = doc(db, 'solicitudes', id);
  await updateDoc(solicitudRef, data);
}

export default { 
  createSolicitud, 
  suscribirseASolicitudes, 
  obtenerSolicitudes,
  derivarATaller,
  suscribirseASolicitudesMecanico,
  suscribirseATodasSolicitudes,
  actualizarSolicitud,
};
