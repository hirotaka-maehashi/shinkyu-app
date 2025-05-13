'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { supabase } from '@/utils/supabase-browser'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!

type Patient = {
  name: string;
  lat: number | null;
  lng: number | null;
};

type Visit = {
  id: string;
  staff_id: string;
  patient_id: string;
  patients: Patient;
};

type MapViewProps = {
  selectedStaffId: string;
  selectedDate: Date;
}

async function drawRouteForStaff(
  staffId: string,
  visits: Visit[],
  map: mapboxgl.Map,
  clinicCoordinates: [number, number],
  color: string,
  bounds: mapboxgl.LngLatBounds,
  markersRef: React.MutableRefObject<mapboxgl.Marker[]>
) {
  const routePoints: [number, number][] = [clinicCoordinates]

  visits.forEach((v, index) => {
    const p = v.patients
    if (!p || p.lat == null || p.lng == null) return

    const coord: [number, number] = [Number(p.lng), Number(p.lat)]
    routePoints.push(coord)
    bounds.extend(coord)

    const marker = new mapboxgl.Marker({ color })
      .setLngLat(coord)
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="font-size: 16px; font-weight: bold; background: white; padding: 6px 10px; border-radius: 6px;">
            ${index + 1}. ${p.name}
          </div>
        `)
      )
      .addTo(map)
      .togglePopup()

    markersRef.current.push(marker)
  })

  if (routePoints.length <= 1) return

  const coordStr = routePoints.map(c => c.join(',')).join(';')
  const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordStr}?geometries=geojson&source=first&destination=last&access_token=${mapboxgl.accessToken}`
  const res = await fetch(url)
  const data = await res.json()
  const geometry = data.trips?.[0]?.geometry
  if (!geometry) return

  const sourceId = `route-${staffId}`
  const layerId = `route-line-${staffId}`

  if (map.getLayer(layerId)) map.removeLayer(layerId)
  if (map.getSource(sourceId)) map.removeSource(sourceId)

  map.addSource(sourceId, {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry,
      properties: {}
    }
  })

  map.addLayer({
    id: layerId,
    type: 'line',
    source: sourceId,
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': color,
      'line-width': 4
    }
  })

  geometry.coordinates.forEach((c: number[]) => bounds.extend(c as [number, number]))
}

export default function MapView({ selectedStaffId, selectedDate }: MapViewProps) {
  console.log('🧭 MapView 表示開始', selectedStaffId, selectedDate)
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const [map, setMap] = useState<mapboxgl.Map | null>(null)
  const staffColors: string[] = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']
  const clinicCoordinates: [number, number] = [137.38624, 34.72408]
  const markersRef = useRef<mapboxgl.Marker[]>([])

  useEffect(() => {
    if (!mapContainer.current) return

    const initMap = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: clinicCoordinates,
      zoom: 12
    })

    initMap.addControl(new mapboxgl.NavigationControl(), 'top-right')
    initMap.addControl(new mapboxgl.FullscreenControl(), 'top-right')

    setMap(initMap)
    console.log('🗺 Mapbox 初期化成功')

    return () => initMap.remove()
  }, [])

  useEffect(() => {
    if (!map || !selectedDate) return

    const loadVisitsAndRoute = async () => {
      const baseDate = selectedDate.toISOString().split('T')[0]
      console.log('📆 クエリ対象日付:', baseDate)

      let query = supabase
        .from('weekly_visits')
        .select('id, staff_id, patient_id, patients(name, lat, lng)')
        .eq('date', baseDate)

      const bounds = new mapboxgl.LngLatBounds()

      const cleanupRoutes = () => {
        if (!map.isStyleLoaded()) {
          map.once('load', cleanupRoutes)
          return
        }
        map.getStyle().layers?.forEach(layer => {
          if (layer.id.startsWith('route-line-')) {
            if (map.getLayer(layer.id)) map.removeLayer(layer.id)
          }
        })
        Object.keys(map.getStyle().sources).forEach(sourceId => {
          if (sourceId.startsWith('route-')) {
            if (map.getSource(sourceId)) map.removeSource(sourceId)
          }
        })
        markersRef.current.forEach(marker => marker.remove())
        markersRef.current = []
      }

      cleanupRoutes()

      if (selectedStaffId && selectedStaffId !== 'ALL') {
        query = query.eq('staff_id', selectedStaffId)
      }

      const { data: visits, error } = await query
      console.log('📡 Supabaseからの取得結果:', visits?.length ?? 0, '件')
if (error) console.error('❌ Supabase取得エラー:', error)

      if (error || !visits || visits.length === 0) {
        console.warn('📭 該当する訪問データがありません')
        return
      }

      const visitsTyped: Visit[] = (visits as any[]).map(v => ({
        id: v.id,
        staff_id: v.staff_id,
        patient_id: v.patient_id,
        patients: {
          name: v.patients?.name ?? '',
          lat: v.patients?.lat != null ? Number(v.patients.lat) : null,
          lng: v.patients?.lng != null ? Number(v.patients.lng) : null
        }
      }))

      new mapboxgl.Marker({ color: 'red' })
        .setLngLat(clinicCoordinates)
        .setPopup(new mapboxgl.Popup().setText('店舗（出発地）'))
        .addTo(map)

      if (selectedStaffId !== 'ALL') {
        const visitsForOne = visitsTyped.filter(v => v.staff_id === selectedStaffId)
        console.log('📍 単一staffルート描画: ', selectedStaffId, ' 件数:', visitsForOne.length)
        drawRouteForStaff(selectedStaffId, visitsForOne, map, clinicCoordinates, staffColors[0], bounds, markersRef)
      } else {
        const staffIds = Array.from(new Set(visitsTyped.map(v => v.staff_id))).sort()
        staffIds.forEach((staffId, idx) => {
          const color = staffColors[idx % staffColors.length]
          const visitGroup = visitsTyped.filter(v => v.staff_id === staffId)
          drawRouteForStaff(staffId, visitGroup, map, clinicCoordinates, color, bounds, markersRef)
        })
      }

      if (!bounds.isEmpty() &&
        bounds.getNorthEast().lat !== bounds.getSouthWest().lat &&
        bounds.getNorthEast().lng !== bounds.getSouthWest().lng) {
        map.fitBounds(bounds, { padding: 60 })
      }
    }

    if (!map.isStyleLoaded()) {
      map.once('load', loadVisitsAndRoute)
    } else {
      loadVisitsAndRoute()
    }
  }, [map, selectedStaffId, selectedDate])

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        ref={mapContainer}
        style={{
          width: '90vw',
          height: '90vh',
          maxWidth: '1600px'
        }}
      />
    </div>
  )
}