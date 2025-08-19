// src/components/EventCalendar.jsx
import { useMemo, useState } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, eachDayOfInterval, isSameMonth, isWithinInterval,
  format, parseISO, startOfDay, endOfDay, isAfter
} from 'date-fns'
import EventDetailModal from './EventDetailModal'
import AllEventsModal from './AllEventsModal'

export default function EventCalendar({
  events = [],
  view = 'month',
  currentDate,
  onPrev,
  onToday,
  onNext,
  holidays = new Set(),
  getDeptColor,
}) {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [modalDate, setModalDate] = useState(null)

  const current = startOfDay(currentDate || new Date())
  const today = startOfDay(new Date())

  const days = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(current, { weekStartsOn: 0 })
      return Array.from({ length: 7 }, (_, i) => addDays(start, i))
    }
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [current, view])

  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach(e => {
      const s = parseISO(String(e.start_date))
      const en = parseISO(String(e.end_date))
      eachDayOfInterval({ start: s, end: en }).forEach(d => {
        const key = format(d, 'yyyy-MM-dd')
        if (!map[key]) map[key] = []
        map[key].push(e)
      })
    })
    return map
  }, [events])

  const dayNumberClass = (d) => {
    const key = format(d, 'yyyy-MM-dd')
    const isHoliday = holidays.has(key)
    const dow = d.getDay()
    if (isHoliday || dow === 0) return 'text-red-500'
    if (dow === 6) return 'text-blue-500'
    return 'text-gray-900'
  }

  const status = (evt) => {
    const s = startOfDay(parseISO(String(evt.start_date)))
    const en = endOfDay(parseISO(String(evt.end_date)))
    if (isAfter(today, en)) return 'past'
    if (isWithinInterval(today, { start: s, end: en })) return 'ongoing'
    return 'upcoming'
  }

  const deptListSorted = useMemo(() => {
    const set = new Set(events.map(e => e.department).filter(Boolean))
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), 'ko'))
  }, [events])

  const openAllEvents = (dateKey) => setModalDate(dateKey)
  const closeAllEvents = () => setModalDate(null)

  const selectedDateEvents = modalDate ? eventsByDate[modalDate] || [] : []

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="text-lg font-semibold">
          {format(current, view === 'week' ? 'yyyy.MM (주)' : 'yyyy.MM')}
        </div>
        <div className="flex gap-2">
          <button onClick={onPrev} className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">이전</button>
          <button onClick={onToday} className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">오늘</button>
          <button onClick={onNext} className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">다음</button>
        </div>
      </div>

      {/* 요일 */}
      <div className="grid grid-cols-7 text-center text-xs text-gray-500 px-2 py-2">
        {['일','월','화','수','목','금','토'].map(d => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const inMonth = isSameMonth(day, current)
          const dayEvents = eventsByDate[key] || []

          const visibleEvents = dayEvents.slice(0, 3)
          const hiddenEvents = dayEvents.slice(3)

          return (
            <div key={key} className={`bg-white p-2 ${view === 'week' ? 'h-48' : 'h-32'} overflow-hidden`}>
              <div className={`text-xs mb-1 flex items-center justify-between ${inMonth ? dayNumberClass(day) : 'text-gray-300'}`}>
                <span>{format(day, 'd')}</span>
                {format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 text-gray-600">오늘</span>
                )}
              </div>

              <div className="space-y-1">
                {visibleEvents.map(evt => {
                  const st = status(evt)
                  const cls = getDeptColor
                    ? getDeptColor(evt.department, st === 'past', st === 'ongoing')
                    : 'bg-neutral-900 text-white'
                  return (
                    <button
                      key={`${evt.id}-${key}`}
                      onClick={() => setSelectedEvent(evt)}
                      className={`w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate ${cls} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-black/20`}
                      title={`${evt.event_name} (${evt.start_date}~${evt.end_date})`}
                    >
                      {evt.event_name}
                    </button>
                  )
                })}
                {hiddenEvents.length > 0 && (
                  <button
                    onClick={() => openAllEvents(key)}
                    className="text-[11px] text-gray-500 hover:underline focus:outline-none"
                  >
                    +{hiddenEvents.length} 더보기
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 부서별 색상 범례 */}
      {deptListSorted.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {deptListSorted.map(dept => {
              const cls = getDeptColor ? getDeptColor(dept, false, false) : 'bg-neutral-800 text-white'
              return (
                <span
                  key={dept}
                  className={`inline-flex items-center px-2 py-0.5 rounded ${cls}`}
                  title={`${dept} 색상 (예정 기준)`}
                >
                  {dept}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      <EventDetailModal
        open={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        getDeptColor={getDeptColor}
        status={status}
      />

      {/* 더보기 모달 */}
      <AllEventsModal
        open={!!modalDate}
        events={selectedDateEvents}
        onClose={closeAllEvents}
        onSelectEvent={setSelectedEvent}
        getDeptColor={getDeptColor}
        status={status}
      />
    </div>
  )
}
