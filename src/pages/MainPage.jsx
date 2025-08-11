// src/pages/MainPage.jsx
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import EventCalendar from '../components/EventCalendar'
import { addMonths, subMonths, addDays } from 'date-fns'

// 부서별 색상 팔레트 (요청 버전)
const getDeptColor = (dept, isPast, isOngoing) => {
  const palette = {
    '학회 1팀': {
      upcoming: 'bg-amber-700 text-white',
      ongoing : 'bg-amber-600 text-white',
      past    : 'bg-amber-300 text-gray-700',
    },
    '학회 2팀': {
      upcoming: 'bg-pink-700 text-white',
      ongoing : 'bg-pink-600 text-white',
      past    : 'bg-pink-300 text-gray-700',
    },
    '제약 1팀': {
      upcoming: 'bg-sky-700 text-white',
      ongoing : 'bg-sky-600 text-white',
      past    : 'bg-sky-300 text-gray-700',
    },
    '제약 2팀': {
      upcoming: 'bg-violet-700 text-white',
      ongoing : 'bg-violet-600 text-white',
      past    : 'bg-violet-300 text-gray-700',
    },
    default: {
      upcoming: 'bg-neutral-800 text-white',
      ongoing : 'bg-neutral-900 text-white',
      past    : 'bg-neutral-300 text-gray-700',
    },
  }
  const tone = isPast ? 'past' : isOngoing ? 'ongoing' : 'upcoming'
  const set = palette[dept] || palette.default
  return set[tone]
}

// 정렬 유틸 (한글 오름차순, 맨 위 '전체')
const sortOptions = (arr) =>
  ['전체', ...Array.from(new Set(arr)).sort((a, b) => String(a).localeCompare(String(b), 'ko'))]

