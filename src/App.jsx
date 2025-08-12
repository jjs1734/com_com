// src/App.jsx
import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import LoginPage from './pages/LoginPage'
import MainPage from './pages/MainPage'

function App() {
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])

  const fetchEvents = async () => {
    if (!user) return  // 로그인한 사용자만 접근
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`id, event_name, start_date, end_date, company_name, product_name, region, venue, department, host:users!events_host_id_fkey(id, name, position, department)`)
        .order('start_date', { ascending: true })
        .order('end_date', { ascending: true })

      if (error) throw error
      setEvents(data)
    } catch (err) {
      console.error('❌ 행사 정보 가져오기 실패:', err.message)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [user])

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage onLogin={setUser} />} />
        <Route
          path="/main"
          element={
            user
              ? <MainPage user={user} events={events} />
              : <Navigate to="/" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App
