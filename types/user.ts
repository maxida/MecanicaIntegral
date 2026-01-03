// Tipos de usuario
export type UserRole = 'admin' | 'supervisor' | 'mecanico' | 'cliente';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  telefono?: string;
  createdAt: string;
  estado: 'activo' | 'inactivo';
}

export interface UsuarioLogin {
  username: string;
  email?: string;
  rol: UserRole;
  id: string;
  nombre: string;
}

export interface ClienteDuenoCamion extends Usuario {
  rol: 'cliente';
  empresa?: string;
  razonSocial?: string;
  cuit?: string;
  camiones?: string[]; // Array de IDs de camiones
}

export interface Camion {
  id: string;
  patente: string;
  modelo: string;
  año: number;
  marca: string;
  tipo: string;
  propietario_id: string;
  combustible: string;
  estado: 'disponible' | 'en_reparacion' | 'mantenimiento';
  createdAt: string;
}
