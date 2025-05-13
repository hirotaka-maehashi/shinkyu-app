'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase-browser'
import styles from './page.module.css'

export default function PatientStatusPage() {
  const [rows, setRows] = useState<any[]>([])
  const [form, setForm] = useState({
    status_type: '',
    status_date: '',
    name: '',
    age: 0,
    gender: '',
    disease: '',
    reason: ''
  })
  const [workDays, setWorkDays] = useState<number>(0)

// その他ステータス取得
useEffect(() => {
  const fetchStatus = async () => {
    const { data, error } = await supabase.from('sonota').select('*')
    if (error) console.error('取得エラー:', error)
    else setRows(data || [])
  }
  fetchStatus()
}, [])

// 稼働日数取得（monthly_workdaysから）
const [monthlyWorkDays, setMonthlyWorkDays] = useState<any[]>([])

useEffect(() => {
  const fetchWorkDays = async () => {
    const { data, error } = await supabase.from('monthly_workdays').select('*')
    if (error) console.error('稼働日数取得エラー:', error)
    else setMonthlyWorkDays(data || [])
  }
  fetchWorkDays()
}, [])

const handleWorkDaysInsert = async () => {
  const today = new Date()
  const yearMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`

const { error } = await supabase.from('monthly_workdays').upsert([
  {
    year_month: yearMonth,
    work_days: workDays
  }
], {
  onConflict: 'year_month'  // ✅ 配列ではなく文字列で指定
})

  if (error) {
    console.error('保存エラー:', error)
  } else {
    alert(`✅ ${yearMonth} の稼働日数 ${workDays}日 を保存しました`)
    const { data, error: fetchError } = await supabase.from('monthly_workdays').select('*')
    if (fetchError) {
      console.error('取得エラー:', fetchError)
    } else {
      setMonthlyWorkDays(data || [])
    }
  }
}

  const handleInsert = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('sonota').insert([{ ...form }])
    if (error) {
      console.error('登録エラー:', error)
    } else {
      alert('✅ 登録完了')
      setForm({
        status_type: '',
        status_date: '',
        name: '',
        age: 0,
        gender: '',
        disease: '',
        reason: ''
      })
      const { data } = await supabase.from('sonota').select('*')
      setRows(data || [])
    }
  }

 return (
  <main className={styles.container}>
    <h1 className={styles.heading}>🗂 その他ステータス管理ページ</h1>

    {/* 横並び2カラム：稼働日数＋フォーム */}
    <div className={styles.flexRow}>
      {/* 稼働日数表示と入力 */}
      <div className={styles.cardCompact}>
        <h2>📅 今月の稼働日数</h2>
        {monthlyWorkDays
          .sort((a, b) => b.year_month.localeCompare(a.year_month))
          .slice(0, 1)
          .map(row => (
            <p key={row.year_month}><strong>{row.work_days}日</strong></p>
        ))}

        <label>🗓 当月の稼働日数（共通入力）</label>
        <input
          type="number"
          placeholder="例：8"
          value={workDays}
          onChange={e => setWorkDays(Number(e.target.value))}
        />
        <button type="button" onClick={handleWorkDaysInsert}>稼働日数を登録</button>
      </div>

      {/* 新規登録フォーム */}
      <form onSubmit={handleInsert} className={styles.cardCompact}>
        <h2>新規登録フォーム</h2>

        <label>ステータス</label>
        <select value={form.status_type} onChange={e => setForm({ ...form, status_type: e.target.value })}>
          <option value="">選択してください</option>
          <option value="新規">新規</option>
          <option value="再開">再開</option>
          <option value="休止">休止</option>
          <option value="中止">中止</option>
          <option value="体験成約">体験成約</option>
          <option value="体験不成約">体験不成約</option>
        </select>

        <label>年月日</label>
        <input type="date" value={form.status_date} onChange={e => setForm({ ...form, status_date: e.target.value })} />

        <label>氏名</label>
        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

        <label>年齢（例：65歳）</label>
        <input type="number" placeholder="65" value={form.age} onChange={e => setForm({ ...form, age: Number(e.target.value) })} />

        <label>性別</label>
        <input type="text" placeholder="例：女性" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} />

        <label>主な疾患</label>
        <input type="text" value={form.disease} onChange={e => setForm({ ...form, disease: e.target.value })} />

        <label>理由</label>
        <input type="text" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />

        <button type="submit">登録する</button>
      </form>
    </div>

    {/* 一覧テーブル */}
    <h2 style={{ marginTop: '2rem' }}>📋 登録一覧</h2>
    <table className={styles.table}>
      <thead>
        <tr>
          <th>ステータス</th>
          <th>年月日</th>
          <th>氏名</th>
          <th>年齢</th>
          <th>性別</th>
          <th>主な疾患</th>
          <th>理由</th>
        </tr>
      </thead>
      <tbody>
        {rows
          .filter(row => row.status_type !== '稼働日数')
          .map((row) => (
            <tr key={row.id}>
              <td>{row.status_type}</td>
              <td>{row.status_date}</td>
              <td>{row.name}</td>
              <td>{row.age}</td>
              <td>{row.gender}</td>
              <td>{row.disease}</td>
              <td>{row.reason}</td>
            </tr>
        ))}
      </tbody>
    </table>

    <div style={{ marginTop: '2rem' }}>
      <a href="/dashboard" className={styles.backButton}>
        ← ダッシュボードに戻る
      </a>
    </div>
  </main>
)
};  