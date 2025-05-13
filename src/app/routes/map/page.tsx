'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import styles from './page.module.css'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

export default function MapPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>訪問ルート確認マップ</h1>

      <div className={styles.mapWrapper}>
        <MapView />
      </div>

      <div className={styles.backButtonWrapper}>
        <Link href="/dashboard" className={styles.backButton}>
          ← ダッシュボードに戻る
        </Link>
      </div>
    </main>
  )
}
