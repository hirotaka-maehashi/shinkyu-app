'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase-browser'
import styles from './page.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  // ログイン状態なら自動で /dashboard に遷移
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.push('/dashboard')
      }
    }
    checkSession()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'http://localhost:3000/dashboard', // 🔁 ここが追加ポイント！
      },
    })
    if (error) {
      setMessage('エラーが発生しました')
    } else {
      setMessage('ログインリンクをメールで送信しました')
    }
  }

  return (
    <main className={styles.main}>
      <h1>鍼灸APP ログイン</h1>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="メールアドレスを入力"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={styles.input}
        />
        <button type="submit" className={styles.button}>
          ログインリンクを送信
        </button>
      </form>
      {message && <p className={styles.message}>{message}</p>}
    </main>
  )
}
