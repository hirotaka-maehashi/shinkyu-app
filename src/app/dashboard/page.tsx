'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase-browser'
import styles from './page.module.css'
import Link from 'next/link'
import { startOfMonth, endOfMonth, format, subMonths, addDays } from 'date-fns'

export const dynamic = 'force-dynamic'

// ✅ ⬇️ ここが「ユーティリティ関数」を入れるベストな位置
const getJstTodayString = () => {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().split('T')[0]
}

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const [monthlyStats, setMonthlyStats] = useState({
    totalSales: 0,
    workingDays: 0,
    totalReserved: 0,
    completedVisits: 0,
    absentCount: 0,
    absentRate: 0,
    estimatedSales: 0,
    expectedWorkingDays: 0,
    patientCount: 0,
    lastMonthSales: 0,
    salesPerDay: 0,
    avgUnitPrice: 0,
    avgVisitPerPatient: 0,
  })

  const [todayStats, setTodayStats] = useState({
    totalReserved: 0,
    completedVisits: 0,
    absentCount: 0,
    totalSales: 0,
  })

  const [isPlanMode, setIsPlanMode] = useState(false) // 実績モード or 予定モードの切り替え用
const [todayPlanStats, setTodayPlanStats] = useState({
  totalReserved: 0,
  totalSales: 0,
})

  const [staffStats, setStaffStats] = useState<any[]>([])
  const [staffPlanStats, setStaffPlanStats] = useState<any[]>([])
  const [monthlySonotaStats, setMonthlySonotaStats] = useState<any>({})
  const [monthlyStaffStats, setMonthlyStaffStats] = useState<any[]>([])
  const [allStaffs, setAllStaffs] = useState<any[]>([])
  const [activePatientCount, setActivePatientCount] = useState(0)

  const [patientStatusStats, setPatientStatusStats] = useState({
  active: 0,
  paused: 0,
  ended: 0,
})

useEffect(() => {
  const fetchPatientStatusStats = async () => {
    const { data, error } = await supabase
      .from('patients')
      .select('id, status')

    if (error || !data) {
      console.error('❌ patients 取得失敗:', error)
      return
    }

    console.log('✅ patients取得件数:', data.length)

    const active = data.filter(p => p.status === 'active').length
    const paused = data.filter(p => p.status === 'paused').length
    const ended = data.filter(p => p.status === 'ended').length

    setPatientStatusStats({ active, paused, ended })
    setActivePatientCount(active)
  }

  fetchPatientStatusStats()
}, [])

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('ログインしていないため、トップページに戻ります')
        location.href = '/'
        return
      }
    }

    const fetchUser = async () => {
      await new Promise((r) => setTimeout(r, 300))
      const { data } = await supabase.auth.getUser()
      if (data.user?.email) {
        setUserEmail(data.user.email)
      }
    }

    checkSession()
    fetchUser()
  }, [])

const handleLogout = async () => {
  await supabase.auth.signOut()
  location.href = '/auth/login' // または '/auth/signin' に変更可能
}

  useEffect(() => {
    const fetchMonthlyVisitRecords = async () => {
    const now = new Date()
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)

    const from = format(startOfMonth(jstNow), 'yyyy-MM-dd')
    const to = format(endOfMonth(jstNow), 'yyyy-MM-dd')

      const { data: records, error } = await supabase
        .from('visit_records')
        .select('*')
        .gte('date', from)
        .lte('date', to)

      if (error || !records) {
        console.error('❌ visit_records 取得エラー:', error)
        return
      }

      const totalSales = records.reduce((sum, r) => sum + (r.revenue_total || 0), 0)
      const workingDays = new Set(records.filter(r => r.is_working_day).map(r => r.date)).size
      const totalReserved = records.reduce((sum, r) => sum + (r.total_reserved || 0), 0)
      const completedVisits = records.reduce((sum, r) => sum + (r.completed_count || 0), 0)
      const absentCount = records.reduce((sum, r) => sum + (r.absent_count || 0), 0)
      const absentRate = totalReserved > 0 ? absentCount / totalReserved : 0

      setMonthlyStats(prev => ({
        ...prev,
        totalSales,
        workingDays,
        totalReserved,
        completedVisits,
        absentCount,
        absentRate,
      }))

      console.log('📊 集計完了:', {
        totalSales,
        workingDays,
        totalReserved,
        completedVisits,
        absentCount,
        absentRate,
      })
    }

    fetchMonthlyVisitRecords()
  }, [])

  const fetchTodayStats = async () => {
  const today = getJstTodayString()
  const { data: records } = await supabase
    .from('visit_records')
    .select('*')
    .eq('date', today)

  if (!records || records.length === 0) return

  const totalReserved = records.reduce((sum, r) => sum + (r.total_reserved || 0), 0)
  const completedVisits = records.reduce((sum, r) => sum + (r.completed_count || 0), 0)
  const absentCount = records.reduce((sum, r) => sum + (r.absent_count || 0), 0)
  const totalSales = records.reduce((sum, r) => sum + (r.revenue_total || 0), 0)

  setTodayStats({
    totalReserved,
    completedVisits,
    absentCount,
    totalSales
  })
}

