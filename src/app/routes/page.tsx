'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase-browser'
import styles from './page.module.css'
import { format } from 'date-fns'

export default function DailyRoutePage() {
  const today = new Date()
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1)
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  const [selectedDate, setSelectedDate] = useState<string>(format(today, 'yyyy-MM-dd'))

  const [staffs, setStaffs] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [visits, setVisits] = useState<any[]>([])

  const yearOptions = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i)
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate()
  const dayOptions = Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1)

  const getPatientName = (id: string) => patients.find(p => p.id === id)?.name || '-'
  const getUnitPrice = (id: string) => patients.find(p => p.id === id)?.unit_price || 0

  const completed = visits.filter(v => v.status === 'completed')
  const absent = visits.filter(v => v.status === 'absent')
  const totalVisits = completed.length
  const plannedPatientCount = new Set(visits.map(v => v.patient_id)).size
  const absentPatients = new Set(visits.filter(v => v.status === 'absent').map(v => v.patient_id)).size
  const activeStaffCount = new Set(visits.map(v => v.staff_id)).size

  const totalRevenue = completed.reduce((sum, v) => sum + getUnitPrice(v.patient_id), 0)
  const expectedRevenue = visits.reduce((sum, v) => sum + getUnitPrice(v.patient_id), 0)
  const averageUnitPrice = completed.length ? totalRevenue / completed.length : 0
  const absentRate = plannedPatientCount ? (absentPatients / plannedPatientCount) * 100 : 0
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null)
  const [editedTime, setEditedTime] = useState<string>('')
  const [editedUnitPrice, setEditedUnitPrice] = useState<number>(0)
  const [editedPatientId, setEditedPatientId] = useState('')
  const [editedStaffId, setEditedStaffId] = useState('')
  const revenueGap = expectedRevenue - totalRevenue
  const averageVisitsPerStaff = activeStaffCount ? completed.length / activeStaffCount : 0
  const [records, setRecords] = useState<any[]>([])


  const getVisitsByStaff = (staffId: string) => {
    return visits.filter(v => v.staff_id === staffId)
  }

  const getWeekday = (dateString: string) => {
    const days = ['日', '月', '火', '水', '木', '金', '土']
    const date = new Date(dateString)
    return days[date.getDay()]
  }

  const handleVisitUpdate = (id: string) => {
    setVisits(prev =>
      prev.map(v =>
        v.id === id
          ? {
              ...v,
              time: editedTime,
              unit_price: editedUnitPrice,
              patient_id: editedPatientId,
              staff_id: editedStaffId,
            }
          : v
      )
    )
    setEditingVisitId(null)
  }

  const handleDeleteVisit = (id: string) => {
    setVisits(prev => prev.filter(v => v.id !== id))
  }

  const getPreferredTime = (patientId: string, date: string) => {
    const weekday = getWeekday(date)
    const schedule = patients.find(p => p.id === patientId)?.preferred_schedule
    const times = schedule?.[weekday]
    if (Array.isArray(times)) return times.join(', ')
    return typeof times === 'string' ? times : ''
  }

  useEffect(() => {
    const y = selectedYear
    const m = selectedMonth.toString().padStart(2, '0')
    const d = selectedDay.toString().padStart(2, '0')
    setSelectedDate(`${y}-${m}-${d}`)
  }, [selectedYear, selectedMonth, selectedDay])

useEffect(() => {
  fetchInitialData()
  fetchVisitRecords() // ← ここを追加
}, [selectedDate])

const handleSaveByStaff = async (staffId: string) => {
  const staffVisits = getVisitsByStaff(staffId)

  // ✅ 1. weekly_visits に status を upsert（変更なし）
  for (const visit of staffVisits) {
    if (visit.id) {
      await supabase.from('weekly_visits').upsert({
        id: visit.id,
        status: visit.status,
      }, { onConflict: 'id' })
    }
  }

  // ✅ 2. visit_records に集計情報を upsert（変更なし）
  const reservedCount = staffVisits.length
  const completedCount = staffVisits.filter(v => v.status === 'completed').length
  const absentCount = staffVisits.filter(v => v.status === 'absent').length
  const revenueTotal = staffVisits
    .filter(v => v.status === 'completed')
    .reduce((sum, v) => sum + getUnitPrice(v.patient_id), 0)

  const { error } = await supabase.from('visit_records').upsert({
    staff_id: staffId,
    date: selectedDate,
    total_reserved: reservedCount,
    completed_count: completedCount,
    absent_count: absentCount,
    revenue_total: revenueTotal,
  }, { onConflict: 'staff_id,date' })

  // ✅ 3. visit_logs に completed のみ insert（新規追加）
  const completedVisits = staffVisits.filter(v => v.status === 'completed')
  const visitLogs = completedVisits.map(v => ({
    staff_id: v.staff_id,
    patient_id: v.patient_id,
    date: selectedDate,
  }))

  console.log('📦 visitLogs に保存予定のデータ:', visitLogs)

  if (visitLogs.length > 0) {
    const { error: logError } = await supabase
      .from('visit_logs')
      .upsert(visitLogs, {
        onConflict: 'staff_id,date,patient_id',
      })

    if (logError) {
      console.error('❌ visit_logs 保存エラー:', logError)
    } else {
      console.log('✅ visit_logs 保存完了:', visitLogs)
    }
  }

  // ✅ 4. 完了通知（変更なし）
  if (error) {
    console.error('❌ visit_records 保存エラー:', error)
    alert('❌ 保存に失敗しました。詳細はコンソールをご確認ください。')
  } else {
    alert(`${staffs.find(s => s.id === staffId)?.name} さんの記録を保存しました`)
  }
}

