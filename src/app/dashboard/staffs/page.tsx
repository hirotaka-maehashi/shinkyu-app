// 上書きコード: 自動ルート作成対象（auto_schedule）列をテーブルに追加
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase-browser'
import styles from './page.module.css'
import Link from 'next/link'

export default function StaffDashboardPage() {
  const [staffs, setStaffs] = useState<any[]>([])
  const [name, setName] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [workingDays, setWorkingDays] = useState('月,火,水,木,金')
  const [skillLevel, setSkillLevel] = useState('1')
  const [workingStartAm, setWorkingStartAm] = useState('09:00')
  const [workingEndAm, setWorkingEndAm] = useState('12:00')
  const [workingStartPm, setWorkingStartPm] = useState('13:00')
  const [workingEndPm, setWorkingEndPm] = useState('18:00')
  const [autoSchedule, setAutoSchedule] = useState(true)

  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})

  const fetchStaffs = async () => {
    const { data } = await supabase.from('staffs').select('*').order('created_at', { ascending: false })
    if (data) {
      const fixed = data.map(s => ({ ...s, auto_schedule: s.auto_schedule ?? false }))
      setStaffs(fixed)
    }
  }  

  const handleAdd = async () => {
    if (!name || !lat || !lng) return alert('すべての必須項目を入力してください')
    await supabase.from('staffs').insert({
      name,
      home_lat: parseFloat(lat),
      home_lng: parseFloat(lng),
      working_days: workingDays,
      skill_level: parseInt(skillLevel),
      working_start_am: workingStartAm,
      working_end_am: workingEndAm,
      working_start_pm: workingStartPm,
      working_end_pm: workingEndPm,
      auto_schedule: autoSchedule
    })
    setName(''); setLat(''); setLng(''); setWorkingDays('月,火,水,木,金')
    setSkillLevel('1')
    setWorkingStartAm('09:00'); setWorkingEndAm('12:00')
    setWorkingStartPm('13:00'); setWorkingEndPm('18:00')
    setAutoSchedule(true)
    fetchStaffs()
  }

  const handleEdit = (staff: any) => {
    setEditId(staff.id)
    setEditData({ ...staff })
  }

  const handleEditChange = (field: string, value: string | boolean) => {
    setEditData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!editId) return
    await supabase.from('staffs').update({
      name: editData.name,
      home_lat: parseFloat(editData.home_lat),
      home_lng: parseFloat(editData.home_lng),
      working_days: editData.working_days,
      skill_level: parseInt(editData.skill_level),
      working_start_am: editData.working_start_am,
      working_end_am: editData.working_end_am,
      working_start_pm: editData.working_start_pm,
      working_end_pm: editData.working_end_pm,
      auto_schedule: editData.auto_schedule
    }).eq('id', editId)
    setEditId(null)
    setEditData({})
    fetchStaffs()
  }

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('この施術者情報を削除してもよろしいですか？')
    if (!confirmDelete) return
    await supabase.from('staffs').delete().eq('id', id)
    fetchStaffs()
  }

  useEffect(() => {
    fetchStaffs()
  }, [])

  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>施術者情報の管理</h1>

      <div className={styles.form}>
        <input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="氏名" />
        <input className={styles.input} value={lat} onChange={e => setLat(e.target.value)} placeholder="緯度" />
        <input className={styles.input} value={lng} onChange={e => setLng(e.target.value)} placeholder="経度" />
        <input className={styles.input} value={workingDays} onChange={e => setWorkingDays(e.target.value)} placeholder="稼働曜日（例：月,火,水）" />

        <div className={styles.group}>
          <label>午前の勤務時間</label>
          <input className={styles.input} type="time" value={workingStartAm} onChange={e => setWorkingStartAm(e.target.value)} />
          <input className={styles.input} type="time" value={workingEndAm} onChange={e => setWorkingEndAm(e.target.value)} />
        </div>

        <div className={styles.group}>
          <label>午後の勤務時間</label>
          <input className={styles.input} type="time" value={workingStartPm} onChange={e => setWorkingStartPm(e.target.value)} />
          <input className={styles.input} type="time" value={workingEndPm} onChange={e => setWorkingEndPm(e.target.value)} />
        </div>

        <select className={styles.input} value={skillLevel} onChange={e => setSkillLevel(e.target.value)}>
          <option value="1">一般対応（1）</option>
          <option value="2">安定対応（2）</option>
          <option value="3">専門対応（3）</option>
        </select>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={autoSchedule}
            onChange={e => setAutoSchedule(e.target.checked)}
          />
          自動ルート作成の対象に含める
        </label>

        <button className={styles.button} onClick={handleAdd}>登録</button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>氏名</th>
              <th>緯度</th>
              <th>経度</th>
              <th>稼働曜日</th>
              <th>スキル</th>
              <th>午前勤務</th>
              <th>午後勤務</th>
              <th>自動ルート</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {staffs.map(s => (
              <tr key={s.id}>
                <td>{editId === s.id ? (<input className={styles.input} value={editData.name} onChange={e => handleEditChange('name', e.target.value)} />) : s.name}</td>
                <td>{editId === s.id ? (<input className={styles.input} value={editData.home_lat} onChange={e => handleEditChange('home_lat', e.target.value)} />) : s.home_lat}</td>
                <td>{editId === s.id ? (<input className={styles.input} value={editData.home_lng} onChange={e => handleEditChange('home_lng', e.target.value)} />) : s.home_lng}</td>
                <td>{editId === s.id ? (<input className={styles.input} value={editData.working_days} onChange={e => handleEditChange('working_days', e.target.value)} />) : s.working_days}</td>
                <td>{editId === s.id ? (
                  <select className={styles.input} value={editData.skill_level} onChange={e => handleEditChange('skill_level', e.target.value)}>
                    <option value="1">一般対応</option>
                    <option value="2">安定対応</option>
                    <option value="3">専門対応</option>
                  </select>
                ) : (
                  s.skill_level === 1 ? '一般対応' : s.skill_level === 2 ? '安定対応' : s.skill_level === 3 ? '専門対応' : '-'
                )}</td>
                <td>{editId === s.id ? (
                  <>
                    <input className={styles.input} type="time" value={editData.working_start_am} onChange={e => handleEditChange('working_start_am', e.target.value)} />〜
                    <input className={styles.input} type="time" value={editData.working_end_am} onChange={e => handleEditChange('working_end_am', e.target.value)} />
                  </>
                ) : s.working_start_am + '〜' + s.working_end_am}</td>
                <td>{editId === s.id ? (
                  <>
                    <input className={styles.input} type="time" value={editData.working_start_pm} onChange={e => handleEditChange('working_start_pm', e.target.value)} />〜
                    <input className={styles.input} type="time" value={editData.working_end_pm} onChange={e => handleEditChange('working_end_pm', e.target.value)} />
                  </>
                ) : s.working_start_pm + '〜' + s.working_end_pm}</td>
                <td>{editId === s.id ? (
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={editData.auto_schedule ?? true}
                      onChange={e => handleEditChange('auto_schedule', e.target.checked)}
                    />
                    自動対象
                  </label>
                ) : (
                  s.auto_schedule ? '自動' : '手動'
                )}</td>
                <td>{editId === s.id ? (
                  <button className={styles.button} onClick={handleSave}>保存</button>
                ) : (
                  <>
                    <button className={styles.button} onClick={() => handleEdit(s)}>編集</button>
                    <button className={`${styles.button} ${styles.deleteButton}`} onClick={() => handleDelete(s.id)}>削除</button>
                  </>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.backButtonWrapper}>
        <Link href="/dashboard" className={styles.backButton}>
          ← ダッシュボードに戻る
        </Link>
      </div>
    </main>
  )
}
