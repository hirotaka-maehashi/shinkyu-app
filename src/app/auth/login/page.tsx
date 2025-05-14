'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase-browser'
import styles from './login.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')
  const router = useRouter()

  const handleLogin = async () => {
    setMessage('')
    setMessageType('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('❌ ログイン失敗:', error.message)
      setMessage('メールアドレスまたはパスワードが正しくありません。')
      setMessageType('error')
    } else {
      setMessage('ログインに成功しました！')
      setMessageType('success')
      setTimeout(() => {
        router.push('/dashboard')
      }, 800)
    }
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>ログイン</h1>

      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className={styles.input}
      />

      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className={styles.input}
      />

      <button
        onClick={handleLogin}
        disabled={!email.trim() || !password.trim()}
        className={styles.button}
      >
        ログイン
      </button>

      {message && (
        <p className={`${styles.message} ${styles[messageType]}`}>
          {message}
        </p>
      )}
    </main>
  )
}
