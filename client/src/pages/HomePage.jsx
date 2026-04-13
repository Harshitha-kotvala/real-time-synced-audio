import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './HomePage.module.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function parseRoomInput(rawValue) {
  const value = rawValue.trim()
  if (!value) return { roomId: '', inviteToken: '' }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const url = new URL(value)
      const parts = url.pathname.split('/').filter(Boolean)
      const roomId = parts[0] === 'room' ? parts[1] || '' : ''
      return {
        roomId,
        inviteToken: url.searchParams.get('invite') || '',
      }
    } catch {
      return { roomId: value, inviteToken: '' }
    }
  }

  return { roomId: value, inviteToken: '' }
}

export default function HomePage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('create')
  const [joinCode, setJoinCode] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [createPassword, setCreatePassword] = useState('')
  const [inviteOnly, setInviteOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [me, setMe] = useState(null)
  const [inviteInfo, setInviteInfo] = useState('')

  const parsedJoin = useMemo(() => parseRoomInput(joinCode), [joinCode])

  useEffect(() => {
    let active = true

    async function loadMe() {
      try {
        const res = await fetch(`${API}/auth/me`, { credentials: 'include' })
        if (!active) return
        if (!res.ok) {
          navigate('/auth')
          return
        }

        const data = await res.json()
        setMe(data.user)
        sessionStorage.setItem('userName', data.user.username)
      } catch {
        if (!active) return
        navigate('/auth')
      }
    }

    loadMe()
    return () => {
      active = false
    }
  }, [navigate])

  async function handleCreate(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setInviteInfo('')

    try {
      const body = {
        privacy,
        password: privacy === 'private' ? createPassword : '',
        inviteOnly,
      }

      const res = await fetch(`${API}/room/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not create room')
        return
      }

      sessionStorage.setItem('roomRole', 'host')
      sessionStorage.setItem('roomJoinPassword', body.password || '')
      sessionStorage.setItem('roomInviteToken', data.inviteToken || '')

      if (data.inviteUrl) {
        setInviteInfo(data.inviteUrl)
      }

      const roomUrl = data.inviteToken
        ? `/room/${data.roomId}?invite=${data.inviteToken}`
        : `/room/${data.roomId}`

      navigate(roomUrl)
    } catch {
      setError('Could not create room. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(event) {
    event.preventDefault()
    if (!parsedJoin.roomId) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API}/room/${parsedJoin.roomId}/exists`, {
        credentials: 'include',
      })
      const data = await res.json()

      if (!res.ok || !data.exists) {
        setError(data.error || 'Room not found. Check the code and try again.')
        return
      }

      if (data.access?.inviteOnly && !parsedJoin.inviteToken) {
        setError('This room is invite-only. Paste the full invite link.')
        return
      }

      if (data.access?.hasPassword && !joinPassword.trim()) {
        setError('This room is private. Enter the room password.')
        return
      }

      sessionStorage.setItem('roomRole', 'listener')
      sessionStorage.setItem('roomJoinPassword', joinPassword.trim())
      sessionStorage.setItem('roomInviteToken', parsedJoin.inviteToken || '')

      const roomUrl = parsedJoin.inviteToken
        ? `/room/${parsedJoin.roomId}?invite=${parsedJoin.inviteToken}`
        : `/room/${parsedJoin.roomId}`

      navigate(roomUrl)
    } catch {
      setError('Could not reach server. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await fetch(`${API}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
    sessionStorage.clear()
    navigate('/auth')
  }

  if (!me) {
    return <div className={styles.page}>Loading account...</div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <div className={styles.hero}>
        <div className={styles.logoRow}>
          
          <span className={styles.logoText}>TuneIn</span>
        </div>
        <h1 className={styles.headline}>
          Listen together,<br />
          <span className={styles.accent}>anywhere.</span>
        </h1>
        <p className={styles.sub}>Signed in as <strong>{me.username}</strong></p>
        <button className={styles.btn} type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'create' ? styles.tabActive : ''}`}
            onClick={() => { setTab('create'); setError('') }}
            type="button"
          >
            Create room
          </button>
          <button
            className={`${styles.tab} ${tab === 'join' ? styles.tabActive : ''}`}
            onClick={() => { setTab('join'); setError('') }}
            type="button"
          >
            Join room
          </button>
        </div>

        {tab === 'create' ? (
          <form className={styles.form} onSubmit={handleCreate}>
            <label className={styles.label}>Host account</label>
            <input className={styles.input} value={me.username} disabled readOnly />

            <label className={styles.label}>Room privacy</label>
            <select
              className={styles.input}
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>

            {privacy === 'private' && (
              <>
                <label className={styles.label}>Room password (optional)</label>
                <input
                  className={styles.input}
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Set password"
                />
              </>
            )}

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={inviteOnly}
                onChange={(e) => setInviteOnly(e.target.checked)}
              />
              Invite-only link required
            </label>

            {inviteInfo && <p className={styles.info}>Invite link: {inviteInfo}</p>}
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.btn} disabled={loading}>
              {loading ? 'Creating...' : 'Create room'}
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleJoin}>
            <label className={styles.label}>Room code or invite link</label>
            <input
              className={`${styles.input} ${styles.mono}`}
              placeholder="e.g. xK9mPq or full invite URL"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              autoFocus
            />

            <label className={styles.label}>Room password (if private)</label>
            <input
              className={styles.input}
              type="password"
              placeholder="Enter room password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
            />

            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.btn} disabled={loading || !parsedJoin.roomId}>
              {loading ? 'Joining...' : 'Join room'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
