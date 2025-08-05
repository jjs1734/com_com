// src/pages/NoticePage.jsx
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function NoticePage({ user, notices, onLogout }) {
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

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">📢 공지사항</h1>
            {user && (
              <p className="text-sm text-gray-600 mt-1">👋 {user.name}님 환영합니다!</p>
            )}
          </div>
          <div className="flex gap-2">
            {user ? (
              <>
                <Link to="/notice/write">
                  <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
                    ✍️ 공지 작성
                  </button>
                </Link>
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
      </div>
    </div>
  )
}

export default NoticePage
