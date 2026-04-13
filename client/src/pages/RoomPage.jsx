import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import YouTube from 'react-youtube'
import { io } from 'socket.io-client'
import Chat from '../components/Chat'
import UserList from '../components/UserList'
import styles from './RoomPage.module.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function extractVideoId(input) {
  const patterns = [/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/]

  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match) return match[1]
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim()
  return null
}

export default function RoomPage() {
  const { roomId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const socketRef = useRef(null)
  const playerRef = useRef(null)

  const [isHost, setIsHost] = useState(false)
  const [users, setUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [videoId, setVideoId] = useState(null)
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const [connected, setConnected] = useState(false)
  const [copied, setCopied] = useState(false)
  const [userName, setUserName] = useState(sessionStorage.getItem('userName') || 'Guest')
  const [roomAccess, setRoomAccess] = useState({
    isPrivate: false,
    inviteOnly: false,
    hasPassword: false,
  })

  useEffect(() => {
    let active = true
    let socket
    const inviteFromUrl = new URLSearchParams(location.search).get('invite') || ''
    const inviteToken = inviteFromUrl || sessionStorage.getItem('roomInviteToken') || ''
    const roomPassword = sessionStorage.getItem('roomJoinPassword') || ''

    async function initRoom() {
      try {
        const meRes = await fetch(`${API}/auth/me`, { credentials: 'include' })
        if (!active) return

        if (!meRes.ok) {
          navigate('/auth')
          return
        }

        const meData = await meRes.json()
        const authName = meData.user.username
        setUserName(authName)
        sessionStorage.setItem('userName', authName)

        socket = io(API, { withCredentials: true })
        socketRef.current = socket

        socket.on('connect', () => {
          setConnected(true)
          socket.emit('join-room', {
            roomId,
            userName: authName,
            password: roomPassword,
            inviteToken,
          })
        })

        socket.on('room-joined', ({ room, isHost: hostStatus }) => {
          setIsHost(hostStatus)
          setUsers(room.users)
          if (room.access) setRoomAccess(room.access)
          if (Array.isArray(room.recentMessages)) setMessages(room.recentMessages)
          if (room.state.videoId) setVideoId(room.state.videoId)
          sessionStorage.setItem('roomRole', hostStatus ? 'host' : 'listener')
        })

        socket.on('error', ({ message }) => {
          alert(message)
          navigate('/')
        })

        socket.on('user-joined', ({ users: nextUsers }) => setUsers(nextUsers))
        socket.on('user-left', ({ users: nextUsers }) => setUsers(nextUsers))
        socket.on('host-changed', ({ users: nextUsers }) => {
          setUsers(nextUsers)
          if (socketRef.current?.id === nextUsers[0]?.id) {
            setIsHost(true)
            sessionStorage.setItem('roomRole', 'host')
          }
        })

        socket.on('sync-state', ({ action, timestamp, playing, serverTime }) => {
          const player = playerRef.current
          if (!player) return

          const latency = (Date.now() - serverTime) / 1000
          const seekTo = timestamp + latency

          if (action === 'play') {
            player.seekTo(seekTo, true)
            player.playVideo()
          } else if (action === 'pause') {
            player.seekTo(seekTo, true)
            player.pauseVideo()
          } else if (action === 'seek') {
            player.seekTo(seekTo, true)
            if (playing) player.playVideo()
          }
        })

        socket.on('request-sync', ({ requesterId }) => {
          const player = playerRef.current
          if (!player) return

          socket.emit('sync-response', {
            requesterId,
            timestamp: player.getCurrentTime(),
            playing: player.getPlayerState() === 1,
          })
        })

        socket.on('video-changed', ({ videoId: nextVideoId }) => {
          setVideoId(nextVideoId)
        })

        socket.on('chat-message', (msg) => {
          setMessages((prev) => [...prev, msg])
        })

        socket.on('disconnect', () => setConnected(false))
      } catch {
        if (!active) return
        navigate('/auth')
      }
    }

    initRoom()

    return () => {
      active = false
      if (socket) socket.disconnect()
    }
  }, [location.search, navigate, roomId])

  function handlePlayerReady(event) {
    playerRef.current = event.target
  }

  function handlePlay() {
    if (!isHost || !playerRef.current) return
    socketRef.current.emit('play', { timestamp: playerRef.current.getCurrentTime() })
  }

  function handlePause() {
    if (!isHost || !playerRef.current) return
    socketRef.current.emit('pause', { timestamp: playerRef.current.getCurrentTime() })
  }

  function handleSeek() {
    if (!isHost || !playerRef.current) return

    const player = playerRef.current
    clearTimeout(window._seekTimeout)
    window._seekTimeout = setTimeout(() => {
      socketRef.current.emit('seek', { timestamp: player.getCurrentTime() })
    }, 300)
  }

  function handleVideoSubmit(event) {
    event.preventDefault()
    const id = extractVideoId(urlInput.trim())

    if (!id) {
      setUrlError('Paste a valid YouTube link or video ID')
      return
    }

    setUrlError('')
    setUrlInput('')
    socketRef.current.emit('video-change', { videoId: id })
  }

  function handleSendMessage(text) {
    socketRef.current.emit('chat-message', { text })
  }

  function copyLink() {
    const inviteToken = sessionStorage.getItem('roomInviteToken') || ''
    const copyUrl = inviteToken
      ? `${window.location.origin}/room/${roomId}?invite=${inviteToken}`
      : `${window.location.origin}/room/${roomId}`

    navigator.clipboard.writeText(copyUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleLogout() {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' })
    sessionStorage.clear()
    navigate('/auth')
  }

  const playerOpts = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      controls: isHost ? 1 : 0,
      modestbranding: 1,
      rel: 0,
    },
  }

  const privacyLabel = roomAccess.isPrivate ? 'Private' : 'Public'
  const accessLabel = roomAccess.inviteOnly ? `${privacyLabel} - Invite-only` : privacyLabel

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>TuneIn</span>
          <span className={`${styles.badge} ${connected ? styles.live : styles.offline}`}>
            {connected ? 'Live' : 'Reconnecting'}
          </span>
        </div>
        <div className={styles.headerRight}>
          <span
            className={`${styles.privacyBadge} ${roomAccess.isPrivate ? styles.privateBadge : styles.publicBadge}`}
          >
            {accessLabel}
          </span>
          <span className={styles.roomCode}>{roomId}</span>
          <button className={styles.copyBtn} onClick={copyLink}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button className={styles.copyBtn} onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.playerCol}>
          <div className={styles.playerWrap}>
            {videoId ? (
              <YouTube
                videoId={videoId}
                opts={playerOpts}
                onReady={handlePlayerReady}
                onPlay={handlePlay}
                onPause={handlePause}
                onStateChange={handleSeek}
                className={styles.ytPlayer}
              />
            ) : (
              <div className={styles.playerEmpty}>
                <span className={styles.emptyIcon}>?</span>
                <p>No video loaded yet</p>
                <p className={styles.emptyHint}>
                  {isHost
                    ? 'Paste a YouTube link below to start the room.'
                    : 'Waiting for the host to add a video...'}
                </p>
              </div>
            )}
          </div>

          {isHost && (
            <form className={styles.urlForm} onSubmit={handleVideoSubmit}>
              <input
                className={styles.urlInput}
                placeholder="Paste a YouTube link..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <button className={styles.urlBtn} type="submit">Load</button>
              {urlError && <p className={styles.urlError}>{urlError}</p>}
            </form>
          )}

          {!isHost && (
            <p className={styles.guestNote}>
              You are a listener - the host controls playback.
            </p>
          )}
        </div>

        <div className={styles.sideCol}>
          <UserList users={users} currentId={socketRef.current?.id} />
          <Chat messages={messages} onSend={handleSendMessage} userName={userName} />
        </div>
      </div>
    </div>
  )
}
