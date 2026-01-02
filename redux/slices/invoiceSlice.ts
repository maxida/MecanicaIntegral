import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FormData } from '../../types';

interface InvoiceState {
  invoiceData: FormData | null;
  idPresupuesto: string;
  flagConFactura: boolean | null;
}

const initialState: InvoiceState = {
  invoiceData: null,
  idPresupuesto: '',
  flagConFactura: null
};

const invoiceSlice = createSlice({
  name: 'invoice',
  initialState,
  reducers: {
    saveInvoiceData: (state, action: PayloadAction<FormData | null>) => {
      state.invoiceData = action.payload;
    },
    setIdPresupuesto: (state, action) => {
      state.idPresupuesto = action.payload;
    },
    setFlagConFactura: (state, action) => {
      state.flagConFactura = action.payload;
    },
    clearFormData: () => {
      return initialState; // Esto restablece el estado a los valores iniciales
    },
  },
});

export const { saveInvoiceData, setIdPresupuesto, setFlagConFactura, clearFormData } = invoiceSlice.actions;
export default invoiceSlice.reducer;