useEffect(() => {
  fetchTodayStats()
}, [])

const fetchMonthlySonotaStats = async () => {
  const today = new Date()
  const from = format(startOfMonth(today), 'yyyy-MM-dd')
  const to = format(endOfMonth(today), 'yyyy-MM-dd')

  const { data: sonotaData } = await supabase
    .from('sonota')
    .select('status_type, status_date')
    .gte('status_date', from)
    .lte('status_date', to)

  const count = {
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

if (sonotaData) {
  sonotaData.forEach(row => {
    if (row.status_type === '新規') count.new++
    if (row.status_type === '再開') count.reopen++
    if (row.status_type === '休止') count.pause++
    if (row.status_type === '中止') count.cancel++
    if (row.status_type === '体験') count.trial++
    if (row.status_type === '成約') count.contract++
    if (row.status_type === '不成約') count.nonContract++
  })
}

  count.total = count.new + count.reopen + count.pause + count.cancel
  count.contractRate = count.trial > 0 ? count.contract / count.trial : 0

  setMonthlySonotaStats(count)
}

useEffect(() => {
  fetchMonthlySonotaStats()
}, [])

const fetchExpectedWorkdays = async () => {
  const today = new Date()
  const from = format(startOfMonth(today), 'yyyy-MM-dd')
  const to = format(endOfMonth(today), 'yyyy-MM-dd')

  const { data } = await supabase
    .from('monthly_workdays')
    .select('expected_days')
    .gte('month', from)
    .lte('month', to)
    .single()

  if (data) {
    setMonthlyStats(prev => ({
      ...prev,
      expectedWorkingDays: data.expected_days || 0
    }))
  }
}

useEffect(() => {
  const fetchAllStaffs = async () => {
    const { data, error } = await supabase
      .from('staffs')
      .select('id, name')

    if (error) {
      console.error('❌ staffs取得エラー:', error)
      return
    }

    setAllStaffs(data || [])
  }

  fetchAllStaffs()
}, [])

useEffect(() => {
  fetchExpectedWorkdays()
}, [])

useEffect(() => {
  const fetchTodayStats = async () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data: records } = await supabase
      .from('visit_records')
      .select('*')
      .eq('date', today)

    if (!records || records.length === 0) return

    const totalReserved = records.reduce((sum, r) => sum + (r.total_reserved || 0), 0)
    const completedVisits = records.reduce((sum, r) => sum + (r.completed_count || 0), 0)
    const absentCount = records.reduce((sum, r) => sum + (r.absent_count || 0), 0)
    const totalSales = records.reduce((sum, r) => sum + (r.revenue_total || 0), 0)

    setTodayStats({ totalReserved, completedVisits, absentCount, totalSales })
  }

const fetchTodayPlanStats = async () => {
  const todayStr = getJstTodayString()

  const { data, error } = await supabase
    .from('weekly_visits')
    .select(`
      id,
      staff_id,
      patient_id,
      patients (
        id,
        unit_price
      )
    `)
    .eq('date', todayStr)

  if (error) {
    console.error('❌ weekly_visits 取得エラー:', error)
    return
  }

  if (!data || data.length === 0) {
    setTodayPlanStats({ totalReserved: 0, totalSales: 0 })
    return
  }

  const totalReserved = data.length
const totalSales = data.reduce(
  (sum, v) => sum + ((v.patients as any)?.unit_price || 0),
  0
)

  setTodayPlanStats({
    totalReserved,
    totalSales,
  })
}

  fetchTodayStats()
  fetchTodayPlanStats()
}, [])

