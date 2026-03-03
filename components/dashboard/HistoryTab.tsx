'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Coach } from '@/types'

interface DayData {
  date: string
  calories: number
  protein: number
  items: { name: string; calories: number; protein: number; carbs: number; fat: number }[]
}

interface Props {
  coach: Coach
  userId: string
  calorieTarget: number
}

function getWeekDays(weekOffset: number): string[] {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const thisMonday = new Date(today)
  thisMonday.setDate(today.getDate() + mondayOffset + weekOffset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(thisMonday)
    d.setDate(thisMonday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function getDayMeta(dateStr: string) {
  const today = new Date().toISOString().split('T')[0]
  const d = new Date(dateStr + 'T12:00:00')
  return {
    day: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    isToday: dateStr === today,
    isFuture: dateStr > today,
  }
}

function getDayColor(calories: number, target: number, logged: boolean): string {
  if (!logged) return 'rgba(255,255,255,0.12)'
  const ratio = calories / target
  if (ratio >= 0.9 && ratio <= 1.1) return '#3DDC84'
  if (ratio >= 0.75 && ratio <= 1.25) return '#FFB020'
  return '#FF4444'
}

export function HistoryTab({ coach, userId, calorieTarget }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [allData, setAllData] = useState<Record<string, DayData>>({})
  const [loading, setLoading] = useState(true)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  const proteinTarget = Math.round((calorieTarget * 0.3) / 4)
  const weekDays = getWeekDays(weekOffset)
  const isCurrentWeek = weekOffset === 0

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true)
      const supabase = createClient()
      const since = new Date()
      since.setDate(since.getDate() - 28)
      const { data } = await supabase
        .from('food_logs')
        .select('session_date, name, calories, protein, carbs, fat')
        .eq('user_id', userId)
        .gte('session_date', since.toISOString().split('T')[0])
        .order('session_date', { ascending: false })

      if (!data) { setLoading(false); return }

      const grouped: Record<string, DayData> = {}
      for (const row of data) {
        if (!grouped[row.session_date]) {
          grouped[row.session_date] = { date: row.session_date, calories: 0, protein: 0, items: [] }
        }
        grouped[row.session_date].calories += row.calories
        grouped[row.session_date].protein += row.protein
        grouped[row.session_date].items.push({
          name: row.name, calories: row.calories, protein: row.protein, carbs: row.carbs, fat: row.fat,
        })
      }
      setAllData(grouped)
      setLoading(false)
    }
    fetchLogs()
  }, [userId])

  const visibleLogged = weekDays.map(d => allData[d]).filter(Boolean)
  const loggedDays = visibleLogged.length
  const avgCalories = loggedDays > 0 ? Math.round(visibleLogged.reduce((s, d) => s + d.calories, 0) / loggedDays) : 0
  const avgProtein = loggedDays > 0 ? Math.round(visibleLogged.reduce((s, d) => s + d.protein, 0) / loggedDays) : 0

  const cardStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16,
  }

  const weekLabel = isCurrentWeek
    ? 'This Week'
    : `Week of ${new Date(weekDays[0] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => { setWeekOffset(o => o - 1); setExpandedDay(null) }}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '6px 14px', color: 'rgba(255,255,255,0.6)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
          }}
        >← Prev</button>

        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-dm-sans)' }}>
          {weekLabel}
        </span>

        <button
          onClick={() => { setWeekOffset(o => Math.min(0, o + 1)); setExpandedDay(null) }}
          disabled={isCurrentWeek}
          style={{
            background: isCurrentWeek ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '6px 14px',
            color: isCurrentWeek ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
            fontSize: 12, fontWeight: 600,
            cursor: isCurrentWeek ? 'default' : 'pointer',
            fontFamily: 'var(--font-dm-sans)',
          }}
        >Next →</button>
      </div>

      {/* Weekly averages */}
      <div style={{ ...cardStyle, padding: '16px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
          Week Averages
        </div>
        <div style={{ display: 'flex' }}>
          {[
            { label: 'Days Logged', value: loggedDays === 0 ? '—' : `${loggedDays}/7`, color: coach.color },
            { label: 'Avg Calories', value: loggedDays === 0 ? '—' : avgCalories.toLocaleString(), color: '#F1F1F1' },
            { label: 'Avg Protein', value: loggedDays === 0 ? '—' : `${avgProtein}g`, color: '#3DDC84' },
          ].map((stat, i) => (
            <div key={stat.label} style={{
              flex: 1,
              paddingLeft: i > 0 ? 12 : 0,
              borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              marginLeft: i > 0 ? 12 : 0,
            }}>
              <div style={{ fontFamily: 'var(--font-space-mono)', fontWeight: 700, fontSize: 18, color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily grid */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: '40px 0' }}>
          Loading…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {weekDays.map(dateStr => {
            const { day, date, isToday, isFuture } = getDayMeta(dateStr)
            const dayData = allData[dateStr]
            const logged = !!dayData && !isFuture
            const dayColor = isFuture ? 'rgba(255,255,255,0.08)' : getDayColor(dayData?.calories ?? 0, calorieTarget, logged)
            const isExpanded = expandedDay === dateStr

            return (
              <div key={dateStr}>
                <button
                  onClick={() => logged ? setExpandedDay(isExpanded ? null : dateStr) : undefined}
                  disabled={!logged}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: isExpanded ? '14px 14px 0 0' : 14,
                    background: isToday ? `${coach.color}12` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isToday ? coach.color + '40' : 'rgba(255,255,255,0.06)'}`,
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: logged ? 'pointer' : 'default',
                    textAlign: 'left',
                    fontFamily: 'var(--font-dm-sans)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: dayColor, flexShrink: 0 }} />

                  <div style={{ width: 36, flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: isToday ? coach.color : '#F1F1F1' }}>{day}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{date}</div>
                  </div>

                  {logged ? (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-space-mono)', fontWeight: 700, fontSize: 15, color: dayColor }}>
                          {dayData.calories.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>kcal</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-space-mono)', fontWeight: 700, fontSize: 15, color: dayData.protein >= proteinTarget ? '#3DDC84' : 'rgba(255,255,255,0.5)' }}>
                          {Math.round(dayData.protein)}g
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>protein</div>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>{isExpanded ? '▾' : '▸'}</div>
                    </div>
                  ) : (
                    <div style={{ flex: 1, textAlign: 'right', fontSize: 11, color: isFuture ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.2)' }}>
                      {isFuture ? 'upcoming' : 'not logged'}
                    </div>
                  )}
                </button>

                {isExpanded && dayData && (
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderTop: 'none',
                    borderRadius: '0 0 14px 14px',
                    overflow: 'hidden',
                  }}>
                    {dayData.items.map((item, i) => (
                      <div key={i} style={{
                        padding: '10px 16px',
                        display: 'flex', alignItems: 'center', gap: 10,
                        borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#F1F1F1' }}>{item.name}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                            {item.protein}p · {item.carbs}c · {item.fat}f
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-space-mono)', fontSize: 13, fontWeight: 700, color: coach.color }}>
                          {item.calories}
                        </div>
                      </div>
                    ))}
                    <div style={{
                      padding: '10px 16px',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>Total</span>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: 12, fontWeight: 700, color: '#3DDC84' }}>
                          {Math.round(dayData.protein)}g protein
                        </span>
                        <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: 12, fontWeight: 700, color: coach.color }}>
                          {dayData.calories} kcal
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
