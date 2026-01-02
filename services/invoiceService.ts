import { db } from '../firebase/firebaseConfig';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';

// Obtener el último ID de presupuesto
export const obtenerUltimoIdPresupuestoGlobal = async (flagConfactura: boolean): Promise<string> => {
  try {
    const q = query(
      collection(db, flagConfactura ? 'conFactura' : 'sinFactura'),
      orderBy('fechaCreacion', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    console.log('Obtener el último ID de presupuesto',querySnapshot.docs);
    console.log('Obtener el último ID de presupuesto',querySnapshot.empty);
    if (!querySnapshot.empty) {
      const ultimaFactura = querySnapshot.docs[0].data();
      console.log('ultimaFactura',querySnapshot.docs);
      console.log('ultimaFactura.idPresupuesto',ultimaFactura.idPresupuesto);
      return ultimaFactura.idPresupuesto;
    }

    // Si no hay facturas, devolver "000000000000"
    return '0';

  } catch (error) {
    console.error("Error al obtener último ID global:", error);
    throw error;
  }
};

// Generar nuevo ID secuencial basado en el último
// const generarNuevoIdGlobal = (ultimoId: string): string => {
//   const numero = parseInt(ultimoId, 10);
//   const nuevoNumero = numero + 1;
//   return String(nuevoNumero).padStart(12, '0');
// };


// Escuchar nuevas facturas en tiempo real (opcional)
// export const suscribirFacturas = (numPatente: any, callback: any) => {
//   const q = query(
//     collection(db, 'facturas'),
//     where('numPatente', '==', numPatente),
//     orderBy('fechaCreacion', 'desc')
//   );

//   return onSnapshot(q, (snapshot) => {
//     const facturas = snapshot.docs.map(doc => ({
//       id: doc.id,
//       ...doc.data(),
//       fechaCreacion: doc.data().fechaCreacion?.toDate()
//     }));
//     callback(facturas);
//   });
// };