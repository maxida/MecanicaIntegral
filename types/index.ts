export type ServiceRequestType = 'mantenimiento' | 'reparacion_general' | 'asistencia_24hs';
export type ServiceRequestStatus = 'por_hacer' | 'haciendo' | 'terminado';

export interface Truck {
  id: string;
  plate: string; // patente
  brand: string;
  model: string;
  year?: number;
  driverName: string;
  ownerId: string; // user id (owner)
  createdAt?: any;
  updatedAt?: any;
}

export interface ServiceRequest {
  id: string;
  truckId: string;
  type: ServiceRequestType;
  description: string;
  status: ServiceRequestStatus;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string; // uid who created it (camion)
}

export interface UserProfile {
  hasRegisteredTruck: boolean;
  // otros campos del perfil pueden ir aquí
  [key: string]: any;
}
