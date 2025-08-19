// src/App.jsx
import { useEffect, useState } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { supabase } from "./supabaseClient"

import LoginPage from "./pages/LoginPage"
import MainPage from "./pages/MainPage"
import DirectoryPage from "./pages/DirectoryPage"
import Layout from "./components/Layout"

export default function App() {
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])

  // ✅ 로그인 사용자만 접속 허용
  const isLoggedIn = !!user

  // ✅ 로그인 유지된 경우 Supabase 세션 검사 (초기 로딩 시)
  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, event_name, start_date, end_date, department, company_name, product_name, region, venue, host")
        .order("start_date", { ascending: true })

      if (error) {
        console.error("Error fetching events:", error)
      } else {
        setEvents(data)
      }
    }

    if (isLoggedIn) {
      fetchEvents()
    }
  }, [isLoggedIn])

  const handleLogout = () => {
    setUser(null)
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isLoggedIn ? <Navigate to="/main" replace /> : <LoginPage onLogin={setUser} />
          }
        />
        <Route
          path="/main"
          element={
            isLoggedIn ? (
              <Layout user={user} onLogout={handleLogout}>
                <MainPage user={user} events={events} onLogout={handleLogout} />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/directory"
          element={
            isLoggedIn ? (
              <Layout user={user} onLogout={handleLogout}>
                <DirectoryPage />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        {/* ❌ 존재하지 않는 경로는 메인으로 리디렉션 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
