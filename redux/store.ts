import { configureStore } from '@reduxjs/toolkit';
import loginReducer from './slices/loginSlice';
import invoiceSlice  from './slices/invoiceSlice';
import turnosReducer from './slices/turnosSlice';

export const store = configureStore({
  reducer: {
    login: loginReducer,
    invoice: invoiceSlice,
    turnos: turnosReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;