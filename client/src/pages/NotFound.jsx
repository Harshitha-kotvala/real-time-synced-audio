import { useNavigate } from 'react-router-dom'
import styles from './NotFound.module.css'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className={styles.page}>
      <span className={styles.code}>404</span>
      <h1 className={styles.title}>Room not found</h1>
      <p className={styles.sub}>This room doesn't exist or has ended.</p>
      <button className={styles.btn} onClick={() => navigate('/')}>
        Back to home
      </button>
    </div>
  )
}