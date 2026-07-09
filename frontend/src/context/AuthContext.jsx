import { createContext, useContext, useReducer } from 'react'

const AuthContext = createContext(null)

const initialState = {
  token: localStorage.getItem('yis_token') || null,
  user: JSON.parse(localStorage.getItem('yis_user') || 'null'),
}

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      localStorage.setItem('yis_token', action.payload.token)
      localStorage.setItem('yis_user', JSON.stringify(action.payload.user))
      return { token: action.payload.token, user: action.payload.user }
    case 'LOGOUT':
      localStorage.removeItem('yis_token')
      localStorage.removeItem('yis_user')
      return { token: null, user: null }
    default:
      return state
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  const login = (token, user) => dispatch({ type: 'LOGIN', payload: { token, user } })
  const logout = () => dispatch({ type: 'LOGOUT' })

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