useEffect(() => {
  const fetchMonthlySonotaStats = async () => {
  const now = new Date()
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)

  const from = format(startOfMonth(jstNow), 'yyyy-MM-dd')
  const to = format(endOfMonth(jstNow), 'yyyy-MM-dd')


    const { data: sonotaData } = await supabase
      .from('sonota')
      .select('status_type, status_date')
      .gte('status_date', from)
      .lte('status_date', to)

    const count = {
      new: 0, reopen: 0, pause: 0, cancel: 0,
      trial: 0, contract: 0, nonContract: 0,
      total: 0, contractRate: 0,
    }

    sonotaData?.forEach(row => {
      if (row.status_type === '新規') count.new++
      if (row.status_type === '再開') count.reopen++
      if (row.status_type === '休止') count.pause++
      if (row.status_type === '中止') count.cancel++
      if (row.status_type === '体験') count.trial++
      if (row.status_type === '成約') count.contract++
      if (row.status_type === '不成約') count.nonContract++
    })

    count.total = count.new + count.reopen + count.pause + count.cancel
    count.contractRate = count.trial > 0 ? count.contract / count.trial : 0

    setMonthlySonotaStats(count)
  }
  fetchMonthlySonotaStats()
}, [])

useEffect(() => {
  const fetchExpectedWorkdays = async () => {
  const now = new Date()
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)

  const ym = format(jstNow, 'yyyy-MM')


    const { data } = await supabase
      .from('monthly_workdays')
      .select('work_days')
      .eq('year_month', ym) // ← ここを修正
      .single()

    if (data) {
      setMonthlyStats(prev => ({
        ...prev,
        expectedWorkingDays: data.work_days || 0
      }))
    }
  }

  fetchExpectedWorkdays()
}, [])

useEffect(() => {
  const fetchLastMonthSales = async () => {
  const now = new Date()
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)

  const lastMonthStart = format(startOfMonth(subMonths(jstNow, 1)), 'yyyy-MM-dd')
  const lastMonthEnd = format(endOfMonth(subMonths(jstNow, 1)), 'yyyy-MM-dd')

    const { data: records } = await supabase
      .from('visit_records')
      .select('revenue_total')
      .gte('date', lastMonthStart)
      .lte('date', lastMonthEnd)


    if (records) {
      const total = records.reduce((sum, r) => sum + (r.revenue_total || 0), 0)
      setMonthlyStats(prev => ({
        ...prev,
        lastMonthSales: total,
      }))
    }
  }
  fetchLastMonthSales()
}, [])

useEffect(() => {
  const fetchPatientStats = async () => {
  const now = new Date()
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)

  const from = format(startOfMonth(jstNow), 'yyyy-MM-dd')
  const to = format(endOfMonth(jstNow), 'yyyy-MM-dd')


    // ① 今月のログ取得
    const { data: logs } = await supabase
      .from('visit_logs')
      .select('patient_id')
      .gte('date', from)
      .lte('date', to)

    // ② 全患者のステータス取得
    const { data: patients } = await supabase
      .from('patients')
      .select('id, status')

    if (logs && patients) {
      const visitCount = logs.length
      const uniquePatientIds = new Set(logs.map(log => log.patient_id))
      const avg = uniquePatientIds.size > 0 ? visitCount / uniquePatientIds.size : 0

      // ③ 稼働中の患者のみ抽出
      const activePatientIds = new Set(
        patients.filter(p => p.status === 'active').map(p => p.id)
      )

      // ④ 稼働中かつ今月ログがある患者数
      const activePatientsWithLogs = new Set(
        logs
          .filter(log => activePatientIds.has(log.patient_id))
          .map(log => log.patient_id)
      ).size

      // ⑤ セットする
      setMonthlyStats(prev => ({
        ...prev,
        patientCount: uniquePatientIds.size,
        avgVisitPerPatient: avg,
      }))
      setActivePatientCount(activePatientsWithLogs)
    }
  }

  fetchPatientStats()
}, [])

