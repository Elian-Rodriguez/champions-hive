import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  token: string | null
  role: string | null
  username: string | null
  userId: string | null
  /** El soporte reseteó la clave: la app obliga a cambiarla antes de seguir. */
  mustChangePassword: boolean
}

const initialState: AuthState = {
  token: localStorage.getItem('token'),
  role: localStorage.getItem('role'),
  username: localStorage.getItem('username'),
  userId: localStorage.getItem('userId'),
  mustChangePassword: localStorage.getItem('mustChangePassword') === '1',
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{
        token: string
        role: string
        username: string
        userId?: string
        mustChangePassword?: boolean
      }>,
    ) {
      state.token = action.payload.token
      state.role = action.payload.role
      state.username = action.payload.username
      state.userId = action.payload.userId || null
      state.mustChangePassword = !!action.payload.mustChangePassword
      localStorage.setItem('token', action.payload.token)
      localStorage.setItem('role', action.payload.role)
      localStorage.setItem('username', action.payload.username)
      if (action.payload.userId) localStorage.setItem('userId', action.payload.userId)
      else localStorage.removeItem('userId')
      if (action.payload.mustChangePassword) localStorage.setItem('mustChangePassword', '1')
      else localStorage.removeItem('mustChangePassword')
    },
    passwordChanged(state) {
      state.mustChangePassword = false
      localStorage.removeItem('mustChangePassword')
    },
    logout(state) {
      state.token = null
      state.role = null
      state.username = null
      state.userId = null
      state.mustChangePassword = false
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('username')
      localStorage.removeItem('userId')
      localStorage.removeItem('mustChangePassword')
    },
  },
})

export const { setCredentials, passwordChanged, logout } = authSlice.actions
export default authSlice.reducer
