'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase-browser'
import styles from './page.module.css'

type VisitRecord = {
  staff_id: string
  date: string
  completed_count: number
  absent_count: number
  total_reserved: number
  revenue_total: number
  is_working_day: boolean
}

type Aggregated = {
  staff_id: string
  staff_name?: string
  total_sales: number
  working_days: number
  total_reservations: number
  completed_visits: number
  absent_count: number
  absent_rate: number
  avg_unit_price: number
  avg_visits_per_patient: number
  patient_count: number  // ← ここを追加！
  label?: string
}

export default function SalesHistoryPage() {
  const [periodType, setPeriodType] = useState<'daily' | 'monthly' | 'yearly'>('monthly')
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedDay, setSelectedDay] = useState<string>('all')
  const [salesData, setSalesData] = useState<Aggregated[]>([])
  const [staffs, setStaffs] = useState<{ id: string; name: string }[]>([])

type StatusRow = {
  label: string
  new: number
  reopen: number
  pause: number
  cancel: number
  trial: number
  contract: number
  nonContract: number
  total: number
  contractRate: number
}

const [statusStatsList, setStatusStatsList] = useState<StatusRow[]>([])

const [statusStats, setStatusStats] = useState({
  label: '',  // ←★ここを追加！
  new: 0,
  reopen: 0,
  pause: 0,
  cancel: 0,
  total: 0,
  trial: 0,
  contract: 0,
  contractRate: 0,
  nonContract: 0,
})

  const generateYearList = () => {
    const now = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => (now - 2 + i).toString())
  }

  const generateMonthList = () => Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))
  const generateDayList = () => Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'))

  const getGroupLabel = (dateStr: string): string => {
  const date = new Date(dateStr + 'T09:00:00') 
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  if (selectedYear === 'all') return `${y}年`
  if (selectedMonth === 'all') return `${m}月`
  if (selectedDay === 'all') return `${d}日`
  return '当日'
}

 useEffect(() => {
  const fetch = async () => {
        // ②: スタッフ一覧を取得
    const { data: staffList } = await supabase
      .from('staffs')
      .select('id, name')

    if (!staffList) return
    let from = '1900-01-01'
    let to = '2100-12-31'

    if (selectedYear !== 'all') {
      const year = selectedYear
      if (selectedMonth === 'all') {
        // 年のみ指定
        from = `${year}-01-01`
        to = `${year}-12-31`

      } else if (selectedDay === 'all') {
        // 年・月 指定（例: 2025年5月）
        const paddedMonth = String(Number(selectedMonth)).padStart(2, '0')
        const lastDay = new Date(Number(year), Number(paddedMonth), 0).getDate()
        from = `${year}-${paddedMonth}-01`
        to = `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`

      } else {
        // 年・月・日すべて指定（例: 2025年5月10日）
        const paddedMonth = String(Number(selectedMonth)).padStart(2, '0')
        const paddedDay = String(Number(selectedDay)).padStart(2, '0')
        from = `${year}-${paddedMonth}-${paddedDay}`
        to = from
      }
    }

    const { data: sonotaData, error: sonotaError } = await supabase
      .from('sonota')
      .select('status_type, status_date')
      .gte('status_date', from)
      .lte('status_date', to)

    if (sonotaError || !sonotaData) {
      console.error('sonota取得エラー:', sonotaError)
      return
    }
        const { data, error } = await supabase
      .from('visit_records')
      .select('*')
      .gte('date', from)
      .lte('date', to)

    if (error || !data) {
      console.error('visit_records 取得エラー:', error)
      return
    }

    const { data: visitLogs, error: logsError } = await supabase
  .from('visit_logs')
  .select('staff_id, patient_id, date')
  .gte('date', from)
  .lte('date', to)

if (logsError || !visitLogs) {
  console.error('visit_logs 取得エラー:', logsError)
  return
}
// ↓ こういう構造にする（grouped構造にして分ける）
const sonotaGrouped: { [label: string]: StatusRow } = {}

sonotaData.forEach(row => {
  const label = getGroupLabel(row.status_date)
  if (!sonotaGrouped[label]) {
    sonotaGrouped[label] = {
      label,
      new: 0,
      reopen: 0,
      pause: 0,
      cancel: 0,
      trial: 0,
      contract: 0,
      nonContract: 0,
      total: 0,
      contractRate: 0,
    }
  }
  const g = sonotaGrouped[label]
  if (row.status_type === '新規') g.new++
  if (row.status_type === '再開') g.reopen++
  if (row.status_type === '休止') g.pause++
  if (row.status_type === '中止') g.cancel++
  if (row.status_type === '体験') g.trial++
  if (row.status_type === '成約') g.contract++
  if (row.status_type === '不成約') g.nonContract++
})

// 成約率・合計の計算＆リスト化
const rows: StatusRow[] = []
for (const label in sonotaGrouped) {
  const g = sonotaGrouped[label]
  g.total = g.new + g.reopen - g.pause - g.cancel
  const totalDecision = g.contract + g.nonContract
  g.contractRate = totalDecision > 0 ? Math.floor((g.contract / totalDecision) * 100) : 0
  rows.push(g)
}

// 合計行を追加
const totalRow: StatusRow = {
  label: '合計',
  new: 0,
  reopen: 0,
  pause: 0,
  cancel: 0,
  trial: 0,
  contract: 0,
  nonContract: 0,
  total: 0,
  contractRate: 0,
}
rows.forEach(r => {
  totalRow.new += r.new
  totalRow.reopen += r.reopen
  totalRow.pause += r.pause
  totalRow.cancel += r.cancel
  totalRow.trial += r.trial
  totalRow.contract += r.contract
  totalRow.nonContract += r.nonContract
  totalRow.total += r.total
})
const decisionTotal = totalRow.contract + totalRow.nonContract
totalRow.contractRate = decisionTotal > 0 ? Math.floor((totalRow.contract / decisionTotal) * 100) : 0
rows.push(totalRow)

// 反映
setStatusStatsList(rows)

// 👇 ここに追加（visitLogs を使って patientCountMap を作成）
const uniqueVisitSet = new Set<string>()
visitLogs.forEach(log => {
  const ym = log.date.slice(0, 7)
  uniqueVisitSet.add(`${log.staff_id}_${ym}_${log.patient_id}`)
})

const patientCountMap: Record<string, number> = {}
uniqueVisitSet.forEach(key => {
  const [staff_id, ym, _] = key.split('_')
  const label =
    selectedYear === 'all' ? `${ym.slice(0, 4)}年`
    : selectedMonth === 'all' ? `${ym.slice(5, 7)}月`
    : `${ym.slice(5, 7)}月`
  const compositeKey = `${staff_id}__${label}`
  patientCountMap[compositeKey] = (patientCountMap[compositeKey] || 0) + 1
})

    // ※以下は今まで通りでOK
const grouped: { [key: string]: VisitRecord[] } = {}
data.forEach((v: VisitRecord) => {
  const label = getGroupLabel(v.date)
  const key = `${v.staff_id}__${label}`
  if (!grouped[key]) grouped[key] = []
  grouped[key].push(v)
})

    const result: Aggregated[] = []
    let totalSales = 0, totalReservations = 0, totalCompleted = 0, totalAbsent = 0, totalWorkingDaysSum = 0

for (const key in grouped) {
  const records = grouped[key]
  const [staff_id, label] = key.split('__')
  const staffName = staffList.find(s => s.id === staff_id)?.name || '(不明)'
  const sales = records.reduce((sum, r) => sum + (r.revenue_total || 0), 0)
  const completed = records.reduce((sum, r) => sum + (r.completed_count || 0), 0)
  const absent = records.reduce((sum, r) => sum + (r.absent_count || 0), 0)
  const reserved = records.reduce((sum, r) => sum + (r.total_reserved || 0), 0)
  const workingDays = new Set(records.filter(r => r.is_working_day).map(r => r.date)).size
  const patientCount = patientCountMap[key] || 0

result.push({
  staff_id,
  staff_name: staffName,
  label,
  total_sales: sales,
  working_days: workingDays,
  total_reservations: reserved,
  completed_visits: completed,
  absent_count: absent,
  absent_rate: reserved ? absent / reserved : 0,
  avg_unit_price: completed ? sales / completed : 0,
  avg_visits_per_patient: patientCount > 0 ? completed / patientCount : 0,
  patient_count: patientCount, // ← この1行を追加
})

  totalSales += sales
  totalReservations += reserved
  totalCompleted += completed
  totalAbsent += absent
  totalWorkingDaysSum += workingDays
}

const avgWorkingDays = result.length ? Math.round(totalWorkingDaysSum / result.length) : 0
const totalPatientCount = Object.values(patientCountMap).reduce((sum, val) => sum + val, 0)

result.push({
  staff_id: '合計',
  total_sales: totalSales,
  working_days: avgWorkingDays,
  total_reservations: totalReservations,
  completed_visits: totalCompleted,
  absent_count: totalAbsent,
  absent_rate: totalReservations ? totalAbsent / totalReservations : 0,
  avg_unit_price: totalCompleted ? totalSales / totalCompleted : 0,
  avg_visits_per_patient: totalPatientCount > 0 ? totalCompleted / totalPatientCount : 0,
  patient_count: totalPatientCount, // ← ✅ これが必要
})

    setSalesData(result)
  }

  fetch()
}, [selectedYear, selectedMonth, selectedDay])

