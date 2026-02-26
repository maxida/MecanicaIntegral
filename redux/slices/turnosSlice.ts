import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Turno {
  id: string;
  numeroPatente: string;
  fechaReparacion: string;
  horaReparacion: string;
  descripcion: string;
  estado: 'pending' | 'scheduled' | 'in_progress' | 'completed';
  fechaCreacion: string;
  mecanico?: string | null;
  mecanicoId?: string | null;
  mecanicoNombre?: string | null;
  prioridad?: number;
  clienteId?: string;
  chofer?: string;
  comentariosChofer?: string | null;
  reporteSupervisor?: string | null;
  tipo?: string;
  tipoIngreso?: string | null;
  instruccionesAdmin?: string | null;
  numeroOT?: string | null;
  horasEstimadas?: number | null;
  sintomas?: string[] | null;
  fotoTablero?: string | null;
  fotoTableroIngreso?: string | null;
  fechaInicioTrabajo?: string | null;
  fechaFinTrabajo?: string | null;
  fechaInicioReal?: string | null;
  fechaFinReal?: string | null;
  tiempoTrabajado?: number; // en minutos
  notasMecanico?: string;
  diagnosticoMecanico?: string | null;
}

interface TurnosState {
  turnos: Turno[];
  loading: boolean;
  error: string | null;
}

const initialState: TurnosState = {
  turnos: [],
  loading: false,
  error: null,
};

const turnosSlice = createSlice({
  name: 'turnos',
  initialState,
  reducers: {
    setTurnos: (state, action: PayloadAction<Turno[]>) => {
      state.turnos = action.payload;
      state.error = null;
    },
    agregarTurno: (state, action: PayloadAction<Turno>) => {
      state.turnos.push(action.payload);
    },
    actualizarTurno: (state, action: PayloadAction<Turno>) => {
      const index = state.turnos.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.turnos[index] = action.payload;
      }
    },
    eliminarTurno: (state, action: PayloadAction<string>) => {
      state.turnos = state.turnos.filter(t => t.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setTurnos, agregarTurno, actualizarTurno, eliminarTurno, setLoading, setError } = turnosSlice.actions;
export default turnosSlice.reducer;
