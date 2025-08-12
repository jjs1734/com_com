// src/App.jsx
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import MainPage from './pages/MainPage'
import { supabase } from './supabaseClient'

function App() {
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
  }

  // ✅ Supabase에서 행사 정보 불러오기
  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          event_name,
          start_date,
          end_date,
          company_name,
          product_name,
          region,
          venue,
          department,
          host:users!events_host_id_fkey (
            id,
            name,
            position,
            department
          )
        `)
        .order('start_date', { ascending: true })
        .order('end_date', { ascending: true })

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
              onLogout={handleLogout}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
