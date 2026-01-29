import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Interface para Solicitud (lo que ve el Mecánico)
export interface Solicitud {
  id: string;
  turnoId: string;
  // Vehículo
  numeroPatente: string;
  modelo?: string | null;
  marca?: string | null;
  // Contexto del reporte
  sintomas?: string[];
  fotoUrl?: string | null;
  kilometraje?: string | null;
  nivelNafta?: string | null;
  chofer?: string | null;
  // Instrucciones del Admin
  notasAdmin: string;
  descripcion?: string;
  tipo: string;
  prioridad: number;
  // Asignación
  mecanicoAsignado: string;
  mecanicoNombre?: string | null;
  // Estado del trabajo
  estado: 'pendiente_inicio' | 'en_progreso' | 'pausada' | 'finalizada';
  // Timestamps
  createdAt: any; // Firestore Timestamp
  fechaDerivacion?: string;
  fechaInicioTrabajo?: string | null;
  fechaFinTrabajo?: string | null;
  // Checklist/Reporte del mecánico
  reporteMecanico?: any;
}

interface SolicitudesState {
  solicitudes: Solicitud[];
  loading: boolean;
  error: string | null;
}

const initialState: SolicitudesState = {
  solicitudes: [],
  loading: false,
  error: null,
};

const solicitudesSlice = createSlice({
  name: 'solicitudes',
  initialState,
  reducers: {
    setSolicitudes: (state, action: PayloadAction<Solicitud[]>) => {
      state.solicitudes = action.payload;
      state.error = null;
    },
    agregarSolicitud: (state, action: PayloadAction<Solicitud>) => {
      state.solicitudes.unshift(action.payload);
    },
    actualizarSolicitud: (state, action: PayloadAction<Partial<Solicitud> & { id: string }>) => {
      const index = state.solicitudes.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        state.solicitudes[index] = { ...state.solicitudes[index], ...action.payload };
      }
    },
    eliminarSolicitud: (state, action: PayloadAction<string>) => {
      state.solicitudes = state.solicitudes.filter(s => s.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { 
  setSolicitudes, 
  agregarSolicitud, 
  actualizarSolicitud, 
  eliminarSolicitud,
  setLoading,
  setError,
} = solicitudesSlice.actions;

export default solicitudesSlice.reducer;
