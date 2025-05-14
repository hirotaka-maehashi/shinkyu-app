'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase-browser'
import styles from './page.module.css'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setMessageType('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL,
      },
    })

    if (error) {
      console.error('❌ サインアップ失敗:', error.message)
      setMessage('❌ 登録に失敗しました。すでに存在するか、形式が正しくありません。')
      setMessageType('error')
    } else {
      setMessage('✅ 登録成功！確認メールを確認してください')
      setMessageType('success')
      setTimeout(() => {
        router.push('/auth/signin') // 認証後にサインインページへ
      }, 1500)
    }
  }

  return (
    <main className={styles.main}>
      <h1>サインアップ</h1>
      <form onSubmit={handleSignUp}>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
          required
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          required
        />
        <button
          type="submit"
          className={styles.button}
          disabled={!email.trim() || !password.trim()}
        >
          登録
        </button>
      </form>
      {message && (
        <p className={`${styles.message} ${styles[messageType]}`}>
          {message}
        </p>
      )}
    </main>
  )
}
