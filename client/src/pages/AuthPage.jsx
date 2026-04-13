import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './AuthPage.module.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function AuthPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [avatar, setAvatar] = useState('?')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const endpoint = tab === 'login' ? '/auth/login' : '/auth/register'
    const payload = tab === 'login'
      ? { username: username.trim(), password }
      : { username: username.trim(), password, avatar: avatar.trim() || '?' }

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Authentication failed')
        return
      }

      sessionStorage.setItem('userName', data.user.username)
      navigate('/')
    } catch {
      setError('Could not reach server. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>TuneIn</h1>
        <p className={styles.sub}>Sign in to create or join synced rooms.</p>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'login' ? styles.active : ''}`}
            onClick={() => setTab('login')}
            type="button"
          >
            Login
          </button>
          <button
            className={`${styles.tab} ${tab === 'register' ? styles.active : ''}`}
            onClick={() => setTab('register')}
            type="button"
          >
            Register
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>Username</label>
          <input
            className={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            minLength={3}
            maxLength={24}
            required
          />

          <label className={styles.label}>Password</label>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            minLength={6}
            required
          />

          {tab === 'register' && (
            <>
              <label className={styles.label}>Avatar</label>
              <input
                className={styles.input}
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="e.g. ?"
                maxLength={2}
              />
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.btn} disabled={loading || !username.trim() || password.length < 6}>
            {loading ? 'Please wait...' : tab === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  )
}
