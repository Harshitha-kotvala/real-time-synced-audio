import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import HomePage from './pages/HomePage'
import RoomPage from './pages/RoomPage'
import NotFound from './pages/NotFound'
import AuthPage from './pages/AuthPage'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function useAuthStatus() {
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let active = true

    async function checkAuth() {
      try {
        const res = await fetch(`${API}/auth/me`, { credentials: 'include' })
        if (!active) return
        setAuthed(res.ok)
      } catch {
        if (!active) return
        setAuthed(false)
      } finally {
        if (!active) return
        setLoading(false)
      }
    }

    checkAuth()
    return () => {
      active = false
    }
  }, [])

  return { loading, authed }
}

function ProtectedRoute({ children }) {
  const { loading, authed } = useAuthStatus()
  if (loading) return <div style={{ padding: 24 }}>Checking session...</div>
  if (!authed) return <Navigate to="/auth" replace />
  return children
}

function AuthRoute() {
  const { loading, authed } = useAuthStatus()
  if (loading) return <div style={{ padding: 24 }}>Checking session...</div>
  if (authed) return <Navigate to="/" replace />
  return <AuthPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthRoute />} />
        <Route
          path="/"
          element={(
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/room/:roomId"
          element={(
            <ProtectedRoute>
              <RoomPage />
            </ProtectedRoute>
          )}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
