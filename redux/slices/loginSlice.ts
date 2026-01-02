import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  error: null,
  loading: false,
};

const loginSlice = createSlice({
  name: 'login',
  initialState,
  reducers: {
    login: (state, action) => {
      state.user = action.payload;
      state.error = null;
    },
    loginFailure: (state, action) => {
      state.error = action.payload.error;
      state.user = null;
    },
    logout: (state) => {
      state.user = null;
      state.error = null;
    },
  },
});

export const { login, loginFailure, logout } = loginSlice.actions;
export default loginSlice.reducer;