return (
  <main className={styles.container}>
    <h1 className={styles.heading}>売上履歴</h1>

    <div className={styles.filterRow}>
      {/* 年セレクト */}
      <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
        <option value="all">すべて</option>
        {generateYearList().map(y => (
          <option key={y} value={y}>{y}年</option>
        ))}
      </select>

      {/* 月セレクト */}
      <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
        <option value="all">すべて</option>
        {generateMonthList().map(m => (
          <option key={m} value={m}>{m}月</option>
        ))}
      </select>

      {/* 日セレクト（※月が選ばれているときのみ） */}
      {selectedMonth !== 'all' && (
        <select value={selectedDay} onChange={e => setSelectedDay(e.target.value)}>
          <option value="all">すべて</option>
          {generateDayList().map(d => (
            <option key={d} value={d}>{d}日</option>
          ))}
        </select>
      )}
    </div>

{/* 売上テーブルをスクロール可能にラップ */}
<div className={styles.tableWrapper}>
  <table className={styles.table}>
    <thead>
      <tr>
        <th>対象</th>
        <th>施術者</th>
        <th>売上</th>
        <th>稼働日数</th>
        <th>予約数</th>
        <th>施術回数</th>
        <th>欠席数</th>
        <th>カルテ枚数</th>
        <th>平均単価</th>
        <th>平均回数</th>
      </tr>
    </thead>
    <tbody>
      {salesData.length === 0 ? (
        <tr>
          <td colSpan={10}>データがありません</td>
        </tr>
      ) : (
        salesData.map((r, i) => (
          <tr key={i}>
            <td>{r.label || ''}</td>
            <td>{r.staff_name}</td>
            <td>¥{r.total_sales.toLocaleString()}</td>
            <td>{r.working_days}</td>
            <td>{r.total_reservations}</td>
            <td>{r.completed_visits}</td>
            <td>{r.absent_count}（{Math.round(r.absent_rate * 100)}%）</td>
            <td>{r.patient_count ?? '-'}</td>
            <td>¥{Math.round(r.avg_unit_price).toLocaleString()}</td>
            <td>
              {r.avg_visits_per_patient > 0
                ? `${r.avg_visits_per_patient.toFixed(1)}回`
                : '-'}
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>

<h2 className={styles.subheading}>患者推移</h2>
<div className={styles.tableWrapper}>
  <table className={styles.table}>
    <thead>
      <tr>
        <th>対象</th>
        <th>新規</th>
        <th>再開</th>
        <th>休止</th>
        <th>中止</th>
        <th>合計</th>
        <th>体験</th>
        <th>成約（率）</th>
        <th>不成約</th>
      </tr>
    </thead>
    <tbody>
      {statusStatsList.map((row, index) => (
        <tr key={index}>
          <td>{row.label}</td>
          <td>{row.new}</td>
          <td>{row.reopen}</td>
          <td>{row.pause}</td>
          <td>{row.cancel}</td>
          <td>{row.total}</td>
          <td>{row.trial}</td>
          <td>{row.contract}（{row.contractRate}%）</td>
          <td>{row.nonContract}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

<div style={{ marginTop: '2rem' }}>


  <button
    onClick={() => window.location.href = '/dashboard'}  // ダッシュボードURLに合わせて修正
    className={styles.backButton}  // 任意：ボタン用のCSSクラス（↓スタイルも追加します）
  >
    ダッシュボードに戻る
  </button>
</div>

  </main>
)

}
