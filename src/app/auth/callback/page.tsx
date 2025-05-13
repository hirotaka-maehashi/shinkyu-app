'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase-browser'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      console.log('セッション情報:', session)
      console.log('エラー情報:', error) // ← ここ追加

      if (session) {
        router.push('/dashboard')
      } else {
        alert('ログイン認証に失敗しました')
        router.push('/')
      }
    }

    handleAuth()
  }, [])

  return <p>ログイン処理中です...</p>
}
