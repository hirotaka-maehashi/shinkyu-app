'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/utils/supabase-browser'
import styles from './page.module.css'
import Link from 'next/link'

export type Weekday = '月' | '火' | '水' | '木' | '金' | '土' | '日'
const weekdays: Weekday[] = ['月', '火', '水', '木', '金', '土', '日']

export type StaffVisit = {
  name: string
  skillLevel: number
  workingDays: string
  dailyVisits: { [key in Weekday]: string[] }
}

// ✅ 時刻を常に HH:mm 形式に整える共通関数
function formatTimeString(raw: string | number): string {
  const [h, m = 0] = raw.toString().split(':').map(Number)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

// ✅ 時刻文字列を分数に変換（安全チェック付き）
const timeStringToMinutes = (time: string): number => {
  if (typeof time !== 'string' || !time.includes(':')) {
    console.warn('⛔ timeStringToMinutes: 無効な time 値:', time)
    return 0
  }

  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export default function WeeklyRoutePage() {
  const [autoStaffRoutes, setAutoStaffRoutes] = useState<StaffVisit[]>([])
  const [manualStaffRoutes, setManualStaffRoutes] = useState<StaffVisit[]>([])
  const visitIdMapRef = useRef<Map<string, string>>(new Map())

  const [allStaffs, setAllStaffs] = useState<any[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')

  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [selectedDay, setSelectedDay] = useState<Weekday>('月')
  const [customTime, setCustomTime] = useState<string>('')

  const [editing, setEditing] = useState<{
    staffName: string
    day: Weekday
    label: string   // ← これを追加
    isManual: boolean
  } | null>(null)
  
  
  const [editTime, setEditTime] = useState<string>('')
  const [editDay, setEditDay] = useState<Weekday>('月')
  const [editStaff, setEditStaff] = useState<string>('') // ← 名前型に変更！
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date())

    // ✅ この下に追加してください
    useEffect(() => {
      const fetchInitialPatients = async () => {
        const { data, error } = await supabase.from('patients').select('*')
        if (error) {
          console.error('❌ 患者取得エラー:', error)
          return
        }
        setPatients(data || [])
      }
      fetchInitialPatients()
    }, [])

    // ✅ この下に追加してください
useEffect(() => {
  const fetchInitialPatients = async () => {
    const { data, error } = await supabase.from('patients').select('*')
    if (error) {
      console.error('❌ 患者取得エラー:', error)
      return
    }
    setPatients(data || [])
  }
  fetchInitialPatients()
}, [])

  const timeOptions: string[] = []
for (let h = 8; h <= 20; h++) {
  for (let m = 0; m < 60; m += 5) {
    const hh = h.toString().padStart(2, '0')
    const mm = m.toString().padStart(2, '0')
    timeOptions.push(`${hh}:${mm}`)
  }
}

const getWeekStartDate = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay() // 0(日)〜6(土)
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  return d
}

const timeStringToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

const handleAutoGenerate = async () => {
  const { data: patientsData } = await supabase.from('patients').select('*')
  const { data: staffData } = await supabase
    .from('staffs')
    .select('*')
    .eq('auto_schedule', true)

  setPatients(patientsData || [])

  if (!patientsData || !staffData || staffData.length === 0) {
    alert('自動ルート対象の施術者がいません。')
    return
  }

  const assignedPatientDayMap = new Set<string>()

  // スタッフごとの訪問データと空きスロット管理を初期化
  const staffRouteMap: Record<string, StaffVisit> = {}
  const staffSlotsMap: Record<string, { [key in Weekday]: { start: number; end: number }[] }> = {}

  staffData.forEach(staff => {
    const dailyVisits = weekdays.reduce((acc, day) => {
      acc[day] = []
      return acc
    }, {} as Record<Weekday, string[]>)

    const occupiedSlots = weekdays.reduce((acc, day) => {
      acc[day] = []
      return acc
    }, {} as Record<Weekday, { start: number; end: number }[]>)

    staffRouteMap[staff.id] = {
      name: staff.name,
      skillLevel: staff.skill_level,
      workingDays: staff.working_days,
      dailyVisits,
    }

    staffSlotsMap[staff.id] = occupiedSlots
  })

  // 🎯患者中心でループし、希望スケジュールに沿って割り当てる
  for (const patient of patientsData) {
    if (patient.assign_type === 'manual') continue
    const schedule = patient.preferred_schedule || {}
    const duration = patient.treatment_duration
    const difficulty = patient.difficulty

    for (const day of weekdays) {
      const preferredTime = schedule[day]

      // 🛡️ 安全チェック（型と形式）
      if (!preferredTime || typeof preferredTime !== 'string' || !preferredTime.includes(':')) {
        console.warn(`⛔ 無効なpreferredTime (${preferredTime}) → 患者: ${patient.name}, 曜日: ${day}`)
        continue
      }

      if (!duration || typeof duration !== 'number') {
        console.warn(`⛔ 無効なduration (${duration}) → 患者: ${patient.name}`)
        continue
      }

      const key = `${patient.id}-${day}`
      if (assignedPatientDayMap.has(key)) continue

      const start = timeStringToMinutes(preferredTime)
      const end = start + duration

      // スタッフ順に割り当てを試す
      for (const staff of staffData) {
        const workingDays = (staff.working_days || '').split(',')
        if (!workingDays.includes(day)) continue

        if (
          typeof difficulty === 'number' &&
          typeof staff.skill_level === 'number' &&
          difficulty > staff.skill_level
        ) {
          continue
        }

        const slots = staffSlotsMap[staff.id][day]
        const overlap = slots.some(slot => !(end <= slot.start || start >= slot.end))
        if (overlap) continue

        const isPriority = patient.last_assigned_staff_id === staff.id
        const label = isPriority ? `★${patient.name}` : `①${patient.name}`

        staffRouteMap[staff.id].dailyVisits[day].push(`${label} ${preferredTime}（${duration}分）`)
        staffSlotsMap[staff.id][day].push({ start, end })
        assignedPatientDayMap.add(key)
        break // 割り当てできたら次の曜日へ
      }
    }
  }

  const routes = Object.values(staffRouteMap)
  console.log('✅ 生成された自動ルート:', routes)

  await handleSave(routes, [], patientsData, staffData)
  await fetchWeeklyVisits()

  alert('✅ 自動スケジュールを保存し、表示を更新しました')
}

  const handleManualBatchAssign = async () => {
    // ① 太田先生の取得
    const ohta = allStaffs.find(s => s.name === '太田')
    if (!ohta) {
      alert('太田先生が見つかりません')
      return
    }
  
    // ② 手動対象の患者だけ抽出
    const manualPatients = patients.filter(p =>
      p.assign_type === 'manual' &&
      Object.keys(p.preferred_schedule || {}).length > 0
    )
  
    // ③ 今週の訪問予定を取得（重複回避用）
    const baseDate = getWeekStartDate(selectedWeek)
    const endDate = new Date(baseDate)
    endDate.setDate(baseDate.getDate() + 6)
  
    const { data: existingVisits } = await supabase
      .from('weekly_visits')
      .select('patient_id, date, time')
      .gte('date', baseDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
  
    const existingKeys = new Set(
      (existingVisits || []).map(v => `${v.patient_id}-${v.date}-${v.time}`)
    )
  
    // ④ 登録データを構築（重複スキップ）
    const inserts = manualPatients.flatMap(p => {
      return Object.entries(p.preferred_schedule).flatMap(([day, time]) => {
        const date = new Date(baseDate)
        date.setDate(baseDate.getDate() + weekdays.indexOf(day as Weekday))
        const isoDate = date.toISOString().split('T')[0]
        const key = `${p.id}-${isoDate}-${time}`
  
        if (existingKeys.has(key)) return [] // 重複スキップ
  
        return [{
          staff_id: ohta.id,
          patient_id: p.id,
          date: isoDate,
          time,
          is_manual: true
        }]
      })
    })
  
    // ⑤ Supabase に保存
    if (inserts.length > 0) {
      await supabase.from('weekly_visits').insert(inserts)
      alert(`✅ ${inserts.length}件 登録しました`)
      await fetchWeeklyVisits()
    } else {
      alert('⛔ 重複のため登録対象がありませんでした')
    }
  }
  
  // 編集確定
  const handleEditConfirm = async () => {
    if (!editing) return

console.log('🔍 編集ステート:', editing)
  
    const fromIndexAuto = autoStaffRoutes.findIndex(s => s.name === editing.staffName)
    const fromIndexManual = manualStaffRoutes.findIndex(s => s.name === editing.staffName)
    
    // 🔽 どちらかが見つかればOK（両方 -1 ならNG）
    if (fromIndexAuto === -1 && fromIndexManual === -1) {
      alert('移動元のスタッフが見つかりませんでした')
      return
    }
    
// 🔍 操作対象の訪問データを正確に取得（labelベース）
const fromAuto = autoStaffRoutes.find(s => s.name === editing.staffName)
const fromManual = manualStaffRoutes.find(s => s.name === editing.staffName)
const dailyVisits = editing.isManual
  ? fromManual?.dailyVisits[editing.day]
  : fromAuto?.dailyVisits[editing.day]

const oldEntry = dailyVisits?.find(v => v === editing.label)

// 🧪 実際に操作対象となっているデータの確認
console.log('🧪 oldEntry（対象データ）:', oldEntry)

if (!oldEntry) {
  alert('元の訪問データが見つかりませんでした')
  return
}

    // ✅ prefix/suffix 抽出（外に定義して再利用）
    const prefix = oldEntry.startsWith('★') ? '★' : oldEntry.startsWith('①') ? '①' : ''
    const suffix = oldEntry.includes('（') ? oldEntry.substring(oldEntry.indexOf('（')) : ''
    
    // ✅ 時間抽出（ゼロ埋め対応）
    const match = oldEntry.match(/\s(\d{1,2}):(\d{2})/)
    const oldTime = match ? `${match[1].padStart(2, '0')}:${match[2]}` : null
    if (!oldTime) {
      console.warn('❌ 時間が抽出できませんでした:', oldEntry)
      return
    }
    
    // 🔑 ラベル生成
    const nameAndTime = oldEntry.replace(/^★|^①/, '').split('（')[0].trim()
    const nameOnly = nameAndTime.replace(/\s\d{1,2}:\d{2}$/, '').replace(/\s\d{4}-\d{2}-\d{2}$/, '').trim()
    
    const baseDate = getWeekStartDate(selectedWeek)
    const dayOffset = weekdays.indexOf(editing.day)
    const visitDate = new Date(baseDate)
    visitDate.setDate(baseDate.getDate() + dayOffset)
    const isoDate = visitDate.toISOString().split('T')[0]
    
    const labelKeyMatch = oldEntry.match(/^[★①]?(.+?) (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/)
const labelKey = labelKeyMatch
  ? `${labelKeyMatch[1].trim()} ${labelKeyMatch[2]} ${labelKeyMatch[3]}`
  : `${nameOnly} ${isoDate} ${oldTime}`  // fallback

    // 🔍 ログ追加：ここで照合ズレがないか検証する
    console.log('🔑 labelKey（探しているキー）:', labelKey)
    console.log('📦 visitIdMap keys（登録済キー一覧）:', [...visitIdMapRef.current.keys()])
    
    const visitId = visitIdMapRef.current.get(labelKey)
    
    if (!visitId) {
      console.warn('❌ visitId が取得できませんでした:', labelKey)
      alert('更新対象のデータが特定できませんでした')
      return
    }
          
    const allStaffList = [
      ...autoStaffRoutes,
      ...manualStaffRoutes,
      ...allStaffs.map(s => ({
        name: s.name,
        skillLevel: s.skill_level,
        workingDays: s.working_days,
        dailyVisits: { 月: [], 火: [], 水: [], 木: [], 金: [], 土: [], 日: [] }
      }))
    ]    
  
    const staff = autoStaffRoutes.find(s => s.name === editStaff)
    || manualStaffRoutes.find(s => s.name === editStaff)
    || allStaffs.find(s => s.name === editStaff)  
  
  if (!staff) {
    alert('スタッフデータが取得できませんでした')
    return
  }  
  
    console.log('🔍 検証: staff.name =', staff.name)
console.log('🔍 allStaffs names =', allStaffs.map(s => s.name))

const staffRecord = allStaffs.find(s => s.name === editStaff)

    if (!staffRecord) {
      alert('施術者情報が取得できませんでした')
      return
    }
  
    // ✅ Supabase 上書き処理
    const newBaseDate = getWeekStartDate(selectedWeek)
    const newDayOffset = weekdays.indexOf(editDay)
    const newVisitDate = new Date(newBaseDate)
    newVisitDate.setDate(newBaseDate.getDate() + newDayOffset)
    const newIsoDate = newVisitDate.toISOString().split('T')[0]
    const timeMatch = editTime.match(/^(\d{1,2}):(\d{2})/)
const newTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : editTime
    const isManual = editing.isManual
  
    const { error } = await supabase
    .from('weekly_visits')
    .update({
      staff_id: staffRecord.id,
      date: newIsoDate,
      time: newTime,
      is_manual: isManual  // ← ここを追加
    })
    .eq('id', visitId)
  
  
    if (error) {
      console.error('❌ 更新失敗:', error)
      alert('更新に失敗しました')
      return
    }
  
// ✅ 表示側を更新（自動・手動どちらでも対応）
if (editing?.isManual) {
  setManualStaffRoutes(prev => {
    const updated = [...prev]

 // 移動元から削除（visitIndex → label による一致で削除）
const fromIndex = updated.findIndex(s => s.name === editing.staffName)
if (fromIndex !== -1) {
  updated[fromIndex].dailyVisits[editing.day] = updated[fromIndex].dailyVisits[editing.day]
    .filter(v => v !== editing.label)
}

    // 移動先に追加
    const toIndex = updated.findIndex(s => s.name === editStaff)
    const entry = `${prefix}${nameOnly} ${newTime}${suffix}`

    if (toIndex === -1) {
      // 移動先の手動スタッフが存在しない場合は新規追加
      const newDailyVisits: { [key in Weekday]: string[] } = {
        月: [], 火: [], 水: [], 木: [], 金: [], 土: [], 日: []
      }
      newDailyVisits[editDay].push(entry)
      updated.push({
        name: editStaff,
        skillLevel: staffRecord.skill_level,
        workingDays: staffRecord.working_days,
        dailyVisits: newDailyVisits
      })
    } else {
      updated[toIndex].dailyVisits[editDay].push(entry)
    }

    return updated
  })
} else {
  setAutoStaffRoutes(prev => {
    const updated = [...prev]

// 移動元から削除（visitIndex → label で特定）
const fromIndex = updated.findIndex(s => s.name === editing?.staffName)
if (fromIndex !== -1) {
  updated[fromIndex].dailyVisits[editing.day] = updated[fromIndex].dailyVisits[editing.day]
    .filter(v => v !== editing.label)
}

    // 移動先に追加
    const toIndex = updated.findIndex(s => s.name === editStaff)
    const entry = `${prefix}${nameOnly} ${newTime}${suffix}`

    if (toIndex === -1) {
      // 移動先の自動スタッフが存在しない場合は新規追加
      const newDailyVisits: { [key in Weekday]: string[] } = {
        月: [], 火: [], 水: [], 木: [], 金: [], 土: [], 日: []
      }
      newDailyVisits[editDay].push(entry)
      updated.push({
        name: editStaff,
        skillLevel: staffRecord.skill_level,
        workingDays: staffRecord.working_days,
        dailyVisits: newDailyVisits
      })
    } else {
      updated[toIndex].dailyVisits[editDay].push(entry)
    }

    return updated
  })
}
  
    setEditing(null)
    setEditTime('')
  }  
  
  // 削除処理
  const handleDelete = async () => {
    console.log('🧨 handleDelete 発火', editing)
    if (!editing) return
  
    const staffList = editing.isManual ? manualStaffRoutes : autoStaffRoutes
    const staff = staffList.find(s => s.name === editing.staffName)
if (!staff) {
  alert('スタッフが見つかりませんでした')
  return
}
const visitLabel = editing.label
    
    // 時間と名前の抽出（この部分はそのまま使う）
    const match = visitLabel.match(/\s(\d{1,2}:\d{2})/)
    const time = match ? match[1] : null
    const nameAndTime = visitLabel.replace(/^★|^①/, '').split('（')[0].trim()
    const nameOnly = nameAndTime.split(' ').slice(0, -2).join(' ')  // ← 姓名だけ抽出
    
    // 🔽 編集対象の日付を算出
    const baseDate = getWeekStartDate(selectedWeek)
    const dayOffset = weekdays.indexOf(editing.day)
    const visitDate = new Date(baseDate)
    visitDate.setDate(baseDate.getDate() + dayOffset)
    const isoDate = visitDate.toISOString().split('T')[0]  // "2025-05-05"
    
    // 🔽 visitId を正確に取得
    const labelKey = `${nameOnly} ${isoDate} ${time}`
    const visitId = visitIdMapRef.current.get(labelKey)

    console.log('🔍 labelKey:', labelKey)
    console.log('📦 visitIdMap keys:', [...visitIdMapRef.current.keys()])
    
    // 補足：他の処理はそのままでOK
    const patient = patients.find(p => p.name === nameOnly)
    console.log('🔍 検証: staff.name =', staff.name)
console.log('🔍 allStaffs names =', allStaffs.map(s => s.name))

    const staffRecord = allStaffs.find(s => s.name === staff.name)
    

    console.log('🟡 データ検証:', { visitId, patient, staffRecord, time })
  
    if (!visitId || !staffRecord || !time) {
      alert('削除対象のデータ特定に失敗しました')
      return
    }    
  
    console.log('🧨 削除クエリ確認:')
    console.log('visit_id:', visitId)
    console.log('staff_id:', staffRecord.id)
  
    // ✅ Supabase削除（UUID 1件）
    const { data, error } = await supabase
    .from('weekly_visits')
    .delete()
    .eq('id', visitId)  

  console.log('🟥 delete結果:', { data, error })
  
    if (error) {
      console.error('❌ Supabase削除エラー:', error)
      alert('削除に失敗しました')
      return
    }
  
// ✅ ローカルからも削除
if (editing.isManual) {
  setManualStaffRoutes(prev => {
    const updated = [...prev]
    const index = updated.findIndex(s => s.name === editing.staffName)
    if (index === -1) return prev

    updated[index].dailyVisits[editing.day] = updated[index].dailyVisits[editing.day]
      .filter(v => v !== editing.label)

    return updated
  })
} else {
  setAutoStaffRoutes(prev => {
    const updated = [...prev]
    const index = updated.findIndex(s => s.name === editing.staffName)
    if (index === -1) return prev

    updated[index].dailyVisits[editing.day] = updated[index].dailyVisits[editing.day]
      .filter(v => v !== editing.label)

    return updated
  })
}

setEditing(null)
await fetchWeeklyVisits()

  }  

// ✅ fetchAllStaffs を定義
const fetchAllStaffs = async () => {
  const { data, error } = await supabase
    .from('staffs')
    .select('id, name, skill_level, working_days, auto_schedule')

  if (error) {
    console.error('スタッフ取得エラー:', error)
  } else {
    setAllStaffs(data || [])
  }
}

// ✅ その下で useEffect で呼び出す
useEffect(() => {
  fetchAllStaffs()
}, [])


  // ✅ ← この下に「ユーザー確認用 useEffect」を追加！
useEffect(() => {
  const checkUser = async () => {
    const { data, error } = await supabase.auth.getUser()
    console.log('✅ 現在のSupabaseユーザー:', data?.user)
    if (error) {
      console.error('❌ ユーザー取得エラー:', error)
    }
  }
  checkUser()
}, [])

  const handleManualAdd = async () => {
    if (!selectedStaffId || !customTime || !selectedPatientId) {
      alert('スタッフ・時間・患者をすべて選択してください。')
      return
    }
  
    const staff = allStaffs.find(s => s.id === selectedStaffId)
    if (!staff) {
      alert('選択されたスタッフが見つかりません')
      return
    }
  
    const patient = patients.find(p => p.id === selectedPatientId)
    const newVisit = `${patient?.name || '不明'} ${customTime}`
  
    // ✅ selectedWeek を週の月曜に補正
    const baseDate = getWeekStartDate(selectedWeek)
    console.log('📆 baseDate（週の月曜）:', baseDate.toISOString()) // ← これを追加
    const dayOffset = weekdays.indexOf(selectedDay)
    const visitDate = new Date(baseDate)
    visitDate.setDate(baseDate.getDate() + dayOffset)
    const isoDate = visitDate.getFullYear() + '-' +
  String(visitDate.getMonth() + 1).padStart(2, '0') + '-' +
  String(visitDate.getDate()).padStart(2, '0')
  
    // 💾 Supabaseに保存（is_manual: true を明示）
   const { error } = await supabase.from('weekly_visits').insert([
  {
    staff_id: selectedStaffId,
    patient_id: selectedPatientId,
    date: isoDate,
    time: formatTimeString(customTime),  // ← ここを修正
    is_manual: true
  }
])
  
    if (error) {
      console.error('❌ 手動追加の保存エラー:', error)
      alert('保存に失敗しました')
      return
    }
  
    // ✅ 表示にも反映
    setManualStaffRoutes(prev => {
      const existingIndex = prev.findIndex(p => p.name === staff.name)
      const updated = [...prev]
  
      if (existingIndex === -1) {
        const newDailyVisits: { [key in Weekday]: string[] } = {
          月: [], 火: [], 水: [], 木: [], 金: [], 土: [], 日: []
        }
        newDailyVisits[selectedDay].push(newVisit)
  
        updated.push({
          name: staff.name,
          skillLevel: staff.skill_level,
          workingDays: staff.working_days,
          dailyVisits: newDailyVisits
        })
      } else {
        updated[existingIndex].dailyVisits[selectedDay].push(newVisit)
      }
  
      return updated
    })
  
    alert('✅ 手動スケジュールを追加しました')
  
    // ⬇ 表示データを再取得して整合性維持
    await fetchWeeklyVisits()
  
    // 入力リセット
    setCustomTime('')
  }  

  useEffect(() => {
    if (patients.length > 0 && allStaffs.length > 0) {
      fetchWeeklyVisits()
    }
  }, [selectedWeek, patients, allStaffs])  
  
  const fetchWeeklyVisits = async (
    patientsRef = patients,
    staffsRef = allStaffs
  ) => {
    console.log('🧪 staffsRef（全スタッフ一覧）:', staffsRef)
  
    const visitIdMap = new Map<string, string>()
  
    const baseDate = getWeekStartDate(selectedWeek)
    const start = baseDate.toISOString().split('T')[0]
    const endDate = new Date(baseDate)
    endDate.setDate(baseDate.getDate() + 6)
    const end = endDate.toISOString().split('T')[0]
  
    const { data, error } = await supabase
      .from('weekly_visits')
      .select('*')
      .gte('date', start)
      .lte('date', end)
  
    if (error) {
      console.error('❌ 取得エラー:', error)
      return
    }
  
    if (!data) return
  
    const autoMap: { [name: string]: StaffVisit } = {}
    const manualMap: { [name: string]: StaffVisit } = {}
  
    data.forEach((visit: any) => {
      const staff = staffsRef.find(s => s.id === visit.staff_id)
      const patient = patientsRef.find(p => p.id === visit.patient_id)
      if (!staff || !patient) return
  
      const visitDate = new Date(visit.date)
      const dayIndex = visitDate.getDay()
      const day: Weekday = weekdays[dayIndex === 0 ? 6 : dayIndex - 1]
  
const visitTime = visit.time.match(/^(\d{1,2}):(\d{2})/)
const formattedTime = visitTime ? `${visitTime[1].padStart(2, '0')}:${visitTime[2]}` : visit.time

const label = `${patient.name} ${visit.date} ${formattedTime}`
visitIdMap.set(label, visit.id)

  
      const targetMap = visit.is_manual === true ? manualMap : autoMap
  
      if (!targetMap[staff.name]) {
        targetMap[staff.name] = {
          name: staff.name,
          skillLevel: staff.skill_level,
          workingDays: staff.working_days,
          dailyVisits: {
            月: [], 火: [], 水: [], 木: [], 金: [], 土: [], 日: []
          }
        }
      }
  
      targetMap[staff.name].dailyVisits[day].push(label)
    })
  
    // ✅ visitIdMap 登録
    visitIdMapRef.current = visitIdMap
  
    // ✅ 自動ゾーン: auto_schedule: true の先生すべてを含める（0件OK）
    const completeAutoRoutes: StaffVisit[] = staffsRef
      .filter(s => s.auto_schedule === true)
      .map(staff => {
        return autoMap[staff.name] || {
          name: staff.name,
          skillLevel: staff.skill_level,
          workingDays: staff.working_days,
          dailyVisits: {
            月: [], 火: [], 水: [], 木: [], 金: [], 土: [], 日: []
          }
        }
      })
  
    setAutoStaffRoutes(completeAutoRoutes)
    setManualStaffRoutes(Object.values(manualMap))
  }  
    
  const handleCopyFromPreviousWeek = async () => {
    // 🔙 先週の開始・終了日を算出
    const prevWeekStart = new Date(selectedWeek)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  
    const start = prevWeekStart.toISOString().split('T')[0]
  
    const prevWeekEnd = new Date(prevWeekStart)
    prevWeekEnd.setDate(prevWeekStart.getDate() + 6)
    const end = prevWeekEnd.toISOString().split('T')[0]
  
    console.log('📋 先週の範囲:', start, '〜', end)
  
    // 📥 Supabaseから先週の訪問データを取得
    const { data: previousWeekVisits, error } = await supabase
      .from('weekly_visits')
      .select('*')
      .gte('date', start)
      .lte('date', end)
  
    if (error) {
      console.error('❌ 先週データ取得エラー:', error)
      alert('先週のデータ取得に失敗しました')
      return
    }
  
    if (!previousWeekVisits || previousWeekVisits.length === 0) {
      alert('先週の予定が見つかりませんでした')
      return
    }
  
    console.log('✅ 取得した先週の訪問データ:', previousWeekVisits)
  
    // 🔁 +7日して今週のコピー用データを作成
    const inserts = previousWeekVisits.map((visit: any) => {
      const newDate = new Date(visit.date)
      newDate.setDate(newDate.getDate() + 7)
  
      return {
        staff_id: visit.staff_id,
        patient_id: visit.patient_id,
        date: newDate.getFullYear() + '-' +
              String(newDate.getMonth() + 1).padStart(2, '0') + '-' +
              String(newDate.getDate()).padStart(2, '0'),
        time: visit.time,
        is_manual: visit.is_manual === true
      }      
    })
  
    // 📤 Supabaseにコピーを保存
    const { error: insertError } = await supabase
      .from('weekly_visits')
      .insert(inserts)
  
    if (insertError) {
      console.error('❌ コピー保存エラー:', insertError)
      alert('コピー保存に失敗しました')
      return
    }
  
    alert('✅ 先週の予定をこの週にコピーしました')
  
    // 🔄 表示を更新（今週のデータを再取得）
    await fetchWeeklyVisits()
  }

  
  const handleSave = async (
    autoRoutes = autoStaffRoutes,
    manualRoutes = manualStaffRoutes,
    patientsRef = patients,
    staffsRef = allStaffs
  ) => {
    console.log('🟢 自動ルート:', autoRoutes)
    console.log('🟢 手動ルート:', manualRoutes)
  
    const inserts = []
    const allRoutes = [...autoRoutes, ...manualRoutes]
  
    for (const staffRoute of allRoutes) {
      const staff = staffsRef.find(s => s.name === staffRoute.name)
      console.log('▶ 処理中 staffRoute.name:', staffRoute.name)
      console.log('✅ 見つかった staff:', staff)
  
      if (!staff) {
        console.warn(`⚠ スタッフが見つかりません: ${staffRoute.name}`)
        continue
      }
  
      for (const day of weekdays) {
        const visits = staffRoute.dailyVisits[day]
        console.log(`📅 ${staffRoute.name} の ${day} の訪問データ:`, visits)
  
        for (const visit of visits) {
          // ✅ 時間抽出：ゼロ埋めあり形式に変更
          const timeMatch = visit.match(/\s(\d{1,2}):(\d{2})/)
          const time = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null
        
          if (!time) {
            console.warn('⚠ 時間抽出に失敗:', visit)
            continue
          }        
  
          const cleanVisit = visit.replace(/^★|^①/, '')
          const timeIndex = cleanVisit.search(/\s\d{1,2}:\d{2}/)
          const nameOnly = timeIndex !== -1 ? cleanVisit.slice(0, timeIndex).trim() : ''
          const patient = patientsRef.find(p => p.name === nameOnly)
  
          console.log('🟡 visit:', visit)
          console.log('🔹 cleanVisit:', cleanVisit)
          console.log('⏰ timeIndex:', timeIndex)
          console.log('👤 nameOnly:', nameOnly)
          console.log('🔍 patient:', patient)
          console.log('👥 staff:', staff)
  
          if (!patient) {
            console.warn(`⚠ 患者が見つかりません: "${nameOnly}"`)
            continue
          }
  
          const dayOffset = weekdays.indexOf(day)
          const baseDate = getWeekStartDate(selectedWeek)
          const visitDate = new Date(baseDate)
          visitDate.setDate(baseDate.getDate() + dayOffset)
          const isoDate = visitDate.getFullYear() + '-' +
          String(visitDate.getMonth() + 1).padStart(2, '0') + '-' +
          String(visitDate.getDate()).padStart(2, '0')        
  
          const { data: existing } = await supabase
            .from('weekly_visits')
            .select('id')
            .eq('patient_id', patient.id)
            .eq('date', isoDate)
            .eq('time', time)
  
          if (existing && existing.length > 0) {
            console.warn('⏭ 重複スキップ:', { staff: staff.name, patient: patient.name, date: isoDate, time })
            continue
          }
  
          const isManual = manualRoutes.some(ms => ms.name === staffRoute.name)
  
          inserts.push({
            staff_id: staff.id,
            patient_id: patient.id,
            date: isoDate,
            time: time,
            duration: patient.treatment_duration,
            is_manual: isManual
          })
        }
      }
    }
  
    console.log('📤 送信予定のデータ:', inserts)
  
    if (inserts.length === 0) {
      alert('保存対象が見つかりませんでした（すでに登録済みか、抽出エラー）')
      return
    }
  
    const { data, error } = await supabase.from('weekly_visits').insert(inserts)
    if (error) {
      console.error('❌ 保存エラー:', error)
      alert('保存に失敗しました')
    } else {
      alert('✅ 保存が完了しました')
    }
  }

  const monday = getWeekStartDate(selectedWeek) 

 return (
  <div className={styles.container}>
    <h1 className={styles.heading}>1週間の訪問ルート表</h1>

    <div className={styles.controls}>
      <button onClick={handleAutoGenerate} className={styles.autoGenerateButton}>
        🔄 自動スケジュール再生成
      </button>
    </div>

<table className={styles.table}>
  <thead>
    <tr>
      <th>施術者</th>
      {weekdays.map((day, index) => {
        const date = new Date(monday)
        date.setDate(monday.getDate() + index)
        const formatted = `${day} (${date.getMonth() + 1}/${date.getDate()})`
        return <th key={day}>{formatted}</th>
      })}
      <th>週合計</th>
    </tr>
  </thead>

      <tbody>
        {autoStaffRoutes.map((staff, staffIndex) => {
          const weeklyTotal = weekdays.reduce(
            (acc, day) => acc + staff.dailyVisits[day].length,
            0
          )
 return (
            <tr key={staffIndex}>
              <td className={styles.name}>
                {staff.name}<br />
                <small>Lv.{staff.skillLevel}／{staff.workingDays}</small>
              </td>
              {weekdays.map(day => (
                <td key={day} className={styles.cell}>
<div className={styles.cellContent}>
  {(() => {
    const sortedVisits = [...staff.dailyVisits[day]].sort((a, b) => {
      const timeA = a.match(/\s(\d{1,2}):(\d{2})/)?.slice(1).map(Number) || [0, 0]
      const timeB = b.match(/\s(\d{1,2}):(\d{2})/)?.slice(1).map(Number) || [0, 0]
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1])
    })

    return sortedVisits.map((visit, visitIndex) => {
      const isEditing = editing &&
      editing.staffName === staff.name &&
      editing.day === day &&
      visit === editing.label &&
      editing.isManual === false
    

      return (
        <div key={visitIndex} className={isEditing ? styles.editForm : undefined}>
          {isEditing ? (
            <>
              <div className={styles.label}>{visit.split(' ')[0]}</div>

              <select
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className={styles.input}
              >
                <option value="">-- 時間を選択 --</option>
                {timeOptions.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>

              <select
                value={editDay}
                onChange={(e) => setEditDay(e.target.value as Weekday)}
                className={styles.input}
              >
                {weekdays.map(dayOption => (
                  <option key={dayOption} value={dayOption}>{dayOption}</option>
                ))}
              </select>

              <select
                value={editStaff}
                onChange={(e) => setEditStaff(e.target.value)}
                className={styles.input}
              >
                {allStaffs.map((staff) => (
                  <option key={staff.id} value={staff.name}>
                    {staff.name}
                  </option>
                ))}
              </select>

              <div className={styles.editButtons}>
                <button onClick={handleEditConfirm}>確定</button>
                <button
                  onClick={() => setEditing(null)}
                  style={{ backgroundColor: '#38a169', color: '#fff' }}
                >
                  キャンセル
                </button>
                <button onClick={handleDelete}>削除</button>
              </div>
            </>
          ) : (
            <>
              <span>{visit}</span>
              <button
                onClick={() => {
                  setEditing({
                    staffName: staff.name,
                    day,
                    label: visit,   // ← visitIndex の代わりに実際の内容
                    isManual: false
                  })                  
                  setEditDay(day)
                  setEditStaff(staff.name)
                  const match = visit.match(/\s(\d{1,2}):(\d{2})/)
                  const time = match ? `${match[1].padStart(2, '0')}:${match[2]}` : ''
                  setEditTime(time)
                }}
                className={styles.button}
                style={{ backgroundColor: '#0070f3', color: '#fff' }}
              >
                編集
              </button>
            </>
          )}
        </div>
      )
    })
  })()}
  <div className={styles.count}>{staff.dailyVisits[day].length}件</div>
</div>
                </td>
              ))}
              <td className={styles.total}>{weeklyTotal}件</td>
            </tr>
          )
        })}
      </tbody>
    </table>

    <h2 className={styles.subheading}>📝 手動追加スケジュール</h2>

    <div className={styles.buttonWrapperRight}>
  <button onClick={handleManualBatchAssign} className={styles.manualGenerateButton}>
    ⏬ 手動患者を太田先生に一括登録
  </button>
</div>

<table className={styles.table}>
  <thead>
    <tr>
      <th>施術者</th>
      {weekdays.map((day, index) => {
        const date = new Date(monday)
        date.setDate(monday.getDate() + index)
        const formatted = `${day} (${date.getMonth() + 1}/${date.getDate()})`
        return <th key={day}>{formatted}</th>
      })}
      <th>週合計</th>
    </tr>
  </thead>

  <tbody>
  {manualStaffRoutes.map((staff, staffIndex) => {
    const weeklyTotal = weekdays.reduce(
      (acc, day) => acc + staff.dailyVisits[day].length,
      0
    )
    return (
      <tr key={staffIndex}>
        <td className={styles.name}>
          {staff.name}<br />
          <small>Lv.{staff.skillLevel}／{staff.workingDays}</small>
        </td>
        {weekdays.map(day => (
 <td key={day} className={styles.cell}>
 <div className={styles.cellContent}>
   {(() => {
     const sortedVisits = [...staff.dailyVisits[day]].sort((a, b) => {
       const timeA = a.match(/\s(\d{1,2}):(\d{2})/)?.slice(1).map(Number) || [0, 0]
       const timeB = b.match(/\s(\d{1,2}):(\d{2})/)?.slice(1).map(Number) || [0, 0]
       return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1])
     })

     return sortedVisits.map((visit, visitIndex) => {
      const isEditing = editing &&
      editing.staffName === staff.name &&
      editing.day === day &&
      visit === editing.label &&
      editing.isManual === true    

       return (
         <div key={visitIndex} className={isEditing ? styles.editForm : undefined}>
           {isEditing ? (
             <>
               <div className={styles.label}>{visit.split(' ')[0]}</div>

               <select
                 value={editTime}
                 onChange={(e) => setEditTime(e.target.value)}
                 className={styles.input}
               >
                 <option value="">-- 時間を選択 --</option>
                 {timeOptions.map(time => (
                   <option key={time} value={time}>{time}</option>
                 ))}
               </select>

               <select
                 value={editDay}
                 onChange={(e) => setEditDay(e.target.value as Weekday)}
                 className={styles.input}
               >
                 {weekdays.map(dayOption => (
                   <option key={dayOption} value={dayOption}>{dayOption}</option>
                 ))}
               </select>

               <select
                 value={editStaff}
                 onChange={(e) => setEditStaff(e.target.value)}
                 className={styles.input}
               >
                 {allStaffs.map((staff) => (
                   <option key={staff.id} value={staff.name}>
                     {staff.name}
                   </option>
                 ))}
               </select>

               <div className={styles.editButtons}>
                 <button onClick={handleEditConfirm}>確定</button>
                 <button
                   onClick={() => setEditing(null)}
                   style={{ backgroundColor: '#38a169', color: '#fff' }}
                 >
                   キャンセル
                 </button>
                 <button onClick={handleDelete}>削除</button>
               </div>
             </>
           ) : (
             <>
               <span>{visit}</span>
               <button
                 onClick={() => {
                  setEditing({
                    staffName: staff.name,
                    day,
                    label: visit,   // ← visitの中身そのもの
                    isManual: true
                  })
                                  
                   setEditDay(day)
                   setEditStaff(staff.name)
                   const match = visit.match(/\s(\d{1,2}):(\d{2})/)
                   const time = match ? `${match[1].padStart(2, '0')}:${match[2]}` : ''
                   setEditTime(time)
                 }}
                 className={styles.button}
                 style={{ backgroundColor: '#0070f3', color: '#fff', marginLeft: '8px' }}
               >
                 編集
               </button>
             </>
           )}
         </div>
       )
     })
   })()}
   <div className={styles.count}>{staff.dailyVisits[day].length}件</div>
 </div>
</td>
        ))}
        <td className={styles.total}>{weeklyTotal}件</td>
      </tr>
    )
  })}
</tbody>
</table>

<div className={styles.weekSelector}>
  <label>
    🟢 表示したい週（編集対象）：
    <input
      type="date"
      value={selectedWeek.toISOString().split('T')[0]}
      onChange={(e) => setSelectedWeek(new Date(e.target.value))}
    />
  </label>
</div>

<div className={styles.copyButtonWrapper}>
  <button onClick={handleCopyFromPreviousWeek} className={styles.copyButton}>
    ⏩ 先週の予定をこの週にコピー
  </button>
</div>

<div className={styles.saveWrapper}>
<button onClick={() => handleSave()} className={styles.saveButton}>
  💾 スケジュール全体を保存
</button>
</div>

<h3>📥 手動でスケジュールを追加</h3>
<div className={styles.manualForm}>

  {/* スタッフ選択 */}
  <label>
    スタッフ：
    <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)}>
      <option value="">-- スタッフを選択 --</option>
      {allStaffs.map(staff => (
        <option key={staff.id} value={staff.id}>{staff.name}</option>
      ))}
    </select>
  </label>

  {/* 曜日選択 */}
  <label>
    曜日：
    <select value={selectedDay} onChange={e => setSelectedDay(e.target.value as Weekday)}>
      {weekdays.map(day => (
        <option key={day} value={day}>{day}</option>
      ))}
    </select>
  </label>

  {/* 時間入力 */}
  <label>
  時間：
  <select value={customTime} onChange={e => setCustomTime(e.target.value)}>
    <option value="">-- 時間を選択 --</option>
    {timeOptions.map(time => (
      <option key={time} value={time}>{time}</option>
    ))}
  </select>
</label>

  {/* 患者名入力 */}
  <label>
  患者名：
  <select value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)}>
  <option value="">-- 患者を選択 --</option>
  {patients.length > 0 ? (
    patients.map(p => (
      <option key={p.id} value={p.id}>{p.name}</option>
    ))
  ) : (
    <option disabled value="">（患者が登録されていません）</option>
  )}
</select>
</label>

  {/* 追加ボタン */}
  <button onClick={handleManualAdd}>追加</button>
</div>


    <div className={styles.backButtonWrapper}>
      <Link href="/dashboard" className={styles.backButton}>
        ← ダッシュボードに戻る
      </Link>
    </div>
  </div>
)
};  