useEffect(() => {
  setMonthlyStats(prev => {
    const avgUnit = prev.completedVisits > 0 ? prev.totalSales / prev.completedVisits : 0
    const perDay = prev.workingDays > 0 ? prev.totalSales / prev.workingDays : 0
    return {
      ...prev,
      avgUnitPrice: avgUnit,
      salesPerDay: perDay,
    }
  })
}, [monthlyStats.totalSales, monthlyStats.completedVisits, monthlyStats.workingDays])

useEffect(() => {
  const fetchTodayStaffStats = async () => {
    const todayStr = getJstTodayString()

    const { data: records, error } = await supabase
      .from('visit_records')
      .select('staff_id, total_reserved, completed_count, absent_count, revenue_total')
      .eq('date', todayStr)

    if (error) {
      console.error('❌ visit_records（日報スタッフ集計）エラー:', error)
      return
    }

    if (!records || records.length === 0) {
      console.log('📭 今日の visit_records は0件です')
      setStaffStats([]) // ← 念のため初期化
      return
    }

    const grouped = new Map<string, any>()

    records.forEach(record => {
      const key = record.staff_id
      if (!key) return

      if (!grouped.has(key)) {
        const staff = allStaffs.find(s => s.id === key)
        grouped.set(key, {
          id: key,
          name: staff?.name || '不明',
          totalSales: 0,
          totalReserved: 0,
          completedVisits: 0,
          absentCount: 0,
        })
      }

      const item = grouped.get(key)
      item.totalSales += record.revenue_total || 0
      item.totalReserved += record.total_reserved || 0
      item.completedVisits += record.completed_count || 0
      item.absentCount += record.absent_count || 0
    })

    const statsArray = Array.from(grouped.values()).map(item => ({
      ...item,
      absentRate: item.totalReserved > 0 ? item.absentCount / item.totalReserved : 0,
    }))

    setStaffStats(statsArray)
  }

  // ✅ allStaffs がそろったら今日の実績を取得
  if (allStaffs.length > 0) {
    fetchTodayStaffStats()
    fetchStaffPlanStats() // ← このままでOK（予定データ）
  }
}, [allStaffs])

const fetchMonthlyStaffStats = async () => {
const now = new Date()
const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)

const from = format(startOfMonth(jstNow), 'yyyy-MM-dd')
const to = format(endOfMonth(jstNow), 'yyyy-MM-dd')


  const { data: records, error } = await supabase
    .from('visit_records')
    .select('staff_id, total_reserved, completed_count, absent_count, revenue_total')
    .gte('date', from)
    .lte('date', to)

  if (error) {
    console.error('❌ visit_records（月間集計）エラー:', error)
    return
  }

  const grouped = new Map<string, any>()

  records.forEach(record => {
    const key = record.staff_id
    if (!key) return

    if (!grouped.has(key)) {
      const staff = allStaffs.find(s => s.id === key)
      grouped.set(key, {
        id: key,
        name: staff?.name || '不明',
        totalSales: 0,
        totalReserved: 0,
        completedVisits: 0,
        absentCount: 0,
      })
    }

    const item = grouped.get(key)
    item.totalSales += record.revenue_total || 0
    item.totalReserved += record.total_reserved || 0
    item.completedVisits += record.completed_count || 0
    item.absentCount += record.absent_count || 0
  })

  const statsArray = Array.from(grouped.values()).map(item => ({
    ...item,
    absentRate: item.totalReserved > 0 ? item.absentCount / item.totalReserved : 0,
  }))

  setMonthlyStaffStats(statsArray) // ← 新たな useState を使います
}

useEffect(() => {
  if (allStaffs.length > 0) {
    fetchMonthlyStaffStats()
  }
}, [allStaffs])

useEffect(() => {
  if (allStaffs.length > 0) {
    fetchStaffPlanStats()
  }
}, [allStaffs])

