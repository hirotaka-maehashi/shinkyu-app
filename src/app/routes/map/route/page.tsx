'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { supabase } from '@/utils/supabase-browser'
import styles from './page.module.css' // ← 相対パスを route フォルダ内に

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

export default function RouteMapPage() {
  const [staffs, setStaffs] = useState<any[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([])

useEffect(() => {
  const fetchStaffs = async () => {
    const { data, error } = await supabase.from('staffs').select('id, name')
    if (!error && data) {
      setStaffs(data)
      setStaffList(data) // 🔧 必須！
    }
  }
  fetchStaffs()
}, [])

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>担当者別ルート確認マップ</h1>

      <div className={styles.controls}>
<select value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)}>
  <option value="ALL">全スタッフ</option>
  {staffList.map(staff => (
    <option key={staff.id} value={staff.id}>{staff.name}</option>
  ))}
</select>


        <input
          type="date"
          value={selectedDate.toISOString().split('T')[0]}
          onChange={e => setSelectedDate(new Date(e.target.value))}
        />
      </div>

      <MapView selectedStaffId={selectedStaffId} selectedDate={selectedDate} />

      <div className={styles.backButtonWrapper}>
        <Link href="/dashboard" className={styles.backButton}>
          ← ダッシュボードに戻る
        </Link>
      </div>
    </main>
  )
}
