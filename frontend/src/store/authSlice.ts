import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  token: string | null
  role: string | null
  username: string | null
}

const initialState: AuthState = {
  token: localStorage.getItem('token'),
  role: localStorage.getItem('role'),
  username: localStorage.getItem('username'),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ token: string; role: string; username: string }>,
    ) {
      state.token = action.payload.token
      state.role = action.payload.role
      state.username = action.payload.username
      localStorage.setItem('token', action.payload.token)
      localStorage.setItem('role', action.payload.role)
      localStorage.setItem('username', action.payload.username)
    },
    logout(state) {
      state.token = null
      state.role = null
      state.username = null
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('username')
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer
