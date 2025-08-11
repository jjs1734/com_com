// src/pages/MainPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function MainPage({ user, events, notices = [], onLogout }) {
  const navigate = useNavigate()
  const [visibleEvents, setVisibleEvents] = useState([])

  useEffect(() => {
    if (!Array.isArray(events)) return

    const now = new Date()
    const upcoming = events
      .filter((event) => new Date(event.end_date) >= now)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))

    setVisibleEvents(upcoming)
  }, [events])

  const handleLogoutClick = () => {
    onLogout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] p-8 font-sans">
      <div className="grid grid-cols-4 gap-6">
        {/* 좌측: 행사 목록 */}
        <div className="col-span-3 space-y-6">
          <div className="p-4 border border-gray-200 rounded-lg bg-white">
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">📅 예정된 행사</h2>
            <div className="grid grid-cols-1 gap-3 max-h-[40vh] overflow-y-auto pr-2">
              {visibleEvents.length === 0 ? (
                <p className="text-gray-500">표시할 행사가 없습니다.</p>
              ) : (
                visibleEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 border border-gray-100 rounded-md bg-[#fafafa] hover:bg-[#f0f0f0] transition text-sm"
                  >
                    <p className="text-base font-medium text-black">{event.event_name}</p>
                    <p className="text-gray-700">🗓️ {event.start_date} ~ {event.end_date}</p>
                    <p className="text-gray-700">🏢 {event.company_name} / {event.product_name}</p>
                    <p className="text-gray-700">📍 {event.region} - {event.venue}</p>
                    <p className="text-gray-700">👤 진행자: {event.host}</p>
                    <p className="text-gray-700">💼 부서: {event.department}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 공지사항 */}
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
            {notices.length === 0 ? (
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

        {/* 우측: 유저 정보 */}
        <div className="col-span-1 p-4 border border-gray-200 rounded-lg bg-white h-fit">
          <h2 className="text-lg font-medium text-gray-900 mb-2">🙋‍♂️ 로그인 정보</h2>
          <p className="text-sm text-gray-700">사용자: <strong>{user?.name}</strong></p>
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