const fetchStaffPlanStats = async () => {
  const todayStr = getJstTodayString()

  const { data, error } = await supabase
    .from('weekly_visits')
    .select(`
      id,
      staff_id,
      patient_id,
      patients (
        id,
        unit_price
      )
    `)
    .eq('date', todayStr)

  if (error || !data) {
    console.error('❌ weekly_visits (担当者別予定) 取得エラー:', error)
    return
  }

  const grouped = new Map<string, any>()

  data.forEach(visit => {
    const key = visit.staff_id
    if (!key) return

    if (!grouped.has(key)) {
      const staff = allStaffs.find(s => s.id === key)
      grouped.set(key, {
        id: key,
        name: staff?.name || '不明',
        totalSales: 0,
        totalReserved: 0,
      })
    }

    const item = grouped.get(key)
    item.totalSales += (visit.patients as any)?.unit_price || 0
    item.totalReserved += 1
  })

  const statsArray = Array.from(grouped.values())
  setStaffPlanStats(statsArray)
}

useEffect(() => {
  setMonthlyStats(prev => {
    const estimated = prev.salesPerDay * prev.expectedWorkingDays
    return {
      ...prev,
      estimatedSales: Math.round(estimated) // 小数は切り上げ・切り捨て調整可
    }
  })
}, [monthlyStats.salesPerDay, monthlyStats.expectedWorkingDays])

const [consentStats, setConsentStats] = useState({
  expiredCount: 0,
  nearingCount: 0,
})

const [nearingPatients, setNearingPatients] = useState<any[]>([])

useEffect(() => {
  const fetchNearingPatients = async () => {
  const now = new Date()
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)

  const todayStr = format(jstNow, 'yyyy-MM-dd')
  const nextMonthStr = format(addDays(jstNow, 60), 'yyyy-MM-dd')


    const { data, error } = await supabase
      .from('patients')
      .select('name, consent_expiry_at')
      .gte('consent_expiry_at', todayStr)
      .lte('consent_expiry_at', nextMonthStr)
      .order('consent_expiry_at', { ascending: true })

    if (error != null) {
      console.error('❌ 期限間近患者の取得エラー:', error)
      return
    }

    setNearingPatients(data || [])
  }

  fetchNearingPatients()
}, [])