function MainPage({ user, events = [], notices = [], onLogout }) {
  const navigate = useNavigate()

  // 보기 전환/달력 기준 날짜
  const [view, setView] = useState('month') // 'month' | 'week'
  const [currentDate, setCurrentDate] = useState(new Date())

  // 필터 상태
  const [deptFilter, setDeptFilter] = useState('전체')
  const [hostFilter, setHostFilter] = useState('전체')
  const [clientFilter, setClientFilter] = useState('전체') // company_name

  // 한국 공휴일(예시)
  const holidaysKR = useMemo(
    () =>
      new Set([
        '2025-01-01', '2025-03-01', '2025-05-05', '2025-06-06',
        '2025-08-15', '2025-10-03', '2025-10-09', '2025-12-25',
      ]),
    []
  )

  // ---- 연동(계단식) 옵션 계산 ----
  const optionsDept = useMemo(() => {
    let pool = events
    if (hostFilter !== '전체') pool = pool.filter(e => e.host === hostFilter)
    if (clientFilter !== '전체') pool = pool.filter(e => e.company_name === clientFilter)
    return sortOptions(pool.map(e => e.department || '미지정'))
  }, [events, hostFilter, clientFilter])

  const optionsHost = useMemo(() => {
    let pool = events
    if (deptFilter !== '전체') pool = pool.filter(e => e.department === deptFilter)
    if (clientFilter !== '전체') pool = pool.filter(e => e.company_name === clientFilter)
    return sortOptions(pool.map(e => e.host || '미지정'))
  }, [events, deptFilter, clientFilter])

  const optionsClient = useMemo(() => {
    let pool = events
    if (deptFilter !== '전체') pool = pool.filter(e => e.department === deptFilter)
    if (hostFilter !== '전체') pool = pool.filter(e => e.host === hostFilter)
    return sortOptions(pool.map(e => e.company_name || '미지정'))
  }, [events, deptFilter, hostFilter])

  // 선택값 유효성 보정 (현재 옵션에 없으면 초기화)
  useEffect(() => {
    if (hostFilter !== '전체' && !optionsHost.includes(hostFilter)) setHostFilter('전체')
    if (clientFilter !== '전체' && !optionsClient.includes(clientFilter)) setClientFilter('전체')
  }, [deptFilter, optionsHost, optionsClient]) // eslint-disable-line

  useEffect(() => {
    if (deptFilter !== '전체' && !optionsDept.includes(deptFilter)) setDeptFilter('전체')
    if (clientFilter !== '전체' && !optionsClient.includes(clientFilter)) setClientFilter('전체')
  }, [hostFilter, optionsDept, optionsClient]) // eslint-disable-line

  useEffect(() => {
    if (deptFilter !== '전체' && !optionsDept.includes(deptFilter)) setDeptFilter('전체')
    if (hostFilter !== '전체' && !optionsHost.includes(hostFilter)) setHostFilter('전체')
  }, [clientFilter, optionsDept, optionsHost]) // eslint-disable-line

  // 필터 적용된 이벤트
  const filteredEvents = useMemo(() => {
    return events.filter(e =>
      (deptFilter === '전체' || e.department === deptFilter) &&
      (hostFilter === '전체' || e.host === hostFilter) &&
      (clientFilter === '전체' || e.company_name === clientFilter)
    )
  }, [events, deptFilter, hostFilter, clientFilter])

  // 필터 초기화
  const resetFilters = () => {
    setDeptFilter('전체')
    setHostFilter('전체')
    setClientFilter('전체')
  }

  // 달력 내비게이션 핸들러 (월/주에 따라 이동 단위 다름)
  const handlePrev = () => {
    setCurrentDate(d => (view === 'week' ? addDays(d, -7) : subMonths(d, 1)))
  }
  const handleToday = () => setCurrentDate(new Date())
  const handleNext = () => {
    setCurrentDate(d => (view === 'week' ? addDays(d, 7) : addMonths(d, 1)))
  }

  const handleLogoutClick = () => {
    onLogout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] p-8 font-sans">
      {/* 4열 그리드: 좌 3 / 우 1 */}
      <div className="grid grid-cols-4 gap-6">
        {/* 좌측(3): 상단 필터/보기 + 캘린더 + 공지 */}
        <div className="col-span-3 space-y-6">
          {/* 상단: 보기 토글 + 필터 + 초기화 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1.5 text-sm ${view === 'month' ? 'bg-black text-white' : 'bg-white text-gray-700'}`}
              >
                월
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-3 py-1.5 text-sm ${view === 'week' ? 'bg-black text-white' : 'bg-white text-gray-700'}`}
              >
                주
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
              >
                {optionsDept.map(v => <option key={v} value={v}>{v}</option>)}
              </select>

              <select
                value={hostFilter}
                onChange={(e) => setHostFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
              >
                {optionsHost.map(v => <option key={v} value={v}>{v}</option>)}
              </select>

              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
              >
                {optionsClient.map(v => <option key={v} value={v}>{v}</option>)}
              </select>

              <button
                onClick={resetFilters}
                className="ml-2 px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50"
              >
                초기화
              </button>
            </div>
          </div>

          {/* 📅 캘린더 (네비게이션 props 전달!) */}
          <EventCalendar
            events={filteredEvents}
            view={view}
            currentDate={currentDate}
            onPrev={handlePrev}
            onToday={handleToday}
            onNext={handleNext}
            holidays={holidaysKR}
            getDeptColor={getDeptColor}
          />

          {/* 📢 공지사항 */}
          <div className="p-4 border border-gray-200 rounded-lg bg-white">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-2xl font-semibold">📢 공지사항</h2>
              <button
                onClick={() => navigate('/notice/write')}
                className="text-sm bg-black text-white px-4 py-1.5 rounded hover:bg-gray-800"
              >
                공지 작성
              </button>
            </div>
            {(!notices || notices.length === 0) ? (
              <p className="text-gray-500">등록된 공지사항이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {notices.map((notice, idx) => (
                  <li key={idx} className="text-sm text-gray-800 border-b pb-1">
                    📌 {notice.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 우측(1): 로그인 정보 (고정 사이드) */}
        <div className="col-span-1 p-4 border border-gray-200 rounded-lg bg-white h-fit">
          <h2 className="text-lg font-medium text-gray-900 mb-2">🙋‍♂️ 로그인 정보</h2>
          <p className="text-sm text-gray-700">사용자: <strong>{user?.name}</strong></p>
          <p className="text-sm text-gray-700">직급: <strong>{user?.position || '미지정'}</strong></p> {/* 👈 추가 */}
          <p className="text-sm text-gray-700 mb-4">부서: <strong>{user?.department || '미지정'}</strong></p>
          <button
           onClick={handleLogoutClick}
           className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  )
}

export default MainPage
