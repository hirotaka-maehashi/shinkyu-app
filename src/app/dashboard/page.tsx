'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase-browser'
import styles from './page.module.css'

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      await new Promise((r) => setTimeout(r, 300))
      const { data } = await supabase.auth.getUser()
      if (data.user?.email) {
        setUserEmail(data.user.email)
      }
    }

    fetchUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    location.href = '/'
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.heading}>鍼灸APP ダッシュボード</h1>

      <section className={styles.section}>
  <h2 className={styles.sectionTitle}>📅 今月の月報</h2>
  <div className={styles.cardGrid}>
    <div className={styles.card}>
      <p className={styles.cardLabel}>売上</p>
      <p className={styles.cardValue}>612,000円</p>
    </div>
    <div className={styles.card}>
      <p className={styles.cardLabel}>稼働日数</p>
      <p className={styles.cardValue}>18日</p>
    </div>
    <div className={styles.card}>
      <p className={styles.cardLabel}>売上予定</p>
      <p className={styles.cardValue}>840,000円</p>
    </div>
    <div className={styles.card}>
      <p className={styles.cardLabel}>今月の稼働日数</p>
      <p className={styles.cardValue}>22日</p>
    </div>
    <div className={styles.card}>
      <p className={styles.cardLabel}>先月比</p>
      <p className={styles.cardValue}>+7.0%</p>
    </div>
    <div className={styles.card}>
      <p className={styles.cardLabel}>患者数</p>
      <p className={styles.cardValue}>42名</p>
    </div>
    <div className={styles.card}>
      <p className={styles.cardLabel}>総施術回数</p>
      <p className={styles.cardValue}>110件</p>
    </div>
    <div className={styles.card}>
      <p className={styles.cardLabel}>欠席率</p>
      <p className={styles.cardValue}>6.2%</p>
    </div>
  </div>
</section>

      {/* 日報 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🗓 今日の日報</h2>
        <div className={styles.cardGrid}>
          <div className={styles.card}><p className={styles.cardLabel}>実施件数</p><p className={styles.cardValue}>13件</p></div>
          <div className={styles.card}><p className={styles.cardLabel}>売上</p><p className={styles.cardValue}>65,000円</p></div>
          <div className={styles.card}><p className={styles.cardLabel}>欠席</p><p className={styles.cardValue}>1件（7.7%）</p></div>
        </div>
        <h3 className={styles.subTitle}>👥 担当者別内訳</h3>
        <div className={styles.cardGrid}>
          <div className={styles.card}><p className={styles.cardLabel}>山田太郎</p><p className={styles.cardValue}>5件 / ¥25,000</p></div>
          <div className={styles.card}><p className={styles.cardLabel}>佐藤花子</p><p className={styles.cardValue}>4件 / ¥20,000</p></div>
          <div className={styles.card}><p className={styles.cardLabel}>石川涼</p><p className={styles.cardValue}>4件 / ¥20,000</p></div>
        </div>
      </section>

      <section className={styles.section}>
  <h2 className={styles.sectionTitle}>👩‍⚕️ 先生ごとの実績</h2>
  <div className={styles.cardGrid}>
    {/* 山田太郎 */}
    <div className={styles.card}>
      <p className={styles.cardLabel}>山田太郎</p>
      <p className={styles.cardSub}>実績：32件 / ¥160,000</p>
      <p className={styles.cardSub}>予測：40件 / ¥200,000</p>
    </div>

    {/* 佐藤花子 */}
    <div className={styles.card}>
      <p className={styles.cardLabel}>佐藤花子</p>
      <p className={styles.cardSub}>実績：27件 / ¥135,000</p>
      <p className={styles.cardSub}>予測：36件 / ¥180,000</p>
    </div>

    {/* 石川涼 */}
    <div className={styles.card}>
      <p className={styles.cardLabel}>石川涼</p>
      <p className={styles.cardSub}>実績：35件 / ¥175,000</p>
      <p className={styles.cardSub}>予測：42件 / ¥210,000</p>
    </div>
  </div>
</section>


      {/* 同意書回収セクション */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>📄 今月の同意書回収</h2>
        <ul className={styles.checkList}>
          <li>鈴木一郎さん <button className={styles.doneButton}>回収完了</button></li>
          <li>田中美咲さん <button className={styles.doneButton}>回収完了</button></li>
        </ul>
      </section>

      {/* ユーザー表示＋ログアウト */}
      {userEmail && <p className={styles.paragraph}>ログイン中：{userEmail}</p>}
      <button className={styles.button} onClick={handleLogout}>ログアウト</button>
    </main>
  )
}
