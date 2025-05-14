'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase-browser'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      console.log('✅ メールリンクから遷移')

      // ✅ セッションが生成されているか確認
      await new Promise(resolve => setTimeout(resolve, 1000)) // ラグ入れ

      const { data: { session }, error } = await supabase.auth.getSession()
      console.log('セッション:', session)
      console.log('エラー:', error)

      if (!session) {
        alert('セッションの取得に失敗しました。ログインページに戻ります。')
        router.push('/auth/login')
        return
      }

      // 成功時
      router.push('/dashboard')
    }

    handleCallback()
  }, [router])

  return <p>ログイン処理中です...</p>
}
