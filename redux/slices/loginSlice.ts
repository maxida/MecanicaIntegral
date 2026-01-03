import { createSlice } from '@reduxjs/toolkit';
import { UsuarioLogin } from '@/types/user';

interface LoginState {
  user: UsuarioLogin | null;
  error: string | null;
  loading: boolean;
  rol: 'admin' | 'supervisor' | 'mecanico' | 'cliente' | null;
}

const initialState: LoginState = {
  user: null,
  error: null,
  loading: false,
  rol: null,
};

const loginSlice = createSlice({
  name: 'login',
  initialState,
  reducers: {
    login: (state, action) => {
      state.user = action.payload.usuario;
      state.rol = action.payload.rol;
      state.error = null;
    },
    loginFailure: (state, action) => {
      state.error = action.payload.error;
      state.user = null;
      state.rol = null;
    },
    logout: (state) => {
      state.user = null;
      state.error = null;
      state.rol = null;
    },
    setRol: (state, action) => {
      state.rol = action.payload;
    },
  },
});

export const { login, loginFailure, logout, setRol } = loginSlice.actions;
export default loginSlice.reducer;