import { getApp } from 'firebase/app';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
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

export default { createSolicitud, suscribirseASolicitudes, obtenerSolicitudes };
