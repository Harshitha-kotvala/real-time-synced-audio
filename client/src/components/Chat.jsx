import { useEffect, useRef, useState } from 'react'
import styles from './Chat.module.css'

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function Chat({ messages, onSend, userName }) {
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.title}>Chat</p>

      <div className={styles.messages}>
        {messages.length === 0 && (
          <p className={styles.empty}>No messages yet. Say hi!</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={styles.msg}>
            <span className={styles.msgName}>{m.userName}</span>
            <span className={styles.msgTime}>{formatTime(m.sentAt)}</span>
            <p className={styles.msgText}>{m.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className={styles.inputRow} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          placeholder="Say something..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={300}
        />
        <button className={styles.sendBtn} type="submit" disabled={!text.trim()}>
          ↑
        </button>
      </form>
    </div>
  )
}