return (
  <main className={styles.main}>
    <h1 className={styles.heading}>鍼灸APP ダッシュボード</h1>

    {/* ① 全体 */}
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>📊 今月の月報（全体）</h2>
      <div className={styles.cardGrid}>
        <div className={styles.card}><p className={styles.cardLabel}>売上（GAP）</p><p className={styles.cardValue}>{monthlyStats.totalSales.toLocaleString()} 円</p></div>
        <div className={styles.card}><p className={styles.cardLabel}>稼働日数</p><p className={styles.cardValue}>{monthlyStats.workingDays} 日</p></div>
        <div className={styles.card}><p className={styles.cardLabel}>総予約数</p><p className={styles.cardValue}>{monthlyStats.totalReserved} 件</p></div>
        <div className={styles.card}><p className={styles.cardLabel}>施術回数</p><p className={styles.cardValue}>{monthlyStats.completedVisits} 回</p></div>
        <div className={styles.card}><p className={styles.cardLabel}>欠席数（率）</p><p className={styles.cardValue}>{monthlyStats.absentCount} 件（{(monthlyStats.absentRate * 100).toFixed(1)}%）</p></div>
        <div className={styles.card}><p className={styles.cardLabel}>売上予定</p><p className={styles.cardValue}>{monthlyStats.estimatedSales.toLocaleString()} 円</p></div>
        <div className={styles.card}><p className={styles.cardLabel}>稼働予定日数</p><p className={styles.cardValue}>{monthlyStats.expectedWorkingDays} 日</p></div>
        <div className={styles.card}><p className={styles.cardLabel}>カルテ枚数</p><p className={styles.cardValue}>{patientStatusStats.active} 人</p></div>
        <div className={styles.card}><p className={styles.cardLabel}>先月比</p><p className={styles.cardValue}>{monthlyStats.lastMonthSales ? ((monthlyStats.totalSales - monthlyStats.lastMonthSales) / monthlyStats.lastMonthSales * 100).toFixed(1) : 0}%</p></div>
        <div className={styles.card}><p className={styles.cardLabel}>1日平均売上</p><p className={styles.cardValue}>{monthlyStats.salesPerDay.toLocaleString()} 円</p></div>
        <div className={styles.card}><p className={styles.cardLabel}>平均単価</p><p className={styles.cardValue}>{monthlyStats.avgUnitPrice.toLocaleString()} 円</p></div>
        <div className={styles.card}><p className={styles.cardLabel}>平均回数</p><p className={styles.cardValue}>{monthlyStats.avgVisitPerPatient.toFixed(1)} 回</p></div>
      </div>
    </section>

    {/* ② 今月の動向 */}
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>📌 今月の動向（患者数変動）</h2>
      <table className={styles.table}>
        <thead>
          <tr><th>新規</th><th>再開</th><th>休止</th><th>中止</th><th>合計</th><th>体験</th><th>成約</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>{monthlySonotaStats.new || 0}</td>
            <td>{monthlySonotaStats.reopen || 0}</td>
            <td>{monthlySonotaStats.pause || 0}</td>
            <td>{monthlySonotaStats.cancel || 0}</td>
            <td>{monthlySonotaStats.total || 0}</td>
            <td>{monthlySonotaStats.trial || 0}</td>
            <td>{monthlySonotaStats.contractRate ? `${(monthlySonotaStats.contractRate * 100).toFixed(1)}%` : '-'}</td>
          </tr>
        </tbody>
      </table>
    </section>

{/* ③ 今日の日報 */}
<section className={styles.section}>
  <h2 className={styles.sectionTitle}>🗓 今日の日報</h2>

  {/* ラジオボタン */}
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ marginRight: '1rem' }}>
      <input
        type="radio"
        name="todayMode"
        checked={!isPlanMode}
        onChange={() => setIsPlanMode(false)}
      />
      実績
    </label>
    <label>
      <input
        type="radio"
        name="todayMode"
        checked={isPlanMode}
        onChange={() => setIsPlanMode(true)}
      />
      予定
    </label>
  </div>

  {/* 実績 / 予定の切り替え表示 */}
  <div className={styles.cardGrid}>
    {isPlanMode ? (
      <>
        <div className={styles.card}>
          <p className={styles.cardLabel}>売上予定</p>
          <p className={styles.cardValue}>{todayPlanStats.totalSales.toLocaleString()} 円</p>
        </div>
        <div className={styles.card}>
          <p className={styles.cardLabel}>予約件数</p>
          <p className={styles.cardValue}>{todayPlanStats.totalReserved} 件</p>
        </div>
        <div className={styles.card}>
          <p className={styles.cardLabel}>施術回数</p>
          <p className={styles.cardValue}>- 回</p>
        </div>
        <div className={styles.card}>
          <p className={styles.cardLabel}>欠席予定</p>
          <p className={styles.cardValue}>-</p>
        </div>
      </>
    ) : (
      <>
        <div className={styles.card}>
          <p className={styles.cardLabel}>売上（GAP）</p>
          <p className={styles.cardValue}>{todayStats.totalSales.toLocaleString()} 円</p>
        </div>
        <div className={styles.card}>
          <p className={styles.cardLabel}>総予約数</p>
          <p className={styles.cardValue}>{todayStats.totalReserved} 件</p>
        </div>
        <div className={styles.card}>
          <p className={styles.cardLabel}>施術回数</p>
          <p className={styles.cardValue}>{todayStats.completedVisits} 回</p>
        </div>
        <div className={styles.card}>
          <p className={styles.cardLabel}>欠席数（率）</p>
          <p className={styles.cardValue}>
            {todayStats.absentCount} 件（
            {todayStats.totalReserved > 0
              ? ((todayStats.absentCount / todayStats.totalReserved) * 100).toFixed(1)
              : '0'
            }%）
          </p>
        </div>
      </>
    )}
  </div>
</section>

