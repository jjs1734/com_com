// src/pages/MainPage.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function MainPage({ user, notices, onLogout }) {
  const [viewedNotices, setViewedNotices] = useState(notices)
  const navigate = useNavigate()

  const handleView = (id) => {
    setViewedNotices((prev) =>
      prev.map((n) => (n.id === id ? { ...n, views: n.views + 1 } : n))
    )
  }

  const handleLogout = () => {
    onLogout()
    navigate('/')
  }

  const handleLoginRedirect = () => {
    navigate('/')
  }

  const goToWritePage = () => {
    navigate('/notice/write')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 상단 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">🌐 사내 커뮤니티 메인</h1>
            {user && (
              <p className="text-sm text-gray-600 mt-1">👋 {user.name}님 환영합니다!</p>
            )}
          </div>
          <div className="flex gap-2">
            {user ? (
              <>
                <button
                  onClick={goToWritePage}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                >
                  ✍️ 공지 작성
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                onClick={handleLoginRedirect}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
              >
                로그인
              </button>
            )}
          </div>
        </div>

        {/* 공지사항 섹션 */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">📢 공지사항</h2>
          <div className="space-y-4">
            {viewedNotices.length === 0 ? (
              <p className="text-center text-gray-500">등록된 공지가 없습니다.</p>
            ) : (
              viewedNotices.map((notice) => (
                <div
                  key={notice.id}
                  onClick={() => handleView(notice.id)}
                  className="bg-white p-4 rounded-xl shadow cursor-pointer hover:shadow-lg transition"
                >
                  <h2 className="text-lg font-semibold mb-1">{notice.title}</h2>
                  <p className="text-sm text-gray-600">{notice.content}</p>
                  {notice.file && (
                    <p className="text-xs text-blue-500 mt-2">📎 {notice.file.name}</p>
                  )}
                  <div className="text-xs text-gray-500 mt-2 flex justify-between">
                    <span>작성자: {notice.author}</span>
                    <span>조회수: {notice.views}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 접속 중인 사용자 & 메신저 준비 영역 */}
        <section>
          <h2 className="text-xl font-semibold mb-4">💬 접속자 & 메신저</h2>
          <p className="text-gray-500 text-sm">* 이 영역은 다음 단계에서 실시간 접속자/채팅 기능으로 확장 예정입니다.</p>
        </section>
      </div>
    </div>
  )
}

export default MainPage
