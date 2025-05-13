'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/utils/supabase-browser'
import styles from './page.module.css'
import Link from 'next/link'

export default function PatientDashboardPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [searchText, setSearchText] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [name, setName] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [status, setStatus] = useState('active')
  const [trial, setTrial] = useState(false)
  const [memo, setMemo] = useState('')
  const [difficultyNote, setDifficultyNote] = useState('')
  const [difficultyLevel, setDifficultyLevel] = useState('0')
  const [address, setAddress] = useState('')
  const [treatmentDuration, setTreatmentDuration] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [consentExpiryAt, setConsentExpiryAt] = useState('')
  const [preferredSchedule, setPreferredSchedule] = useState<{ [key: string]: string }>({})
  const [assignType, setAssignType] = useState('auto')
  const [activeCount, setActiveCount] = useState(0)
const [inactiveCount, setInactiveCount] = useState(0)

  const timeOptions: string[] = useMemo(() => {
    const list: string[] = []
    for (let h = 8; h <= 20; h++) {
      for (let m = 0; m < 60; m += 10) {
        const time = `${h}:${m.toString().padStart(2, '0')}`
        list.push(time)
      }
    }
    return list
  }, [])

const fetchPatients = async () => {
  const { data } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })

  if (data) {
    setPatients(data)

    const active = data.filter(p => p.status === 'active').length
    const inactive = data.filter(p => p.status === 'paused' || p.status === 'ended').length

    setActiveCount(active)
    setInactiveCount(inactive)
  }
}


  const handleAdd = async () => {
    if (!name || !lat || !lng || !address || !treatmentDuration) {
      return alert('すべての必須項目を入力してください')
    }

    await supabase.from('patients').insert({
      name,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      address,
      treatment_duration: parseInt(treatmentDuration || '0'),
      status,
      memo,
      trial,
      status_changed: new Date().toISOString(),
      difficulty_note: difficultyNote,
      difficulty_level: difficultyLevel,
      preferred_schedule: preferredSchedule,
      unit_price: parseInt(unitPrice || '0'),
      consent_expiry_at: consentExpiryAt,
      assign_type: assignType
    })

    setName('')
    setLat('')
    setLng('')
    setAddress('')
    setTreatmentDuration('')
    setStatus('active')
    setTrial(false)
    setMemo('')
    setDifficultyNote('')
    setUnitPrice('')
    setDifficultyLevel('0')
    setPreferredSchedule({})
    setConsentExpiryAt('')
    setAssignType('auto')
    fetchPatients()
  }

  const handleDelete = async (id: string) => {
    const confirm = window.confirm('この患者情報を削除してもよろしいですか？')
    if (!confirm) return
    await supabase.from('patients').delete().eq('id', id)
    fetchPatients()
  }

  const handleEdit = (patient: any) => {
    setEditId(patient.id)
    setEditData({
      ...patient,
      preferred_schedule: patient.preferred_schedule || {},
      assign_type: patient.assign_type || 'auto'
    })
  }

  const handleEditChange = (field: string, value: any) => {
    setEditData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!editId) return

    await supabase.from('patients').update({
      name: editData.name,
      lat: parseFloat(editData.lat),
      lng: parseFloat(editData.lng),
      status: editData.status,
      memo: editData.memo,
      difficulty_note: editData.difficulty_note,
      difficulty_level: editData.difficulty_level,
      unit_price: parseInt(editData.unit_price || '0'),
      treatment_duration: parseInt(editData.treatment_duration || '0'),
      consent_expiry_at: editData.consent_expiry_at,
      preferred_schedule: editData.preferred_schedule,
      assign_type: editData.assign_type
    }).eq('id', editId)

    setEditId(null)
    setEditData({})
    fetchPatients()
  }

  useEffect(() => {
    fetchPatients()
  }, [])

  return (
<main className={styles.container}>
<div className={styles.headingRow}>
  <h1 className={styles.heading}>患者情報の管理</h1>
  <div className={styles.statsRow}>
    <span>📄 稼働中：{activeCount}人</span>
    <span>⛔ 非稼働：{inactiveCount}人</span>
  </div>
</div>


      <div className={styles.form}>
        <input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="氏名" />
        <input className={styles.input} value={lat} onChange={e => setLat(e.target.value)} placeholder="緯度" />
        <input className={styles.input} value={lng} onChange={e => setLng(e.target.value)} placeholder="経度" />
        <input className={styles.input} value={address} onChange={e => setAddress(e.target.value)} placeholder="住所" />
        <input className={styles.input} type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="施術単価（円）" />
        <input
  type="number"
  className={styles.input}
  value={treatmentDuration}
  onChange={e => setTreatmentDuration(e.target.value)}
  min={5}
  step={5}
  placeholder="施術時間（移動時間を含む）例：45"
/>
<div className={styles.formGroup}>
  <label className={styles.formLabel}>同意書の有効期限：</label>
  <input
    type="date"
    className={styles.input}
    value={consentExpiryAt}
    onChange={e => setConsentExpiryAt(e.target.value)}
    placeholder="同意書有効期限"
  />
  <small className={styles.helperText}>同意書の期限を入力してください</small>
</div>

        <select className={styles.input} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="active">稼働中</option>
          <option value="paused">休止中</option>
          <option value="ended">中止</option>
        </select>
  
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={trial}
            onChange={e => setTrial(e.target.checked)}
          />
          体験利用
        </label>
  
        <select className={styles.input} value={difficultyLevel} onChange={e => setDifficultyLevel(e.target.value)}>
          <option value="0">困難レベルなし</option>
          <option value="1">軽度（要注意）</option>
          <option value="2">中等度（制約あり）</option>
          <option value="3">重度（対応制限）</option>
        </select>

        <div className={styles.formGroup}>
  <label className={styles.formLabel}>振り分け方法：</label>
  <select
    className={styles.formSelect}
    value={assignType}
    onChange={(e) => setAssignType(e.target.value)}
  >
    <option value="auto">自動スケジュールに含める</option>
    <option value="manual">手動で管理する</option>
  </select>
</div>

  
        <h3 style={{ fontSize: '1.2rem', marginTop: '16px' }}>
  利用曜日と、それぞれの希望時間を選択してください
</h3>
        <div className={styles.scheduleGroup}>
  {['月', '火', '水', '木', '金', '土', '日'].map(day => (
    <div key={day} className={styles.scheduleRow}>
      <label className={styles.checkboxBox}>
        <input
          type="checkbox"
          checked={day in preferredSchedule}
          onChange={e => {
            const newSchedule = { ...preferredSchedule }
            if (e.target.checked) {
              newSchedule[day] = ''
            } else {
              delete newSchedule[day]
            }
            setPreferredSchedule(newSchedule)
          }}
        />
        <span className={styles.dayLabel}>{day}</span>
      </label>

      {day in preferredSchedule && (
        <select
          className={styles.timeSelect}
          value={preferredSchedule[day]}
          onChange={e => {
            const newSchedule = { ...preferredSchedule, [day]: e.target.value }
            setPreferredSchedule(newSchedule)
          }}
        >
          <option value="">-- 時間を選択 --</option>
          {timeOptions.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      )}
    </div>
  ))}
</div>

        <textarea className={styles.input} value={memo} onChange={e => setMemo(e.target.value)} placeholder="メモ" />
        <textarea className={styles.input} value={difficultyNote} onChange={e => setDifficultyNote(e.target.value)} placeholder="困難事例・対応注意点" />
        <button className={styles.button} onClick={handleAdd}>登録</button>
      </div>

      <div className={styles.filterRow}>
  <input
    className={styles.input}
    type="text"
    value={searchText}
    onChange={e => setSearchText(e.target.value)}
    placeholder="氏名・住所・メモで検索"
  />
</div>

      <div className={styles.tableWrapper}>
  <table className={styles.table}>
    <thead>
      <tr>
        <th>氏名</th>
        <th>緯度</th>
        <th>経度</th>
        <th>施術単価</th> 
        <th>施術＋移動時間</th>
        <th>同意書期限</th>
        <th>状態</th>
        <th>困難レベル</th>
        <th>振り分け</th>
        <th>希望時間と曜日</th>
        <th>メモ</th>
         <th>注意点</th>
        <th>操作</th>
      </tr>
    </thead>

<tbody>
  {patients
    .filter(p => {
      const matchSearch =
        p.name?.includes(searchText) ||
        p.address?.includes(searchText) ||
        p.memo?.includes(searchText)

      return matchSearch
    })
    .map(p => (
      <tr key={p.id}>
        {/* 👇 以下は元の <td> 群、あなたのコードをそのまま維持してOK */}
        <td>
          {editId === p.id ? (
            <input className={styles.input} value={editData.name} onChange={e => handleEditChange('name', e.target.value)} />
          ) : (
            p.name
          )}
        </td>
        <td>
          {editId === p.id ? (
            <input className={styles.input} value={editData.lat} onChange={e => handleEditChange('lat', e.target.value)} />
          ) : (
            p.lat
          )}
        </td>
        <td>
          {editId === p.id ? (
            <input className={styles.input} value={editData.lng} onChange={e => handleEditChange('lng', e.target.value)} />
          ) : (
            p.lng
          )}
        </td>
        <td>
          {editId === p.id ? (
            <input className={styles.input} value={editData.unit_price} onChange={e => handleEditChange('unit_price', e.target.value)} />
          ) : (
            p.unit_price ? `${p.unit_price}円` : '-'
          )}
        </td>
        <td>
          {editId === p.id ? (
            <input className={styles.input} value={editData.treatment_duration} onChange={e => handleEditChange('treatment_duration', e.target.value)} />
          ) : (
            p.treatment_duration ? `${p.treatment_duration}分` : '-'
          )}
        </td>
        <td>
          {editId === p.id ? (
            <input type="date" className={styles.input} value={editData.consent_expiry_at || ''} onChange={e => handleEditChange('consent_expiry_at', e.target.value)} />
          ) : (
            p.consent_expiry_at ? new Date(p.consent_expiry_at).toLocaleDateString() : '-'
          )}
        </td>
        <td>
          {editId === p.id ? (
            <select className={styles.input} value={editData.status} onChange={e => handleEditChange('status', e.target.value)}>
              <option value="active">稼働中</option>
              <option value="paused">休止中</option>
              <option value="ended">中止</option>
            </select>
          ) : (
            p.status
          )}
        </td>
        <td>
          {editId === p.id ? (
            <select className={styles.input} value={editData.difficulty_level} onChange={e => handleEditChange('difficulty_level', e.target.value)}>
              <option value="0">なし</option>
              <option value="1">軽度</option>
              <option value="2">中等度</option>
              <option value="3">重度</option>
            </select>
          ) : (
            p.difficulty_level === '0' ? 'なし' :
            p.difficulty_level === '1' ? '軽度' :
            p.difficulty_level === '2' ? '中等度' :
            p.difficulty_level === '3' ? '重度' : '-'
          )}
        </td>
        <td>
          {editId === p.id ? (
            <select className={styles.input} value={editData.assign_type} onChange={e => handleEditChange('assign_type', e.target.value)}>
              <option value="auto">自動</option>
              <option value="manual">手動</option>
            </select>
          ) : (
            p.assign_type === 'manual' ? '手動' : '自動'
          )}
        </td>
        <td>
          {editId === p.id ? (
            <div className={styles.scheduleGroup}>
              {['月', '火', '水', '木', '金', '土', '日'].map(day => (
                <div key={day} className={styles.scheduleRow}>
                  <label className={styles.checkboxBox}>
                    <input
                      type="checkbox"
                      checked={editData.preferred_schedule?.[day] !== undefined}
                      onChange={e => {
                        const current = { ...editData.preferred_schedule }
                        if (e.target.checked) {
                          current[day] = ''
                        } else {
                          delete current[day]
                        }
                        handleEditChange('preferred_schedule', current)
                      }}
                    />
                    <span className={styles.dayLabel}>{day}</span>
                  </label>
                  {editData.preferred_schedule?.[day] !== undefined && (
                    <select
                      className={styles.timeSelect}
                      value={editData.preferred_schedule[day]}
                      onChange={e => {
                        const updated = {
                          ...editData.preferred_schedule,
                          [day]: e.target.value
                        }
                        handleEditChange('preferred_schedule', updated)
                      }}
                    >
                      <option value="">-- 時間を選択 --</option>
                      {timeOptions.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          ) : (
            p.preferred_schedule
              ? Object.entries(p.preferred_schedule)
                  .map(([day, time]) => `${day}: ${time}`)
                  .join(' / ')
              : '-'
          )}
        </td>
        <td>
          {editId === p.id ? (
            <textarea className={styles.input} value={editData.memo} onChange={e => handleEditChange('memo', e.target.value)} />
          ) : (
            p.memo
          )}
        </td>
        <td>
          {editId === p.id ? (
            <textarea className={styles.input} value={editData.difficulty_note} onChange={e => handleEditChange('difficulty_note', e.target.value)} />
          ) : (
            p.difficulty_note
          )}
        </td>
        <td>
          {editId === p.id ? (
            <button className={styles.button} onClick={handleSave}>保存</button>
          ) : (
            <>
              <button className={styles.button} onClick={() => handleEdit(p)}>編集</button>
              <button className={`${styles.button} ${styles.deleteButton}`} onClick={() => handleDelete(p.id)}>削除</button>
            </>
          )}
        </td>
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
};