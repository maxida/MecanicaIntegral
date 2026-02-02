import { Timestamp } from 'firebase/firestore';

export type ComplianceStatus = 'ok' | 'warning' | 'critical' | 'expired';

export interface DocStatus {
  status: ComplianceStatus;
  daysRemaining: number;
  label: string;
  color: string;
  formattedDate: string;
}

// Función auxiliar para normalizar fechas de Firebase
const parseDate = (dateInput: any): Date | null => {
  if (!dateInput) return null;
  // Caso A: Es un Timestamp de Firestore directo (SDK)
  if (dateInput instanceof Timestamp || typeof dateInput.toDate === 'function') {
    return dateInput.toDate();
  }
  // Caso B: Es un objeto serializado (seconds)
  if (dateInput.seconds) {
    return new Date(dateInput.seconds * 1000);
  }
  // Caso C: Es un string o fecha JS estándar
  const d = new Date(dateInput);
  if (!isNaN(d.getTime())) return d;
  
  return null;
};

export const getExpirationStatus = (dateInput?: any): DocStatus => {
  const expDate = parseDate(dateInput);

  if (!expDate) {
    return { status: 'expired', daysRemaining: -999, label: 'NO REGISTRADO', color: '#EF4444', formattedDate: '--/--/----' };
  }

  const today = new Date();
  // Diferencia en milisegundos
  const diffTime = expDate.getTime() - today.getTime();
  // Diferencia en días
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Formato argentino DD/MM/AAAA
  const formattedDate = expDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (daysRemaining < 0) {
    return { status: 'expired', daysRemaining, label: 'VENCIDO', color: '#EF4444', formattedDate }; // Rojo
  } else if (daysRemaining <= 7) {
    return { status: 'critical', daysRemaining, label: 'CRÍTICO', color: '#EF4444', formattedDate }; // Rojo
  } else if (daysRemaining <= 30) {
    return { status: 'warning', daysRemaining, label: 'PRONTO A VENCER', color: '#F59E0B', formattedDate }; // Amarillo
  } else {
    return { status: 'ok', daysRemaining, label: 'VIGENTE', color: '#10B981', formattedDate }; // Verde
  }
};