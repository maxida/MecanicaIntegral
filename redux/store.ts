import { configureStore } from '@reduxjs/toolkit';
import loginReducer from './slices/loginSlice';
import invoiceSlice  from './slices/invoiceSlice';
import turnosReducer from './slices/turnosSlice';
import solicitudesReducer from './slices/solicitudesSlice';

export const store = configureStore({
  reducer: {
    login: loginReducer,
    invoice: invoiceSlice,
    turnos: turnosReducer,
    solicitudes: solicitudesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;