const fetchVisitRecords = async () => {
  const { data, error } = await supabase
    .from('visit_records')
    .select('*')
    .eq('date', selectedDate)

  if (error) {
    console.error('❌ visit_records 読み込みエラー:', error)
  } else {
    setRecords(data)
    console.log('📥 読み込んだ visit_records:', data)
  }
}

  const fetchInitialData = async () => {
    const { data: staffData } = await supabase.from('staffs').select('*')
    const { data: patientData } = await supabase.from('patients').select('*')
    const { data: visitData } = await supabase
      .from('weekly_visits')
      .select('*')
      .eq('date', selectedDate)
    if (staffData && patientData && visitData) {
      setStaffs(staffData)
      setPatients(patientData)
      setVisits(visitData)
    }
  }

  const handleStatusChange = (visitId: string, newStatus: 'completed' | 'absent') => {
    setVisits(prev =>
      prev.map(v =>
        v.id === visitId ? { ...v, status: v.status === newStatus ? 'pending' : newStatus } : v
      )
    )
  }

  const saveVisitRecords = async () => {
    for (const staff of staffs) {
      const staffVisits = visits.filter(v => v.staff_id === staff.id)
      const reservedCount = staffVisits.length
      const completedCount = staffVisits.filter(v => v.status === 'completed').length
      const absentCount = staffVisits.filter(v => v.status === 'absent').length

      await supabase.from('visit_records').upsert({
        staff_id: staff.id,
        date: selectedDate,
        total_reserved: reservedCount,
        completed_count: completedCount,
        absent_count: absentCount,
      }, { onConflict: 'staff_id,date' })
    }
  }


  const generateTimeSlots = () => {
    const slots: string[] = []
    for (let h = 8; h <= 20; h++) {
      for (let m = 0; m < 60; m += 5) {
        const hh = h.toString().padStart(2, '0')
        const mm = m.toString().padStart(2, '0')
        slots.push(`${hh}:${mm}`)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  const staffTotals = staffs.map(staff => {
    const staffVisits = visits.filter(v => v.staff_id === staff.id && v.status === 'completed')
    const count = staffVisits.length
    const total = staffVisits.reduce((sum, v) => sum + getUnitPrice(v.patient_id), 0)
    return { staffId: staff.id, count, total }
  })

  const totalCount = staffTotals.reduce((sum, s) => sum + s.count, 0)

return (
  <main className={styles.container}>
    <h1 className={styles.heading}>📅 日別ルート管理ページ</h1>

    {/* 日付選択 */}
    <div className={styles.dateSelector}>
      <label>表示日：</label>
      <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
        {yearOptions.map(year => <option key={year} value={year}>{year}年</option>)}
      </select>
      <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
        {monthOptions.map(month => <option key={month} value={month}>{month}月</option>)}
      </select>
      <select value={selectedDay} onChange={e => setSelectedDay(Number(e.target.value))}>
        {dayOptions.map(day => <option key={day} value={day}>{day}日</option>)}
      </select>
    </div>

    {/* スケジュール表 */}
    <div className={styles.gridWrapper}>
      <div className={styles.gridHeader}>
        <div className={styles.cellHeader}>時間</div>
        {staffs.map(staff => (
          <div key={staff.id} className={styles.cellHeader}>{staff.name}</div>
        ))}
      </div>

      {timeSlots.map(time => (
        <div key={time} className={styles.gridRow}>
          <div className={styles.cellTime}>{time}</div>
          {staffs.map(staff => {
            const visit = visits.find(v => v.time === time && v.staff_id === staff.id)
            return (
              <div key={staff.id + time} className={styles.cell}>
{visit ? (
  editingVisitId === visit.id ? (
    <div className={styles.editMode}>
      <select
        value={editedPatientId}
        onChange={e => setEditedPatientId(e.target.value)}
      >
        <option value="">患者選択</option>
        {patients.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <input
        type="time"
        value={editedTime}
        onChange={e => setEditedTime(e.target.value)}
      />

      <input
        type="number"
        placeholder="単価"
        value={editedUnitPrice}
        onChange={e => setEditedUnitPrice(Number(e.target.value))}
      />

      <select
        value={editedStaffId}
        onChange={e => setEditedStaffId(e.target.value)}
      >
        {staffs.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <div className={styles.editButtons}>
        <button onClick={() => handleVisitUpdate(visit.id)}>保存</button>
        <button onClick={() => setEditingVisitId(null)}>キャンセル</button>
        <button onClick={() => handleDeleteVisit(visit.id)}>削除</button>
      </div>
    </div>
  ) : (
    <div className={styles.visitRow}>
      <div
        className={styles.patientInfo}
        onClick={() => {
          setEditingVisitId(visit.id)
          setEditedTime(visit.time)
          setEditedUnitPrice(visit.unit_price || getUnitPrice(visit.patient_id))
          setEditedPatientId(visit.patient_id)
          setEditedStaffId(visit.staff_id)
        }}
      >
        {getPatientName(visit.patient_id)}（{visit.time}）
      </div>
      <div className={styles.actionRow}>
        <span className={styles.unitPrice}>
          ￥{visit.unit_price || getUnitPrice(visit.patient_id)}
        </span>
        <label>
          <input
            type="checkbox"
            checked={visit.status === 'completed'}
            onChange={() => handleStatusChange(visit.id, 'completed')}
          />
          訪問済
        </label>
        <label>
          <input
            type="checkbox"
            checked={visit.status === 'absent'}
            onChange={() => handleStatusChange(visit.id, 'absent')}
          />
          欠席
        </label>
      </div>
    </div>
  )
) : (
  editingVisitId === `new-${staff.id}-${time}` ? (
    <div className={styles.editMode}>
      <select
        value={editedPatientId}
        onChange={e => setEditedPatientId(e.target.value)}
      >
        <option value="">患者選択</option>
        {patients.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <input
        type="time"
        value={editedTime}
        onChange={e => setEditedTime(e.target.value)}
      />

      <input
        type="number"
        placeholder="単価"
        value={editedUnitPrice}
        onChange={e => setEditedUnitPrice(Number(e.target.value))}
      />

      <div className={styles.editButtons}>
        <button onClick={() => handleVisitUpdate(`new-${staff.id}-${time}`)}>保存</button>
        <button onClick={() => setEditingVisitId(null)}>キャンセル</button>
      </div>
    </div>
  ) : (
    <div
      className={styles.emptyCell}
      onClick={() => {
        setEditingVisitId(`new-${staff.id}-${time}`)
        setEditedTime(time)
        setEditedUnitPrice(0)
        setEditedPatientId('')
        setEditedStaffId(staff.id)
      }}
    >
      -
    </div>
  )
)}

              </div>
            )
          })}
        </div>
      ))}

      {/* 合計行 */}
      <div className={styles.gridFooter}>
        <div className={styles.cellFooter}>合計</div>
        {staffs.map(staff => {
          const staffVisits = visits.filter(v => v.staff_id === staff.id)
          const completed = staffVisits.filter(v => v.status === 'completed')
          const absent = staffVisits.filter(v => v.status === 'absent')
          const count = completed.length
          const total = completed.reduce((sum, v) => sum + getUnitPrice(v.patient_id), 0)
          const absentRate = staffVisits.length ? (absent.length / staffVisits.length) * 100 : 0

return (
  <div key={staff.id} className={styles.cellFooter}>
    {count}件 ／ ￥{total.toLocaleString()}<br />
    欠席：{absent.length}件（{absentRate.toFixed(1)}%）<br />
    
<div className={styles.staffSaveZone}>
  <button onClick={() => handleSaveByStaff(staff.id)}>
    保存
  </button>
</div>

  </div>
)

        })}
      </div>
    </div>

    {/* 日別集計 */}
    <div className={styles.summary}>
      <div className={styles.summaryTitle}>
        全体合計：{completed.length}件 ／ ￥{totalRevenue.toLocaleString()}
      </div>

      <div className={styles.summaryTitle}>📝 日別集計</div>
      <div className={styles.cards}>
        <div className={styles.card}><label>稼働日数</label><span>{completed.length > 0 ? 1 : 0}日</span></div>
        <div className={styles.card}><label>総予約数</label><span>{plannedPatientCount}名</span></div>
        <div className={styles.card}><label>施術回数</label><span>{totalVisits}件</span></div>
        <div className={styles.card}><label>欠席数</label><span>{absent.length}件（{absentRate.toFixed(1)}%）</span></div>
        <div className={styles.card}><label>平均単価</label><span>￥{Math.round(averageUnitPrice).toLocaleString()}</span></div>
        <div className={styles.card}> <label>稼働スタッフ数</label><span>{activeStaffCount}名</span></div>
<div className={styles.card}> <label>平均回数（1人あたり）</label><span>{averageVisitsPerStaff.toFixed(1)}回</span></div>

<div className={styles.card}>
  <label>売上GAP</label>
  <span>￥{expectedRevenue.toLocaleString()}</span>
  <div className={styles.gapLine}>
    差額：
    <span className={styles.gapNegative}>
      ▲￥{Math.abs(revenueGap).toLocaleString()}
    </span>
  </div>
</div>

      </div>
    </div>

    {/* ボタン */}
    <div className={styles.saveButtonWrapper}>
      <button className={styles.backButton} onClick={() => window.location.href = '/dashboard'}>
        ← ダッシュボードに戻る
      </button>
    </div>
  </main>
)
}
