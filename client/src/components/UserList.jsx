import styles from './UserList.module.css'

// Generates a consistent color from a string (for avatar)
function colorFromName(name) {
  const colors = ['#00e5ff', '#a78bfa', '#34d399', '#f472b6', '#fbbf24', '#fb923c']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function UserList({ users, currentId }) {
  return (
    <div className={styles.wrap}>
      <p className={styles.title}>In this room · {users.length}</p>
      <div className={styles.list}>
        {users.map((u, i) => (
          <div key={u.id} className={styles.user}>
            <div
              className={styles.avatar}
              style={{ background: colorFromName(u.userName) }}
            >
              {u.userName[0].toUpperCase()}
            </div>
            <span className={styles.name}>
              {u.userName}
              {u.id === currentId && <span className={styles.you}> (you)</span>}
            </span>
            {i === 0 && <span className={styles.hostBadge}>host</span>}
          </div>
        ))}
      </div>
    </div>
  )
}