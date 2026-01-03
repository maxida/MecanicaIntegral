import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';

export interface ItemChecklist {
  id?: string;
  nombre: string;
  descripcion: string;
  completado: boolean;
  orden: number;
}

export interface Checklist {
  id?: string;
  numeroPatente: string;
  fecha: string;
  mecanico: string;
  items: ItemChecklist[];
  completado: boolean;
  notas?: string;
  fechaCreacion?: string;
}

const CHECKLIST_COLLECTION = 'checklist';

// Obtener checklist por patente
export const obtenerChecklistPorPatente = async (numeroPatente: string): Promise<Checklist[]> => {
  try {
    const q = query(collection(db, CHECKLIST_COLLECTION), where('numeroPatente', '==', numeroPatente));
    const querySnapshot = await getDocs(q);
    const checklists: Checklist[] = [];
    
    querySnapshot.forEach((doc) => {
      checklists.push({
        id: doc.id,
        ...doc.data(),
      } as Checklist);
    });
    
    return checklists;
  } catch (error) {
    console.error('Error obteniendo checklist:', error);
    throw error;
  }
};

// Crear nuevo checklist
export const crearChecklist = async (checklist: Omit<Checklist, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, CHECKLIST_COLLECTION), {
      ...checklist,
      fechaCreacion: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creando checklist:', error);
    throw error;
  }
};

// Actualizar checklist
export const actualizarChecklist = async (id: string, checklist: Partial<Checklist>): Promise<void> => {
  try {
    const checklistRef = doc(db, CHECKLIST_COLLECTION, id);
    await updateDoc(checklistRef, checklist);
  } catch (error) {
    console.error('Error actualizando checklist:', error);
    throw error;
  }
};

// Eliminar checklist
export const eliminarChecklist = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, CHECKLIST_COLLECTION, id));
  } catch (error) {
    console.error('Error eliminando checklist:', error);
    throw error;
  }
};

// Items por defecto del checklist
export const ITEMS_CHECKLIST_DEFECTO: ItemChecklist[] = [
  { nombre: 'Revisar neumáticos', descripcion: 'Verificar presión y desgaste', completado: false, orden: 1 },
  { nombre: 'Revisar frenos', descripcion: 'Revisar pastillas y sistema de frenado', completado: false, orden: 2 },
  { nombre: 'Revisar luces', descripcion: 'Delanteras, traseras y intermitentes', completado: false, orden: 3 },
  { nombre: 'Revisar espejo retrovisores', descripcion: 'Estado general y funcionalidad', completado: false, orden: 4 },
  { nombre: 'Revisar limpiaparabrisas', descripcion: 'Funcionamiento y desgaste', completado: false, orden: 5 },
  { nombre: 'Revisar batería', descripcion: 'Conexiones y estado', completado: false, orden: 6 },
  { nombre: 'Revisar aceite', descripcion: 'Nivel y condición', completado: false, orden: 7 },
  { nombre: 'Revisar líquido refrigerante', descripcion: 'Nivel y condición', completado: false, orden: 8 },
  { nombre: 'Revisar dirección', descripcion: 'Funcionalidad y holgura', completado: false, orden: 9 },
  { nombre: 'Revisar suspensión', descripcion: 'Amortiguadores y muelles', completado: false, orden: 10 },
];