<section className={styles.section}>
  <h2 className={styles.sectionTitle}>👥 担当者別内訳</h2>

  {/* 表示切り替え */}
  <div className={styles.cardToggle}>
    <label style={{ marginRight: '1rem' }}>
      <input
        type="radio"
        name="staffMode"
        checked={!isPlanMode}
        onChange={() => setIsPlanMode(false)}
      /> 実績
    </label>
    <label>
      <input
        type="radio"
        name="staffMode"
        checked={isPlanMode}
        onChange={() => setIsPlanMode(true)}
      /> 予定
    </label>
  </div>

  <table className={styles.table}>
    <thead>
      <tr>
        <th>氏名</th>
        <th>売上</th>
        <th>予約数</th>
        <th>施術回数</th>
        <th>欠席数（率）</th>
      </tr>
    </thead>
    <tbody>
      {(isPlanMode ? staffPlanStats : staffStats).length === 0 ? (
        <tr><td colSpan={5}>データなし</td></tr>
      ) : (
        (isPlanMode ? staffPlanStats : staffStats).map((staff, idx) => (
          <tr key={idx}>
            <td>{staff.name}</td>
            <td>{staff.totalSales?.toLocaleString()} 円</td>
            <td>{staff.totalReserved} 件</td>
            <td>{isPlanMode ? '-' : `${staff.completedVisits} 回`}</td>
            <td>
              {isPlanMode
                ? '-'
                : `${staff.absentCount} 件（${(staff.absentRate * 100).toFixed(1)}%）`}
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</section>

    {/* ⑤ 先生ごとの実績（当月） */}
{/* ⑤ 先生ごとの実績（当月） */}
<section className={styles.section}>
  <h2 className={styles.sectionTitle}>🧑‍⚕️ 先生ごとの実績（当月）</h2>
  <table className={styles.table}>
    <thead>
      <tr>
        <th>氏名</th>
        <th>売上（GAP）</th>
        <th>総予約数</th>
        <th>施術回数</th>
        <th>欠席数（率）</th>
      </tr>
    </thead>
    <tbody>
      {monthlyStaffStats.length === 0 ? (
        <tr><td colSpan={5}>データなし</td></tr>
      ) : (
        monthlyStaffStats.map((staff, idx) => (
          <tr key={idx}>
            <td>{staff.name}</td>
            <td>{staff.totalSales.toLocaleString()} 円</td>
            <td>{staff.totalReserved} 件</td>
            <td>{staff.completedVisits} 回</td>
            <td>{staff.absentCount} 件（{(staff.absentRate * 100).toFixed(1)}%）</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</section>


<section className={styles.section}>
  <h2 className={styles.sectionTitle}>📅 同意書の期限が近い患者一覧（60日以内）</h2>
  <table className={styles.table}>
    <thead>
      <tr>
        <th>氏名</th>
        <th>期限日</th>
      </tr>
    </thead>
    <tbody>
      {nearingPatients.length === 0 ? (
        <tr>
          <td colSpan={2}>該当者なし</td>
        </tr>
      ) : (
        nearingPatients.map((p, idx) => (
          <tr key={idx}>
            <td>{p.name}</td>
            <td>{format(new Date(p.consent_expiry_at), 'yyyy年MM月dd日')}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</section>

    {/* ログインユーザーとリンク */}
    <div className={styles.userActions}>
      {userEmail && <p className={styles.paragraph}>ログイン中：{userEmail}</p>}

      <Link href="/routes" className={styles.linkButton}>日別ルートページ</Link>
      <Link href="/routes/weekly" className={styles.linkButton}>週間予定表ページ</Link>
      <Link href="/dashboard/patients" className={styles.linkButton}>患者管理ページ</Link>
      <Link href="/dashboard/staffs" className={styles.linkButton}>スタッフ管理ページ</Link>
      <Link href="/routes/map/route" className={styles.linkButton}>担当者別ルートマップ</Link>
      <Link href="/patient-status" className={styles.linkButton}>その他ページへ</Link>
      <Link href="/routes/history" className={styles.historyButton}>売上履歴ページ</Link>

      <button className={styles.button} onClick={handleLogout}>ログアウト</button>
    </div>
  </main>
)
}