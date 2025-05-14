'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase-browser'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      if (!code) {
        alert('認証コードが見つかりませんでした。')
        router.push('/')
        return
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('認証エラー:', error.message)
        alert('認証に失敗しました。')
        router.push('/')
        return
      }

      // セッション取得後にダッシュボードへ
      router.push('/dashboard')
    }

    handleCallback()
  }, [router])

  return <p>ログイン処理中です...</p>
}
