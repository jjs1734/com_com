// src/App.jsx
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import MainPage from './pages/MainPage'
import NoticeWritePage from './pages/NoticeWritePage'
import { supabase } from './supabaseClient'

function App() {
  const [user, setUser] = useState(null)
  const [notices, setNotices] = useState([])
  const [events, setEvents] = useState([])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
  }

  const handleAddNotice = (newNotice) => {
    setNotices((prev) => [...prev, newNotice])
  }

  // ✅ Supabase에서 행사 정보 불러오기
  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase.from('events').select('*')
      if (error) {
        console.error('❌ 행사 정보 가져오기 실패:', error.message)
      } else {
        console.log('✅ 불러온 이벤트:', data)
        setEvents(data)
      }
    }

    fetchEvents()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage onLogin={handleLogin} />} />
        <Route
          path="/main"
          element={
            <MainPage
              user={user}
              events={events}
              notices={notices}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/notice/write"
          element={
            user ? (
              <NoticeWritePage user={user} onSubmitNotice={handleAddNotice} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
