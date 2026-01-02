import { configureStore } from '@reduxjs/toolkit';
import loginReducer from './slices/loginSlice';
import invoiceSlice  from './slices/invoiceSlice';

export const store = configureStore({
  reducer: {
    login: loginReducer,
    invoice: invoiceSlice,
  },
});